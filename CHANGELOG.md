# Changelog

All notable changes to this project will be documented in this file.

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
