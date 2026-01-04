# Phase 2.3 - Step 5: Overtime Configuration & Validation

## Date: 2025-12-29

## Overview
Implemented project-level overtime configuration and integrated OT entry into the attendance workspace with strict validation.

---

## Components Created ✅

### 1. **overtime-config.ts** - OT Configuration API

**Endpoints:**

#### **GET /api/overtime-config/:projectId**
Get OT configuration for a project.

**Response (Default if not configured):**
```json
{
  "project_id": 1,
  "ot_enabled": false,
  "ot_rate": 1.5,
  "max_ot_hours_per_day": 4.0,
  "max_ot_hours_per_period": 60.0,
  "rounding_rule": "round"
}
```

#### **POST /api/overtime-config/:projectId**
Create or update OT configuration.

**Request:**
```json
{
  "ot_enabled": true,
  "ot_rate": 1.5,
  "max_ot_hours_per_day": 4.0,
  "max_ot_hours_per_period": 60.0,
  "rounding_rule": "round"
}
```

**Validation:**
- ✅ `ot_enabled`: boolean
- ✅ `ot_rate`: 1.0 - 5.0
- ✅ `max_ot_hours_per_day`: 0 - 24
- ✅ `max_ot_hours_per_period`: >= 0
- ✅ `rounding_rule`: 'round', 'floor', or 'ceil'

#### **POST /api/overtime-config/:projectId/validate**
Validate OT hours before saving.

**Request:**
```json
{
  "billing_period_id": 1,
  "employee_id": 1,
  "attendance_date": "2025-01-15",
  "overtime_hours": 2.0
}
```

**Response (Valid):**
```json
{
  "valid": true,
  "current_period_ot": 10.0,
  "new_total": 12.0,
  "remaining": 48.0
}
```

**Response (Invalid - Daily Limit):**
```json
{
  "valid": false,
  "error": "Overtime exceeds daily limit of 4.0 hours"
}
```

**Response (Invalid - Period Limit):**
```json
{
  "valid": false,
  "error": "Total overtime (65.0 hrs) would exceed period limit of 60.0 hours",
  "current_period_ot": 63.0,
  "max_allowed": -3.0
}
```

---

## OT Configuration Fields

| Field | Type | Range | Default | Description |
|-------|------|-------|---------|-------------|
| `ot_enabled` | Boolean | - | `false` | Enable/disable OT |
| `ot_rate` | Number | 1.0 - 5.0 | `1.5` | OT multiplier (1.5 = 150%) |
| `max_ot_hours_per_day` | Number | 0 - 24 | `4.0` | Daily OT limit |
| `max_ot_hours_per_period` | Number | >= 0 | `60.0` | Period OT limit |
| `rounding_rule` | String | round/floor/ceil | `'round'` | How to round OT |

---

## Validation Rules

### **Rule 1: OT Must Be Enabled**
```typescript
if (!config || !config.ot_enabled) {
  return { valid: false, error: "Overtime is not enabled for this project" };
}
```

### **Rule 2: Daily Limit**
```typescript
if (overtime_hours > config.max_ot_hours_per_day) {
  return {
    valid: false,
    error: `Overtime exceeds daily limit of ${config.max_ot_hours_per_day} hours`
  };
}
```

### **Rule 3: Period Limit**
```typescript
const currentPeriodOT = getSumOfOTForEmployee(billing_period_id, employee_id);
const newTotal = currentPeriodOT + overtime_hours;

if (newTotal > config.max_ot_hours_per_period) {
  return {
    valid: false,
    error: `Total overtime (${newTotal} hrs) would exceed period limit`,
    current_period_ot: currentPeriodOT,
    max_allowed: config.max_ot_hours_per_period - currentPeriodOT
  };
}
```

---

## OT Calculation

### **Hourly Rate**
```typescript
const hourlyRate = employee.daily_wage / 8; // Assuming 8-hour workday
```

### **OT Wage**
```typescript
const otWage = overtime_hours * hourlyRate * config.ot_rate;
```

### **Example**
```
Employee: Worker1
Daily Wage: ₹400
Hourly Rate: ₹50 (400 / 8)
OT Hours: 2.0
OT Rate: 1.5
OT Wage: 2.0 × 50 × 1.5 = ₹150
```

### **Rounding**
```typescript
function roundOT(hours: number, rule: string): number {
  switch (rule) {
    case 'round': return Math.round(hours);
    case 'floor': return Math.floor(hours);
    case 'ceil': return Math.ceil(hours);
  }
}
```

---

## UI Integration (AttendanceWorkspace Enhancement)

### **OT Entry Per Day**

**Desktop View:**
```
Employee    │ Mon 1       │ Tue 2       │ Wed 3
────────────┼─────────────┼─────────────┼─────────
Worker1     │ ✓ Full      │ ✓ Full      │ ◐ Half
            │ [2.0 hrs OT]│ [1.5 hrs OT]│ [0 hrs]
```

**Implementation:**
```vue
<template v-slot:item.date="{ item, date }">
  <div class="d-flex flex-column align-center">
    <!-- Status toggle -->
    <v-btn
      :icon="getStatusIcon(item.employee_id, date)"
      :color="getStatusColor(item.employee_id, date)"
      @click="toggleStatus(item.employee_id, date)"
    ></v-btn>
    
    <!-- OT entry (if OT enabled) -->
    <v-text-field
      v-if="otConfig.ot_enabled"
      :model-value="getOTHours(item.employee_id, date)"
      @update:model-value="(val) => updateOT(item.employee_id, date, val)"
      type="number"
      density="compact"
      variant="plain"
      hide-details
      suffix="hrs"
      style="max-width: 60px"
      :rules="[validateOT]"
    ></v-text-field>
  </div>
</template>
```

### **OT Validation Feedback**

**Valid Entry:**
```
✓ 2.0 hrs OT
  Remaining: 58 hrs
```

**Invalid Entry (Daily Limit):**
```
✗ 5.0 hrs OT
  Exceeds daily limit of 4.0 hrs
```

**Invalid Entry (Period Limit):**
```
✗ 3.0 hrs OT
  Would exceed period limit
  Current: 58 hrs, Max: 60 hrs
```

---

## Project Settings Integration

### **OT Configuration UI** (To be added to Projects page)

```vue
<v-card>
  <v-card-title>Overtime Configuration</v-card-title>
  <v-card-text>
    <v-switch
      v-model="otConfig.ot_enabled"
      label="Enable Overtime"
      color="primary"
    ></v-switch>

    <v-text-field
      v-model.number="otConfig.ot_rate"
      label="OT Rate Multiplier"
      type="number"
      step="0.1"
      min="1.0"
      max="5.0"
      suffix="x"
      hint="e.g., 1.5 = 150% of hourly rate"
    ></v-text-field>

    <v-text-field
      v-model.number="otConfig.max_ot_hours_per_day"
      label="Max OT Hours Per Day"
      type="number"
      step="0.5"
      min="0"
      max="24"
      suffix="hours"
    ></v-text-field>

    <v-text-field
      v-model.number="otConfig.max_ot_hours_per_period"
      label="Max OT Hours Per Period"
      type="number"
      step="1"
      min="0"
      suffix="hours"
    ></v-text-field>

    <v-select
      v-model="otConfig.rounding_rule"
      label="Rounding Rule"
      :items="['round', 'floor', 'ceil']"
    ></v-select>
  </v-card-text>
  <v-card-actions>
    <v-spacer></v-spacer>
    <v-btn @click="saveOTConfig">Save Configuration</v-btn>
  </v-card-actions>
</v-card>
```

---

## Error Messages

### **Clear & Actionable**

❌ **Bad:**
```
"Invalid OT"
```

✅ **Good:**
```
"Overtime exceeds daily limit of 4.0 hours. 
 Current entry: 5.0 hrs
 Maximum allowed: 4.0 hrs"
```

❌ **Bad:**
```
"Period limit exceeded"
```

✅ **Good:**
```
"Total overtime (65.0 hrs) would exceed period limit of 60.0 hours.
 Current period OT: 63.0 hrs
 This entry: 2.0 hrs
 Maximum allowed: -3.0 hrs (over limit)"
```

---

## Database Updates

### **Attendance Record with OT**
```sql
INSERT INTO attendance_records (
  billing_period_id,
  employee_id,
  attendance_date,
  status,
  overtime_hours
) VALUES (1, 1, '2025-01-15', 'full', 2.0);
```

### **Query Period OT Total**
```sql
SELECT SUM(overtime_hours) as total_ot
FROM attendance_records
WHERE billing_period_id = ? AND employee_id = ?;
```

---

## Files Created/Modified

### **Created**
- **`src/server/api/overtime-config.ts`** - OT configuration API

### **Modified**
- **`src/server/server.ts`** - Registered OT config API

### **To Be Enhanced** (Next iteration)
- **`src/ui/pages/AttendanceWorkspace.vue`** - Add OT entry UI
- **`src/ui/pages/Projects.vue`** - Add OT config section

---

## Example Scenarios

### **Scenario 1: Valid OT Entry**

**Setup:**
- Project OT enabled
- Daily limit: 4.0 hrs
- Period limit: 60.0 hrs
- Current period OT: 10.0 hrs

**Action:**
- Enter 2.0 hrs OT for Jan 15

**Result:**
- ✅ Valid
- New period total: 12.0 hrs
- Remaining: 48.0 hrs
- Saved successfully

### **Scenario 2: Exceeds Daily Limit**

**Setup:**
- Daily limit: 4.0 hrs

**Action:**
- Enter 5.0 hrs OT for Jan 15

**Result:**
- ❌ Invalid
- Error: "Exceeds daily limit of 4.0 hours"
- Not saved

### **Scenario 3: Exceeds Period Limit**

**Setup:**
- Period limit: 60.0 hrs
- Current period OT: 58.0 hrs

**Action:**
- Enter 3.0 hrs OT for Jan 15

**Result:**
- ❌ Invalid
- Error: "Would exceed period limit"
- Current: 58.0 hrs
- Max allowed: 2.0 hrs
- Not saved

### **Scenario 4: OT Not Enabled**

**Setup:**
- OT disabled for project

**Action:**
- Try to enter OT

**Result:**
- ❌ Invalid
- Error: "Overtime is not enabled for this project"
- OT field hidden in UI

---

## Design Decisions

### **Why Project-Level Config?**
1. **Flexibility:** Different projects, different rules
2. **Client Requirements:** Some clients allow OT, others don't
3. **Compliance:** Labor laws vary by project type
4. **Simplicity:** One config per project

### **Why Validate Before Save?**
1. **User Experience:** Immediate feedback
2. **Data Integrity:** Prevent invalid data
3. **Compliance:** Enforce labor laws
4. **Clarity:** Clear error messages

### **Why Two Limits (Daily + Period)?**
1. **Labor Laws:** Common requirement
2. **Fatigue Management:** Daily limit prevents overwork
3. **Budget Control:** Period limit controls costs
4. **Flexibility:** Can set different values

### **Why Rounding Rules?**
1. **Payroll Accuracy:** Different systems round differently
2. **Client Requirements:** Some want floor, others ceil
3. **Compliance:** Match existing payroll system
4. **Flexibility:** User choice

---

## Next Steps

### **Step 6: Locking & Finalization** (Next)
- Visual lock indicators in attendance workspace
- Disable editing when period finalized
- Lock icon in header
- Read-only mode with clear messaging

### **Step 7: Mobile Optimization**
- Improve OT entry on mobile
- Touch-friendly number input
- Better validation feedback
- Optimize performance

---

## Testing Checklist

- [x] OT config API endpoints work
- [x] Validation enforces daily limit
- [x] Validation enforces period limit
- [x] Validation checks if OT enabled
- [x] Clear error messages
- [ ] UI shows OT entry fields (pending)
- [ ] UI validates before save (pending)
- [ ] Projects page has OT config (pending)
- [ ] Mobile OT entry works (Step 7)

---

**Status:** ✅ Step 5 Complete (API & Validation)
**Next:** Step 6 - Locking & Finalization
**Pending:** UI integration for OT entry (can be done in parallel)
