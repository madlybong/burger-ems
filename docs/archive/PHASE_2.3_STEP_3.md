# Phase 2.3 - Step 3: Database Schema for Calendar Attendance

## Date: 2025-12-29

## Overview
Created foundational database tables for calendar-based attendance tracking and project-level overtime configuration.

---

## Tables Created ✅

### 1. **attendance_records** - Calendar-based Attendance

```sql
CREATE TABLE IF NOT EXISTS attendance_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  billing_period_id INTEGER NOT NULL,
  employee_id INTEGER NOT NULL,
  attendance_date TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('full', 'half', 'absent')) DEFAULT 'absent',
  overtime_hours REAL NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(billing_period_id, employee_id, attendance_date),
  FOREIGN KEY(billing_period_id) REFERENCES billing_periods(id) ON DELETE CASCADE,
  FOREIGN KEY(employee_id) REFERENCES employees(id) ON DELETE CASCADE
);
```

**Purpose:**
- Single source of truth for attendance
- Per-day, per-employee records
- Supports full day, half day, and absent statuses
- Tracks overtime hours per day
- Optional notes for special cases

**Key Features:**
- ✅ **Unique constraint** - One record per employee per date per period
- ✅ **Cascading deletes** - Auto-cleanup when period/employee deleted
- ✅ **Audit timestamps** - created_at and updated_at
- ✅ **Status validation** - Only 'full', 'half', or 'absent' allowed
- ✅ **OT tracking** - overtime_hours field for daily OT

**Indexes:**
```sql
CREATE INDEX idx_attendance_period_employee 
ON attendance_records(billing_period_id, employee_id);

CREATE INDEX idx_attendance_date 
ON attendance_records(attendance_date);
```

**Performance:**
- Fast lookups by period + employee
- Fast date-based queries
- Efficient for calendar grid rendering

---

### 2. **project_overtime_config** - Project-level OT Settings

```sql
CREATE TABLE IF NOT EXISTS project_overtime_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL UNIQUE,
  ot_enabled BOOLEAN DEFAULT 0,
  ot_rate REAL NOT NULL DEFAULT 1.5,
  max_ot_hours_per_day REAL NOT NULL DEFAULT 4.0,
  max_ot_hours_per_period REAL NOT NULL DEFAULT 60.0,
  rounding_rule TEXT NOT NULL DEFAULT 'round' CHECK(rounding_rule IN ('round', 'floor', 'ceil')),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
);
```

**Purpose:**
- Configure overtime rules per project
- Enforce OT limits at entry time
- Snapshot for billing periods

**Fields:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `project_id` | INTEGER | - | Unique per project |
| `ot_enabled` | BOOLEAN | 0 | Enable/disable OT for project |
| `ot_rate` | REAL | 1.5 | OT multiplier (1.5 = 150%) |
| `max_ot_hours_per_day` | REAL | 4.0 | Daily OT limit |
| `max_ot_hours_per_period` | REAL | 60.0 | Period-wide OT limit |
| `rounding_rule` | TEXT | 'round' | How to round OT hours |

**Constraints:**
- ✅ **Unique project_id** - One config per project
- ✅ **Cascading delete** - Auto-cleanup when project deleted
- ✅ **Rounding validation** - Only 'round', 'floor', or 'ceil'

**Defaults:**
- OT disabled by default (`ot_enabled = 0`)
- Standard 1.5x rate
- 4 hours/day, 60 hours/period limits
- Round to nearest hour

---

## Data Model Relationships

```
projects
  ↓ (1:1)
project_overtime_config

projects
  ↓ (1:N)
billing_periods
  ↓ (1:N)
attendance_records
  ↓ (N:1)
employees
```

**Key Relationships:**
1. **Project → OT Config** (1:1)
   - Each project has one OT configuration
   - Optional (can be null if not configured)

2. **Billing Period → Attendance Records** (1:N)
   - Each period has many attendance records
   - One record per employee per date

3. **Employee → Attendance Records** (1:N)
   - Each employee has many attendance records
   - Across multiple periods

---

## Attendance Status Values

### **'full'** - Full Day
- Employee worked full day
- Counts as 1.0 day
- Standard wage applies

### **'half'** - Half Day
- Employee worked half day
- Counts as 0.5 day
- Half wage applies

### **'absent'** - Absent
- Employee did not work
- Counts as 0.0 day
- No wage

**Calculation:**
```typescript
const daysWorked = attendanceRecords
  .filter(r => r.status === 'full')
  .length + 
  attendanceRecords
  .filter(r => r.status === 'half')
  .length * 0.5;
```

---

## Overtime Calculation

### **Per-Day OT**
```typescript
// Validate against daily limit
if (overtimeHours > config.max_ot_hours_per_day) {
  throw new Error(`OT exceeds daily limit of ${config.max_ot_hours_per_day} hours`);
}
```

### **Per-Period OT**
```typescript
// Sum all OT for employee in period
const totalOT = attendanceRecords
  .filter(r => r.employee_id === employeeId)
  .reduce((sum, r) => sum + r.overtime_hours, 0);

// Validate against period limit
if (totalOT > config.max_ot_hours_per_period) {
  throw new Error(`OT exceeds period limit of ${config.max_ot_hours_per_period} hours`);
}
```

### **OT Wage Calculation**
```typescript
const hourlyRate = employee.daily_wage / 8; // Assuming 8-hour day
const otWage = overtimeHours * hourlyRate * config.ot_rate;
```

**Example:**
- Daily wage: ₹400
- Hourly rate: ₹50 (400/8)
- OT hours: 2
- OT rate: 1.5
- OT wage: 2 × 50 × 1.5 = **₹150**

---

## Backward Compatibility

### **Existing System**
- `billing_employees` table remains unchanged
- `days_worked` field still exists
- Legacy periods continue to work

### **New System**
- `attendance_records` table is additional
- Calendar-based for new entries
- Coexists with legacy data

### **Migration Strategy**
- **No automatic migration** of existing data
- Legacy periods use `days_worked`
- New periods use `attendance_records`
- Both systems supported simultaneously

---

## Example Data

### **Attendance Records**

```sql
-- Worker1, January 2025
INSERT INTO attendance_records 
  (billing_period_id, employee_id, attendance_date, status, overtime_hours)
VALUES
  (1, 1, '2025-01-01', 'full', 0),
  (1, 1, '2025-01-02', 'full', 2.0),
  (1, 1, '2025-01-03', 'half', 0),
  (1, 1, '2025-01-04', 'absent', 0),
  (1, 1, '2025-01-05', 'full', 1.5);
```

**Summary:**
- Full days: 3
- Half days: 1
- Absent: 1
- Total days: 3.5
- Total OT: 3.5 hours

### **OT Configuration**

```sql
-- Project 1 OT Config
INSERT INTO project_overtime_config 
  (project_id, ot_enabled, ot_rate, max_ot_hours_per_day, max_ot_hours_per_period)
VALUES
  (1, 1, 1.5, 4.0, 60.0);
```

**Settings:**
- OT enabled
- 1.5x rate (150%)
- Max 4 hours/day
- Max 60 hours/period
- Round to nearest

---

## Queries

### **Get Attendance for Period**
```sql
SELECT 
  e.name,
  ar.attendance_date,
  ar.status,
  ar.overtime_hours
FROM attendance_records ar
JOIN employees e ON ar.employee_id = e.id
WHERE ar.billing_period_id = ?
ORDER BY e.name, ar.attendance_date;
```

### **Calculate Days Worked**
```sql
SELECT 
  employee_id,
  SUM(CASE 
    WHEN status = 'full' THEN 1.0
    WHEN status = 'half' THEN 0.5
    ELSE 0
  END) as days_worked,
  SUM(overtime_hours) as total_ot
FROM attendance_records
WHERE billing_period_id = ?
GROUP BY employee_id;
```

### **Get OT Config for Project**
```sql
SELECT * 
FROM project_overtime_config
WHERE project_id = ?;
```

### **Validate Daily OT Limit**
```sql
SELECT overtime_hours
FROM attendance_records
WHERE billing_period_id = ?
  AND employee_id = ?
  AND attendance_date = ?;
```

---

## Indexes Performance

### **idx_attendance_period_employee**
- **Purpose:** Fast employee attendance lookup
- **Used for:** Calendar grid rendering
- **Complexity:** O(log n)

### **idx_attendance_date**
- **Purpose:** Fast date-based queries
- **Used for:** Daily reports, date filtering
- **Complexity:** O(log n)

**Estimated Performance:**
- 1,000 records: < 1ms
- 10,000 records: < 5ms
- 100,000 records: < 20ms

---

## Constraints & Validation

### **Unique Constraint**
```sql
UNIQUE(billing_period_id, employee_id, attendance_date)
```
- Prevents duplicate attendance entries
- One record per employee per date per period
- Database-level enforcement

### **Status Check**
```sql
CHECK(status IN ('full', 'half', 'absent'))
```
- Only valid statuses allowed
- Database-level validation
- Prevents invalid data

### **Rounding Rule Check**
```sql
CHECK(rounding_rule IN ('round', 'floor', 'ceil'))
```
- Only valid rounding methods
- Database-level validation
- Consistent OT calculation

### **Foreign Keys**
- **ON DELETE CASCADE** - Auto-cleanup
- Maintains referential integrity
- Prevents orphaned records

---

## Storage Estimates

### **Attendance Records**
- **Per record:** ~100 bytes
- **Per employee per month:** ~3 KB (30 days)
- **50 employees, 12 months:** ~1.8 MB/year

### **OT Configuration**
- **Per project:** ~80 bytes
- **100 projects:** ~8 KB

**Total:** Minimal storage impact

---

## Files Modified

- **`src/server/db/init.ts`**
  - Added `attendance_records` table
  - Added `project_overtime_config` table
  - Added indexes for performance
  - Documented Phase 2.3 schema

---

## Next Steps

### Step 4: Attendance Workspace (Next)
- Create `/billing/:id/attendance` route
- Build calendar grid component
- Implement Full/Half/Absent toggles
- Add OT entry per day
- Auto-calculate totals

### Step 5: OT Configuration
- Project settings page
- OT config form
- Validation enforcement
- Snapshot mechanism

### Step 6: Locking & Finalization
- Lock attendance on finalize
- Visual lock indicators
- Read-only mode

### Step 7: Mobile Optimization
- Responsive calendar view
- Touch-friendly toggles
- Per-employee day list

---

## Design Decisions

### Why Separate Table?
1. **Granularity:** Day-level vs period-level
2. **Flexibility:** Can add fields without affecting legacy
3. **Performance:** Indexed for calendar queries
4. **Audit:** Complete attendance history

### Why Project-level OT Config?
1. **Flexibility:** Different projects, different rules
2. **Snapshot:** Can capture config at billing time
3. **Simplicity:** One config per project
4. **Scalability:** Easy to extend

### Why Three Status Values?
1. **Clarity:** Clear distinction between full/half/absent
2. **Calculation:** Simple math (1.0, 0.5, 0.0)
3. **Industry Standard:** Common in payroll systems
4. **Extensibility:** Can add more statuses later

### Why Daily OT Tracking?
1. **Accuracy:** Precise OT calculation
2. **Compliance:** Labor law requirements
3. **Audit:** Day-by-day trail
4. **Flexibility:** Different OT per day

---

**Status:** ✅ Step 3 Complete
**Next:** Step 4 - Attendance Workspace (Full-Screen Calendar View)
