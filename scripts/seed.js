import { join } from "path";
// Import db instance from the server module to check it, 
// though for the script we might want a direct connection or just reuse the code.
// The previous attempt tried to import 'db' from src/server/db/index.
// Let's stick to the pattern: import the setup, but careful with relative paths.
import db from "../src/server/db/index";
// Force foreign keys
db.run("PRAGMA foreign_keys = ON;");
const dbPath = join(process.cwd(), "data", "app.db");
console.log(`Seeding database at ${dbPath}...`);
// Insert default company if not exists
const company = db.query("SELECT * FROM companies WHERE name = ?").get("NRD Global");
if (!company) {
    console.log("Creating default company: NRD Global");
    db.run("INSERT INTO companies (name) VALUES (?)", ["NRD Global"]);
}
else {
    console.log("Default company already exists.");
}
console.log("Seed complete.");
