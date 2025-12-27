# Changelog

All notable changes to this project will be documented in this file.

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
