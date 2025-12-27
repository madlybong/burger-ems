# Astrake EMS (Employee Management System)

## Project Identity
**Astrake EMS** is a professional, local-first operational system designed for Indian public-sector contractor companies. It focuses on generating compliance and billing documents efficiently.

## Target Audience
Indian public-sector contractors working with organizations like SAIL, IOCL, and other PSUs.

## Phase-1 Scope
- **Single Company Support**: Default seeded with 'NRD Global'.
- **Core Modules**: Employees, Projects (Work Orders), Billing Periods.
- **Attendance & Wages**: Editable table UI, Excel upload support.
- **Document Generation**: Automated PDF generation for Attendance Summary, Wage Disbursement, and GP Declaration.
- **Offline Capable**: Local SQLite database, single executable distribution.

## Intentionally Missing (Phase-2)
- PF / ESI Logic (Fields exist, calculations manual for now).
- Authentication (Single user system).
- Accounting / GST Integration.
- Multi-company UI.

## How to Run Locally

### Prerequisites
- [Bun](https://bun.sh/) (Runtime & Package Manager)

### Development
1. **Install Dependencies**:
   ```bash
   cd backend && bun install
   cd ../frontend && bun install
   ```
2. **Setup Database**:
   ```bash
   bun run scripts/seed.ts
   ```
3. **Run Backend** (Port 3000):
   ```bash
   cd backend && bun dev
   ```
4. **Run Frontend** (Port 5173 - proxies to backend):
   ```bash
   cd frontend && bun dev
   ```

## How to Build Executable
This project compiles into a single executable file containing both the backend and the embedded frontend.

```bash
bun run scripts/build.ts
```
Output will be in `dist/astrake-ems.exe`.

## License
Proprietary / Private Use.
