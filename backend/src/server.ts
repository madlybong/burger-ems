import { Hono } from "hono";
import { serveStatic } from "hono/bun";

const app = new Hono();

import employees from "./api/employees";
import projects from "./api/projects";
import billing from "./api/billing";
import generate from "./api/generate";
import upload from "./api/upload";

// API Routes placeholder
app.get("/api/health", (c) => c.json({ status: "ok", version: "1.0.0" }));
app.route("/api/employees", employees);
app.route("/api/projects", projects);
app.route("/api/billing", billing);
app.route("/api/generate", generate);
app.route("/api/upload", upload);

// Serve frontend (to be built later)
app.use("/*", serveStatic({ root: "../frontend/dist" }));
app.get("*", serveStatic({ path: "../frontend/dist/index.html" }));

console.log("Server running on port 3000");

export default {
    port: 3000,
    fetch: app.fetch,
};
