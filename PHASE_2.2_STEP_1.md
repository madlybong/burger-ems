# Phase 2.2 - Step 1: Statutory Configuration

## Overview
This document describes the implementation of statutory configuration for PF (Provident Fund) and ESI (Employee State Insurance) at the company level.

## Implementation Date
2025-12-28

## Scope
**Configuration Only** - This step introduces the ability to configure PF/ESI parameters. Actual calculations will be implemented in subsequent steps of Phase 2.2.

## Database Schema

### New Table: `statutory_config`

```sql
CREATE TABLE statutory_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL,
  
  -- PF Configuration
  pf_enabled BOOLEAN DEFAULT 1,
  pf_wage_basis TEXT DEFAULT 'gross' CHECK(pf_wage_basis IN ('gross', 'basic', 'custom')),
  pf_employee_rate REAL DEFAULT 12.0,
  pf_employer_rate REAL DEFAULT 12.0,
  pf_wage_ceiling REAL DEFAULT 15000.0,
  pf_enforce_ceiling BOOLEAN DEFAULT 1,
  
  -- ESI Configuration
  esi_enabled BOOLEAN DEFAULT 1,
  esi_threshold REAL DEFAULT 21000.0,
  esi_employee_rate REAL DEFAULT 0.75,
  esi_employer_rate REAL DEFAULT 3.25,
  
  -- General
  rounding_mode TEXT DEFAULT 'round' CHECK(rounding_mode IN ('round', 'floor', 'ceil')),
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY(company_id) REFERENCES companies(id),
  UNIQUE(company_id)
);
```

## Default Values (Indian Statutory Norms - 2024)

| Parameter | Default Value | Description |
|-----------|--------------|-------------|
| **PF** |
| pf_enabled | true | PF deduction enabled |
| pf_wage_basis | 'gross' | Calculate on gross wages |
| pf_employee_rate | 12.0% | Employee contribution |
| pf_employer_rate | 12.0% | Employer contribution (includes EPS 8.33%) |
| pf_wage_ceiling | ₹15,000 | Maximum wage for PF calculation |
| pf_enforce_ceiling | true | Apply wage ceiling |
| **ESI** |
| esi_enabled | true | ESI deduction enabled |
| esi_threshold | ₹21,000 | Employees earning above this are not eligible |
| esi_employee_rate | 0.75% | Employee contribution |
| esi_employer_rate | 3.25% | Employer contribution |
| **General** |
| rounding_mode | 'round' | Round to nearest rupee |

## API Endpoints

### GET /api/statutory
Fetch statutory configuration for a company.

**Query Parameters:**
- `company_id` (optional, default: 1)

**Response:**
```json
{
  "id": 1,
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
  "rounding_mode": "round",
  "updated_at": "2025-12-28 12:00:00"
}
```

### PUT /api/statutory
Update statutory configuration (Admin only).

**Request Body:**
```json
{
  "company_id": 1,
  "pf_enabled": true,
  "pf_wage_basis": "gross",
  "pf_employee_rate": 13.0,
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

**Validation Rules:**
- `pf_wage_basis`: Must be one of 'gross', 'basic', 'custom'
- `rounding_mode`: Must be one of 'round', 'floor', 'ceil'
- All rate fields must be positive numbers
- Threshold and ceiling values must be positive numbers

## Frontend Implementation

### New Page: Settings (`/settings`)

**Location:** `src/ui/pages/Settings.vue`

**Features:**
- Three configuration sections:
  1. **Provident Fund (PF) Configuration** (Blue card)
  2. **Employee State Insurance (ESI) Configuration** (Green card)
  3. **General Settings** (Info card)
- Real-time form validation
- Save button with loading state
- Success/error snackbar feedback
- Information panel with Indian statutory norms

**Navigation:**
- Added "Settings" link in sidebar under "Resources" section
- Icon: `mdi-cog-outline`
- Admin-only access (enforced by route guards)

## TypeScript Types

```typescript
export interface StatutoryConfig {
    id?: number;
    company_id: number;
    pf_enabled: boolean;
    pf_wage_basis: 'gross' | 'basic' | 'custom';
    pf_employee_rate: number;
    pf_employer_rate: number;
    pf_wage_ceiling: number;
    pf_enforce_ceiling: boolean;
    esi_enabled: boolean;
    esi_threshold: number;
    esi_employee_rate: number;
    esi_employer_rate: number;
    rounding_mode: 'round' | 'floor' | 'ceil';
    updated_at?: string;
}
```

## Migration

The database initialization script automatically:
1. Creates the `statutory_config` table if it doesn't exist
2. Seeds default configuration for all existing companies
3. Uses Indian statutory norms as defaults

## Testing

### Manual Testing Checklist
- [x] Settings page accessible from navigation
- [x] All configuration fields display correctly
- [x] PF configuration can be modified
- [x] ESI configuration can be modified
- [x] General settings can be modified
- [x] Save button persists changes
- [x] Success snackbar appears on save
- [x] Configuration persists after page refresh
- [x] Form validation works (e.g., invalid wage basis rejected)

### Test Results
All tests passed successfully. Configuration is properly persisted and retrieved.

## Files Modified/Created

### Backend
- **Created:** `src/server/api/statutory.ts` - API endpoints
- **Modified:** `src/server/db/init.ts` - Added table and migration
- **Modified:** `src/server/server.ts` - Registered API route

### Frontend
- **Created:** `src/ui/pages/Settings.vue` - Settings page
- **Modified:** `src/ui/types.ts` - Added StatutoryConfig interface
- **Modified:** `src/ui/router/index.ts` - Added Settings route
- **Modified:** `src/ui/layouts/DefaultLayout.vue` - Added navigation link

## Future Steps (Phase 2.2)

**Step 2:** Implement PF/ESI calculation logic
- Read configuration from `statutory_config`
- Calculate employee and employer contributions
- Apply wage ceiling and threshold rules
- Use configured rounding mode

**Step 3:** Integrate calculations into billing workflow
- Add PF/ESI columns to billing employee records
- Display calculations in billing detail view
- Include in document generation (wage declarations)

## Notes

- **No Impact on Existing Flows:** This configuration does not affect current billing or payroll processes
- **Admin Only:** Only admin users can access and modify statutory configuration
- **Single Company:** Currently supports one company (company_id = 1)
- **Validation:** All inputs are validated on both frontend and backend
- **Persistence:** Configuration is stored in SQLite database

## References

- Indian PF Act: https://www.epfindia.gov.in/
- ESI Act: https://www.esic.gov.in/
- Current rates as of 2024
