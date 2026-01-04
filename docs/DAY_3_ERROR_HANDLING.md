# Day 3: Error Handling & Bug Fixes

**Date:** 2026-01-04  
**Status:** 🔄 IN PROGRESS  
**Gate 3:** Error Handling

---

## Objectives

1. **Fix Critical Bug:** Invalid billing period date range validation
2. **Implement Error Handling:** Wrap all API calls in try-catch
3. **Add User-Friendly Messages:** Clear error feedback
4. **Implement Retry Logic:** Auto-retry network errors
5. **Add Loading States:** Clear UI feedback during operations

---

## Priority 1: Critical Bug Fix

### Issue: Invalid Billing Period Date Range
**Severity:** HIGH  
**Found in:** Day 2 Testing  
**Impact:** System accepts end dates before start dates, creating broken UI states

#### Fix Tasks

1. **Frontend Validation** ✅
   - File: `src/ui/pages/BillingCycles.vue` (or billing period creation component)
   - Add validation before form submission
   - Show error message if `to_date < from_date`

2. **Backend Validation** ✅
   - File: `src/server/api/billing.ts`
   - Add validation in POST endpoint
   - Return 400 error with clear message

3. **Error Recovery** ✅
   - Add "Delete" button for invalid periods
   - Add "Edit" button to fix invalid periods
   - Show clear error message in UI

---

## Priority 2: API Error Handling

### Tasks

1. **Wrap All API Calls in Try-Catch**
   - [ ] `fetchData()` - AttendanceWorkspace.vue
   - [ ] `fetchAttendance()` - AttendanceWorkspace.vue
   - [ ] `toggleStatus()` - AttendanceWorkspace.vue
   - [ ] `updateAttendance()` - AttendanceWorkspace.vue
   - [ ] `deleteAttendance()` - AttendanceWorkspace.vue
   - [ ] `handleOTChange()` - AttendanceWorkspace.vue (when implemented)

2. **Add Error State Management**
   ```typescript
   const error = ref<string | null>(null);
   const isRetrying = ref(false);
   const retryCount = ref(0);
   ```

3. **Implement Error Messages**
   - Network error: "Connection lost. Retrying..."
   - Validation error: "Invalid input: {reason}"
   - Server error: "Something went wrong. Please try again."
   - Lock error: "Period is finalized and cannot be edited."
   - Not found: "Record not found. It may have been deleted."

---

## Priority 3: Retry Logic

### Implementation

```typescript
async function retryableFetch(
  fn: () => Promise<any>,
  maxRetries = 3,
  backoff = 1000
): Promise<any> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      if (!isNetworkError(error)) throw error;
      
      isRetrying.value = true;
      retryCount.value = i + 1;
      await new Promise(resolve => setTimeout(resolve, backoff * Math.pow(2, i)));
    }
  }
}
```

### Tasks
- [ ] Create `retryableFetch` utility function
- [ ] Apply to all network requests
- [ ] Show retry attempt to user
- [ ] Clear retry state on success

---

## Priority 4: Loading States

### Tasks

1. **Add Loading Indicators**
   - [ ] Skeleton loader while fetching data
   - [ ] Disable status toggle buttons while saving
   - [ ] Show spinner in header during save
   - [ ] Progress bar for long operations

2. **Implement Loading State**
   ```typescript
   const isLoading = ref(false);
   const isSaving = ref(false);
   const loadingMessage = ref('');
   ```

3. **Clear Loading on Error**
   - Ensure loading states reset on error
   - Show error message instead of loading
   - Re-enable interactions

---

## Priority 5: Error Boundaries

### Tasks

1. **Wrap Critical Components**
   - [ ] Calendar Grid error boundary
   - [ ] Employee Sidebar error boundary
   - [ ] Header error boundary

2. **Fallback UI**
   ```vue
   <template>
     <div v-if="hasError" class="error-fallback">
       <v-icon color="error">mdi-alert-circle</v-icon>
       <p>Something went wrong loading this component.</p>
       <v-btn @click="retry">Try Again</v-btn>
     </div>
     <slot v-else />
   </template>
   ```

3. **Error Logging**
   - Log errors to console (development)
   - Send to error tracking service (production)
   - Include context (user, action, state)

---

## Testing Plan

### Manual Tests

1. **Network Error Simulation**
   - [ ] Disconnect network during save
   - [ ] Verify retry logic triggers
   - [ ] Verify error message shows
   - [ ] Verify auto-recovery on reconnect

2. **Validation Error Testing**
   - [ ] Try to create invalid billing period
   - [ ] Verify error message shows
   - [ ] Verify form doesn't submit
   - [ ] Verify user can correct and retry

3. **Server Error Simulation**
   - [ ] Trigger 500 error from backend
   - [ ] Verify error message shows
   - [ ] Verify UI remains usable
   - [ ] Verify user can retry

4. **Loading State Testing**
   - [ ] Verify skeleton shows on initial load
   - [ ] Verify buttons disable during save
   - [ ] Verify spinner shows in header
   - [ ] Verify loading clears on completion

### Automated Tests

1. **Unit Tests**
   - [ ] `retryableFetch` with network errors
   - [ ] `retryableFetch` with non-network errors
   - [ ] Error message formatting
   - [ ] Loading state transitions

2. **Integration Tests**
   - [ ] API call with retry
   - [ ] Error boundary fallback
   - [ ] Loading state during fetch

---

## Success Criteria

### Gate 3: Error Handling ✅

**Must Pass:**
- [ ] Critical bug fixed (date validation)
- [ ] All API calls wrapped in try-catch
- [ ] Network errors auto-retry (3 attempts)
- [ ] User sees clear error messages
- [ ] UI remains usable after errors
- [ ] No unhandled errors in console
- [ ] Loading states work correctly

**Verification:**
```bash
# 1. Test date validation
# Create billing period with invalid dates
# Expected: Error message, form doesn't submit

# 2. Test network retry
# Disconnect network, toggle status
# Expected: "Retrying..." message, auto-recovery

# 3. Test error messages
# Trigger various errors
# Expected: Clear, user-friendly messages

# 4. Check console
# Perform all actions
# Expected: Zero unhandled errors
```

---

## Implementation Order

1. **Fix Critical Bug** (30 min)
   - Add frontend validation
   - Add backend validation
   - Test thoroughly

2. **Add Error Handling** (1 hour)
   - Wrap API calls in try-catch
   - Add error state management
   - Implement error messages

3. **Implement Retry Logic** (45 min)
   - Create retryableFetch utility
   - Apply to all network calls
   - Add retry UI feedback

4. **Add Loading States** (30 min)
   - Add loading indicators
   - Disable interactions during save
   - Clear loading on error

5. **Test Everything** (45 min)
   - Manual testing
   - Fix any issues found
   - Verify all criteria met

**Total Estimated Time:** 3.5 hours

---

## Files to Modify

1. `src/ui/pages/BillingCycles.vue` - Add date validation
2. `src/server/api/billing.ts` - Add backend validation
3. `src/ui/pages/AttendanceWorkspace.vue` - Add error handling
4. `src/ui/utils/retry.ts` - Create retry utility (new file)
5. `src/ui/components/ErrorBoundary.vue` - Create error boundary (new file)

---

## Notes

- **Feature Freeze Active:** Only bug fixes and error handling
- **No New Features:** Focus on reliability
- **Test Thoroughly:** Every error path must be tested
- **User Experience:** Clear, helpful error messages

---

**Status:** 🔄 IN PROGRESS  
**Started:** 2026-01-04 19:55  
**Target Completion:** 2026-01-04 23:30  
**Next:** Priority 1 - Fix Critical Bug
