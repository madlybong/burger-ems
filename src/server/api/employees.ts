import { Hono } from "hono";
import db from "../db";

const employees = new Hono();

// List all active employees
employees.get("/", (c) => {
    // For Phase 1, we assume getting all active employees
    // Optionally filter by company_id if provided query param, else default to all (or specific company 1)
    const query = db.query("SELECT * FROM employees WHERE active = 1 ORDER BY name ASC");
    return c.json(query.all());
});

// Create Employee
employees.post("/", async (c) => {
    const body = await c.req.json();
    const { company_id, name, skill_type, daily_wage, uan, pf_applicable, esi_applicable, gp_number } = body;

    // Validation
    if (!company_id || typeof company_id !== 'number') return c.json({ error: "Invalid or missing company_id" }, 400);
    if (!name || typeof name !== 'string') return c.json({ error: "Invalid or missing name" }, 400);
    if (!daily_wage || typeof daily_wage !== 'number') return c.json({ error: "Invalid or missing daily_wage" }, 400);

    const validSkills = ['unskilled', 'skilled', 'supervisor', 'engineer'];
    if (!skill_type || !validSkills.includes(skill_type)) {
        return c.json({ error: `Invalid skill_type. Must be one of: ${validSkills.join(', ')}` }, 400);
    }

    const stmt = db.prepare(`
    INSERT INTO employees (company_id, name, skill_type, daily_wage, uan, pf_applicable, esi_applicable, gp_number)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

    try {
        const info = stmt.run(company_id, name, skill_type, daily_wage, uan, pf_applicable ? 1 : 0, esi_applicable ? 1 : 0, gp_number);
        const id = info.lastInsertRowid;

        // Auto-generate credentials
        const { generateStrongPassword } = await import("../utils/password");
        const initialPassword = generateStrongPassword();
        const hash = await Bun.password.hash(initialPassword);

        db.run(
            "UPDATE employees SET username = 'EMP' || id, password_hash = ?, is_first_login = 1 WHERE id = ?",
            [hash, id.toString()]
        );

        return c.json({ id, ...body, username: 'EMP' + id, initial_password: initialPassword }, 201);
    } catch (err: any) {
        return c.json({ error: err.message }, 400);
    }
});

// Update Employee
employees.put("/:id", async (c) => {
    const id = c.req.param("id");
    const body = await c.req.json();
    const { name, skill_type, daily_wage, uan, pf_applicable, esi_applicable, gp_number } = body;

    // Validation
    if (!name || typeof name !== 'string') return c.json({ error: "Invalid or missing name" }, 400);
    if (!daily_wage || typeof daily_wage !== 'number') return c.json({ error: "Invalid or missing daily_wage" }, 400);

    const validSkills = ['unskilled', 'skilled', 'supervisor', 'engineer'];
    if (!skill_type || !validSkills.includes(skill_type)) {
        return c.json({ error: `Invalid skill_type. Must be one of: ${validSkills.join(', ')}` }, 400);
    }

    const stmt = db.prepare(`
    UPDATE employees 
    SET name = ?, skill_type = ?, daily_wage = ?, uan = ?, pf_applicable = ?, esi_applicable = ?, gp_number = ?
    WHERE id = ?
  `);

    try {
        stmt.run(name, skill_type, daily_wage, uan, pf_applicable ? 1 : 0, esi_applicable ? 1 : 0, gp_number, id);
        return c.json({ id, ...body });
    } catch (err: any) {
        return c.json({ error: err.message }, 400);
    }
});

// Delete Employee (Soft)
employees.delete("/:id", (c) => {
    const id = c.req.param("id");
    db.run("UPDATE employees SET active = 0 WHERE id = ?", [id]);
    return c.json({ success: true });
});

// Reset Password
employees.post("/:id/reset-password", async (c) => {
    const id = c.req.param("id");
    const { generateStrongPassword } = await import("../utils/password");
    const newPassword = generateStrongPassword();
    const hash = await Bun.password.hash(newPassword);

    db.run("UPDATE employees SET password_hash = ?, is_first_login = 1 WHERE id = ?", [hash, id]);

    return c.json({ success: true, new_password: newPassword });
});

export default employees;
