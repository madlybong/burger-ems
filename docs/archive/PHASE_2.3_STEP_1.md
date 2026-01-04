# Phase 2.3 - Step 1: Terminology & UX Refactor

## Date: 2025-12-29

## Overview
Phase 2.3 corrects the mental model from "manpower management" to "attendance recording" with a calendar-based authoritative workflow.

---

## Step 1: Terminology & Quick Wins ✅ COMPLETE

### Changes Implemented

#### 1. **Terminology Updates**

**Before → After:**
- "Add Manpower" → **"Add Attendance"**
- "Add Worker" → **"Add Attendance"** 
- "Select Worker" → **"Select Employee"**
- Icon: `mdi-account-plus` → **`mdi-calendar-plus`**

#### 2. **Removed Inline Editing**

**Before:**
```vue
<!-- Editable text field -->
<v-text-field 
  v-model.number="item.days_worked" 
  type="number" 
  variant="outlined"
  @blur="updateEntry(item)"
></v-text-field>
```

**After:**
```vue
<!-- Read-only display -->
<span class="text-body-2 font-weight-bold">
  {{ item.days_worked || 0 }}
</span>
```

**Rationale:**
- Table is now a **summary view only**
- Attendance editing will happen in dedicated calendar workspace
- Prevents confusion about source of truth

#### 3. **UI Changes**

**Buttons:**
- Desktop: "Add Attendance" with calendar-plus icon
- Mobile: Calendar-plus icon button
- Color: Primary (blue)

**Dialog:**
- Title: "Add Attendance"
- Employee selector label: "Select Employee"
- Days Worked field: Remains for seeding initial attendance

---

## Files Modified

### Frontend
- **`src/ui/pages/BillingDetail.vue`**
  - Line 312-314: Changed button text and icon
  - Line 350-353: Made days_worked read-only
  - Line 596: Changed dialog title
  - Line 599: Changed autocomplete label

---

## Visual Changes

### Before
```
┌──────────────────────────────────┐
│ [Excel] [Add Manpower]           │
├──────────────────────────────────┤
│ Worker1  unskilled  ₹400  [25▼] │
│                            ↑      │
│                       Editable    │
└──────────────────────────────────┘
```

### After
```
┌──────────────────────────────────┐
│ [Excel] [Add Attendance]         │
├──────────────────────────────────┤
│ Worker1  unskilled  ₹400   25    │
│                            ↑      │
│                       Read-only   │
└──────────────────────────────────┘
```

---

## Backward Compatibility

✅ **Preserved:**
- Existing `billing_employees` table unchanged
- Legacy periods with `days_worked` continue to work
- No data migration required
- Existing functionality intact

---

## User Impact

### What Users See
1. **Button text changed** to "Add Attendance"
2. **Icon changed** to calendar (more intuitive)
3. **Days column is read-only** (no more inline editing)
4. **Dialog title updated** to match new terminology

### What Users Can Still Do
- ✅ Add employees to billing period
- ✅ Enter initial days worked
- ✅ View attendance summary
- ✅ Delete employees
- ✅ Generate reports

### What Users Cannot Do Anymore
- ❌ Edit days worked inline in table
  - **Reason:** Attendance will be managed via calendar workspace (coming in Step 4)

---

## Next Steps

### Step 2: Starter Attendance Modal (In Progress)
- Filter employees by project
- Disable already-added employees
- Validate input
- Fast attendance entry

### Step 3: Database Schema
- Create `attendance_records` table
- Create `project_overtime_config` table
- Add migrations

### Step 4: Attendance Workspace
- New route: `/billing/:id/attendance`
- Calendar-based grid
- Full/Half/Absent toggles
- OT entry per day

### Step 5-7: OT, Locking, Mobile
- Project-level OT configuration
- Lock attendance on finalization
- Mobile-optimized view

---

## Testing Checklist

- [x] "Add Attendance" button appears
- [x] Button has calendar icon
- [x] Dialog title is "Add Attendance"
- [x] Employee selector label is "Select Employee"
- [x] Days worked column is read-only
- [x] Cannot edit days inline
- [x] Can still add new attendance entries
- [x] Can still delete employees
- [x] Existing data displays correctly

---

## Design Decisions

### Why Remove Inline Editing?
1. **Single Source of Truth:** Calendar will be authoritative
2. **Prevent Confusion:** Users shouldn't edit in two places
3. **Better UX:** Dedicated workspace for attendance management
4. **Audit Trail:** Calendar provides better tracking

### Why Keep "Days Worked" in Add Dialog?
1. **Quick Entry:** Users can seed initial attendance
2. **Backward Compatibility:** Works with existing system
3. **Migration Path:** Smooth transition to calendar
4. **Flexibility:** Not everyone needs calendar immediately

### Why Change Icon to Calendar?
1. **Mental Model:** Attendance = Calendar-based
2. **Clarity:** Calendar icon is more intuitive
3. **Consistency:** Aligns with upcoming calendar workspace
4. **Industry Standard:** Payroll systems use calendar icons

---

## Known Limitations

### Current Step (Step 1)
- Days worked still stored as single number
- No per-day breakdown yet
- No overtime tracking yet
- No calendar view yet

### To Be Addressed in Future Steps
- Step 3: Calendar-based storage
- Step 4: Full calendar workspace
- Step 5: Overtime configuration
- Step 6: Locking mechanism

---

## Migration Notes

### For Existing Users
- **No action required**
- Existing billing periods work as before
- New terminology appears immediately
- Inline editing removed (use Add Attendance dialog)

### For New Users
- Start with "Add Attendance" workflow
- Calendar workspace coming soon
- Current system is transitional

---

**Status:** ✅ Step 1 Complete
**Next:** Step 2 - Starter Attendance Modal Enhancement
