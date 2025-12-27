import db from "./index";

export function initDB() {
  console.log("Initializing database...");

  db.run(`
    CREATE TABLE IF NOT EXISTS schema_info (
      version INTEGER NOT NULL
    );
  `);

  // Ensure version exists (minimal: insert ignore or check count)
  const hasVersion = db.query("SELECT COUNT(*) as count FROM schema_info").get() as any;
  if (hasVersion.count === 0) {
    db.run("INSERT INTO schema_info (version) VALUES (1)");
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      skill_type TEXT NOT NULL CHECK(skill_type IN ('unskilled', 'skilled', 'supervisor', 'engineer')),
      daily_wage REAL NOT NULL,
      uan TEXT,
      pf_applicable BOOLEAN DEFAULT 0,
      esi_applicable BOOLEAN DEFAULT 0,
      gp_number TEXT,
      active BOOLEAN DEFAULT 1,
      FOREIGN KEY(company_id) REFERENCES companies(id)
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL,
      client_name TEXT NOT NULL,
      site_name TEXT NOT NULL,
      work_order_no TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      FOREIGN KEY(company_id) REFERENCES companies(id)
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS billing_periods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      from_date TEXT NOT NULL,
      to_date TEXT NOT NULL,
      label TEXT,
      FOREIGN KEY(project_id) REFERENCES projects(id)
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS billing_employees (
      billing_period_id INTEGER NOT NULL,
      employee_id INTEGER NOT NULL,
      days_worked REAL NOT NULL DEFAULT 0,
      wage_amount REAL NOT NULL DEFAULT 0,
      PRIMARY KEY (billing_period_id, employee_id),
      FOREIGN KEY(billing_period_id) REFERENCES billing_periods(id),
      FOREIGN KEY(employee_id) REFERENCES employees(id)
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS generated_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      billing_period_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('attendance', 'wage_declaration', 'gp_declaration')),
      file_path TEXT NOT NULL,
      generated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(billing_period_id) REFERENCES billing_periods(id)
    );
  `);

  console.log("Database initialized successfully.");
}

// Auto-run if executed directly
if (import.meta.main) {
  initDB();
}
