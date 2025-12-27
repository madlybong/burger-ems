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
    }
    else {
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
    const stmt = db.prepare(`
    INSERT INTO billing_periods (project_id, from_date, to_date, label)
    VALUES (?, ?, ?, ?)
  `);
    try {
        const info = stmt.run(project_id, from_date, to_date, label);
        return c.json({ id: info.lastInsertRowid, ...body }, 201);
    }
    catch (err) {
        return c.json({ error: err.message }, 400);
    }
});
// Get Single Billing Period Details (including employees)
billing.get("/:id", (c) => {
    const id = c.req.param("id");
    const period = db.query("SELECT * FROM billing_periods WHERE id = ?").get(id);
    if (!period)
        return c.json({ error: "Not found" }, 404);
    const project = db.query("SELECT * FROM projects WHERE id = ?").get(period.project_id);
    // Get assigned employees + their attendance/wages
    const employees = db.query(`
    SELECT e.id, e.name, e.skill_type, e.daily_wage, e.uan, e.gp_number,
           be.days_worked, be.wage_amount
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
    const stmt = db.prepare("UPDATE billing_periods SET from_date = ?, to_date = ?, label = ? WHERE id = ?");
    stmt.run(from_date, to_date, label, id);
    return c.json({ id, ...body });
});
// Assign / Update Employee in Billing Period (Attendance Entry)
billing.post("/:id/employees", async (c) => {
    const id = c.req.param("id"); // billing_period_id
    const body = await c.req.json();
    const { employee_id, days_worked, wage_amount } = body; // single or array? Stick to single for simplicity or loop
    // Upsert
    const stmt = db.prepare(`
    INSERT INTO billing_employees (billing_period_id, employee_id, days_worked, wage_amount)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(billing_period_id, employee_id) DO UPDATE SET
      days_worked = excluded.days_worked,
      wage_amount = excluded.wage_amount
  `);
    try {
        stmt.run(id, employee_id, days_worked, wage_amount);
        return c.json({ success: true });
    }
    catch (e) {
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
export default billing;
