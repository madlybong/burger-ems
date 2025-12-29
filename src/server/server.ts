import { Hono } from "hono";
import { serveStatic } from "hono/bun";

const app = new Hono();

// Imports are relative to current file.
// Old structure: backend/src/server.ts -> ./api/employees
// New structure: src/server/server.ts -> ./api/employees
// So imports should be fine. checking just in case.
// But verifying relative paths in `src/server/api/generate.ts` which used `../services/pdf` -> remains valid.
// `src/server/db/init.ts` -> valid.
import employees from "./api/employees";
import projects from "./api/projects";
import billing from "./api/billing";
import generate from "./api/generate";
import upload from "./api/upload";
import auth from "./api/auth";
import portal from "./api/portal";
import statutory from "./api/statutory";
import statutoryComputation from "./api/statutory-computation";
import statutoryOverrides from "./api/statutory-overrides";
import { initDB } from "./db/init";

// Initialize database (run migrations)
initDB();

// API Routes placeholder
app.get("/api/health", (c) => c.json({ status: "ok", version: "1.0.0" }));
app.route("/api/employees", employees);
app.route("/api/projects", projects);
app.route("/api/billing", billing);
app.route("/api/generate", generate);
app.route("/api/upload", upload);
app.route("/api/auth", auth);
app.route("/api/portal", portal);
app.route("/api/statutory", statutory);
app.route("/api/statutory-computation", statutoryComputation);
app.route("/api/statutory-overrides", statutoryOverrides);

// Serve frontend (to be built later)
app.use("/*", serveStatic({ root: "./dist" }));
app.get("*", serveStatic({ path: "./dist/index.html" }));

console.log("Server running on port 3000");

export default {
    port: 3000,
    fetch: app.fetch,
};
