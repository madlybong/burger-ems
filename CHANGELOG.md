# Changelog

All notable changes to this project will be documented in this file.

## [0.1.5] - 2026-01-04

### Added - Robustness & Performance
- **Data Integrity**: Implemented "Week Off" toggle cycle and rigorous backend validation for date ranges.
- **Performance**: Added virtual scrolling for employee lists (handles 100+ items smoothly) and debounced search inputs.
- **Error Handling**: Comprehensive global error boundary, network retry logic with exponential backoff, and user-friendly error alerts.
- **Documentation**: New Developer Guide and User Guide for the Attendance Workspace.

### Fixed
- **Critical**: Prevented creation of billing periods where `End Date` < `Start Date`.
- **UI**: Fixed sticky header layout issues and mobile responsiveness.
- **Type Safety**: Resolved all TypeScript errors in the UI codebase.

## [0.1.4] - 2026-01-04

### Fixed - Attendance & UI Polish
- **Attendance Data Integrity**: Fixed issue where orphan attendance records persisted after deleting an employee from a billing period.
- **Attendance Counts**: Resolved discrepancy between attendance summary count and actual calendar days.
- **Week Off Toggle**: Fixed bug preventing "Week Off" status from being applied correctly.
- **Header Layout**: Restored visibility of Attendance Header and improved spacing/layout.
- **Search Experience**: Unified search bar in the header, removed duplicate input in sidebar, and fixed filtering logic.
- **Autocomplete**: Disabled browser autocomplete on search and overtime inputs for cleaner UI.
- **UI Bleed**: Fixed calendar grid bleeding into left navigation.
- **Scrollbars**: Fixed double scrollbars by enforcing strict viewport height on workspace.

## [0.1.3] - 2026-01-03

### Added - Attendance Engine Refactor (Phase 2.3)

#### Attendance Workspace
- **Calendar-Based Workflow**: New full-screen workspace for day-by-day attendance tracking.
- **Dedicated Route**: `/billing/:id/attendance` with efficient calendar grid interface.
- **Smart Status Toggles**: One-click cycle through Full, Half, and Absent statuses.
- **Real-Time Calculation**: Employee days and wages update instantly upon changes.
- **Mobile Optimization**: Responsive accordion view with touch-friendly controls.
- **Quick Actions**: "Mark All Full" and "Clear" buttons for bulk updates on mobile.
- **Visual Locking**: Clear indicators when periods are finalized (read-only mode).

#### Overtime Management
- **Project-Level Configuration**: Define OT rules (rate, caps, rounding) per project.
- **Daily & Period Limits**: Strict validation prevents OT exceeding daily or period caps.
- **Integrated Entry**: Record overtime hours directly within the attendance calendar.
- **Validation Feedback**: Clear, actionable error messages for invalid OT entries.

#### Database & API
- **New Tables**: `attendance_records` (daily tracking) and `project_overtime_config`.
- **Backward Compatibility**: Seamlessly coexists with legacy `days_worked` summary data.
- **Audit Trail**: Tracking of creation and update timestamps for all records.
- **API Security**: Strict lock enforcement prevents editing finalized data.

#### UI Enhancements
- **"Add Attendance" Modal**: Smart filtering to exclude already-added employees.
- **Rich Employee List**: Avatars, skill types, and wage details in selectors.
- **Terminology Update**: Shifted from "Manpower" to professional "Attendance" terminology.
- **Sticky Layouts**: Employee names and totals remain visible while scrolling.

---

### Added - PF/ESI Statutory Compliance System (Phase 2.2)

#### Configuration Management
- **Statutory Configuration Page**: Admin-only settings page for PF and ESI parameters
- **Company-Level Settings**: Configure PF wage basis (gross/basic/custom), employee/employer rates, wage ceiling, and enforcement
- **ESI Configuration**: Set threshold, employee/employer rates
- **Rounding Modes**: Support for round/floor/ceil rounding methods
- **Indian Statutory Defaults**: Pre-configured with 2024 Indian norms (PF: 12%/12%, ₹15k ceiling; ESI: 0.75%/3.25%, ₹21k threshold)

#### Computation Engine
- **Pure Computation Module**: Deterministic PF/ESI calculation engine with no side effects
- **100% Test Coverage**: 11 comprehensive unit tests covering all scenarios
- **Wage Basis Support**: Calculate on gross, basic (50%), or custom wage amounts
- **Ceiling Enforcement**: Automatic PF wage ceiling application
- **Threshold Validation**: ESI applicability based on wage threshold
- **Explainable Results**: Human-readable explanation strings for all calculations

#### Data Persistence
- **Immutable Storage**: Computation results stored with configuration snapshot
- **Audit Trail**: Complete timestamp and configuration tracking
- **Lock Mechanism**: Prevent recomputation of finalized periods
- **Cascading Deletes**: Automatic cleanup of related records
- **Idempotent Operations**: Safe to retry without data duplication

#### Billing Period Lifecycle
- **Finalization Workflow**: One-click finalize button triggers PF/ESI computation
- **Status Tracking**: Draft vs Finalized status for billing periods
- **Automatic Computation**: PF/ESI calculated and locked on finalization
- **Validation**: Ensures employees exist before finalization
- **Statutory Summary**: Returns aggregate PF/ESI totals on finalization

#### Admin UI Integration
- **Statutory Section**: Dedicated section in billing detail sidebar
- **Mobile Tab**: Separate "Statutory" tab for mobile devices
- **Finalize Button**: Prominent button with confirmation dialog
- **PF/ESI Totals**: Display employee and employer contributions
- **Employee Breakdown**: Expandable list showing per-employee deductions
- **Net Payable**: Shows final amount after deductions
- **Status Indicators**: Visual feedback for finalized vs draft periods

#### Override Management
- **Manual Adjustments**: Admin can override PF/ESI amounts with reason
- **Complete Audit Trail**: Tracks original value, override value, reason, who, and when
- **Automatic Recalculation**: Employee and billing period totals updated automatically
- **Lock Enforcement**: Cannot override locked computations without unlocking
- **Reversible Operations**: Overrides can be removed to restore original values
- **Field-Level Overrides**: Support for PF employee/employer and ESI employee/employer amounts

#### Employee Portal
- **Statutory History**: Employees can view their PF/ESI deductions across all periods
- **Detailed Breakdown**: Per-period view with PF, ESI, and net payable
- **Read-Only Access**: Employees cannot edit or override values
- **Privacy Protected**: JWT authentication ensures employees only see their own data
- **Explanation Strings**: Transparent calculation details for employee understanding

### Database Schema
- **statutory_config**: Company-level PF/ESI configuration
- **billing_period_statutory_computation**: Aggregate computation results per billing period
- **billing_employee_statutory**: Employee-level statutory details
- **statutory_overrides**: Manual adjustment audit trail
- **billing_periods**: Added `status` (draft/finalized) and `finalized_at` fields

### API Endpoints
- `GET/PUT /api/statutory` - Configuration management
- `POST /api/billing/:id/finalize` - Finalize billing period
- `GET /api/statutory-computation/:id` - Retrieve computation
- `POST /api/statutory-computation/:id/compute` - Manual computation
- `POST /api/statutory-computation/:id/lock` - Lock computation
- `POST /api/statutory-computation/:id/unlock` - Unlock computation
- `POST /api/statutory-overrides/:id/override` - Apply override
- `DELETE /api/statutory-overrides/:id` - Remove override
- `GET /api/portal/statutory` - Employee statutory history
- `GET /api/portal/statutory/:id` - Employee statutory detail

### Documentation
- **PHASE_2.2_STEP_1.md**: Statutory configuration
- **PHASE_2.2_STEP_2.md**: Computation engine
- **PHASE_2.2_STEP_3.md**: Computation persistence
- **PHASE_2.2_STEP_4.md**: Billing period finalization
- **PHASE_2.2_STEP_5.md**: UI integration
- **PHASE_2.2_STEP_6.md**: Statutory overrides
- **PHASE_2.2_STEP_7.md**: Employee portal view
- **PHASE_2.2_SUMMARY.md**: Complete implementation summary

### Technical Details
- **Code Added**: ~2,650 lines of backend code, ~450 lines of frontend code
- **Tests**: 11 unit tests with 100% pass rate
- **Performance**: O(n) computation where n = number of employees
- **Storage**: ~1KB per employee per billing period
- **Security**: JWT authentication, role-based access, lock enforcement

## [0.1.0] - 2025-12-28

### Added - Authentication & Security
- **Multi-Role Authentication System**: Implemented JWT-based authentication with role-based access control (Admin/Employee).
- **First-Time Password Flow**: Added mandatory password change on first login with dedicated `/change-password` route.
- **Strong Password Policy**: Enforced minimum 8 characters with uppercase, lowercase, numbers, and symbols.
- **Readable Password Generator**: Auto-generates secure passwords using only readable characters (excludes confusing l/I/1/0/O) and simple symbols (!@#$*).
- **Case-Insensitive Employee Login**: Employee usernames (e.g., EMP1) work regardless of case.
- **Session Persistence**: Authentication state persists across page refreshes using localStorage.
- **Console Logging**: Added debug logging for authentication state changes and redirects.

### Added - Employee Management
- **Password Reset Functionality**: Admins can reset any employee's password with one click.
- **Credentials Display Dialog**: Professional dialog showing username and temporary password after creation/reset.
- **Copy to Clipboard**: One-click copy of login credentials (URL, username, password) with success feedback.
- **Custom Confirmation Dialogs**: Replaced native browser alerts with Vuetify dialogs for better UX.
- **Employee Status Toggle**: Working active/inactive status switch with proper boolean handling.
- **Auto-Generated Credentials**: System automatically creates secure credentials when adding new employees.
- **Improved Edit Form**: Fixed data loading for PF/ESI checkboxes with proper boolean conversion.

### Added - User Experience
- **User Dropdown Menu**: Added avatar dropdown in header with user details, profile links, and logout.
- **Logout Functionality**: Complete state clearing on logout with redirect to login page.
- **Success Snackbars**: Visual feedback for actions like copying credentials.
- **Professional UI Design**: Enhanced employee table with avatars, chips, and better typography.

### Fixed
- **Layout Consistency**: Corrected Employees page layout to match Billing page pattern (removed extra card wrapper).
- **Boolean State Handling**: Fixed employee status and PF/ESI checkbox state management (0/1 to boolean conversion).
- **Edit Form Data Loading**: Employee edit dialog now correctly loads existing data including checkboxes.
- **Credentials Visibility**: Fixed username/password contrast and readability in credentials dialog.
- **Password Complexity**: Reduced password complexity while maintaining security (10 chars vs 12, simpler symbols).

### Changed
- **Employee Portal Access**: Employees now have dedicated portal with change password functionality.
- **Password Validation**: Updated from 6-character minimum to comprehensive strong password requirements.
- **Seeded Credentials**: Updated demo employee (EMP1) with proper password hash and first-login flag.
- **API Security**: All employee-related endpoints now validate and enforce strong passwords.

### Security
- **Password Hashing**: All passwords stored using Bun.password.hash (bcrypt-compatible).
- **JWT Tokens**: Secure token-based authentication with role claims.
- **Protected Routes**: Router guards prevent unauthorized access to admin/employee areas.
- **Temporary Password Flow**: Forces password change on first login for security.

## [0.0.2] - 2025-12-28

### Fixed
- **Theme System**: Hardened the theme system, establishing a single source of truth for colors and fixing broken dark mode navigation.
- **Layout Alignment**: Fixed vertical centering issues on full-height pages (Billing, Projects, Employees).
- **Navigation Colors**: Corrected sidebar navigation colors and active state highlights for better visibility.
- **Design Consistency**: Enforced uniform design tokens (outlined inputs, tonal buttons, flat cards) via global defaults.

### Changed
- Standardized all application inputs to use `variant="outlined"` and `rounded="lg"`.
- Standardized all buttons to use `variant="tonal"` and `density="compact"`.
- Added a global footer with system status.

## [0.0.1] - 2025-12-27

### Added
- **Unified Project Structure**: Consolidated backend and frontend into a single `astrake-ems` repository.
- **Single Executable Build**: Implemented `bun run release` to generate a standalone executable embedding the UI.
- **Concurrent Dev Mode**: Added `bun run dev` to run backend and frontend concurrently for development.
- **Document Generation**: Integrated PDF generation for Attendance Summary and Wage Declaration.
- **Excel Upload Stub**: Added API endpoint stub for Excel file uploads.

### Changed
- Refactored `backend/` to `src/server/`.
- Refactored `frontend/` to `src/ui/`.
- Updated `vite.config.ts` to sit at the project root.
- Updated `tsconfig` to support composite projects (Server + UI).
- Updated CI/CD workflow to support the new unified build process.
