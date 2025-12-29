# Phase 2.2 - Step 2: PF/ESI Computation Engine

## Overview
This document describes the implementation of a deterministic, pure computation engine for PF (Provident Fund) and ESI (Employee State Insurance) calculations.

## Implementation Date
2025-12-28

## Design Principles

### 1. **Pure Functions**
- No database writes
- No side effects
- Deterministic output for given input
- Fully testable in isolation

### 2. **Explainability**
- Every computation includes human-readable explanation
- Trace-able calculation steps
- Clear basis for each amount

### 3. **Configuration-Driven**
- All rules read from `StatutoryConfig`
- Respects enable/disable flags
- Supports multiple wage basis types
- Configurable rounding modes

## Architecture

```
Input                    Computation Engine              Output
─────                    ──────────────────              ──────
Employee Wages    ──►    computeEmployeeStatutory   ──►  ComputationResult
+ Config                                                  (PF + ESI amounts)

Billing Period    ──►    computeBillingPeriodStatutory  BillingPeriodResult
+ Employees                                              (Aggregated totals)
+ Config
```

## Core Functions

### 1. `computeEmployeeStatutory()`
Computes PF and ESI for a single employee.

**Input:**
```typescript
{
  employee_id: number;
  name: string;
  days_worked: number;
  daily_wage: number;
  wage_amount: number;
  pf_applicable: boolean;
  esi_applicable: boolean;
}
```

**Output:**
```typescript
{
  employee_id: number;
  name: string;
  
  // Wage Components
  gross_wage: number;
  basic_wage: number;
  custom_wage: number;
  
  // PF Details
  pf_applicable: boolean;
  pf_wage_basis: number;
  pf_wage_capped: number;
  pf_employee_amount: number;
  pf_employer_amount: number;
  pf_total_amount: number;
  pf_explanation: string;
  
  // ESI Details
  esi_applicable: boolean;
  esi_wage_basis: number;
  esi_employee_amount: number;
  esi_employer_amount: number;
  esi_total_amount: number;
  esi_explanation: string;
  
  // Totals
  total_employee_deduction: number;
  total_employer_contribution: number;
  net_payable: number;
}
```

### 2. `computeBillingPeriodStatutory()`
Computes PF and ESI for an entire billing period with multiple employees.

**Input:**
```typescript
{
  billing_period_id: number;
  from_date: string;
  to_date: string;
  employees: EmployeeWageInput[];
  config: StatutoryConfig;
}
```

**Output:**
```typescript
{
  billing_period_id: number;
  from_date: string;
  to_date: string;
  config_snapshot: StatutoryConfig;
  employee_results: ComputationResult[];
  
  // Aggregates
  total_gross_wages: number;
  total_pf_employee: number;
  total_pf_employer: number;
  total_esi_employee: number;
  total_esi_employer: number;
  total_employee_deductions: number;
  total_employer_contributions: number;
  total_net_payable: number;
}
```

## Computation Rules

### PF (Provident Fund)

**Applicability Checks:**
1. `config.pf_enabled` must be `true`
2. `employee.pf_applicable` must be `true`

**Wage Basis Calculation:**
- **Gross**: Full wage amount
- **Basic**: 50% of gross wage (industry standard for contractors)
- **Custom**: Full wage amount (configurable in future)

**Ceiling Application:**
- If `config.pf_enforce_ceiling` is `true`:
  - Wage basis capped at `config.pf_wage_ceiling` (₹15,000)
- Otherwise: No ceiling applied

**Contribution Calculation:**
```
Employee Contribution = (Wage Basis × pf_employee_rate) / 100
Employer Contribution = (Wage Basis × pf_employer_rate) / 100
```

**Rounding:**
Applied per `config.rounding_mode` ('round', 'floor', 'ceil')

### ESI (Employee State Insurance)

**Applicability Checks:**
1. `config.esi_enabled` must be `true`
2. `employee.esi_applicable` must be `true`
3. `gross_wage` must be ≤ `config.esi_threshold` (₹21,000)

**Wage Basis:**
- Always uses **gross wage** (ESI regulation)

**Contribution Calculation:**
```
Employee Contribution = (Gross Wage × esi_employee_rate) / 100
Employer Contribution = (Gross Wage × esi_employer_rate) / 100
```

**Rounding:**
Applied per `config.rounding_mode`

## Rounding Modes

| Mode | Behavior | Example (1560.7) |
|------|----------|------------------|
| `round` | Nearest integer | 1561 |
| `floor` | Round down | 1560 |
| `ceil` | Round up | 1561 |

## Test Results

### Test Coverage
All 11 unit tests passed with 100% success rate:

1. ✅ Basic PF Computation (Below Ceiling)
2. ✅ PF Computation (Above Ceiling - Capping)
3. ✅ PF with Basic Wage Basis
4. ✅ ESI Computation (Below Threshold)
5. ✅ ESI Not Applicable (Above Threshold)
6. ✅ Employee Not Enrolled in PF
7. ✅ PF/ESI Disabled in Configuration
8. ✅ Rounding Modes
9. ✅ Billing Period Computation (Multiple Employees)
10. ✅ Configuration Validation
11. ✅ Computation Summary

### Sample Test Case

**Input:**
- Employee: Test Employee
- Gross Wage: ₹13,000
- PF Applicable: Yes
- ESI Applicable: Yes
- Config: Default (12% PF, 0.75% ESI employee)

**Expected Output:**
- PF Employee: ₹1,560 (12% of ₹13,000)
- PF Employer: ₹1,560 (12% of ₹13,000)
- ESI Employee: ₹98 (0.75% of ₹13,000, rounded)
- ESI Employer: ₹423 (3.25% of ₹13,000, rounded)
- Total Deduction: ₹1,658
- Net Payable: ₹11,342

**Actual Output:** ✅ Matches expected

## Example Usage

```typescript
import { 
  computeEmployeeStatutory,
  computeBillingPeriodStatutory 
} from './statutory-computation';

// Single Employee
const employee = {
  employee_id: 1,
  name: 'John Doe',
  days_worked: 26,
  daily_wage: 500,
  wage_amount: 13000,
  pf_applicable: true,
  esi_applicable: true
};

const config = {
  company_id: 1,
  pf_enabled: true,
  pf_wage_basis: 'gross',
  pf_employee_rate: 12.0,
  pf_employer_rate: 12.0,
  pf_wage_ceiling: 15000.0,
  pf_enforce_ceiling: true,
  esi_enabled: true,
  esi_threshold: 21000.0,
  esi_employee_rate: 0.75,
  esi_employer_rate: 3.25,
  rounding_mode: 'round'
};

const result = computeEmployeeStatutory(employee, config);

console.log(`PF Employee: ₹${result.pf_employee_amount}`);
console.log(`ESI Employee: ₹${result.esi_employee_amount}`);
console.log(`Net Payable: ₹${result.net_payable}`);
console.log(`Explanation: ${result.pf_explanation}`);
```

## Utility Functions

### `validateConfig()`
Validates statutory configuration before computation.

**Returns:**
```typescript
{
  valid: boolean;
  errors: string[];
}
```

**Validation Rules:**
- PF/ESI rates must be between 0 and 100
- Wage ceiling must be positive
- ESI threshold must be positive

### `getComputationSummary()`
Generates human-readable summary of billing period computation.

**Example Output:**
```
Billing Period: 2025-01-01 to 2025-01-31
Employees Processed: 3

Totals:
  Gross Wages: ₹56000.00
  PF Employee: ₹5160.00
  PF Employer: ₹5160.00
  ESI Employee: ₹233.00
  ESI Employer: ₹1008.00
  Total Deductions: ₹5393.00
  Total Contributions: ₹6168.00
  Net Payable: ₹50607.00
```

## Edge Cases Handled

1. **Employee not enrolled in PF/ESI**
   - Returns zero amounts with explanation

2. **PF/ESI disabled in configuration**
   - Returns zero amounts with explanation

3. **Wage above ESI threshold**
   - ESI not applicable, returns zero with explanation

4. **Wage above PF ceiling**
   - Caps wage at ceiling if `pf_enforce_ceiling` is true

5. **Decimal amounts**
   - Properly rounded per configuration

6. **Zero wages**
   - Returns zero contributions

## Files Created

### Implementation
- **File:** `src/server/utils/statutory-computation.ts`
- **Lines:** ~550
- **Exports:**
  - `computeEmployeeStatutory()`
  - `computeBillingPeriodStatutory()`
  - `validateConfig()`
  - `getComputationSummary()`
  - Type definitions

### Tests
- **File:** `src/server/utils/statutory-computation.test.ts`
- **Lines:** ~400
- **Coverage:** 11 test cases
- **Success Rate:** 100%

## Integration Points (Future)

This computation engine will be integrated in Step 3:

1. **Billing Detail API**
   - Call `computeBillingPeriodStatutory()` when fetching billing details
   - Return computed PF/ESI amounts alongside wage data

2. **Document Generation**
   - Use computation results in wage declaration PDFs
   - Include PF/ESI breakdowns in attendance summaries

3. **Payroll Reports**
   - Generate PF/ESI summary reports
   - Export data for statutory compliance

## Performance Characteristics

- **Time Complexity:** O(n) where n = number of employees
- **Space Complexity:** O(n) for results storage
- **Deterministic:** Same input always produces same output
- **Thread-Safe:** Pure functions with no shared state

## Next Steps (Phase 2.2 - Step 3)

1. **Database Integration**
   - Add PF/ESI columns to `billing_employees` table
   - Store computed amounts for audit trail

2. **API Integration**
   - Modify `/api/billing/:id` to include computations
   - Add endpoint to recompute with different config

3. **UI Integration**
   - Display PF/ESI columns in billing detail table
   - Show computation explanations on hover
   - Add totals row with aggregates

4. **Document Updates**
   - Include PF/ESI in wage declaration PDF
   - Add statutory summary section

## References

- Indian PF Act: Contribution rates and ceiling
- ESI Act: Threshold and contribution rates
- Industry Practice: Basic wage calculation (50% of gross)

## Compliance Notes

- ✅ Follows Indian statutory norms (2024)
- ✅ Configurable for future rate changes
- ✅ Audit trail via explanation strings
- ✅ Deterministic for compliance verification
