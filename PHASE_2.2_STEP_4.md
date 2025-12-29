# Phase 2.2 - Step 4: Billing Period Finalization Integration

## Overview
This document describes the integration of PF/ESI computation with the billing period lifecycle through a finalization workflow.

## Implementation Date
2025-12-28

## Concept

When an admin finalizes a billing period:
1. **Trigger PF/ESI Computation** - Automatically compute statutory deductions
2. **Store Immutable Results** - Persist computation with config snapshot
3. **Lock Computation** - Prevent any modifications
4. **Mark Period as Finalized** - Update billing period status

## Database Schema Changes

### Modified Table: `billing_periods`

Added two new fields:

```sql
ALTER TABLE billing_periods ADD COLUMN status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'finalized'));
ALTER TABLE billing_periods ADD COLUMN finalized_at TEXT;
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `status` | TEXT | 'draft' | Period status ('draft' or 'finalized') |
| `finalized_at` | TEXT | NULL | Timestamp when finalized |

## API Endpoint

### POST `/api/billing/:id/finalize`

Finalize a billing period, triggering PF/ESI computation.

**Request:**
```bash
POST /api/billing/1/finalize
```

**Response (Success - First Time):**
```json
{
  "success": true,
  "message": "Billing period finalized successfully",
  "finalized": true,
  "computation_id": 1,
  "statutory_summary": {
    "total_pf_employee": 5160,
    "total_pf_employer": 5160,
    "total_esi_employee": 233,
    "total_esi_employer": 1008,
    "total_deductions": 5393,
    "total_contributions": 6168
  }
}
```

**Response (Already Finalized - Idempotent):**
```json
{
  "message": "Billing period already finalized",
  "finalized": true,
  "finalized_at": "2025-12-28 19:15:00"
}
```

**Response (No Employees):**
```json
{
  "error": "Cannot finalize: No employees assigned to this billing period"
}
```

## Finalization Workflow

```
Admin clicks "Finalize"
    ↓
1. Validate Billing Period
   - Check period exists
   - Check not already finalized
   - Check has employees
    ↓
2. Fetch Data
   - Employee wages
   - Current statutory config
    ↓
3. Compute PF/ESI
   - Call computation engine
   - Generate results
    ↓
4. Persist (Atomic)
   - Update period status → 'finalized'
   - Set finalized_at timestamp
   - Store computation results
   - Lock computation
    ↓
5. Return Summary
   - Statutory totals
   - Computation ID
```

## Idempotency

The finalization endpoint is **idempotent**:

| Scenario | Behavior |
|----------|----------|
| First call | Computes and persists |
| Second call | Returns existing data |
| Computation exists | Ensures it's locked |
| Status already finalized | Returns success immediately |

**Example:**
```bash
# First call
POST /api/billing/1/finalize
→ Computes, stores, returns results

# Second call (same period)
POST /api/billing/1/finalize
→ Returns "already finalized" message
→ No duplicate data created
```

## Validation Rules

Before finalization, the system checks:

1. ✅ **Billing Period Exists**
   - Returns 404 if not found

2. ✅ **Has Employees**
   - Returns 400 if no employees assigned
   - Message: "Cannot finalize: No employees assigned"

3. ✅ **Statutory Config Exists**
   - Returns 500 if config not found
   - Should never happen (seeded by default)

4. ✅ **Not Already Finalized**
   - Returns success message if already finalized
   - Ensures idempotency

## Computation Storage

When finalizing, the system:

1. **Computes PF/ESI**
   - Uses current statutory configuration
   - Processes all employees in billing period

2. **Stores Results**
   - Aggregate totals in `billing_period_statutory_computation`
   - Employee details in `billing_employee_statutory`
   - Configuration snapshot (JSON)

3. **Locks Computation**
   - Sets `locked = 1`
   - Prevents any recomputation
   - Even force recompute will fail

4. **Updates Period Status**
   - Sets `status = 'finalized'`
   - Sets `finalized_at = CURRENT_TIMESTAMP`

## State Transitions

```
Draft Period
    ↓
  Finalize
    ↓
Finalized Period
(Immutable)
```

**Rules:**
- Draft → Finalized: ✅ Allowed (via finalize endpoint)
- Finalized → Draft: ❌ Not allowed (no unfinalizeendpoint)
- Draft → Draft: ✅ Can edit employees/wages
- Finalized → Finalized: ✅ Idempotent (returns success)

## Impact on Existing Features

### ✅ **No Impact**

1. **Document Generation**
   - Still works for both draft and finalized periods
   - No changes to PDF generation

2. **Employee Assignment**
   - Can still add/edit employees in draft periods
   - Should be blocked in finalized periods (future enhancement)

3. **Wage Updates**
   - Can still update wages in draft periods
   - Should be blocked in finalized periods (future enhancement)

### 🔄 **Enhanced**

1. **Billing Period List**
   - Now shows status (draft/finalized)
   - Can filter by status (future enhancement)

2. **Billing Period Detail**
   - Shows finalized status
   - Shows finalized timestamp
   - Shows statutory summary (future enhancement)

## Example Usage

### Scenario 1: Normal Finalization

```bash
# Create billing period
POST /api/billing
Body: {
  "project_id": 1,
  "from_date": "2025-01-01",
  "to_date": "2025-01-31",
  "label": "January 2025"
}
→ Returns: { "id": 1, "status": "draft", ... }

# Add employees
POST /api/billing/1/employees
Body: { "employee_id": 1, "days_worked": 26, "wage_amount": 13000 }
→ Returns: { "success": true }

# Finalize
POST /api/billing/1/finalize
→ Returns: {
    "success": true,
    "finalized": true,
    "statutory_summary": { ... }
  }

# Check status
GET /api/billing/1
→ Returns: { "status": "finalized", "finalized_at": "2025-12-28 19:15:00", ... }
```

### Scenario 2: Attempt to Finalize Twice

```bash
# First finalization
POST /api/billing/1/finalize
→ Returns: { "success": true, "finalized": true, ... }

# Second finalization (idempotent)
POST /api/billing/1/finalize
→ Returns: {
    "message": "Billing period already finalized",
    "finalized": true,
    "finalized_at": "2025-12-28 19:15:00"
  }
```

### Scenario 3: Finalize Empty Period

```bash
# Create period without employees
POST /api/billing
Body: { "project_id": 1, "from_date": "2025-02-01", "to_date": "2025-02-28" }

# Attempt to finalize
POST /api/billing/2/finalize
→ Returns (400): {
    "error": "Cannot finalize: No employees assigned to this billing period"
  }
```

## Security Considerations

- ✅ Finalization is a one-way operation
- ✅ Locked computations cannot be modified
- ✅ Configuration snapshot prevents tampering
- ✅ Idempotency prevents duplicate data
- ⚠️ No authentication yet (Phase 2.3)
- ⚠️ Should be admin-only (Phase 2.3)

## Future Enhancements (Phase 2.3)

1. **Unfinalize Endpoint**
   - Admin-only
   - Unlocks computation
   - Reverts status to draft
   - Audit log entry

2. **Edit Protection**
   - Block employee assignment in finalized periods
   - Block wage updates in finalized periods
   - Show warning in UI

3. **Bulk Finalization**
   - Finalize multiple periods at once
   - Progress indicator
   - Error handling

4. **Approval Workflow**
   - Multi-step approval
   - Review before finalization
   - Approval history

## Files Modified

### Modified
- **`src/server/db/init.ts`**
  - Added migration for `status` and `finalized_at` fields

- **`src/server/api/billing.ts`**
  - Added `POST /:id/finalize` endpoint (~210 lines)
  - Integrated computation engine
  - Implemented idempotency

### Created
- **`PHASE_2.2_STEP_4.md`** (this document)

## Testing Checklist

- [ ] Finalize billing period with employees
- [ ] Verify status changes to 'finalized'
- [ ] Verify finalized_at timestamp is set
- [ ] Verify computation is created and locked
- [ ] Attempt to finalize twice (idempotency)
- [ ] Attempt to finalize empty period (should fail)
- [ ] Verify statutory summary in response
- [ ] Check computation via GET /api/statutory-computation/:id
- [ ] Verify config snapshot is stored
- [ ] Attempt to recompute finalized period (should fail)

## Performance

- **Computation Time:** O(n) where n = number of employees
- **Storage:** ~1KB per employee
- **Transaction:** Atomic (all or nothing)
- **Idempotency:** Fast check (single query)

## Notes

- **No Auto-Finalization:** Admin must explicitly finalize
- **No Unfinaliz:** Once finalized, cannot be reverted (yet)
- **No Edit Protection:** Can still edit finalized periods (should be blocked in future)
- **No UI Changes:** Backend-only implementation

## Next Steps (Phase 2.2 - Step 5)

1. **UI Integration**
   - Add "Finalize" button to billing detail page
   - Show finalized status badge
   - Display statutory summary
   - Block edits on finalized periods

2. **Document Integration**
   - Include PF/ESI in wage declarations
   - Add statutory summary section
   - Show finalized status on documents

3. **Reporting**
   - Finalized periods report
   - Statutory compliance report
   - Period comparison

---

**Status:** ✅ Complete - Ready for UI integration
