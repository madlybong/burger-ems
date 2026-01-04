import db from '../src/server/db/index';

// Check if Worker1 still has attendance records for billing period 3
const attendanceRecords = db.prepare(`
    SELECT COUNT(*) as count 
    FROM attendance_records 
    WHERE billing_period_id = 3 AND employee_id = 1
`).get() as { count: number };

console.log('Attendance records for Worker1 (employee_id=1) in billing period 3:');
console.log(`Count: ${attendanceRecords.count}`);

if (attendanceRecords.count === 0) {
    console.log('✅ PASSED: No orphan attendance records found');
} else {
    console.log(`❌ FAILED: Found ${attendanceRecords.count} orphan attendance records`);
}

// Check if Worker1 is still in billing_employees for period 3
const billingEmployee = db.prepare(`
    SELECT COUNT(*) as count 
    FROM billing_employees 
    WHERE billing_period_id = 3 AND employee_id = 1
`).get() as { count: number };

console.log('\nBilling employee record for Worker1 in period 3:');
console.log(`Count: ${billingEmployee.count}`);

if (billingEmployee.count === 0) {
    console.log('✅ PASSED: Billing employee record deleted');
} else {
    console.log(`❌ FAILED: Billing employee record still exists`);
}

// Verify Worker1 still exists in the employees table (should NOT be deleted)
const employee = db.prepare(`
    SELECT COUNT(*) as count 
    FROM employees 
    WHERE id = 1
`).get() as { count: number };

console.log('\nWorker1 in employees table:');
console.log(`Count: ${employee.count}`);

if (employee.count === 1) {
    console.log('✅ PASSED: Employee still exists in system (not deleted globally)');
} else {
    console.log(`❌ FAILED: Employee was incorrectly deleted from system`);
}
