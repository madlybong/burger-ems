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
    const stmt = db.prepare(`
    INSERT INTO employees (company_id, name, skill_type, daily_wage, uan, pf_applicable, esi_applicable, gp_number)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
    try {
        const info = stmt.run(company_id, name, skill_type, daily_wage, uan, pf_applicable ? 1 : 0, esi_applicable ? 1 : 0, gp_number);
        return c.json({ id: info.lastInsertRowid, ...body }, 201);
    }
    catch (err) {
        return c.json({ error: err.message }, 400);
    }
});
// Update Employee
employees.put("/:id", async (c) => {
    const id = c.req.param("id");
    const body = await c.req.json();
    const { name, skill_type, daily_wage, uan, pf_applicable, esi_applicable, gp_number } = body;
    const stmt = db.prepare(`
    UPDATE employees 
    SET name = ?, skill_type = ?, daily_wage = ?, uan = ?, pf_applicable = ?, esi_applicable = ?, gp_number = ?
    WHERE id = ?
  `);
    try {
        stmt.run(name, skill_type, daily_wage, uan, pf_applicable ? 1 : 0, esi_applicable ? 1 : 0, gp_number, id);
        return c.json({ id, ...body });
    }
    catch (err) {
        return c.json({ error: err.message }, 400);
    }
});
// Delete Employee (Soft)
employees.delete("/:id", (c) => {
    const id = c.req.param("id");
    db.run("UPDATE employees SET active = 0 WHERE id = ?", [id]);
    return c.json({ success: true });
});
export default employees;
