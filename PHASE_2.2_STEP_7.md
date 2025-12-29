# Phase 2.2 - Step 7: Employee Portal Statutory View

## Overview
This document describes the implementation of read-only PF/ESI deduction visibility for employees in the Employee Portal.

## Implementation Date
2025-12-29

## Design Principles

### 1. **Read-Only Access**
- Employees can only view their own data
- No editing capabilities
- No override visibility
- No configuration access

### 2. **Privacy & Security**
- JWT authentication required
- Only own data visible
- No access to other employees
- No access to company-wide data

### 3. **Mobile-Friendly**
- Responsive design
- Touch-friendly interface
- Optimized for small screens

## API Endpoints

### 1. GET `/api/portal/statutory`

Get statutory deductions history for logged-in employee.

**Authentication:** JWT required

**Response:**
```json
[
  {
    "gross_wage": 13000,
    "pf_applicable": 1,
    "pf_employee_amount": 1560,
    "pf_employer_amount": 1560,
    "esi_applicable": 1,
    "esi_employee_amount": 98,
    "esi_employer_amount": 423,
    "total_employee_deduction": 1658,
    "net_payable": 11342,
    "from_date": "2025-01-01",
    "to_date": "2025-01-31",
    "label": "January 2025",
    "billing_period_id": 1,
    "site_name": "Construction Site A",
    "client_name": "ABC Corp",
    "computed_at": "2025-12-28 19:15:00"
  }
]
```

**Features:**
- Returns all finalized periods for employee
- Ordered by date (newest first)
- Includes project context
- Shows computation timestamp

### 2. GET `/api/portal/statutory/:billingPeriodId`

Get detailed statutory information for a specific period.

**Authentication:** JWT required

**Response:**
```json
{
  "id": 5,
  "computation_id": 1,
  "employee_id": 1,
  "gross_wage": 13000,
  "basic_wage": 6500,
  "custom_wage": 13000,
  "pf_applicable": true,
  "pf_wage_basis": 13000,
  "pf_wage_capped": 13000,
  "pf_employee_amount": 1560,
  "pf_employer_amount": 1560,
  "pf_total_amount": 3120,
  "pf_explanation": "Wage Basis (gross): ₹13000.00 | Employee (12%): ₹1560 | Employer (12%): ₹1560",
  "esi_applicable": true,
  "esi_wage_basis": 13000,
  "esi_employee_amount": 98,
  "esi_employer_amount": 423,
  "esi_total_amount": 521,
  "esi_explanation": "Wage Basis (gross): ₹13000.00 | Employee (0.75%): ₹98 | Employer (3.25%): ₹423",
  "total_employee_deduction": 1658,
  "total_employer_contribution": 1983,
  "net_payable": 11342,
  "from_date": "2025-01-01",
  "to_date": "2025-01-31",
  "label": "January 2025",
  "site_name": "Construction Site A",
  "client_name": "ABC Corp",
  "computed_at": "2025-12-28 19:15:00",
  "config_snapshot": {
    "pf_employee_rate": 12.0,
    "pf_employer_rate": 12.0,
    "esi_employee_rate": 0.75,
    "esi_employer_rate": 3.25
  }
}
```

**Features:**
- Detailed breakdown
- Explanation strings
- Configuration snapshot (rates used)
- Project context

## Data Access Rules

### What Employees Can See
- ✅ Own PF deductions (employee share)
- ✅ Own ESI deductions (employee share)
- ✅ Employer contributions (informational)
- ✅ Net payable amount
- ✅ Gross wage
- ✅ Period dates and project
- ✅ Computation timestamp

### What Employees Cannot See
- ❌ Other employees' data
- ❌ Company-wide totals
- ❌ Configuration settings (beyond rates used)
- ❌ Override history
- ❌ Admin functions
- ❌ Unlock/lock controls

## Security Implementation

### JWT Authentication
```typescript
portal.use("/*", jwt({ secret: SECRET }));
```

**Payload:**
```json
{
  "id": 1,
  "username": "EMP1",
  "role": "employee"
}
```

### Data Filtering
```sql
WHERE bes.employee_id = ?
-- ? = payload.id (from JWT)
```

**Ensures:**
- Only own data returned
- No cross-employee access
- Automatic filtering by authentication

## Use Cases

### 1. **View Deduction History**
Employee wants to see PF/ESI deductions over time.

**Flow:**
1. Login to portal
2. Navigate to "Statutory" section
3. See list of all periods with deductions
4. View amounts per period

### 2. **Understand Deductions**
Employee wants to know why certain amounts were deducted.

**Flow:**
1. Select a specific period
2. View detailed breakdown
3. See PF and ESI separately
4. Read explanation strings

### 3. **Verify Net Pay**
Employee wants to verify their net payable amount.

**Flow:**
1. View statutory detail
2. See: Gross Wage - Deductions = Net Payable
3. Understand the calculation

### 4. **Track Contributions**
Employee wants to track employer contributions (informational).

**Flow:**
1. View statutory history
2. See employer PF and ESI contributions
3. Understand total statutory cost

## Example Responses

### History View
```json
[
  {
    "billing_period_id": 3,
    "from_date": "2025-03-01",
    "to_date": "2025-03-31",
    "label": "March 2025",
    "site_name": "Site C",
    "client_name": "XYZ Ltd",
    "gross_wage": 15000,
    "pf_employee_amount": 1800,
    "esi_employee_amount": 0,
    "total_employee_deduction": 1800,
    "net_payable": 13200,
    "computed_at": "2025-03-31 18:00:00"
  },
  {
    "billing_period_id": 2,
    "from_date": "2025-02-01",
    "to_date": "2025-02-28",
    "label": "February 2025",
    "site_name": "Site B",
    "client_name": "ABC Corp",
    "gross_wage": 14000,
    "pf_employee_amount": 1680,
    "esi_employee_amount": 105,
    "total_employee_deduction": 1785,
    "net_payable": 12215,
    "computed_at": "2025-02-28 17:30:00"
  }
]
```

### Detail View
```json
{
  "billing_period_id": 2,
  "from_date": "2025-02-01",
  "to_date": "2025-02-28",
  "label": "February 2025",
  "site_name": "Site B",
  "client_name": "ABC Corp",
  "gross_wage": 14000,
  "pf_applicable": true,
  "pf_employee_amount": 1680,
  "pf_employer_amount": 1680,
  "pf_explanation": "Wage Basis (gross): ₹14000.00 | Employee (12%): ₹1680 | Employer (12%): ₹1680",
  "esi_applicable": true,
  "esi_employee_amount": 105,
  "esi_employer_amount": 455,
  "esi_explanation": "Wage Basis (gross): ₹14000.00 | Employee (0.75%): ₹105 | Employer (3.25%): ₹455",
  "total_employee_deduction": 1785,
  "total_employer_contribution": 2135,
  "net_payable": 12215,
  "computed_at": "2025-02-28 17:30:00"
}
```

## UI Considerations (Future)

### History Page
```
┌─────────────────────────────────────┐
│ My Statutory Deductions             │
├─────────────────────────────────────┤
│ March 2025                          │
│ Site C • XYZ Ltd                    │
│ Gross: ₹15,000                      │
│ PF: ₹1,800 | ESI: ₹0                │
│ Net Pay: ₹13,200                    │
├─────────────────────────────────────┤
│ February 2025                       │
│ Site B • ABC Corp                   │
│ Gross: ₹14,000                      │
│ PF: ₹1,680 | ESI: ₹105              │
│ Net Pay: ₹12,215                    │
└─────────────────────────────────────┘
```

### Detail Page
```
┌─────────────────────────────────────┐
│ February 2025                       │
│ Site B • ABC Corp                   │
├─────────────────────────────────────┤
│ Gross Wage          ₹14,000         │
│                                     │
│ Deductions:                         │
│ PF (12%)            ₹1,680          │
│ ESI (0.75%)           ₹105          │
│ ─────────────────────────           │
│ Total Deductions    ₹1,785          │
│                                     │
│ Net Payable        ₹12,215          │
│                                     │
│ Employer Contributions:             │
│ PF (12%)            ₹1,680          │
│ ESI (3.25%)           ₹455          │
└─────────────────────────────────────┘
```

## Privacy & Compliance

### Data Minimization
- Only necessary data exposed
- No sensitive company data
- No other employees' data

### Transparency
- Employees see their deductions
- Understand calculations
- Know employer contributions

### Audit Trail
- All access logged via JWT
- Employee ID in every query
- Timestamp in responses

## Performance

- **History Query:** O(n) where n = employee's periods
- **Detail Query:** O(1) - Single record
- **Response Size:** ~500 bytes per period
- **Caching:** Can be cached per employee

## Error Handling

### No Data Found
```json
{
  "error": "No statutory data found for this period"
}
```

**Reasons:**
- Period not finalized
- Employee not in that period
- Invalid billing period ID

### Authentication Failed
```json
{
  "error": "Unauthorized"
}
```

**Reasons:**
- No JWT token
- Invalid token
- Expired token

## Files Modified

### Modified
- **`src/server/api/portal.ts`**
  - Added `GET /statutory` endpoint
  - Added `GET /statutory/:billingPeriodId` endpoint
  - JWT authentication enforced
  - Employee-specific data filtering

### Documentation
- **`PHASE_2.2_STEP_7.md`** (this document)

## Testing Checklist

- [ ] Login as employee
- [ ] Call `GET /api/portal/statutory`
- [ ] Verify only own data returned
- [ ] Verify periods are ordered correctly
- [ ] Call `GET /api/portal/statutory/:id` for a period
- [ ] Verify detailed data returned
- [ ] Verify explanation strings present
- [ ] Attempt to access another employee's data (should fail)
- [ ] Verify JWT authentication required
- [ ] Test with employee who has no finalized periods

## Integration with Existing Portal

### Current Portal Features
1. **Profile** - `/api/portal/me`
2. **Attendance History** - `/api/portal/attendance`
3. **Payslip Generation** - `/api/portal/payslip/:id`

### New Features
4. **Statutory History** - `/api/portal/statutory`
5. **Statutory Detail** - `/api/portal/statutory/:billingPeriodId`

### Consistency
- Same authentication mechanism
- Same response format
- Same error handling
- Same data filtering approach

## Future Enhancements (Phase 2.3)

1. **Enhanced Payslip**
   - Include PF/ESI in payslip PDF
   - Show deductions breakdown
   - Add employer contributions

2. **Yearly Summary**
   - Total PF contributions for year
   - Total ESI contributions for year
   - Tax planning information

3. **Notifications**
   - Alert when new period finalized
   - Email with statutory summary

4. **Download Options**
   - CSV export of history
   - PDF summary report

5. **Comparison**
   - Compare periods
   - Trend analysis
   - Visual charts

## Notes

- **Read-Only:** Employees cannot edit or override
- **Automatic:** Data appears when period is finalized
- **Transparent:** Full calculation visibility
- **Secure:** JWT authentication enforced
- **Private:** Only own data visible

---

**Status:** ✅ Complete - Backend ready for UI integration
