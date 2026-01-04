# Day 5: Testing & QA

**Goal:** Verify system integrity, correctness, and readiness for production usage.
**Focus:** Scripted verification of logic and Manual verification of flows.

## 1. Unit Tests (Utility Logic)
Since we don't have a dedicated test runner (like Vitest) configured in `package.json`, we will create a standalone test script `scripts/test_units.ts` to verify core utility logic.

### 1.1 Test Candidates
- `debounce`: Verify it delays execution.
- `src/ui/utils/retry.ts`: Verify it retries (mock fetch).
- *Note:* We can't easily test Vue components without a DOM/test-runner, so we focus on pure logic.

## 2. API Integration Tests (Automated)
We have `scripts/test_date_validation.ts`. We will expand this to cover the full attendance lifecycle.
New Script: `scripts/test_attendance_lifecycle.ts`

### 2.1 Test Flow
1.  **Setup:** Create a billing period, add an employee.
2.  **Attendance:**
    - Mark `full` -> Verify totals.
    - Mark `half` -> Verify totals.
    - Mark `absent` -> Verify totals.
3.  **Overtime:**
    - Set valid OT -> Verify.
    - Set invalid OT (<0) -> Verify rejection.
    - Set OT > limit -> Verify rejection (if logic is shared/testable via API).
4.  **Locking:**
    - Finalize period.
    - Attempt to change attendance -> Verify 403 Forbidden.
5.  **Cleanup:** Delete test data.

## 3. Manual E2E Verification (Checklist)
We will perform a manual walkthrough and document results.

### 3.1 Scenarios
- [ ] **Desktop:**
  - Sidebar scrolling (100+ employees).
  - Rapid search typing (Debounce check).
  - Bulk marking (if implemented).
- [ ] **Mobile (Responsive):**
  - Verify layout collapses correctly.
  - Verify touch interaction works.
- [ ] **Data Integrity:**
  - Reload page -> Ensure data persists.
  - Network disconnect -> Ensure "Retry" button appears.

## 4. Final Polish
- Ensure no simple UI bugs (misaligned icons, typos).
- Check `console` for any warnings during normal operation.

## Plan Execution
1.  Create `scripts/test_units.ts` for utilities.
2.  Create `scripts/test_attendance_lifecycle.ts` for API flow.
3.  Execute basic manual verification.
4.  Consolidate results.

