import { Hono } from "hono";
import db from "../db";
const projects = new Hono();
// List all active projects
projects.get("/", (c) => {
    // Ordered by latest start_date
    const query = db.query("SELECT * FROM projects ORDER BY start_date DESC");
    return c.json(query.all());
});
// Create Project
projects.post("/", async (c) => {
    const body = await c.req.json();
    const { company_id, client_name, site_name, work_order_no, start_date, end_date, status } = body;
    const stmt = db.prepare(`
    INSERT INTO projects (company_id, client_name, site_name, work_order_no, start_date, end_date, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
    try {
        const info = stmt.run(company_id, client_name, site_name, work_order_no, start_date, end_date, status || 'active');
        return c.json({ id: info.lastInsertRowid, ...body }, 201);
    }
    catch (err) {
        return c.json({ error: err.message }, 400);
    }
});
// Update Project
projects.put("/:id", async (c) => {
    const id = c.req.param("id");
    const body = await c.req.json();
    const { client_name, site_name, work_order_no, start_date, end_date, status } = body;
    const stmt = db.prepare(`
    UPDATE projects 
    SET client_name = ?, site_name = ?, work_order_no = ?, start_date = ?, end_date = ?, status = ?
    WHERE id = ?
  `);
    try {
        stmt.run(client_name, site_name, work_order_no, start_date, end_date, status, id);
        return c.json({ id, ...body });
    }
    catch (err) {
        return c.json({ error: err.message }, 400);
    }
});
// Delete Project (Hard delete only if no billing periods, else maybe status=archived? Phase 1 simple delete logic usually implies check FK or catch error)
projects.delete("/:id", (c) => {
    const id = c.req.param("id");
    try {
        db.run("DELETE FROM projects WHERE id = ?", [id]);
        return c.json({ success: true });
    }
    catch (err) {
        return c.json({ error: "Cannot delete project with existing billing periods" }, 400);
    }
});
export default projects;
