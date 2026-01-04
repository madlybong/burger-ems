# Astrake EMS (Employee Management System)

**Version:** 0.1.0

## Project Identity
**Astrake EMS** is a professional, local-first operational system designed for Indian public-sector contractor companies. It focuses on generating compliance and billing documents efficiently with secure multi-user access.

## Target Audience
Indian public-sector contractors working with organizations like SAIL, IOCL, and other PSUs.

## Key Features (v0.1.5)
- **Multi-Role Authentication**: Secure JWT-based authentication with Admin and Employee roles
- **Employee Management**: Complete CRUD with auto-generated secure credentials and password reset
- **Attendance Workspace**: Calendar-based attendance tracking, holiday management, and virtualized lists for performance.
- **Statutory Compliance**: Automated PF/ESI calculation engine with 2024 Indian norms.
- **Overtime Management**: Configurable OT limits, rates, and approval workflow.
- **Document Generation**: Automated PDF generation for Attendance Summary, Wage Disbursement, and GP Declaration
- **Offline Capable**: Local SQLite database, single executable distribution
- **Strong Security**: Password hashing, role-based access control, and first-time password change enforcement

## Phase-1 Scope (Completed)
- **Single Company Support**: Default seeded with 'NRD Global'
- **Core Modules**: Employees, Projects (Work Orders), Billing Periods
- **Attendance**: Calendar view with status cycle (Full/Half/Absent/WeekOff).
- **Statutory**: PF/ESI computation engine with overrides.
- **Security**: Admin and Employee portals with role-based access.
- **Documentation**: Comprehensive Developer and User guides (`docs/`).

## Upcoming (Phase-2)
- Multi-company UI
- Accounting / GST Integration
- Advanced reporting and analytics
- Mobile App (Native)

## How to Run Locally

### Prerequisites
- [Bun](https://bun.sh/) v1.0+ (Runtime & Package Manager)

### Development
1. **Install Dependencies**:
   ```bash
   bun install
   ```

2. **Setup Database** (First time only):
   ```bash
   bun run scripts/seed.ts
   ```

3. **Run Development Server** (Concurrent backend + frontend):
   ```bash
   bun run dev
   ```
   - Backend: `http://localhost:3000`
   - Frontend: `http://localhost:5173` (proxies API to backend)

4. **Default Login Credentials**:
   - **Admin**: `admin` / `admin123`
   - **Employee**: `EMP1` / (use reset_demo.ts to set password)

### Testing Employee Portal
```bash
bun run reset_demo.ts
```
This resets EMP1 password to a known value for testing. Check console output for credentials.

## How to Build Executable
This project compiles into a single executable file containing both the backend and the embedded frontend.

```bash
bun run release
```
Output will be in `release/astrake-ems-{version}-{platform}.exe`.

## Project Structure
```
astrake-ems/
├── src/
│   ├── server/          # Hono backend (API, DB, PDF generation)
│   │   ├── api/         # API routes
│   │   ├── db/          # Database schema and migrations
│   │   └── utils/       # Utilities (password, PDF generation)
│   └── ui/              # Vue 3 + Vuetify frontend
│       ├── pages/       # Page components
│       ├── stores/      # Pinia state management
│       └── router/      # Vue Router configuration
├── scripts/             # Build and seed scripts
├── data/                # SQLite database (auto-created)
└── dist/                # Build output
```

## Technology Stack
- **Backend**: Bun + Hono + SQLite
- **Frontend**: Vue 3 + Vuetify 3 + Pinia + Vue Router
- **Build**: Vite + TypeScript
- **Security**: JWT + bcrypt-compatible password hashing

## License
Proprietary / Private Use.
