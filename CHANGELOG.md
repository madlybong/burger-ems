# Changelog

All notable changes to this project will be documented in this file.

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
