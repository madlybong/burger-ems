# Employee Portal Integration - Testing Guide

## Overview
The Employee Portal has been fully integrated into the Astrake EMS application with role-based authentication and layout switching.

## Login Credentials

### Admin Access
- **Username**: `admin`
- **Password**: `admin123`
- **Redirects to**: Admin Dashboard (/)

### Employee Access
- **Username**: `EMP{id}` (e.g., `EMP1`, `EMP2`)
- **Default Password**: `welcome123`
- **Redirects to**: Employee Portal (/portal)
- **First Login**: Forces password change

## Testing Steps

### 1. Test Unauthenticated Access
1. Open browser to `http://localhost:3000`
2. **Expected**: Automatically redirects to `/login`
3. **Verify**: Login page is visible with username/password fields

### 2. Test Admin Login
1. Enter username: `admin`
2. Enter password: `admin123`
3. Click "Login"
4. **Expected**: Redirects to Admin Dashboard at `/`
5. **Verify**: 
   - Top navigation bar shows "ASTRAKE EMS"
   - Left sidebar shows admin navigation (Projects, Billing, Employees)
   - Dashboard shows metrics cards
   - Footer shows "© 2025 Astrake Systems"

### 3. Test Admin Session Persistence
1. While logged in as admin, refresh the page
2. **Expected**: Remains on admin dashboard
3. Navigate to `/portal`
4. **Expected**: Redirects back to `/` (admin dashboard)

### 4. Test Employee Login (First Time)
1. Logout from admin (if logged in)
2. Enter username: `EMP1` (or any employee ID)
3. Enter password: `welcome123`
4. Click "Login"
5. **Expected**: Shows "Set Password" screen
6. Enter new password (min 6 characters)
7. Confirm password
8. Click "Set Password"
9. **Expected**: Redirects to Employee Portal at `/portal`

### 5. Test Employee Portal Navigation
1. **Verify Bottom Navigation**:
   - Home icon → `/portal`
   - History icon → `/portal/attendance`
   - Profile icon → `/portal/profile`

2. **Test Home/Dashboard**:
   - Shows welcome message with employee name
   - "Check Attendance" button
   - "View Profile" button

3. **Test Attendance History**:
   - Lists billing periods with days worked and wages
   - Each period has "Download Payslip" button
   - Click download → PDF file downloads

4. **Test Profile**:
   - Shows employee details (name, role, rate, UAN, GP number)
   - All fields are read-only

### 6. Test Employee Session Persistence
1. While logged in as employee, refresh the page
2. **Expected**: Remains on employee portal
3. Navigate to `/` or `/employees`
4. **Expected**: Redirects back to `/portal`

### 7. Test Logout
1. Click logout icon (top right in employee portal)
2. **Expected**: Redirects to `/login`
3. **Verify**: Auth state cleared (localStorage empty)

### 8. Test Role Isolation
1. Login as admin
2. Try to manually navigate to `/portal`
3. **Expected**: Redirects to `/` (admin dashboard)
4. Logout
5. Login as employee
6. Try to manually navigate to `/employees`
7. **Expected**: Redirects to `/portal`

## Implementation Summary

### Files Created/Modified

**New Files**:
- `src/ui/stores/auth.ts` - Pinia auth store
- `src/ui/layouts/EmployeeLayout.vue` - Employee portal layout
- `src/ui/pages/Login.vue` - Unified login page
- `src/ui/pages/portal/Dashboard.vue` - Employee home
- `src/ui/pages/portal/Attendance.vue` - Attendance history
- `src/ui/pages/portal/Profile.vue` - Employee profile
- `src/server/api/auth.ts` - Authentication endpoints
- `src/server/api/portal.ts` - Employee portal API

**Modified Files**:
- `src/ui/main.ts` - Added Pinia
- `src/ui/router/index.ts` - Complete rewrite with auth guards
- `src/server/server.ts` - Registered auth and portal routes
- `src/server/db/init.ts` - Added auth columns migration
- `src/server/api/employees.ts` - Auto-generate usernames

### Key Features

1. **Authentication**:
   - JWT-based token authentication
   - Role-based access (admin/employee)
   - First-login password change enforcement
   - Session persistence via localStorage

2. **Router Guards**:
   - Unauthenticated users → `/login`
   - Admin users → Admin layout routes
   - Employee users → Employee layout routes
   - Role-based route protection

3. **Layout Switching**:
   - Admin: `DefaultLayout.vue` (sidebar navigation)
   - Employee: `EmployeeLayout.vue` (bottom navigation, mobile-first)

4. **Security**:
   - Server-side role validation
   - JWT token expiry (24 hours)
   - Password hashing with Bun.password
   - Protected API endpoints

## Known Limitations

1. Admin credentials are hardcoded (username: admin, password: admin123)
2. No password recovery mechanism
3. No multi-factor authentication
4. Token refresh not implemented (24-hour expiry only)

## Next Steps

For production deployment:
1. Move admin credentials to environment variables
2. Implement proper admin user management
3. Add password recovery flow
4. Implement token refresh mechanism
5. Add audit logging for authentication events
