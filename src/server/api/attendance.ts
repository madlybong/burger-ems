import { Hono } from "hono";
import db from "../db/index";

const attendance = new Hono();

// Get all attendance records for a billing period
attendance.get("/:billingPeriodId", (c) => {
    const billingPeriodId = c.req.param("billingPeriodId");

    try {
        const records = db.query(`
            SELECT 
                ar.id,
                ar.billing_period_id,
                ar.employee_id,
                ar.attendance_date,
                ar.status,
                ar.overtime_hours,
                ar.notes,
                ar.created_at,
                ar.updated_at
            FROM attendance_records ar
            WHERE ar.billing_period_id = ?
            ORDER BY ar.employee_id, ar.attendance_date
        `).all(billingPeriodId);

        return c.json({ records });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

// Upsert attendance record
attendance.post("/:billingPeriodId", async (c) => {
    const billingPeriodId = c.req.param("billingPeriodId");
    const body = await c.req.json();
    const { employee_id, attendance_date, status, overtime_hours = 0, notes = null } = body;

    // Validation
    if (!employee_id || typeof employee_id !== 'number') {
        return c.json({ error: "Invalid or missing employee_id" }, 400);
    }
    if (!attendance_date || typeof attendance_date !== 'string') {
        return c.json({ error: "Invalid or missing attendance_date" }, 400);
    }
    if (!status || !['full', 'half', 'absent'].includes(status)) {
        return c.json({ error: "Invalid status. Must be 'full', 'half', or 'absent'" }, 400);
    }
    if (typeof overtime_hours !== 'number' || overtime_hours < 0) {
        return c.json({ error: "Invalid overtime_hours. Must be a non-negative number" }, 400);
    }

    // Check if billing period is locked
    const period = db.query(`
        SELECT status FROM billing_periods WHERE id = ?
    `).get(billingPeriodId) as any;

    if (period?.status === 'finalized') {
        return c.json({ error: "Cannot modify attendance for finalized billing period" }, 403);
    }

    try {
        // Upsert attendance record
        const stmt = db.prepare(`
            INSERT INTO attendance_records (
                billing_period_id, 
                employee_id, 
                attendance_date, 
                status, 
                overtime_hours, 
                notes,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(billing_period_id, employee_id, attendance_date) 
            DO UPDATE SET
                status = excluded.status,
                overtime_hours = excluded.overtime_hours,
                notes = excluded.notes,
                updated_at = CURRENT_TIMESTAMP
        `);

        stmt.run(billingPeriodId, employee_id, attendance_date, status, overtime_hours, notes);

        // Update billing_employees summary
        await updateEmployeeSummary(Number(billingPeriodId), employee_id);

        return c.json({ success: true });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

// Delete attendance record
attendance.delete("/:billingPeriodId/:employeeId/:date", (c) => {
    const billingPeriodId = c.req.param("billingPeriodId");
    const employeeId = c.req.param("employeeId");
    const date = c.req.param("date");

    // Check if billing period is locked
    const period = db.query(`
        SELECT status FROM billing_periods WHERE id = ?
    `).get(billingPeriodId) as any;

    if (period?.status === 'finalized') {
        return c.json({ error: "Cannot modify attendance for finalized billing period" }, 403);
    }

    try {
        db.run(`
            DELETE FROM attendance_records 
            WHERE billing_period_id = ? 
                AND employee_id = ? 
                AND attendance_date = ?
        `, [billingPeriodId, employeeId, date]);

        // Update billing_employees summary
        updateEmployeeSummary(Number(billingPeriodId), Number(employeeId));

        return c.json({ success: true });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

// Helper: Update billing_employees summary from attendance records
function updateEmployeeSummary(billingPeriodId: number, employeeId: number) {
    // Calculate days worked from attendance records
    const summary = db.query(`
        SELECT 
            SUM(CASE 
                WHEN status = 'full' THEN 1.0
                WHEN status = 'half' THEN 0.5
                ELSE 0
            END) as days_worked,
            SUM(overtime_hours) as total_ot
        FROM attendance_records
        WHERE billing_period_id = ? AND employee_id = ?
    `).get(billingPeriodId, employeeId) as any;

    const daysWorked = summary?.days_worked || 0;

    // Get employee daily wage
    const employee = db.query(`
        SELECT daily_wage FROM employees WHERE id = ?
    `).get(employeeId) as any;

    const wageAmount = daysWorked * (employee?.daily_wage || 0);

    // Update billing_employees
    db.run(`
        UPDATE billing_employees 
        SET days_worked = ?, wage_amount = ?
        WHERE billing_period_id = ? AND employee_id = ?
    `, [daysWorked, wageAmount, billingPeriodId, employeeId]);
}

// Get attendance summary for a billing period
attendance.get("/:billingPeriodId/summary", (c) => {
    const billingPeriodId = c.req.param("billingPeriodId");

    try {
        const summary = db.query(`
            SELECT 
                e.id as employee_id,
                e.name,
                e.skill_type,
                e.daily_wage,
                SUM(CASE 
                    WHEN ar.status = 'full' THEN 1.0
                    WHEN ar.status = 'half' THEN 0.5
                    ELSE 0
                END) as days_worked,
                SUM(ar.overtime_hours) as total_ot,
                SUM(CASE 
                    WHEN ar.status = 'full' THEN 1.0
                    WHEN ar.status = 'half' THEN 0.5
                    ELSE 0
                END) * e.daily_wage as wage_amount
            FROM employees e
            JOIN billing_employees be ON e.id = be.employee_id
            LEFT JOIN attendance_records ar ON ar.employee_id = e.id 
                AND ar.billing_period_id = be.billing_period_id
            WHERE be.billing_period_id = ?
            GROUP BY e.id, e.name, e.skill_type, e.daily_wage
        `).all(billingPeriodId);

        return c.json({ summary });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

export default attendance;
