/**
 * Statutory Overrides API
 * Phase 2.2 - Step 6
 * 
 * Handles manual overrides of PF/ESI amounts with full audit trail
 */

import { Hono } from "hono";
import db from "../db";

const statutoryOverrides = new Hono();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if computation is locked
 */
function isComputationLocked(billingPeriodId: number): boolean {
    const computation = db.query(`
    SELECT locked FROM billing_period_statutory_computation 
    WHERE billing_period_id = ?
  `).get(billingPeriodId) as any;

    return computation ? !!computation.locked : false;
}

/**
 * Get employee statutory record
 */
function getEmployeeStatutory(employeeStatutoryId: number): any {
    return db.query(`
    SELECT bes.*, bpsc.billing_period_id, bpsc.locked
    FROM billing_employee_statutory bes
    JOIN billing_period_statutory_computation bpsc ON bes.computation_id = bpsc.id
    WHERE bes.id = ?
  `).get(employeeStatutoryId) as any;
}

/**
 * Get existing override for a field
 */
function getExistingOverride(employeeStatutoryId: number, fieldName: string): any {
    return db.query(`
    SELECT * FROM statutory_overrides 
    WHERE employee_statutory_id = ? AND field_name = ?
    ORDER BY overridden_at DESC
    LIMIT 1
  `).get(employeeStatutoryId, fieldName) as any;
}

/**
 * Apply override to employee statutory record
 */
function applyOverride(
    employeeStatutoryId: number,
    fieldName: string,
    originalValue: number,
    overrideValue: number,
    reason: string,
    overriddenBy: string = 'admin'
): number {
    // Insert override record
    const stmt = db.prepare(`
    INSERT INTO statutory_overrides (
      employee_statutory_id, field_name, original_value, 
      override_value, reason, overridden_by
    ) VALUES (?, ?, ?, ?, ?, ?)
  `);

    stmt.run(
        employeeStatutoryId,
        fieldName,
        originalValue,
        overrideValue,
        reason,
        overriddenBy
    );

    // Update the employee statutory record
    const updateStmt = db.prepare(`
    UPDATE billing_employee_statutory 
    SET ${fieldName} = ? 
    WHERE id = ?
  `);

    updateStmt.run(overrideValue, employeeStatutoryId);

    // Recalculate totals
    recalculateTotals(employeeStatutoryId);

    // Get the inserted override ID
    const override = db.query(`
    SELECT id FROM statutory_overrides 
    WHERE employee_statutory_id = ? AND field_name = ?
    ORDER BY overridden_at DESC
    LIMIT 1
  `).get(employeeStatutoryId, fieldName) as any;

    return override.id;
}

/**
 * Recalculate totals after override
 */
function recalculateTotals(employeeStatutoryId: number) {
    const record = db.query(`
    SELECT * FROM billing_employee_statutory WHERE id = ?
  `).get(employeeStatutoryId) as any;

    if (!record) return;

    // Recalculate employee totals
    const totalPF = record.pf_employee_amount + record.pf_employer_amount;
    const totalESI = record.esi_employee_amount + record.esi_employer_amount;
    const totalEmployeeDeduction = record.pf_employee_amount + record.esi_employee_amount;
    const totalEmployerContribution = record.pf_employer_amount + record.esi_employer_amount;
    const netPayable = record.gross_wage - totalEmployeeDeduction;

    db.run(`
    UPDATE billing_employee_statutory 
    SET 
      pf_total_amount = ?,
      esi_total_amount = ?,
      total_employee_deduction = ?,
      total_employer_contribution = ?,
      net_payable = ?
    WHERE id = ?
  `, [totalPF, totalESI, totalEmployeeDeduction, totalEmployerContribution, netPayable, employeeStatutoryId]);

    // Recalculate billing period totals
    const computationId = record.computation_id;
    const aggregates = db.query(`
    SELECT 
      SUM(gross_wage) as total_gross_wages,
      SUM(pf_employee_amount) as total_pf_employee,
      SUM(pf_employer_amount) as total_pf_employer,
      SUM(esi_employee_amount) as total_esi_employee,
      SUM(esi_employer_amount) as total_esi_employer,
      SUM(total_employee_deduction) as total_employee_deductions,
      SUM(total_employer_contribution) as total_employer_contributions,
      SUM(net_payable) as total_net_payable
    FROM billing_employee_statutory
    WHERE computation_id = ?
  `).get(computationId) as any;

    db.run(`
    UPDATE billing_period_statutory_computation
    SET
      total_gross_wages = ?,
      total_pf_employee = ?,
      total_pf_employer = ?,
      total_esi_employee = ?,
      total_esi_employer = ?,
      total_employee_deductions = ?,
      total_employer_contributions = ?,
      total_net_payable = ?
    WHERE id = ?
  `, [
        aggregates.total_gross_wages,
        aggregates.total_pf_employee,
        aggregates.total_pf_employer,
        aggregates.total_esi_employee,
        aggregates.total_esi_employer,
        aggregates.total_employee_deductions,
        aggregates.total_employer_contributions,
        aggregates.total_net_payable,
        computationId
    ]);
}

// ============================================================================
// API ENDPOINTS
// ============================================================================

/**
 * GET /api/statutory-overrides/:employeeStatutoryId
 * 
 * Get all overrides for an employee statutory record
 */
statutoryOverrides.get("/:employeeStatutoryId", (c) => {
    const employeeStatutoryId = Number(c.req.param("employeeStatutoryId"));

    const overrides = db.query(`
    SELECT * FROM statutory_overrides 
    WHERE employee_statutory_id = ?
    ORDER BY overridden_at DESC
  `).all(employeeStatutoryId);

    return c.json({ overrides });
});

/**
 * POST /api/statutory-overrides/:employeeStatutoryId/override
 * 
 * Apply an override to a specific field
 */
statutoryOverrides.post("/:employeeStatutoryId/override", async (c) => {
    const employeeStatutoryId = Number(c.req.param("employeeStatutoryId"));
    const body = await c.req.json();
    const { field_name, override_value, reason, overridden_by } = body;

    // Validation
    const validFields = ['pf_employee_amount', 'pf_employer_amount', 'esi_employee_amount', 'esi_employer_amount'];
    if (!validFields.includes(field_name)) {
        return c.json({ error: "Invalid field_name" }, 400);
    }

    if (typeof override_value !== 'number' || override_value < 0) {
        return c.json({ error: "override_value must be a non-negative number" }, 400);
    }

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
        return c.json({ error: "reason is required" }, 400);
    }

    try {
        // Get employee statutory record
        const record = getEmployeeStatutory(employeeStatutoryId);
        if (!record) {
            return c.json({ error: "Employee statutory record not found" }, 404);
        }

        // Check if locked
        if (record.locked) {
            return c.json({
                error: "Computation is locked. Unlock the billing period first to make overrides."
            }, 403);
        }

        // Get original value
        const originalValue = record[field_name];

        // Check if value is actually different
        if (originalValue === override_value) {
            return c.json({
                message: "Override value is same as current value. No change made.",
                current_value: originalValue
            });
        }

        // Apply override
        const overrideId = applyOverride(
            employeeStatutoryId,
            field_name,
            originalValue,
            override_value,
            reason.trim(),
            overridden_by || 'admin'
        );

        return c.json({
            success: true,
            override_id: overrideId,
            field_name,
            original_value: originalValue,
            override_value,
            reason
        });

    } catch (err: any) {
        console.error("Override error:", err);
        return c.json({ error: err.message }, 500);
    }
});

/**
 * DELETE /api/statutory-overrides/:overrideId
 * 
 * Remove an override and restore original value
 */
statutoryOverrides.delete("/:overrideId", async (c) => {
    const overrideId = Number(c.req.param("overrideId"));

    try {
        // Get override record
        const override = db.query(`
      SELECT * FROM statutory_overrides WHERE id = ?
    `).get(overrideId) as any;

        if (!override) {
            return c.json({ error: "Override not found" }, 404);
        }

        // Get employee statutory record
        const record = getEmployeeStatutory(override.employee_statutory_id);
        if (!record) {
            return c.json({ error: "Employee statutory record not found" }, 404);
        }

        // Check if locked
        if (record.locked) {
            return c.json({
                error: "Computation is locked. Cannot remove overrides."
            }, 403);
        }

        // Restore original value
        const updateStmt = db.prepare(`
      UPDATE billing_employee_statutory 
      SET ${override.field_name} = ? 
      WHERE id = ?
    `);

        updateStmt.run(override.original_value, override.employee_statutory_id);

        // Recalculate totals
        recalculateTotals(override.employee_statutory_id);

        // Delete override record
        db.run(`DELETE FROM statutory_overrides WHERE id = ?`, [overrideId]);

        return c.json({
            success: true,
            message: "Override removed and original value restored",
            field_name: override.field_name,
            restored_value: override.original_value
        });

    } catch (err: any) {
        console.error("Remove override error:", err);
        return c.json({ error: err.message }, 500);
    }
});

/**
 * GET /api/statutory-overrides/billing-period/:billingPeriodId
 * 
 * Get all overrides for a billing period
 */
statutoryOverrides.get("/billing-period/:billingPeriodId", (c) => {
    const billingPeriodId = Number(c.req.param("billingPeriodId"));

    const overrides = db.query(`
    SELECT 
      so.*,
      bes.employee_id,
      e.name as employee_name
    FROM statutory_overrides so
    JOIN billing_employee_statutory bes ON so.employee_statutory_id = bes.id
    JOIN billing_period_statutory_computation bpsc ON bes.computation_id = bpsc.id
    JOIN employees e ON bes.employee_id = e.id
    WHERE bpsc.billing_period_id = ?
    ORDER BY so.overridden_at DESC
  `).all(billingPeriodId);

    return c.json({
        billing_period_id: billingPeriodId,
        overrides,
        count: overrides.length
    });
});

export default statutoryOverrides;
