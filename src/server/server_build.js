import { Hono } from "hono";
import { assets } from "./embedded_frontend";
import { getMimeType } from "hono/utils/mime";
import employees from "./api/employees";
import projects from "./api/projects";
import billing from "./api/billing";
import generate from "./api/generate";
import upload from "./api/upload";
// Ensure DB tables exist (init) 
// In compiled app, we might need to run migration check on startup
import { initDB } from "./db/init";
initDB();
const app = new Hono();
// API Routes
app.get("/api/health", (c) => c.json({ status: "ok", version: "1.0.0" }));
app.route("/api/employees", employees);
app.route("/api/projects", projects);
app.route("/api/billing", billing);
app.route("/api/generate", generate);
app.route("/api/upload", upload);
// Serve Embedded Frontend
app.use("*", async (c, next) => {
    const path = c.req.path === "/" ? "/index.html" : c.req.path;
    if (assets.has(path)) {
        const content = assets.get(path);
        const mime = getMimeType(path) || "application/octet-stream";
        c.header("Content-Type", mime);
        return c.body(content);
    }
    // SPA Fallback
    if (!path.startsWith("/api") && assets.has("/index.html")) {
        const content = assets.get("/index.html");
        c.header("Content-Type", "text/html");
        return c.body(content);
    }
    await next();
});
console.log("Astrake EMS running on port 3000");
export default {
    port: 3000,
    fetch: app.fetch
};
