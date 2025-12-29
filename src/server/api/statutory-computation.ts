/**
 * Statutory Computation Persistence API
 * Phase 2.2 - Step 3
 * 
 * Handles storage and retrieval of PF/ESI computation results
 */

import { Hono } from "hono";
import db from "../db";
import {
    computeBillingPeriodStatutory,
    type BillingPeriodComputationResult,
    type EmployeeWageInput,
    type StatutoryConfig
} from "../utils/statutory-computation";

const statutoryComputation = new Hono();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if computation exists for a billing period
 */
function getExistingComputation(billingPeriodId: number): any | null {
    return db.query(`
    SELECT * FROM billing_period_statutory_computation 
    WHERE billing_period_id = ?
  `).get(billingPeriodId) as any;
}

/**
 * Persist computation results to database
 */
function persistComputation(
    billingPeriodId: number,
    result: BillingPeriodComputationResult
): number {
    // Store config snapshot as JSON
    const configSnapshot = JSON.stringify(result.config_snapshot);

    // Insert main computation record
    const stmt = db.prepare(`
    INSERT INTO billing_period_statutory_computation (
      billing_period_id, config_snapshot, total_gross_wages,
      total_pf_employee, total_pf_employer, total_esi_employee, total_esi_employer,
      total_employee_deductions, total_employer_contributions, total_net_payable, locked
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
  `);

    stmt.run(
        billingPeriodId,
        configSnapshot,
        result.total_gross_wages,
        result.total_pf_employee,
        result.total_pf_employer,
        result.total_esi_employee,
        result.total_esi_employer,
        result.total_employee_deductions,
        result.total_employer_contributions,
        result.total_net_payable
    );

    // Get the inserted computation ID
    const computation = db.query(`
    SELECT id FROM billing_period_statutory_computation 
    WHERE billing_period_id = ?
  `).get(billingPeriodId) as any;

    const computationId = computation.id;

    // Insert employee-level results
    const empStmt = db.prepare(`
    INSERT INTO billing_employee_statutory (
      computation_id, employee_id, gross_wage, basic_wage, custom_wage,
      pf_applicable, pf_wage_basis, pf_wage_capped, pf_employee_amount, pf_employer_amount,
      pf_total_amount, pf_explanation, esi_applicable, esi_wage_basis, esi_employee_amount,
      esi_employer_amount, esi_total_amount, esi_explanation, total_employee_deduction,
      total_employer_contribution, net_payable
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

    for (const empResult of result.employee_results) {
        empStmt.run(
            computationId,
            empResult.employee_id,
            empResult.gross_wage,
            empResult.basic_wage,
            empResult.custom_wage,
            empResult.pf_applicable ? 1 : 0,
            empResult.pf_wage_basis,
            empResult.pf_wage_capped,
            empResult.pf_employee_amount,
            empResult.pf_employer_amount,
            empResult.pf_total_amount,
            empResult.pf_explanation,
            empResult.esi_applicable ? 1 : 0,
            empResult.esi_wage_basis,
            empResult.esi_employee_amount,
            empResult.esi_employer_amount,
            empResult.esi_total_amount,
            empResult.esi_explanation,
            empResult.total_employee_deduction,
            empResult.total_employer_contribution,
            empResult.net_payable
        );
    }

    return computationId;
}

/**
 * Retrieve persisted computation
 */
function retrieveComputation(billingPeriodId: number): BillingPeriodComputationResult | null {
    const computation = getExistingComputation(billingPeriodId);
    if (!computation) return null;

    // Get employee results
    const employeeResults = db.query(`
    SELECT bes.*, e.name
    FROM billing_employee_statutory bes
    JOIN employees e ON bes.employee_id = e.id
    WHERE bes.computation_id = ?
    ORDER BY e.name
  `).all(computation.id) as any[];

    // Get billing period info
    const period = db.query(`
    SELECT from_date, to_date FROM billing_periods WHERE id = ?
  `).get(billingPeriodId) as any;

    return {
        billing_period_id: billingPeriodId,
        from_date: period.from_date,
        to_date: period.to_date,
        config_snapshot: JSON.parse(computation.config_snapshot),
        employee_results: employeeResults.map((emp: any) => ({
            employee_id: emp.employee_id,
            name: emp.name,
            gross_wage: emp.gross_wage,
            basic_wage: emp.basic_wage,
            custom_wage: emp.custom_wage,
            pf_applicable: !!emp.pf_applicable,
            pf_wage_basis: emp.pf_wage_basis,
            pf_wage_capped: emp.pf_wage_capped,
            pf_employee_amount: emp.pf_employee_amount,
            pf_employer_amount: emp.pf_employer_amount,
            pf_total_amount: emp.pf_total_amount,
            pf_explanation: emp.pf_explanation,
            esi_applicable: !!emp.esi_applicable,
            esi_wage_basis: emp.esi_wage_basis,
            esi_employee_amount: emp.esi_employee_amount,
            esi_employer_amount: emp.esi_employer_amount,
            esi_total_amount: emp.esi_total_amount,
            esi_explanation: emp.esi_explanation,
            total_employee_deduction: emp.total_employee_deduction,
            total_employer_contribution: emp.total_employer_contribution,
            net_payable: emp.net_payable
        })),
        total_gross_wages: computation.total_gross_wages,
        total_pf_employee: computation.total_pf_employee,
        total_pf_employer: computation.total_pf_employer,
        total_esi_employee: computation.total_esi_employee,
        total_esi_employer: computation.total_esi_employer,
        total_employee_deductions: computation.total_employee_deductions,
        total_employer_contributions: computation.total_employer_contributions,
        total_net_payable: computation.total_net_payable
    };
}

// ============================================================================
// API ENDPOINTS
// ============================================================================

/**
 * GET /api/statutory-computation/:billingPeriodId
 * 
 * Retrieve existing computation or return null if not computed
 */
statutoryComputation.get("/:billingPeriodId", (c) => {
    const billingPeriodId = Number(c.req.param("billingPeriodId"));

    const result = retrieveComputation(billingPeriodId);

    if (!result) {
        return c.json({ computed: false, message: "No computation found" }, 404);
    }

    const computation = getExistingComputation(billingPeriodId);

    return c.json({
        computed: true,
        locked: !!computation.locked,
        computed_at: computation.computed_at,
        result
    });
});

/**
 * POST /api/statutory-computation/:billingPeriodId/compute
 * 
 * Compute and persist PF/ESI for a billing period
 * Will NOT recompute if already exists unless force=true
 */
statutoryComputation.post("/:billingPeriodId/compute", async (c) => {
    const billingPeriodId = Number(c.req.param("billingPeriodId"));
    const body = await c.req.json();
    const force = body.force === true;

    // Check if already computed
    const existing = getExistingComputation(billingPeriodId);

    if (existing && !force) {
        return c.json({
            error: "Computation already exists. Use force=true to recompute.",
            locked: !!existing.locked,
            computed_at: existing.computed_at
        }, 409);
    }

    if (existing && existing.locked) {
        return c.json({
            error: "Computation is locked and cannot be recomputed",
            locked: true,
            computed_at: existing.computed_at
        }, 403);
    }

    try {
        // Get billing period info
        const period = db.query(`
      SELECT from_date, to_date FROM billing_periods WHERE id = ?
    `).get(billingPeriodId) as any;

        if (!period) {
            return c.json({ error: "Billing period not found" }, 404);
        }

        // Get employees for this billing period
        const employees = db.query(`
      SELECT 
        be.employee_id,
        e.name,
        be.days_worked,
        e.daily_wage,
        be.wage_amount,
        e.pf_applicable,
        e.esi_applicable
      FROM billing_employees be
      JOIN employees e ON be.employee_id = e.id
      WHERE be.billing_period_id = ?
    `).all(billingPeriodId) as any[];

        if (employees.length === 0) {
            return c.json({ error: "No employees found for this billing period" }, 400);
        }

        // Get current statutory config
        const config = db.query(`
      SELECT * FROM statutory_config WHERE company_id = 1
    `).get() as any;

        if (!config) {
            return c.json({ error: "Statutory configuration not found" }, 500);
        }

        // Convert to proper types
        const employeeInputs: EmployeeWageInput[] = employees.map((emp: any) => ({
            employee_id: emp.employee_id,
            name: emp.name,
            days_worked: emp.days_worked,
            daily_wage: emp.daily_wage,
            wage_amount: emp.wage_amount,
            pf_applicable: !!emp.pf_applicable,
            esi_applicable: !!emp.esi_applicable
        }));

        const statutoryConfig: StatutoryConfig = {
            company_id: config.company_id,
            pf_enabled: !!config.pf_enabled,
            pf_wage_basis: config.pf_wage_basis,
            pf_employee_rate: config.pf_employee_rate,
            pf_employer_rate: config.pf_employer_rate,
            pf_wage_ceiling: config.pf_wage_ceiling,
            pf_enforce_ceiling: !!config.pf_enforce_ceiling,
            esi_enabled: !!config.esi_enabled,
            esi_threshold: config.esi_threshold,
            esi_employee_rate: config.esi_employee_rate,
            esi_employer_rate: config.esi_employer_rate,
            rounding_mode: config.rounding_mode
        };

        // Compute
        const result = computeBillingPeriodStatutory({
            billing_period_id: billingPeriodId,
            from_date: period.from_date,
            to_date: period.to_date,
            employees: employeeInputs,
            config: statutoryConfig
        });

        // Delete existing if recomputing
        if (existing) {
            db.run(`DELETE FROM billing_period_statutory_computation WHERE billing_period_id = ?`, [billingPeriodId]);
        }

        // Persist
        const computationId = persistComputation(billingPeriodId, result);

        return c.json({
            success: true,
            computation_id: computationId,
            result
        });

    } catch (err: any) {
        console.error("Computation error:", err);
        return c.json({ error: err.message }, 500);
    }
});

/**
 * POST /api/statutory-computation/:billingPeriodId/lock
 * 
 * Lock computation to prevent recomputation
 */
statutoryComputation.post("/:billingPeriodId/lock", async (c) => {
    const billingPeriodId = Number(c.req.param("billingPeriodId"));

    const existing = getExistingComputation(billingPeriodId);

    if (!existing) {
        return c.json({ error: "No computation found to lock" }, 404);
    }

    if (existing.locked) {
        return c.json({ message: "Already locked", locked: true });
    }

    db.run(`
    UPDATE billing_period_statutory_computation 
    SET locked = 1 
    WHERE billing_period_id = ?
  `, [billingPeriodId]);

    return c.json({ success: true, locked: true });
});

/**
 * POST /api/statutory-computation/:billingPeriodId/unlock
 * 
 * Unlock computation to allow recomputation (admin only)
 */
statutoryComputation.post("/:billingPeriodId/unlock", async (c) => {
    const billingPeriodId = Number(c.req.param("billingPeriodId"));

    const existing = getExistingComputation(billingPeriodId);

    if (!existing) {
        return c.json({ error: "No computation found to unlock" }, 404);
    }

    db.run(`
    UPDATE billing_period_statutory_computation 
    SET locked = 0 
    WHERE billing_period_id = ?
  `, [billingPeriodId]);

    return c.json({ success: true, locked: false });
});

/**
 * DELETE /api/statutory-computation/:billingPeriodId
 * 
 * Delete computation (only if not locked)
 */
statutoryComputation.delete("/:billingPeriodId", (c) => {
    const billingPeriodId = Number(c.req.param("billingPeriodId"));

    const existing = getExistingComputation(billingPeriodId);

    if (!existing) {
        return c.json({ error: "No computation found" }, 404);
    }

    if (existing.locked) {
        return c.json({ error: "Cannot delete locked computation" }, 403);
    }

    db.run(`DELETE FROM billing_period_statutory_computation WHERE billing_period_id = ?`, [billingPeriodId]);

    return c.json({ success: true, message: "Computation deleted" });
});

export default statutoryComputation;
