# User Guide: Attendance Workspace

## Getting Started
The **Attendance Workspace** is your central hub for managing employee attendance for a specific billing period.

### Accessing the Workspace
1.  Navigate to **Billing** from the main menu.
2.  Click on a **Billing Period** to view its details.
3.  Click **"Open Attendance"** to enter the workspace.

## Interface Overview

### 1. The Header
- **Navigation:** Back button returns to the Billing Detail page.
- **Period Info:** Shows the dates and current status (Draft/Finalized).
- **Employee Context:** Shows the currently selected employee's details (Name, Skill, Wage) and their total attendance stats.
- **Search:** Quickly find employees by name.
- **Save Status:** Indicates if changes are Saving, Saved, or if an Error occurred.

### 2. The Sidebar (Left)
- Displays all employees assigned to this billing period.
- Shows a quick summary of **Days Worked** and **OT Hours** for each employee.
- Click a name to view their calendar.

### 3. The Calendar (Center)
- Displays the weeks and days for the selected billing period.
- **Status Colors:**
  - 🟢 **Green:** Full Day
  - 🟡 **Yellow:** Half Day
  - 🔴 **Red:** Absent (Workday) / Week Off (Weekend)
  - ⚪ **Grey:** Outside billing period

## Managing Attendance

### Marking Attendance
1.  Select an employee from the sidebar.
2.  Click on a date cell in the calendar to toggle status.
    *   **Workdays:** Cycle: `Absent` -> `Full` -> `Half` -> `Absent`
    *   **Weekends:** Cycle: `Week Off` -> `Full` -> `Half` -> `Absent` -> `Week Off`

### Entering Overtime (OT)
*If Overtime is enabled for the project:*
1.  Locate the OT input box inside the calendar cell for the specific day.
2.  Type the number of hours (e.g., `2` or `1.5`).
3.   The system will automatically save.
4.   **Note:** You cannot exceed the daily limit (default 4h) or period limit (default 60h).

### Bulk Actions (Mobile Only)
On mobile devices, you can expand an employee card and use "All Full" to mark all days as present, or "Clear" to reset them.

## Finalizing the Period
Once all attendance is verified:
1.  Go back to the **Billing Detail** page.
2.  Ensure all data is correct.
3.  Click **"Finalize Period"**.
4.  ⚠️ **Warning:** Once finalized, the period is **LOCKED**. You cannot edit attendance or overtime anymore.

## Troubleshooting

### "Connection Lost" / Error Messages
- If you see a red "Error" badge or alert, check your internet connection.
- Click **"Retry"** on the error alert.
- If the issue persists, refresh the page. Your last successful save is preserved.

### "Period Limit Exceeded"
- This means you are trying to add OT that would push the employee over the project's maximum allowed overtime hours. You must reduce OT on other days before adding more.
