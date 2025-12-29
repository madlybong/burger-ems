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

  db.run(`
    CREATE TABLE IF NOT EXISTS billing_period_statutory_computation (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      billing_period_id INTEGER NOT NULL,
      config_snapshot TEXT NOT NULL,
      computed_at TEXT DEFAULT CURRENT_TIMESTAMP,
      locked BOOLEAN DEFAULT 0,
      total_gross_wages REAL NOT NULL DEFAULT 0,
      total_pf_employee REAL NOT NULL DEFAULT 0,
      total_pf_employer REAL NOT NULL DEFAULT 0,
      total_esi_employee REAL NOT NULL DEFAULT 0,
      total_esi_employer REAL NOT NULL DEFAULT 0,
      total_employee_deductions REAL NOT NULL DEFAULT 0,
      total_employer_contributions REAL NOT NULL DEFAULT 0,
      total_net_payable REAL NOT NULL DEFAULT 0,
      FOREIGN KEY(billing_period_id) REFERENCES billing_periods(id),
      UNIQUE(billing_period_id)
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS billing_employee_statutory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      computation_id INTEGER NOT NULL,
      employee_id INTEGER NOT NULL,
      gross_wage REAL NOT NULL DEFAULT 0,
      basic_wage REAL NOT NULL DEFAULT 0,
      custom_wage REAL NOT NULL DEFAULT 0,
      pf_applicable BOOLEAN DEFAULT 0,
      pf_wage_basis REAL NOT NULL DEFAULT 0,
      pf_wage_capped REAL NOT NULL DEFAULT 0,
      pf_employee_amount REAL NOT NULL DEFAULT 0,
      pf_employer_amount REAL NOT NULL DEFAULT 0,
      pf_total_amount REAL NOT NULL DEFAULT 0,
      pf_explanation TEXT,
      esi_applicable BOOLEAN DEFAULT 0,
      esi_wage_basis REAL NOT NULL DEFAULT 0,
      esi_employee_amount REAL NOT NULL DEFAULT 0,
      esi_employer_amount REAL NOT NULL DEFAULT 0,
      esi_total_amount REAL NOT NULL DEFAULT 0,
      esi_explanation TEXT,
      total_employee_deduction REAL NOT NULL DEFAULT 0,
      total_employer_contribution REAL NOT NULL DEFAULT 0,
      net_payable REAL NOT NULL DEFAULT 0,
      FOREIGN KEY(computation_id) REFERENCES billing_period_statutory_computation(id) ON DELETE CASCADE,
      FOREIGN KEY(employee_id) REFERENCES employees(id),
      UNIQUE(computation_id, employee_id)
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS statutory_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL,
      pf_enabled BOOLEAN DEFAULT 1,
      pf_wage_basis TEXT DEFAULT 'gross' CHECK(pf_wage_basis IN ('gross', 'basic', 'custom')),
      pf_employee_rate REAL DEFAULT 12.0,
      pf_employer_rate REAL DEFAULT 12.0,
      pf_wage_ceiling REAL DEFAULT 15000.0,
      pf_enforce_ceiling BOOLEAN DEFAULT 1,
      esi_enabled BOOLEAN DEFAULT 1,
      esi_threshold REAL DEFAULT 21000.0,
      esi_employee_rate REAL DEFAULT 0.75,
      esi_employer_rate REAL DEFAULT 3.25,
      rounding_mode TEXT DEFAULT 'round' CHECK(rounding_mode IN ('round', 'floor', 'ceil')),
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(company_id) REFERENCES companies(id),
      UNIQUE(company_id)
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS statutory_overrides (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_statutory_id INTEGER NOT NULL,
      field_name TEXT NOT NULL CHECK(field_name IN ('pf_employee_amount', 'pf_employer_amount', 'esi_employee_amount', 'esi_employer_amount')),
      original_value REAL NOT NULL,
      override_value REAL NOT NULL,
      reason TEXT NOT NULL,
      overridden_by TEXT DEFAULT 'admin',
      overridden_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(employee_statutory_id) REFERENCES billing_employee_statutory(id) ON DELETE CASCADE
    );
  `);

  console.log("Database initialized successfully.");

  // MIGRATIONS
  // Check for new columns in employees
  const empInfo = db.query("PRAGMA table_info(employees)").all() as any[];

  if (!empInfo.some(c => c.name === 'password_hash')) {
    console.log("Migrating: Adding password_hash and is_first_login to employees");
    db.run("ALTER TABLE employees ADD COLUMN password_hash TEXT");
    db.run("ALTER TABLE employees ADD COLUMN is_first_login BOOLEAN DEFAULT 1");
  }

  if (!empInfo.some(c => c.name === 'username')) {
    console.log("Migrating: Adding username to employees");
    db.run("ALTER TABLE employees ADD COLUMN username TEXT");
    // Unique constraint via index or just trust app logic for legacy migration? 
    // SQLite ADD COLUMN with UNIQUE is tricky if data exists.
    // We settle for creating text column, populating it, then creating unique index.
    db.run("UPDATE employees SET username = 'EMP' || id WHERE username IS NULL");
    db.run("CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_username ON employees(username)");
  }

  // Ensure all companies have statutory config
  const companies = db.query("SELECT id FROM companies").all() as any[];
  for (const company of companies) {
    const existing = db.query("SELECT id FROM statutory_config WHERE company_id = ?").get(company.id);
    if (!existing) {
      console.log(`Migrating: Creating default statutory config for company ${company.id}`);
      db.run(`
        INSERT INTO statutory_config (
          company_id, pf_enabled, pf_wage_basis, pf_employee_rate, pf_employer_rate,
          pf_wage_ceiling, pf_enforce_ceiling, esi_enabled, esi_threshold,
          esi_employee_rate, esi_employer_rate, rounding_mode
        ) VALUES (?, 1, 'gross', 12.0, 12.0, 15000.0, 1, 1, 21000.0, 0.75, 3.25, 'round')
      `, [company.id]);
    }
  }

  // Add status and finalized_at to billing_periods if not exists
  const billingInfo = db.query("PRAGMA table_info(billing_periods)").all() as any[];

  if (!billingInfo.some(c => c.name === 'status')) {
    console.log("Migrating: Adding status and finalized_at to billing_periods");
    db.run("ALTER TABLE billing_periods ADD COLUMN status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'finalized'))");
    db.run("ALTER TABLE billing_periods ADD COLUMN finalized_at TEXT");
  }
}

// Auto-run if executed directly
if (import.meta.main) {
  initDB();
}
