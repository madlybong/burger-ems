/**
 * Unit Tests for PF/ESI Computation Engine
 * Phase 2.2 - Step 2
 * 
 * These tests verify the deterministic computation logic
 */

import {
    computeEmployeeStatutory,
    computeBillingPeriodStatutory,
    validateConfig,
    getComputationSummary,
    type EmployeeWageInput,
    type BillingPeriodComputationInput,
    type StatutoryConfig
} from './statutory-computation';

// ============================================================================
// TEST DATA
// ============================================================================

const defaultConfig: StatutoryConfig = {
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

const sampleEmployee: EmployeeWageInput = {
    employee_id: 1,
    name: 'Test Employee',
    days_worked: 26,
    daily_wage: 500,
    wage_amount: 13000,
    pf_applicable: true,
    esi_applicable: true
};

// ============================================================================
// TEST CASES
// ============================================================================

console.log('='.repeat(80));
console.log('PF/ESI COMPUTATION ENGINE - UNIT TESTS');
console.log('='.repeat(80));
console.log('');

// ----------------------------------------------------------------------------
// TEST 1: Basic PF Computation (Below Ceiling)
// ----------------------------------------------------------------------------
console.log('TEST 1: Basic PF Computation (Below Ceiling)');
console.log('-'.repeat(80));

const test1 = computeEmployeeStatutory(sampleEmployee, defaultConfig);

console.log(`Employee: ${test1.name}`);
console.log(`Gross Wage: ₹${test1.gross_wage}`);
console.log(`PF Applicable: ${test1.pf_applicable}`);
console.log(`PF Wage Basis: ₹${test1.pf_wage_basis}`);
console.log(`PF Wage Capped: ₹${test1.pf_wage_capped}`);
console.log(`PF Employee (12%): ₹${test1.pf_employee_amount} (Expected: ₹1560)`);
console.log(`PF Employer (12%): ₹${test1.pf_employer_amount} (Expected: ₹1560)`);
console.log(`PF Total: ₹${test1.pf_total_amount} (Expected: ₹3120)`);
console.log(`Explanation: ${test1.pf_explanation}`);

// Assertions
const test1Pass =
    test1.pf_employee_amount === 1560 &&
    test1.pf_employer_amount === 1560 &&
    test1.pf_total_amount === 3120;

console.log(`Result: ${test1Pass ? '✅ PASS' : '❌ FAIL'}`);
console.log('');

// ----------------------------------------------------------------------------
// TEST 2: PF Computation (Above Ceiling - Should Cap)
// ----------------------------------------------------------------------------
console.log('TEST 2: PF Computation (Above Ceiling - Should Cap)');
console.log('-'.repeat(80));

const highWageEmployee: EmployeeWageInput = {
    ...sampleEmployee,
    wage_amount: 20000
};

const test2 = computeEmployeeStatutory(highWageEmployee, defaultConfig);

console.log(`Employee: ${test2.name}`);
console.log(`Gross Wage: ₹${test2.gross_wage}`);
console.log(`PF Wage Basis: ₹${test2.pf_wage_basis}`);
console.log(`PF Wage Capped: ₹${test2.pf_wage_capped} (Expected: ₹15000 - ceiling applied)`);
console.log(`PF Employee (12% of 15000): ₹${test2.pf_employee_amount} (Expected: ₹1800)`);
console.log(`PF Employer (12% of 15000): ₹${test2.pf_employer_amount} (Expected: ₹1800)`);
console.log(`Explanation: ${test2.pf_explanation}`);

const test2Pass =
    test2.pf_wage_capped === 15000 &&
    test2.pf_employee_amount === 1800 &&
    test2.pf_employer_amount === 1800;

console.log(`Result: ${test2Pass ? '✅ PASS' : '❌ FAIL'}`);
console.log('');

// ----------------------------------------------------------------------------
// TEST 3: PF with Basic Wage Basis
// ----------------------------------------------------------------------------
console.log('TEST 3: PF with Basic Wage Basis (50% of Gross)');
console.log('-'.repeat(80));

const basicWageConfig: StatutoryConfig = {
    ...defaultConfig,
    pf_wage_basis: 'basic'
};

const test3 = computeEmployeeStatutory(sampleEmployee, basicWageConfig);

console.log(`Employee: ${test3.name}`);
console.log(`Gross Wage: ₹${test3.gross_wage}`);
console.log(`Basic Wage (50%): ₹${test3.basic_wage} (Expected: ₹6500)`);
console.log(`PF Wage Basis: ₹${test3.pf_wage_basis} (Expected: ₹6500)`);
console.log(`PF Employee (12% of 6500): ₹${test3.pf_employee_amount} (Expected: ₹780)`);
console.log(`PF Employer (12% of 6500): ₹${test3.pf_employer_amount} (Expected: ₹780)`);

const test3Pass =
    test3.pf_wage_basis === 6500 &&
    test3.pf_employee_amount === 780 &&
    test3.pf_employer_amount === 780;

console.log(`Result: ${test3Pass ? '✅ PASS' : '❌ FAIL'}`);
console.log('');

// ----------------------------------------------------------------------------
// TEST 4: ESI Computation (Below Threshold)
// ----------------------------------------------------------------------------
console.log('TEST 4: ESI Computation (Below Threshold)');
console.log('-'.repeat(80));

const test4 = computeEmployeeStatutory(sampleEmployee, defaultConfig);

console.log(`Employee: ${test4.name}`);
console.log(`Gross Wage: ₹${test4.gross_wage}`);
console.log(`ESI Threshold: ₹${defaultConfig.esi_threshold}`);
console.log(`ESI Applicable: ${test4.esi_applicable} (Expected: true)`);
console.log(`ESI Wage Basis: ₹${test4.esi_wage_basis}`);
console.log(`ESI Employee (0.75%): ₹${test4.esi_employee_amount} (Expected: ₹98)`);
console.log(`ESI Employer (3.25%): ₹${test4.esi_employer_amount} (Expected: ₹423)`);
console.log(`ESI Total: ₹${test4.esi_total_amount} (Expected: ₹521)`);
console.log(`Explanation: ${test4.esi_explanation}`);

const test4Pass =
    test4.esi_applicable === true &&
    test4.esi_employee_amount === 98 &&
    test4.esi_employer_amount === 423;

console.log(`Result: ${test4Pass ? '✅ PASS' : '❌ FAIL'}`);
console.log('');

// ----------------------------------------------------------------------------
// TEST 5: ESI Not Applicable (Above Threshold)
// ----------------------------------------------------------------------------
console.log('TEST 5: ESI Not Applicable (Above Threshold)');
console.log('-'.repeat(80));

const highWageESI: EmployeeWageInput = {
    ...sampleEmployee,
    wage_amount: 25000
};

const test5 = computeEmployeeStatutory(highWageESI, defaultConfig);

console.log(`Employee: ${test5.name}`);
console.log(`Gross Wage: ₹${test5.gross_wage}`);
console.log(`ESI Threshold: ₹${defaultConfig.esi_threshold}`);
console.log(`ESI Applicable: ${test5.esi_applicable} (Expected: false - above threshold)`);
console.log(`ESI Employee: ₹${test5.esi_employee_amount} (Expected: ₹0)`);
console.log(`ESI Employer: ₹${test5.esi_employer_amount} (Expected: ₹0)`);
console.log(`Explanation: ${test5.esi_explanation}`);

const test5Pass =
    test5.esi_applicable === false &&
    test5.esi_employee_amount === 0 &&
    test5.esi_employer_amount === 0;

console.log(`Result: ${test5Pass ? '✅ PASS' : '❌ FAIL'}`);
console.log('');

// ----------------------------------------------------------------------------
// TEST 6: Employee Not Enrolled in PF
// ----------------------------------------------------------------------------
console.log('TEST 6: Employee Not Enrolled in PF');
console.log('-'.repeat(80));

const noPFEmployee: EmployeeWageInput = {
    ...sampleEmployee,
    pf_applicable: false
};

const test6 = computeEmployeeStatutory(noPFEmployee, defaultConfig);

console.log(`Employee: ${test6.name}`);
console.log(`PF Applicable (Employee): ${noPFEmployee.pf_applicable}`);
console.log(`PF Computed Applicable: ${test6.pf_applicable} (Expected: false)`);
console.log(`PF Employee: ₹${test6.pf_employee_amount} (Expected: ₹0)`);
console.log(`PF Employer: ₹${test6.pf_employer_amount} (Expected: ₹0)`);
console.log(`Explanation: ${test6.pf_explanation}`);

const test6Pass =
    test6.pf_applicable === false &&
    test6.pf_employee_amount === 0;

console.log(`Result: ${test6Pass ? '✅ PASS' : '❌ FAIL'}`);
console.log('');

// ----------------------------------------------------------------------------
// TEST 7: PF/ESI Disabled in Configuration
// ----------------------------------------------------------------------------
console.log('TEST 7: PF/ESI Disabled in Configuration');
console.log('-'.repeat(80));

const disabledConfig: StatutoryConfig = {
    ...defaultConfig,
    pf_enabled: false,
    esi_enabled: false
};

const test7 = computeEmployeeStatutory(sampleEmployee, disabledConfig);

console.log(`Employee: ${test7.name}`);
console.log(`Config PF Enabled: ${disabledConfig.pf_enabled}`);
console.log(`Config ESI Enabled: ${disabledConfig.esi_enabled}`);
console.log(`PF Applicable: ${test7.pf_applicable} (Expected: false)`);
console.log(`ESI Applicable: ${test7.esi_applicable} (Expected: false)`);
console.log(`Total Deductions: ₹${test7.total_employee_deduction} (Expected: ₹0)`);
console.log(`Net Payable: ₹${test7.net_payable} (Expected: ₹${test7.gross_wage})`);

const test7Pass =
    test7.pf_applicable === false &&
    test7.esi_applicable === false &&
    test7.total_employee_deduction === 0 &&
    test7.net_payable === test7.gross_wage;

console.log(`Result: ${test7Pass ? '✅ PASS' : '❌ FAIL'}`);
console.log('');

// ----------------------------------------------------------------------------
// TEST 8: Rounding Modes
// ----------------------------------------------------------------------------
console.log('TEST 8: Rounding Modes');
console.log('-'.repeat(80));

const oddWageEmployee: EmployeeWageInput = {
    ...sampleEmployee,
    wage_amount: 13333 // Will produce decimal amounts
};

// Test Round
const roundConfig: StatutoryConfig = { ...defaultConfig, rounding_mode: 'round' };
const testRound = computeEmployeeStatutory(oddWageEmployee, roundConfig);
console.log(`Round Mode - PF Employee: ₹${testRound.pf_employee_amount}`);

// Test Floor
const floorConfig: StatutoryConfig = { ...defaultConfig, rounding_mode: 'floor' };
const testFloor = computeEmployeeStatutory(oddWageEmployee, floorConfig);
console.log(`Floor Mode - PF Employee: ₹${testFloor.pf_employee_amount}`);

// Test Ceil
const ceilConfig: StatutoryConfig = { ...defaultConfig, rounding_mode: 'ceil' };
const testCeil = computeEmployeeStatutory(oddWageEmployee, ceilConfig);
console.log(`Ceil Mode - PF Employee: ₹${testCeil.pf_employee_amount}`);

const test8Pass =
    testRound.pf_employee_amount !== testFloor.pf_employee_amount ||
    testRound.pf_employee_amount !== testCeil.pf_employee_amount;

console.log(`Result: ${test8Pass ? '✅ PASS (Different rounding produces different results)' : '❌ FAIL'}`);
console.log('');

// ----------------------------------------------------------------------------
// TEST 9: Billing Period Computation (Multiple Employees)
// ----------------------------------------------------------------------------
console.log('TEST 9: Billing Period Computation (Multiple Employees)');
console.log('-'.repeat(80));

const billingInput: BillingPeriodComputationInput = {
    billing_period_id: 1,
    from_date: '2025-01-01',
    to_date: '2025-01-31',
    config: defaultConfig,
    employees: [
        { ...sampleEmployee, employee_id: 1, name: 'Employee 1', wage_amount: 13000 },
        { ...sampleEmployee, employee_id: 2, name: 'Employee 2', wage_amount: 18000 },
        { ...sampleEmployee, employee_id: 3, name: 'Employee 3', wage_amount: 25000, esi_applicable: false }
    ]
};

const test9 = computeBillingPeriodStatutory(billingInput);

console.log(`Billing Period: ${test9.from_date} to ${test9.to_date}`);
console.log(`Employees: ${test9.employee_results.length}`);
console.log(`Total Gross Wages: ₹${test9.total_gross_wages}`);
console.log(`Total PF Employee: ₹${test9.total_pf_employee}`);
console.log(`Total PF Employer: ₹${test9.total_pf_employer}`);
console.log(`Total ESI Employee: ₹${test9.total_esi_employee}`);
console.log(`Total ESI Employer: ₹${test9.total_esi_employer}`);
console.log(`Total Deductions: ₹${test9.total_employee_deductions}`);
console.log(`Total Contributions: ₹${test9.total_employer_contributions}`);
console.log(`Net Payable: ₹${test9.total_net_payable}`);

const test9Pass =
    test9.employee_results.length === 3 &&
    test9.total_gross_wages === 56000;

console.log(`Result: ${test9Pass ? '✅ PASS' : '❌ FAIL'}`);
console.log('');

// ----------------------------------------------------------------------------
// TEST 10: Configuration Validation
// ----------------------------------------------------------------------------
console.log('TEST 10: Configuration Validation');
console.log('-'.repeat(80));

const validConfig = validateConfig(defaultConfig);
console.log(`Valid Config: ${validConfig.valid} (Expected: true)`);
console.log(`Errors: ${validConfig.errors.length} (Expected: 0)`);

const invalidConfig: StatutoryConfig = {
    ...defaultConfig,
    pf_employee_rate: 150, // Invalid: > 100
    esi_threshold: -1000 // Invalid: negative
};

const invalidResult = validateConfig(invalidConfig);
console.log(`Invalid Config: ${invalidResult.valid} (Expected: false)`);
console.log(`Errors: ${invalidResult.errors.length} (Expected: > 0)`);
console.log(`Error Messages:`);
invalidResult.errors.forEach(err => console.log(`  - ${err}`));

const test10Pass =
    validConfig.valid === true &&
    invalidResult.valid === false &&
    invalidResult.errors.length > 0;

console.log(`Result: ${test10Pass ? '✅ PASS' : '❌ FAIL'}`);
console.log('');

// ----------------------------------------------------------------------------
// TEST 11: Computation Summary
// ----------------------------------------------------------------------------
console.log('TEST 11: Computation Summary');
console.log('-'.repeat(80));

const summary = getComputationSummary(test9);
console.log(summary);
console.log('');
console.log(`Result: ✅ PASS (Summary generated)`);
console.log('');

// ============================================================================
// SUMMARY
// ============================================================================

const allTests = [
    test1Pass,
    test2Pass,
    test3Pass,
    test4Pass,
    test5Pass,
    test6Pass,
    test7Pass,
    test8Pass,
    test9Pass,
    test10Pass,
    true // test11
];

const passedTests = allTests.filter(t => t).length;
const totalTests = allTests.length;

console.log('='.repeat(80));
console.log('TEST SUMMARY');
console.log('='.repeat(80));
console.log(`Total Tests: ${totalTests}`);
console.log(`Passed: ${passedTests}`);
console.log(`Failed: ${totalTests - passedTests}`);
console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
console.log('');

if (passedTests === totalTests) {
    console.log('✅ ALL TESTS PASSED');
} else {
    console.log('❌ SOME TESTS FAILED');
}

console.log('='.repeat(80));
