# Day 4: Performance Optimization

**Goal:** Ensure the Attendance Workspace remains fast, smooth, and responsive even with large datasets (e.g., 100+ employees, full month data).

## 1. Database & Backend Optimization

### 1.1 Add Indexes
Ensure SQLite has the necessary indexes for frequent lookups.
- `idx_attendance_period_emp`: `(billing_period_id, employee_id)` for fetching specific records.
- `idx_attendance_date`: `(attendance_date)` for date-range queries.
- `idx_billing_employees_period`: `(billing_period_id)` for listing employees in a period.

### 1.2 Optimize Queries
Review code in `src/server/api/attendance.ts` and `src/server/api/billing.ts`.
- **Current State Analysis:** Check if we are doing N+1 queries.
- **Batching:** Ensure `fetchAttendance` returns all records for a period in one go (it seems to do this already, but we'll verify).
- **Lightweight DTOs:** Ensure we only send necessary fields to the frontend.

## 2. Frontend Optimization

### 2.1 Virtualization
The `EmployeeSidebar` lists all employees. For 50+ employees, this DOM can get heavy.
- **Action:** Convert `v-list` in `EmployeeSidebar.vue` to `v-virtual-scroll` or ensure pagination/loading limits.
- **Action:** Since `CalendarGrid` is complex, virtualization might be tricky there, but we can ensure we rely on `v-memo` or smart keying to minimize re-renders.

### 2.2 Debounce Search
The search input in `UnifiedAttendanceHeader` currently emits `update:search` immediately.
- **Action:** Implement `useDebounce` or lodash `debounce` for the search input to delay filtering trigger by 300ms.

### 2.3 Computed Property Memoization
Review `AttendanceWorkspace.vue` computed properties.
- `currentAttendanceMap` acts as a lookup cache. Ensure it efficiently updates only when `attendanceRecords` changes.
- Ensure large lists (like `calendarWeeks`) are computed efficiently.

### 2.4 Reduce Re-renders
- Use `shallowRef` for large immutable data (like the raw attendance list) if deep reactivity isn't needed.
- Optimize `CalendarGrid` cell rendering.

## 3. Bundle & Asset Optimization

### 3.1 Code Splitting
- Verify that `AttendanceWorkspace` is lazy-loaded in the router (`import(...)` syntax).
- Verify that `UnifiedAttendanceHeader`, `EmployeeSidebar`, `CalendarGrid` are imported effectively.

## 4. Measurement & Verification

### 4.1 Performance Metrics
- **Load Time:** Measure time from route change to "Interactive" (data loaded).
- **Interaction Latency:** Measure time from clicking a status to UI update (optimistic UI is already there, verify it feels instant).

## Plan of Action

1.  **Analyze & Benchmark:** Measure current load time with ~50 dummy employees.
2.  **Backend Integ:** Apply SQL indexes via a migration script or init script.
3.  **Frontend Debounce:** implementations.
4.  **Virtualization:** Refactor Sidebar.
5.  **Verify:** Re-measure performance.

