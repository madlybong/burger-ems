# Enhancement: Attendance Entry During Employee Addition

## Date: 2025-12-29

## Feature Request
Add the ability to enter attendance (days worked) directly when adding an employee to a billing period, instead of adding them with 0 days and then editing inline.

## Problem
**Before:**
1. Click "Add Manpower"
2. Select employee
3. Employee is added with 0 days worked
4. Must click on the "Days Worked" field to edit
5. Enter the number of days
6. Save

This required an extra step and was not intuitive.

## Solution
Enhanced the "Add Manpower to Batch" dialog to include a "Days Worked" field.

**After:**
1. Click "Add Manpower"
2. Select employee
3. **Enter days worked in the same dialog**
4. Click "Confirm Add"
5. Employee is added with the correct days and calculated wage

## Implementation

### 1. Added State Variable
```typescript
const daysWorked = ref<number>(0);
```

### 2. Reset Days Worked When Opening Dialog
```typescript
function openAddDialog() {
  selectedEmployeeId.value = null;
  daysWorked.value = 0;  // Reset to 0
  dialog.value = true;
}
```

### 3. Calculate Wage Amount
```typescript
async function addEntry() {
  // ... validation
  
  // Calculate wage amount based on days worked
  const wage = (daysWorked.value || 0) * (emp.daily_wage || 0);

  const newEntry: BillingEmployee = {
    // ...
    days_worked: daysWorked.value || 0,
    wage_amount: wage,
    // ...
  };
  
  // ... save to backend
}
```

### 4. Updated Dialog UI
```vue
<v-dialog v-model="dialog" max-width="500px">
  <v-card>
    <v-card-title>Add Manpower to Batch</v-card-title>
    <v-card-text class="pb-2">
      <!-- Employee Selection -->
      <v-autocomplete 
        v-model="selectedEmployeeId" 
        :items="allEmployees" 
        label="Select Worker"
        variant="outlined" 
        density="compact"
        autofocus
      ></v-autocomplete>
      
      <!-- NEW: Days Worked Field -->
      <v-text-field 
        v-model.number="daysWorked" 
        type="number" 
        label="Days Worked" 
        variant="outlined" 
        density="compact"
        hint="Enter the number of days worked in this period"
        persistent-hint
        min="0"
        class="mt-2"
      ></v-text-field>
    </v-card-text>
    <v-divider></v-divider>
    <v-card-actions>
      <v-spacer></v-spacer>
      <v-btn variant="text" @click="dialog = false">Close</v-btn>
      <v-btn color="primary" @click="addEntry">Confirm Add</v-btn>
    </v-card-actions>
  </v-card>
</v-dialog>
```

## Features

### Input Field Properties
- **Type:** Number input
- **Label:** "Days Worked"
- **Hint:** "Enter the number of days worked in this period"
- **Min Value:** 0 (prevents negative numbers)
- **Default:** 0
- **Variant:** Outlined (consistent with employee selector)
- **Density:** Compact (space-efficient)

### Automatic Calculation
- Wage amount is automatically calculated: `days × daily_wage`
- Calculation happens before saving to database
- No need for manual calculation

### Validation
- Number input type ensures only numbers can be entered
- Min="0" prevents negative values
- Empty field defaults to 0

## User Experience

### Before Enhancement
```
1. Add Manpower → Select Employee → Confirm
2. Employee appears with 0 days
3. Click on days field → Enter 25 → Press Enter
4. Wage updates
```
**Steps:** 4 actions, 2 separate operations

### After Enhancement
```
1. Add Manpower → Select Employee → Enter 25 days → Confirm
2. Employee appears with 25 days and calculated wage
```
**Steps:** 2 actions, 1 operation

### Benefits
- ✅ Faster workflow (fewer steps)
- ✅ More intuitive (all info in one place)
- ✅ Fewer errors (less chance of forgetting to enter days)
- ✅ Better UX (single dialog for complete entry)
- ✅ Immediate wage calculation

## Example Usage

### Scenario: Adding Worker1 with 25 Days

**Dialog Input:**
- Select Worker: Worker1
- Days Worked: 25

**Result:**
- Employee: Worker1
- Skill: unskilled
- Rate: ₹400
- Days: 25
- Wage: ₹10,000 (automatically calculated)

### Scenario: Adding Worker Without Days

**Dialog Input:**
- Select Worker: Worker2
- Days Worked: 0 (or leave empty)

**Result:**
- Employee: Worker2
- Days: 0
- Wage: ₹0

Can still edit inline later if needed.

## Backward Compatibility

### Inline Editing Still Works
The existing inline editing functionality remains unchanged:
- Can still click on days field to edit
- Auto-saves on change
- Wage recalculates automatically

### Use Cases for Each Method

**Use Dialog Entry When:**
- Adding new employee with known attendance
- Bulk entry from attendance sheet
- Initial data entry

**Use Inline Editing When:**
- Correcting mistakes
- Updating attendance mid-period
- Quick adjustments

## Files Modified

**Frontend:**
- `src/ui/pages/BillingDetail.vue`
  - Added `daysWorked` state variable
  - Updated `openAddDialog()` to reset days
  - Updated `addEntry()` to use days and calculate wage
  - Enhanced dialog template with days worked field

## Testing Checklist

- [x] Open Add Manpower dialog
- [x] Days Worked field appears
- [x] Default value is 0
- [x] Can enter positive numbers
- [x] Cannot enter negative numbers
- [x] Select employee and enter days
- [x] Click Confirm Add
- [x] Employee appears with correct days
- [x] Wage is calculated correctly
- [x] Can still edit days inline after adding
- [x] Inline editing still works as before

## Visual Changes

### Dialog Before
```
┌─────────────────────────────────┐
│ Add Manpower to Batch           │
├─────────────────────────────────┤
│ Select Worker                   │
│ [Worker1              ▼]        │
│                                 │
├─────────────────────────────────┤
│              Close  Confirm Add │
└─────────────────────────────────┘
```

### Dialog After
```
┌─────────────────────────────────┐
│ Add Manpower to Batch           │
├─────────────────────────────────┤
│ Select Worker                   │
│ [Worker1              ▼]        │
│                                 │
│ Days Worked                     │
│ [25                  ]          │
│ Enter the number of days...     │
│                                 │
├─────────────────────────────────┤
│              Close  Confirm Add │
└─────────────────────────────────┘
```

## Future Enhancements

### Possible Additions
1. **Show calculated wage in dialog**
   - Display: "Wage: ₹10,000" below days field
   - Updates in real-time as days change

2. **Quick fill buttons**
   - "Full Month" (30 days)
   - "Half Month" (15 days)
   - "Week" (7 days)

3. **Validation**
   - Warn if days > 31
   - Warn if days exceeds billing period duration

4. **Bulk add with days**
   - Select multiple employees
   - Enter same days for all

---

**Status:** ✅ Implemented and Working
**Version:** v0.1.2 (post-release enhancement)
