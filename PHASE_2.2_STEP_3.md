# Phase 2.2 - Step 3: PF/ESI Computation Persistence

## Overview
This document describes the implementation of persistent storage for PF/ESI computation results with immutability controls and audit trail.

## Implementation Date
2025-12-28

## Design Principles

### 1. **Immutability by Default**
- Computations cannot be overwritten without explicit force flag
- Locked computations cannot be modified at all
- Audit trail preserved via timestamps

### 2. **Configuration Snapshot**
- Stores the exact configuration used for computation
- Enables audit and verification
- Prevents confusion from config changes

### 3. **Two-Level Storage**
- Billing period aggregates
- Individual employee details
- Linked via computation_id

## Database Schema

### Table: `billing_period_statutory_computation`

Stores aggregate computation results for a billing period.

```sql
CREATE TABLE billing_period_statutory_computation (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  billing_period_id INTEGER NOT NULL,
  config_snapshot TEXT NOT NULL,              -- JSON of StatutoryConfig used
  computed_at TEXT DEFAULT CURRENT_TIMESTAMP,
  locked BOOLEAN DEFAULT 0,                   -- Prevents recomputation
  total_gross_wages REAL NOT NULL DEFAULT 0,
  total_pf_employee REAL NOT NULL DEFAULT 0,
  total_pf_employer REAL NOT NULL DEFAULT 0,
  total_esi_employee REAL NOT NULL DEFAULT 0,
  total_esi_employer REAL NOT NULL DEFAULT 0,
  total_employee_deductions REAL NOT NULL DEFAULT 0,
  total_employer_contributions REAL NOT NULL DEFAULT 0,
  total_net_payable REAL NOT NULL DEFAULT 0,
  FOREIGN KEY(billing_period_id) REFERENCES billing_periods(id),
  UNIQUE(billing_period_id)
);
```

### Table: `billing_employee_statutory`

Stores per-employee computation details.

```sql
CREATE TABLE billing_employee_statutory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  computation_id INTEGER NOT NULL,
  employee_id INTEGER NOT NULL,
  
  -- Wage Components
  gross_wage REAL NOT NULL DEFAULT 0,
  basic_wage REAL NOT NULL DEFAULT 0,
  custom_wage REAL NOT NULL DEFAULT 0,
  
  -- PF Details
  pf_applicable BOOLEAN DEFAULT 0,
  pf_wage_basis REAL NOT NULL DEFAULT 0,
  pf_wage_capped REAL NOT NULL DEFAULT 0,
  pf_employee_amount REAL NOT NULL DEFAULT 0,
  pf_employer_amount REAL NOT NULL DEFAULT 0,
  pf_total_amount REAL NOT NULL DEFAULT 0,
  pf_explanation TEXT,
  
  -- ESI Details
  esi_applicable BOOLEAN DEFAULT 0,
  esi_wage_basis REAL NOT NULL DEFAULT 0,
  esi_employee_amount REAL NOT NULL DEFAULT 0,
  esi_employer_amount REAL NOT NULL DEFAULT 0,
  esi_total_amount REAL NOT NULL DEFAULT 0,
  esi_explanation TEXT,
  
  -- Totals
  total_employee_deduction REAL NOT NULL DEFAULT 0,
  total_employer_contribution REAL NOT NULL DEFAULT 0,
  net_payable REAL NOT NULL DEFAULT 0,
  
  FOREIGN KEY(computation_id) REFERENCES billing_period_statutory_computation(id) ON DELETE CASCADE,
  FOREIGN KEY(employee_id) REFERENCES employees(id),
  UNIQUE(computation_id, employee_id)
);
```

## API Endpoints

### 1. GET `/api/statutory-computation/:billingPeriodId`

Retrieve existing computation for a billing period.

**Response (if computed):**
```json
{
  "computed": true,
  "locked": false,
  "computed_at": "2025-12-28 19:00:00",
  "result": {
    "billing_period_id": 1,
    "from_date": "2025-01-01",
    "to_date": "2025-01-31",
    "config_snapshot": { /* StatutoryConfig */ },
    "employee_results": [ /* ComputationResult[] */ ],
    "total_gross_wages": 56000,
    "total_pf_employee": 5160,
    "total_pf_employer": 5160,
    "total_esi_employee": 233,
    "total_esi_employer": 1008,
    "total_employee_deductions": 5393,
    "total_employer_contributions": 6168,
    "total_net_payable": 50607
  }
}
```

**Response (if not computed):**
```json
{
  "computed": false,
  "message": "No computation found"
}
```

### 2. POST `/api/statutory-computation/:billingPeriodId/compute`

Compute and persist PF/ESI for a billing period.

**Request Body:**
```json
{
  "force": false  // Optional: set to true to recompute
}
```

**Behavior:**
- If computation exists and `force=false`: Returns 409 error
- If computation is locked: Returns 403 error (even with force)
- Otherwise: Computes and persists results

**Response (success):**
```json
{
  "success": true,
  "computation_id": 1,
  "result": { /* BillingPeriodComputationResult */ }
}
```

**Response (already exists):**
```json
{
  "error": "Computation already exists. Use force=true to recompute.",
  "locked": false,
  "computed_at": "2025-12-28 19:00:00"
}
```

**Response (locked):**
```json
{
  "error": "Computation is locked and cannot be recomputed",
  "locked": true,
  "computed_at": "2025-12-28 19:00:00"
}
```

### 3. POST `/api/statutory-computation/:billingPeriodId/lock`

Lock computation to prevent recomputation.

**Response:**
```json
{
  "success": true,
  "locked": true
}
```

### 4. POST `/api/statutory-computation/:billingPeriodId/unlock`

Unlock computation (admin only).

**Response:**
```json
{
  "success": true,
  "locked": false
}
```

### 5. DELETE `/api/statutory-computation/:billingPeriodId`

Delete computation (only if not locked).

**Response (success):**
```json
{
  "success": true,
  "message": "Computation deleted"
}
```

**Response (locked):**
```json
{
  "error": "Cannot delete locked computation"
}
```

## Computation Flow

```
1. User triggers computation
   ↓
2. Check if already computed
   ├─ Yes, not forced → Return 409
   ├─ Yes, locked → Return 403
   └─ No or forced → Continue
   ↓
3. Fetch billing period data
   - Period dates
   - Employee wages
   - Current statutory config
   ↓
4. Call computation engine
   - computeBillingPeriodStatutory()
   ↓
5. Persist results
   - Insert into billing_period_statutory_computation
   - Insert into billing_employee_statutory
   ↓
6. Return results
```

## Immutability Rules

| Scenario | Allowed | Requires |
|----------|---------|----------|
| First computation | ✅ Yes | None |
| Recompute (not locked) | ✅ Yes | `force=true` |
| Recompute (locked) | ❌ No | Must unlock first |
| Delete (not locked) | ✅ Yes | None |
| Delete (locked) | ❌ No | Must unlock first |
| Lock | ✅ Yes | Computation exists |
| Unlock | ✅ Yes | Admin only |

## Configuration Snapshot

The `config_snapshot` field stores the exact `StatutoryConfig` used for computation as JSON:

```json
{
  "company_id": 1,
  "pf_enabled": true,
  "pf_wage_basis": "gross",
  "pf_employee_rate": 12.0,
  "pf_employer_rate": 12.0,
  "pf_wage_ceiling": 15000.0,
  "pf_enforce_ceiling": true,
  "esi_enabled": true,
  "esi_threshold": 21000.0,
  "esi_employee_rate": 0.75,
  "esi_employer_rate": 3.25,
  "rounding_mode": "round"
}
```

**Benefits:**
- Audit trail: Know exactly what config was used
- Reproducibility: Can verify calculations
- Config changes don't affect past computations

## Data Integrity

### Cascading Deletes
- Deleting a `billing_period_statutory_computation` automatically deletes related `billing_employee_statutory` records
- Uses `ON DELETE CASCADE`

### Unique Constraints
- One computation per billing period
- One employee result per computation

### Foreign Keys
- `billing_period_id` → `billing_periods(id)`
- `computation_id` → `billing_period_statutory_computation(id)`
- `employee_id` → `employees(id)`

## Example Usage

### Compute for First Time

```bash
POST /api/statutory-computation/1/compute
```

**Response:**
```json
{
  "success": true,
  "computation_id": 1,
  "result": {
    "total_pf_employee": 5160,
    "total_esi_employee": 233,
    ...
  }
}
```

### Attempt Recompute (Fails)

```bash
POST /api/statutory-computation/1/compute
```

**Response (409):**
```json
{
  "error": "Computation already exists. Use force=true to recompute.",
  "locked": false,
  "computed_at": "2025-12-28 19:00:00"
}
```

### Force Recompute

```bash
POST /api/statutory-computation/1/compute
Body: { "force": true }
```

**Response:**
```json
{
  "success": true,
  "computation_id": 1,
  "result": { ... }
}
```

### Lock Computation

```bash
POST /api/statutory-computation/1/lock
```

**Response:**
```json
{
  "success": true,
  "locked": true
}
```

### Attempt Recompute (Locked - Fails)

```bash
POST /api/statutory-computation/1/compute
Body: { "force": true }
```

**Response (403):**
```json
{
  "error": "Computation is locked and cannot be recomputed",
  "locked": true,
  "computed_at": "2025-12-28 19:00:00"
}
```

## Files Created/Modified

### Created
- **`src/server/api/statutory-computation.ts`** (~400 lines)
  - API endpoints for computation persistence
  - Helper functions for storage/retrieval
  - Immutability controls

### Modified
- **`src/server/db/init.ts`**
  - Added `billing_period_statutory_computation` table
  - Added `billing_employee_statutory` table

- **`src/server/server.ts`**
  - Registered `/api/statutory-computation` route

- **`src/server/utils/statutory-computation.ts`**
  - Re-exported `StatutoryConfig` type

## Testing Checklist

- [ ] Compute for first time
- [ ] Retrieve existing computation
- [ ] Attempt recompute without force (should fail)
- [ ] Recompute with force (should succeed)
- [ ] Lock computation
- [ ] Attempt recompute when locked (should fail)
- [ ] Unlock computation
- [ ] Delete unlocked computation
- [ ] Attempt delete locked computation (should fail)
- [ ] Verify config snapshot is stored correctly
- [ ] Verify employee results are stored correctly
- [ ] Verify aggregates match sum of employee results

## Security Considerations

- ✅ Locked computations cannot be modified
- ✅ Force recompute requires explicit flag
- ✅ Configuration snapshot prevents tampering
- ✅ Timestamps provide audit trail
- ⚠️ No authentication yet (Phase 2.3)
- ⚠️ Unlock should be admin-only (Phase 2.3)

## Performance

- **Storage:** ~1KB per employee per billing period
- **Retrieval:** Single query with JOIN
- **Computation:** O(n) where n = number of employees
- **Persistence:** Transaction-based (atomic)

## Future Enhancements (Phase 2.3)

1. **Authentication**
   - Require admin role for unlock
   - Require admin role for force recompute

2. **Audit Log**
   - Track who computed/locked/unlocked
   - Track configuration changes

3. **Versioning**
   - Support multiple computation versions
   - Compare different configurations

4. **Bulk Operations**
   - Compute multiple billing periods
   - Lock/unlock in batch

## Notes

- **No UI Changes Yet:** This is backend-only
- **No Auto-Recompute:** Config changes don't trigger recomputation
- **No Overrides:** Manual adjustments not yet supported
- **Immutable by Design:** Prevents accidental data loss

## Next Steps (Phase 2.2 - Step 4)

1. **UI Integration**
   - Display computed PF/ESI in billing detail
   - Add "Compute" button
   - Show lock status
   - Display computation timestamp

2. **Document Generation**
   - Include PF/ESI in wage declarations
   - Add statutory summary section

3. **Reporting**
   - PF/ESI summary reports
   - Export for compliance

---

**Status:** ✅ Complete - Ready for UI integration
