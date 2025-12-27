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

    // Validation
    if (!from_date || typeof from_date !== 'string') return c.json({ error: "Invalid or missing from_date" }, 400);
    if (!to_date || typeof to_date !== 'string') return c.json({ error: "Invalid or missing to_date" }, 400);

    const stmt = db.prepare("UPDATE billing_periods SET from_date = ?, to_date = ?, label = ? WHERE id = ?");
    stmt.run(from_date, to_date, label, id);
    return c.json({ id, ...body });
});

// Assign / Update Employee in Billing Period (Attendance Entry)
billing.post("/:id/employees", async (c) => {
    const id = c.req.param("id"); // billing_period_id
    const body = await c.req.json();
    const { employee_id, days_worked, wage_amount } = body; // single or array? Stick to single for simplicity or loop

    // Validation
    if (!employee_id || typeof employee_id !== 'number') return c.json({ error: "Invalid or missing employee_id" }, 400);
    if (typeof days_worked !== 'number') return c.json({ error: "Invalid or missing days_worked" }, 400);
    if (typeof wage_amount !== 'number') return c.json({ error: "Invalid or missing wage_amount" }, 400);

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

export default billing;
