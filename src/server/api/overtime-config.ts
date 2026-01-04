import { Hono } from "hono";
import db from "../db/index";

const overtimeConfig = new Hono();

// Get OT config for a project
overtimeConfig.get("/:projectId", (c) => {
    const projectId = c.req.param("projectId");

    try {
        const config = db.query(`
            SELECT * FROM project_overtime_config
            WHERE project_id = ?
        `).get(projectId) as any;

        // Return default config if not set
        if (!config) {
            return c.json({
                project_id: Number(projectId),
                ot_enabled: false,
                ot_rate: 1.5,
                max_ot_hours_per_day: 4.0,
                max_ot_hours_per_period: 60.0,
                rounding_rule: 'round'
            });
        }

        return c.json(config);
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

// Create or update OT config for a project
overtimeConfig.post("/:projectId", async (c) => {
    const projectId = c.req.param("projectId");
    const body = await c.req.json();
    const {
        ot_enabled = false,
        ot_rate = 1.5,
        max_ot_hours_per_day = 4.0,
        max_ot_hours_per_period = 60.0,
        rounding_rule = 'round'
    } = body;

    // Validation
    if (typeof ot_enabled !== 'boolean') {
        return c.json({ error: "ot_enabled must be a boolean" }, 400);
    }
    if (typeof ot_rate !== 'number' || ot_rate < 1.0 || ot_rate > 5.0) {
        return c.json({ error: "ot_rate must be between 1.0 and 5.0" }, 400);
    }
    if (typeof max_ot_hours_per_day !== 'number' || max_ot_hours_per_day < 0 || max_ot_hours_per_day > 24) {
        return c.json({ error: "max_ot_hours_per_day must be between 0 and 24" }, 400);
    }
    if (typeof max_ot_hours_per_period !== 'number' || max_ot_hours_per_period < 0) {
        return c.json({ error: "max_ot_hours_per_period must be non-negative" }, 400);
    }
    if (!['round', 'floor', 'ceil'].includes(rounding_rule)) {
        return c.json({ error: "rounding_rule must be 'round', 'floor', or 'ceil'" }, 400);
    }

    try {
        const stmt = db.prepare(`
            INSERT INTO project_overtime_config (
                project_id,
                ot_enabled,
                ot_rate,
                max_ot_hours_per_day,
                max_ot_hours_per_period,
                rounding_rule,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(project_id) DO UPDATE SET
                ot_enabled = excluded.ot_enabled,
                ot_rate = excluded.ot_rate,
                max_ot_hours_per_day = excluded.max_ot_hours_per_day,
                max_ot_hours_per_period = excluded.max_ot_hours_per_period,
                rounding_rule = excluded.rounding_rule,
                updated_at = CURRENT_TIMESTAMP
        `);

        stmt.run(projectId, ot_enabled, ot_rate, max_ot_hours_per_day, max_ot_hours_per_period, rounding_rule);

        return c.json({ success: true });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

// Validate OT hours for a specific date
overtimeConfig.post("/:projectId/validate", async (c) => {
    const projectId = c.req.param("projectId");
    const body = await c.req.json();
    const { billing_period_id, employee_id, attendance_date, overtime_hours } = body;

    try {
        // Get OT config
        const config = db.query(`
            SELECT * FROM project_overtime_config
            WHERE project_id = ?
        `).get(projectId) as any;

        // If OT not enabled, reject
        if (!config || !config.ot_enabled) {
            return c.json({
                valid: false,
                error: "Overtime is not enabled for this project"
            });
        }

        // Validate daily limit
        if (overtime_hours > config.max_ot_hours_per_day) {
            return c.json({
                valid: false,
                error: `Overtime exceeds daily limit of ${config.max_ot_hours_per_day} hours`
            });
        }

        // Get current period OT total for employee
        const periodTotal = db.query(`
            SELECT SUM(overtime_hours) as total
            FROM attendance_records
            WHERE billing_period_id = ? 
                AND employee_id = ?
                AND attendance_date != ?
        `).get(billing_period_id, employee_id, attendance_date) as any;

        const currentPeriodOT = periodTotal?.total || 0;
        const newTotal = currentPeriodOT + overtime_hours;

        // Validate period limit
        if (newTotal > config.max_ot_hours_per_period) {
            return c.json({
                valid: false,
                error: `Total overtime (${newTotal.toFixed(1)} hrs) would exceed period limit of ${config.max_ot_hours_per_period} hours`,
                current_period_ot: currentPeriodOT,
                max_allowed: config.max_ot_hours_per_period - currentPeriodOT
            });
        }

        return c.json({
            valid: true,
            current_period_ot: currentPeriodOT,
            new_total: newTotal,
            remaining: config.max_ot_hours_per_period - newTotal
        });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

export default overtimeConfig;
