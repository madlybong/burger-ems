import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from "fs";
import { join, relative, resolve } from "path";
import { $ } from "bun";

const ROOT = process.cwd();
const FRONTEND_DIR = ROOT; // Root since vite.config.ts is at root
const BACKEND_DIR = join(ROOT, "src", "server");
const DIST_DIR = join(ROOT, "release");
const OUT_FILE = join(BACKEND_DIR, "embedded_frontend.ts");

async function build() {
    console.log("Building Frontend...");
    await $`bun run build:ui`;

    console.log("Embedding Frontend Assets...");
    const distPath = join(ROOT, "dist");
    const files = getAllFiles(distPath);

    // Generate TS file with Map of path -> content
    // We'll use base64 for binary safety, though for text files string is fine.
    // To be safe and simple: store everything as Uint8Array or Base64 string.

    let code = `export const assets = new Map<string, Uint8Array>();\n`;

    for (const file of files) {
        const relPath = "/" + relative(distPath, file).replace(/\\/g, "/");
        const content = readFileSync(file);
        // We write as array of bytes to avoid huge string literals issues usually? 
        // Or just huge base64 strings.
        // Bun handles large strings okay.
        const b64 = content.toString("base64");
        code += `assets.set("${relPath}", Uint8Array.from(atob("${b64}"), c => c.charCodeAt(0)));\n`;
    }

    writeFileSync(OUT_FILE, code);
    console.log(`Embedded ${files.length} files into ${OUT_FILE}`);

    // Create server_build.ts if not exists (or overwrite)
    const buildServerPath = join(BACKEND_DIR, "server_build.ts");
    const serverCode = `
import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { assets } from "./embedded_frontend";
import { getMimeType } from "hono/utils/mime";
import employees from "./api/employees";
import projects from "./api/projects";
import billing from "./api/billing";
import generate from "./api/generate";
import upload from "./api/upload";
import db from "./db";

// Ensure DB tables exist (init) 
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
        const content = assets.get(path)!;
        const mime = getMimeType(path) || "application/octet-stream";
        c.header("Content-Type", mime);
        return c.body(content);
    }
    // SPA Fallback
    if (!path.startsWith("/api") && assets.has("/index.html")) {
         const content = assets.get("/index.html")!;
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
    `;
    writeFileSync(buildServerPath, serverCode);

    console.log("Compiling Single Executable...");
    if (!require("fs").existsSync(DIST_DIR)) mkdirSync(DIST_DIR);

    // Bun build
    await $`bun build --compile --minify --sourcemap src/server/server_build.ts --outfile release/astrake-ems`;

    console.log("Build Complete: release/astrake-ems.exe");
}

function getAllFiles(dir: string, fileList: string[] = []) {
    const files = readdirSync(dir);
    for (const file of files) {
        const filePath = join(dir, file);
        if (statSync(filePath).isDirectory()) {
            getAllFiles(filePath, fileList);
        } else {
            fileList.push(filePath);
        }
    }
    return fileList;
}

build().catch(console.error);
