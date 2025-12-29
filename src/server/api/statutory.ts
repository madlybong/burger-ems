import { Hono } from "hono";
import db from "../db";

const statutory = new Hono();

// Get statutory configuration for a company (default: company_id = 1)
statutory.get("/", (c) => {
    const company_id = Number(c.req.query("company_id") || 1);

    const config = db.query(`
    SELECT * FROM statutory_config WHERE company_id = ?
  `).get(company_id) as any;

    if (!config) {
        return c.json({ error: "Configuration not found" }, 404);
    }

    // Convert SQLite booleans (0/1) to JavaScript booleans
    return c.json({
        ...config,
        pf_enabled: !!config.pf_enabled,
        pf_enforce_ceiling: !!config.pf_enforce_ceiling,
        esi_enabled: !!config.esi_enabled
    });
});

// Update statutory configuration (Admin only)
statutory.put("/", async (c) => {
    const body = await c.req.json();
    const company_id = Number(body.company_id || 1);

    // Validation
    const validWageBasis = ['gross', 'basic', 'custom'];
    if (body.pf_wage_basis && !validWageBasis.includes(body.pf_wage_basis)) {
        return c.json({ error: `Invalid pf_wage_basis. Must be one of: ${validWageBasis.join(', ')}` }, 400);
    }

    const validRoundingModes = ['round', 'floor', 'ceil'];
    if (body.rounding_mode && !validRoundingModes.includes(body.rounding_mode)) {
        return c.json({ error: `Invalid rounding_mode. Must be one of: ${validRoundingModes.join(', ')}` }, 400);
    }

    // Validate rates are positive numbers
    const numericFields = [
        'pf_employee_rate', 'pf_employer_rate', 'pf_wage_ceiling',
        'esi_threshold', 'esi_employee_rate', 'esi_employer_rate'
    ];

    for (const field of numericFields) {
        if (body[field] !== undefined && (typeof body[field] !== 'number' || body[field] < 0)) {
            return c.json({ error: `${field} must be a positive number` }, 400);
        }
    }

    try {
        // Check if config exists
        const existing = db.query("SELECT id FROM statutory_config WHERE company_id = ?").get(company_id);

        if (existing) {
            // Update existing config
            db.run(`
        UPDATE statutory_config SET
          pf_enabled = ?,
          pf_wage_basis = ?,
          pf_employee_rate = ?,
          pf_employer_rate = ?,
          pf_wage_ceiling = ?,
          pf_enforce_ceiling = ?,
          esi_enabled = ?,
          esi_threshold = ?,
          esi_employee_rate = ?,
          esi_employer_rate = ?,
          rounding_mode = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE company_id = ?
      `, [
                body.pf_enabled ? 1 : 0,
                body.pf_wage_basis || 'gross',
                body.pf_employee_rate ?? 12.0,
                body.pf_employer_rate ?? 12.0,
                body.pf_wage_ceiling ?? 15000.0,
                body.pf_enforce_ceiling ? 1 : 0,
                body.esi_enabled ? 1 : 0,
                body.esi_threshold ?? 21000.0,
                body.esi_employee_rate ?? 0.75,
                body.esi_employer_rate ?? 3.25,
                body.rounding_mode || 'round',
                company_id
            ]);
        } else {
            // Insert new config
            db.run(`
        INSERT INTO statutory_config (
          company_id, pf_enabled, pf_wage_basis, pf_employee_rate, pf_employer_rate,
          pf_wage_ceiling, pf_enforce_ceiling, esi_enabled, esi_threshold,
          esi_employee_rate, esi_employer_rate, rounding_mode
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
                company_id,
                body.pf_enabled ? 1 : 0,
                body.pf_wage_basis || 'gross',
                body.pf_employee_rate ?? 12.0,
                body.pf_employer_rate ?? 12.0,
                body.pf_wage_ceiling ?? 15000.0,
                body.pf_enforce_ceiling ? 1 : 0,
                body.esi_enabled ? 1 : 0,
                body.esi_threshold ?? 21000.0,
                body.esi_employee_rate ?? 0.75,
                body.esi_employer_rate ?? 3.25,
                body.rounding_mode || 'round'
            ]);
        }

        // Return updated config
        const updated = db.query("SELECT * FROM statutory_config WHERE company_id = ?").get(company_id) as any;
        return c.json({
            ...updated,
            pf_enabled: !!updated.pf_enabled,
            pf_enforce_ceiling: !!updated.pf_enforce_ceiling,
            esi_enabled: !!updated.esi_enabled
        });
    } catch (err: any) {
        return c.json({ error: err.message }, 400);
    }
});

export default statutory;
