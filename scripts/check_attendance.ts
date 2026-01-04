import db from '../src/server/db/index';

// Check attendance records for billing period 3 (November 2025)
const records = db.prepare(`
    SELECT * FROM attendance_records 
    WHERE billing_period_id = 3 
    ORDER BY attendance_date
`).all();

console.log('Attendance Records for Billing Period 3:');
console.log(JSON.stringify(records, null, 2));

// Check summary
const summary = db.prepare(`
    SELECT employee_id, days_worked, total_wage 
    FROM billing_employees 
    WHERE billing_period_id = 3
`).all();

console.log('\nBilling Employee Summary:');
console.log(JSON.stringify(summary, null, 2));
