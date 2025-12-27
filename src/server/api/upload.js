import { Hono } from "hono";
import { read, utils } from "xlsx";
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
        // This is a rough implementation. Ideally we need strict mapping.
        // For MVP, let's assume columns map to our logic or just stub it.
        // Stub: Log data
        console.log("Uploaded Data:", data.length, "rows");
        return c.json({ success: true, message: `Parsed ${data.length} rows (Mock processing)` });
    }
    return c.json({ error: "No file uploaded" }, 400);
});
export default upload;
