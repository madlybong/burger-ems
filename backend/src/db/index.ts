import { Database } from "bun:sqlite";

const db = new Database("../data/app.db", { create: true });

// Enable foreign keys
db.run("PRAGMA foreign_keys = ON;");

export default db;
