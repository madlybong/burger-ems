import { Database } from "bun:sqlite";
import { join } from "path";

// Connect to DB directly for seeding
const dbPath = join(process.cwd(), "data", "app.db");
const db = new Database(dbPath);

console.log(`Seeding database at ${dbPath}...`);

// Ensure tables exist? We should probably import the init script, 
// but sticking to raw SQL or relying on init is better. 
// Let's assume we run init first or do it here.
// Safest is to run the init logic here or call it.

// Let's just run the create statements again to be safe (IF NOT EXISTS handles it)
// actually, better to use the backend/src/db/init.ts logic if possible, 
// but loading that might fail due to path resolution of "data/app.db" inside it relative to CWD.
// The backend code used "../data/app.db".
// If we run `bun scripts/seed.ts` from root, relative paths inside backend/src/db/index.ts might be tricky 
// unless we are careful.
// Let's just duplicate the create table logic or trust the user initializes via backend.
// Actually, strict requirement: "Seed default company: NRD Global".

// I will replicate the Create Table logic briefly to ensure independence, or call the init script if I update the path handling.
// Let's just use raw SQL here for simplicity and robustness in a script.

const queries = [
    `CREATE TABLE IF NOT EXISTS companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL
  );`,
    // ... (other tables if needed for foreign keys, but we only seed Company and maybe minimal data)
];

queries.forEach(q => db.run(q));

// Seed Company
const companyName = "NRD Global";
const existing = db.query("SELECT * FROM companies WHERE name = ?").get(companyName);

if (!existing) {
    db.run("INSERT INTO companies (name) VALUES (?)", [companyName]);
    console.log(`Seeded company: ${companyName}`);
} else {
    console.log(`Company ${companyName} already exists.`);
}

console.log("Seeding complete.");
