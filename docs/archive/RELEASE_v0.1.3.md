# Release v0.1.3 - Attendance Engine Refactor

## Date: 2026-01-03

## Overview
This release introduces the **Attendance Engine Refactor (Phase 2.3)**, a significant upgrade that transforms the system from simple manpower allocation to professional, calendar-based attendance tracking. This update brings day-by-day precision, overtime management, and strict validation while maintaining backward compatibility.

---

## 🚀 Key Features

### 1. Attendance Workspace
- **Calendar Grid Interface**: A dedicated full-screen workspace (`/billing/:id/attendance`) offers a comprehensive view of all employees and days in a billing period.
- **Efficient Tracking**: 
  - One-click status toggles (Absent → Full → Half).
  - Sticky headers and columns for easy navigation of large datasets.
  - Hover effects for clear row tracking.
- **Mobile Optimization**: 
  - Accordion-style employee lists.
  - Large touch-friendly controls.
  - **Quick Actions**: "Mark All Full" and "Clear" buttons to speed up mobile data entry.

### 2. Overtime Management
- **Project-Level Configuration**: Set OT rules per project (e.g., enable/disable, 1.5x rate, caps).
- **Integrated Entry**: Record OT hours directly alongside daily attendance.
- **Smart Validation**: The system strictly enforces:
  - Daily OT limits (e.g., max 4 hours/day).
  - Period OT limits (e.g., max 60 hours/period).
- **Clear Feedback**: Actionable error messages explain exactly why an entry is invalid (e.g., "Exceeds daily limit of 4 hours").

### 3. Data Integrity & Security
- **Locking Mechanism**: Finalized billing periods become strictly read-only. The UI shows a lock indicator, and the API blocks any modification attempts.
- **Audit Support**: Granular `attendance_records` ensure every day's status is tracked and auditable.
- **Auto-Sync**: Changes in the calendar automatically recalculate summary days and wages in the billing report.

### 4. Usability Enhancements
- **Smart "Add Attendance"**: The employee selector filters out already-added workers and displays role/wage context.
- **Visual Feedback**: Real-time saving indicators and instant total recalculations.
- **Professional Terminology**: Transitioned from "Manpower" to "Attendance" to align with industry standards.

---

## 🛠 Technical Highlights

- **Database**: Introduced `attendance_records` (daily tracking) and `project_overtime_config` tables.
- **Backward Compatibility**: Existing billing periods using the legacy summary method continue to function without migration.
- **Performance**: Optimized rendering for large grids and batched updates for mobile actions.
- **Architecture**: A clear separation of concerns with a dedicated Attendance API and logical validation layers.

---

## 📋 usage Instructions

### To Use the New Calendar System:
1.  Navigate to a Billing Period details page.
2.  Click the **"Prepare Attendance"** button.
3.  In the workspace:
    - **Desktop**: Click calendar cells to toggle status or enter OT hours.
    - **Mobile**: Tap an employee to expand, use "Mark All Full" for quick entry, or toggle individual days.
4.  Changes are saved automatically.
5.  Return to the Billing page to see updated totals.

---

## 📦 Database Changes
- **New Tables**:
    - `attendance_records`: Stores daily status and OT.
    - `project_overtime_config`: Stores OT rules.
- **Migrations**: No manual migration required (handled by initialization script).

---

## Version History
- **v0.1.3**: Attendance Engine Refactor (Current)
- **v0.1.2**: PF/ESI Statutory Computation
- **v0.1.0**: Authentication & Role-Based Access
