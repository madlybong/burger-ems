import { Database } from "bun:sqlite";
import { join } from "path";
import { mkdirSync, existsSync } from "fs";

const DATA_DIR = join(process.cwd(), "data");
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(join(DATA_DIR, "app.db"), { create: true });

// Enable foreign keys
db.run("PRAGMA foreign_keys = ON;");

export default db;
