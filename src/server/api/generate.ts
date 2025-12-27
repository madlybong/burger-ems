import { Hono } from "hono";
import { join } from "path";
import { generatePDF } from "../services/pdf";
import { attendanceSummary, wageDeclaration } from "../templates";
import db from "../db";
import { writeFileSync, existsSync, mkdirSync } from "fs";

const generate = new Hono();

const OUT_DIR = join(process.cwd(), "data", "generated");
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

generate.post("/billing/:id/:type", async (c) => {
    const billingPeriodId = c.req.param("id");
    const type = c.req.param("type"); // attendance | wage | gp

    // Fetch Data
    const period = db.query("SELECT * FROM billing_periods WHERE id = ?").get(billingPeriodId) as any;
    if (!period) return c.json({ error: "Billing Period not found" }, 404);

    const project = db.query("SELECT * FROM projects WHERE id = ?").get(period.project_id) as any;
    const company = db.query("SELECT * FROM companies WHERE id = ?").get(project.company_id) as any;

    const rows = db.query(`
        SELECT e.*, be.days_worked, be.wage_amount
        FROM billing_employees be
        JOIN employees e ON be.employee_id = e.id
        WHERE be.billing_period_id = ?
    `).all(billingPeriodId);

    // Select Template
    let html = "";
    let filename = "";
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

    if (type === "attendance") {
        html = attendanceSummary({ company, project, period, rows });
        filename = `Attendance_${project.site_name}_${period.from_date}_to_${period.to_date}_${timestamp}.pdf`;
    } else if (type === "wage") {
        html = wageDeclaration({ company, project, period, rows });
        filename = `WageDeclaration_${project.site_name}_${period.from_date}_to_${period.to_date}_${timestamp}.pdf`;
    } else {
        return c.json({ error: "Unknown document type" }, 400);
    }

    try {
        const pdfBuffer = await generatePDF(html);
        const filePath = join(OUT_DIR, filename);
        writeFileSync(filePath, pdfBuffer);

        // Record in DB
        // Map "wage" -> "wage_declaration" for DB constraint
        const dbType = type === "wage" ? "wage_declaration" : type;

        db.run("INSERT INTO generated_documents (billing_period_id, type, file_path) VALUES (?, ?, ?)",
            [billingPeriodId, dbType, filename]);

        // Return download URL or just success and let frontend request download
        // We'll return the filename.
        return c.json({ success: true, filename });
    } catch (e: any) {
        console.error(e);
        return c.json({ error: e.message }, 500);
    }
});

// ZIP Generation (Placeholder for Phase 1 - individual downloads first)
// ...

// Download
generate.get("/download/:filename", async (c) => {
    const filename = c.req.param("filename");
    const path = join(OUT_DIR, filename);
    if (!existsSync(path)) return c.json({ error: "File not found" }, 404);

    // Serve file
    const file = Bun.file(path);
    return new Response(file);
});

export default generate;
