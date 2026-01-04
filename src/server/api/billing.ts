import { Hono } from "hono";
import db from "../db";

const billing = new Hono();

// List all Billing Periods (optionally filter by project)
billing.get("/", (c) => {
    const projectId = c.req.query("project_id");
    let query;
    if (projectId) {
        query = db.query(`
      SELECT bp.*, p.client_name, p.site_name, p.work_order_no 
      FROM billing_periods bp
      JOIN projects p ON bp.project_id = p.id
      WHERE bp.project_id = ?
      ORDER BY bp.from_date DESC
    `);
        return c.json(query.all(projectId));
    } else {
        query = db.query(`
      SELECT bp.*, p.client_name, p.site_name, p.work_order_no 
      FROM billing_periods bp
      JOIN projects p ON bp.project_id = p.id
      ORDER BY bp.from_date DESC
    `);
        return c.json(query.all());
    }
});

// Create Billing Period
billing.post("/", async (c) => {
    const body = await c.req.json();
    const { project_id, from_date, to_date, label } = body;

    // Validation
    if (!project_id || typeof project_id !== 'number') return c.json({ error: "Invalid or missing project_id" }, 400);
    if (!from_date || typeof from_date !== 'string') return c.json({ error: "Invalid or missing from_date" }, 400);
    if (!to_date || typeof to_date !== 'string') return c.json({ error: "Invalid or missing to_date" }, 400);

    // Validate date range
    const fromDate = new Date(from_date);
    const toDate = new Date(to_date);

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
        return c.json({ error: "Invalid date format. Please use YYYY-MM-DD format." }, 400);
    }

    if (toDate < fromDate) {
        return c.json({ error: "End date must be after start date." }, 400);
    }

    // Check for Overlap
    // Condition: (ReqStart <= ExistingEnd) AND (ReqEnd >= ExistingStart)
    const existing = db.query(`
        SELECT COUNT(*) as count 
        FROM billing_periods 
        WHERE project_id = ? 
        AND (? <= to_date AND ? >= from_date)
    `).get(project_id, from_date, to_date) as any;

    if (existing && existing.count > 0) {
        return c.json({ error: "Billing period overlaps with an existing period for this project." }, 400);
    }

    const stmt = db.prepare(`
    INSERT INTO billing_periods (project_id, from_date, to_date, label)
    VALUES (?, ?, ?, ?)
  `);

    try {
        const info = stmt.run(project_id, from_date, to_date, label);
        return c.json({ id: info.lastInsertRowid, ...body }, 201);
    } catch (err: any) {
        return c.json({ error: err.message }, 400);
    }
});

// Get Single Billing Period Details (including employees)
billing.get("/:id", (c) => {
    const id = c.req.param("id");
    const period = db.query("SELECT * FROM billing_periods WHERE id = ?").get(id) as any;
    if (!period) return c.json({ error: "Not found" }, 404);

    const project = db.query("SELECT * FROM projects WHERE id = ?").get(period.project_id);

    // Get assigned employees + their attendance/wages
    const employees = db.query(`
    SELECT e.id, e.name, e.skill_type, e.daily_wage, e.uan, e.gp_number,
           be.employee_id, be.days_worked, be.wage_amount
    FROM billing_employees be
    JOIN employees e ON be.employee_id = e.id
    WHERE be.billing_period_id = ?
  `).all(id);

    return c.json({ ...period, project, employees });
});

// Update Billing Period metadata
billing.put("/:id", async (c) => {
    const id = c.req.param("id");
    const body = await c.req.json();
    const { from_date, to_date, label } = body;

    // Validation
    if (!from_date || typeof from_date !== 'string') return c.json({ error: "Invalid or missing from_date" }, 400);
    if (!to_date || typeof to_date !== 'string') return c.json({ error: "Invalid or missing to_date" }, 400);

    // Validate date range
    const fromDate = new Date(from_date);
    const toDate = new Date(to_date);

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
        return c.json({ error: "Invalid date format. Please use YYYY-MM-DD format." }, 400);
    }

    if (toDate < fromDate) {
        return c.json({ error: "End date must be after start date." }, 400);
    }

    const stmt = db.prepare("UPDATE billing_periods SET from_date = ?, to_date = ?, label = ? WHERE id = ?");
    stmt.run(from_date, to_date, label, id);
    return c.json({ id, ...body });
});

// Assign / Update Employee in Billing Period (Attendance Entry)
billing.post("/:id/employees", async (c) => {
    const id = c.req.param("id"); // billing_period_id
    const body = await c.req.json();
    const { employee_id, days_worked, wage_amount } = body;

    // Validation
    if (!employee_id || typeof employee_id !== 'number') return c.json({ error: "Invalid or missing employee_id" }, 400);
    if (typeof days_worked !== 'number') return c.json({ error: "Invalid or missing days_worked" }, 400);
    if (typeof wage_amount !== 'number') return c.json({ error: "Invalid or missing wage_amount" }, 400);

    try {
        const period = db.query("SELECT from_date, to_date FROM billing_periods WHERE id = ?").get(id) as any;
        if (!period) return c.json({ error: "Billing period not found" }, 404);

        const doInsert = db.transaction(() => {
            // 1. Upsert Summary
            db.prepare(`
                INSERT INTO billing_employees (billing_period_id, employee_id, days_worked, wage_amount)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(billing_period_id, employee_id) DO UPDATE SET
                  days_worked = excluded.days_worked,
                  wage_amount = excluded.wage_amount
            `).run(id, employee_id, days_worked, wage_amount);

            // 2. Seed Attendance (Only if no records exist)
            const countRes = db.prepare("SELECT COUNT(*) as c FROM attendance_records WHERE billing_period_id = ? AND employee_id = ?").get(id, employee_id) as any;

            if (countRes.c === 0 && days_worked > 0) {
                const startDate = new Date(period.from_date);
                const endDate = new Date(period.to_date);

                if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                    throw new Error("Invalid billing period dates");
                }

                const targetDays = Math.floor(days_worked);
                let seededCount = 0;

                const insertRecord = db.prepare(`
                    INSERT INTO attendance_records (billing_period_id, employee_id, attendance_date, status, overtime_hours)
                    VALUES (?, ?, ?, 'full', 0)
                `);

                const current = new Date(startDate);
                while (current <= endDate && seededCount < targetDays) {
                    const day = current.getUTCDay(); // 0=Sun, 6=Sat
                    const dateStr = current.toISOString().split('T')[0];

                    // Skip Weekends (Sat & Sun)
                    if (day !== 0 && day !== 6) {
                        insertRecord.run(Number(id), Number(employee_id), dateStr);
                        seededCount++;
                    }
                    current.setUTCDate(current.getUTCDate() + 1);
                }
            }
        });

        doInsert();
        return c.json({ success: true });
    } catch (e: any) {
        return c.json({ error: e.message }, 400);
    }
});

// Delete Employee from Billing Period
billing.delete("/:id/employees/:employee_id", (c) => {
    const billingPeriodId = c.req.param("id");
    const employeeId = c.req.param("employee_id");

    try {
        db.transaction(() => {
            db.prepare(`
                DELETE FROM attendance_records 
                WHERE billing_period_id = ? AND employee_id = ?
            `).run(billingPeriodId, employeeId);

            db.prepare(`
                DELETE FROM billing_employees 
                WHERE billing_period_id = ? AND employee_id = ?
            `).run(billingPeriodId, employeeId);
        })();

        return c.json({ success: true });
    } catch (e: any) {
        return c.json({ error: e.message }, 400);
    }
});

// Bulk Import Employees (from Previous Period or All Active)
billing.post("/:id/import-employees", async (c) => {
    const id = c.req.param("id");
    const { source_period_id } = await c.req.json(); // if null, import all active employees

    // Implementation: insert into billing_employees select ... where ...
    // For Phase 1 MVP, maybe just "Select Employees to Add" UI is better?
    // User wants "Employee assignment to billing periods".
    // Let's keep it simple: "Add Employee" allows picking from active employees.
    return c.json({ message: "Not implemented yet, use manual add" });
});

// Finalize Billing Period
// Triggers PF/ESI computation and locks the period
billing.post("/:id/finalize", async (c) => {
    const id = Number(c.req.param("id"));

    try {
        // Check if billing period exists
        const period = db.query("SELECT * FROM billing_periods WHERE id = ?").get(id) as any;
        if (!period) {
            return c.json({ error: "Billing period not found" }, 404);
        }

        // Check if already finalized (idempotency)
        if (period.status === 'finalized') {
            return c.json({
                message: "Billing period already finalized",
                finalized: true,
                finalized_at: period.finalized_at
            });
        }

        // Check if there are employees
        const employeeCount = db.query(`
            SELECT COUNT(*) as count FROM billing_employees WHERE billing_period_id = ?
        `).get(id) as any;

        if (!employeeCount || employeeCount.count === 0) {
            return c.json({ error: "Cannot finalize: No employees assigned to this billing period" }, 400);
        }

        // Get employees for computation
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
        `).all(id) as any[];

        // Get current statutory config
        const config = db.query(`
            SELECT * FROM statutory_config WHERE company_id = 1
        `).get() as any;

        if (!config) {
            return c.json({ error: "Statutory configuration not found" }, 500);
        }

        // Import computation functions
        const { computeBillingPeriodStatutory } = await import("../utils/statutory-computation");

        // Convert to proper types
        const employeeInputs = employees.map((emp: any) => ({
            employee_id: emp.employee_id,
            name: emp.name,
            days_worked: emp.days_worked,
            daily_wage: emp.daily_wage,
            wage_amount: emp.wage_amount,
            pf_applicable: !!emp.pf_applicable,
            esi_applicable: !!emp.esi_applicable
        }));

        const statutoryConfig = {
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

        // Compute PF/ESI
        const result = computeBillingPeriodStatutory({
            billing_period_id: id,
            from_date: period.from_date,
            to_date: period.to_date,
            employees: employeeInputs,
            config: statutoryConfig
        });

        // Start transaction
        // 1. Update billing period status
        db.run(`
            UPDATE billing_periods 
            SET status = 'finalized', finalized_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        `, [id]);

        // 2. Store computation (check if exists first for idempotency)
        const existingComputation = db.query(`
            SELECT id FROM billing_period_statutory_computation WHERE billing_period_id = ?
        `).get(id) as any;

        let computationId;

        if (!existingComputation) {
            // Store config snapshot as JSON
            const configSnapshot = JSON.stringify(result.config_snapshot);

            // Insert main computation record
            const stmt = db.prepare(`
                INSERT INTO billing_period_statutory_computation (
                    billing_period_id, config_snapshot, total_gross_wages,
                    total_pf_employee, total_pf_employer, total_esi_employee, total_esi_employer,
                    total_employee_deductions, total_employer_contributions, total_net_payable, locked
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
            `);

            stmt.run(
                id,
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
                SELECT id FROM billing_period_statutory_computation WHERE billing_period_id = ?
            `).get(id) as any;

            computationId = computation.id;

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
        } else {
            computationId = existingComputation.id;
            // Ensure it's locked
            db.run(`
                UPDATE billing_period_statutory_computation 
                SET locked = 1 
                WHERE id = ?
            `, [computationId]);
        }

        return c.json({
            success: true,
            message: "Billing period finalized successfully",
            finalized: true,
            computation_id: computationId,
            statutory_summary: {
                total_pf_employee: result.total_pf_employee,
                total_pf_employer: result.total_pf_employer,
                total_esi_employee: result.total_esi_employee,
                total_esi_employer: result.total_esi_employer,
                total_deductions: result.total_employee_deductions,
                total_contributions: result.total_employer_contributions
            }
        });

    } catch (err: any) {
        console.error("Finalization error:", err);
        return c.json({ error: err.message }, 500);
    }
});

// Delete Billing Period (Cascade)
billing.delete("/:id", (c) => {
    const id = c.req.param("id");

    try {
        const doDelete = db.transaction(() => {
            // 1. Delete generated documents
            db.prepare("DELETE FROM generated_documents WHERE billing_period_id = ?").run(id);

            // 2. Delete computations (Cascades to employee_statutory -> overrides)
            db.prepare("DELETE FROM billing_period_statutory_computation WHERE billing_period_id = ?").run(id);

            // 3. Delete attendance records (Cascades from billing_periods usually, but explicit safety)
            db.prepare("DELETE FROM attendance_records WHERE billing_period_id = ?").run(id);

            // 4. Delete billing employees
            db.prepare("DELETE FROM billing_employees WHERE billing_period_id = ?").run(id);

            // 5. Delete the period
            return db.prepare("DELETE FROM billing_periods WHERE id = ?").run(id);
        });

        const info = doDelete();

        if (info.changes === 0) {
            return c.json({ error: "Billing period not found" }, 404);
        }

        return c.json({ success: true });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

export default billing;
