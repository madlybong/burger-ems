import { Hono } from "hono";
import { read, utils } from "xlsx";
import db from "../db";

const upload = new Hono();

upload.post("/billing/:id/excel", async (c) => {
    const id = c.req.param("id");
    const body = await c.req.parseBody();
    const file = body['file'];

    if (file instanceof File) {
        const arrayBuffer = await file.arrayBuffer();
        const wb = read(arrayBuffer);
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = utils.sheet_to_json(ws);

        // Expect columns: "Name", "Days", "WageAmount" (or similar, map by UAN or Name)
        // Row-level processing
        let successCount = 0;
        const failedRows: { row: number; reason: string }[] = [];

        for (let i = 0; i < data.length; i++) {
            const row: any = data[i];
            const rowNum = i + 2; // +1 for 0-index, +1 for header
            let rowErrors: string[] = [];

            if (!row['Name'] || typeof row['Name'] !== 'string') {
                rowErrors.push("Missing or invalid 'Name'");
            }
            if (row['Days'] === undefined || typeof row['Days'] !== 'number') {
                rowErrors.push("Missing or invalid 'Days'");
            }
            if (row['WageAmount'] === undefined || typeof row['WageAmount'] !== 'number') {
                rowErrors.push("Missing or invalid 'WageAmount'");
            }

            if (rowErrors.length > 0) {
                failedRows.push({ row: rowNum, reason: rowErrors.join(", ") });
            } else {
                successCount++;
            }
        }

        // Stub: Log data
        console.log(`Upload processed: ${successCount} valid, ${failedRows.length} failed`);

        return c.json({
            success: true,
            imported_count: successCount,
            failed_count: failedRows.length,
            failed_rows: failedRows
        });
    }

    return c.json({ error: "No file uploaded" }, 400);
});

export default upload;
