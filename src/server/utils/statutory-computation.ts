/**
 * PF/ESI Computation Engine
 * Phase 2.2 - Step 2
 * 
 * Pure computation module with no database writes or UI dependencies.
 * All calculations are deterministic and explainable.
 */

import type { StatutoryConfig } from '../../ui/types';

// Re-export for convenience
export type { StatutoryConfig };

// ============================================================================
// TYPES
// ============================================================================

export interface EmployeeWageInput {
    employee_id: number;
    name: string;
    days_worked: number;
    daily_wage: number;
    wage_amount: number;
    pf_applicable: boolean;
    esi_applicable: boolean;
}

export interface ComputationResult {
    employee_id: number;
    name: string;

    // Wage Information
    gross_wage: number;
    basic_wage: number;
    custom_wage: number;

    // PF Computation
    pf_applicable: boolean;
    pf_wage_basis: number;
    pf_wage_capped: number;
    pf_employee_amount: number;
    pf_employer_amount: number;
    pf_total_amount: number;
    pf_explanation: string;

    // ESI Computation
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

export interface BillingPeriodComputationInput {
    billing_period_id: number;
    from_date: string;
    to_date: string;
    employees: EmployeeWageInput[];
    config: StatutoryConfig;
}

export interface BillingPeriodComputationResult {
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

// ============================================================================
// ROUNDING UTILITIES
// ============================================================================

function applyRounding(value: number, mode: 'round' | 'floor' | 'ceil'): number {
    switch (mode) {
        case 'round':
            return Math.round(value);
        case 'floor':
            return Math.floor(value);
        case 'ceil':
            return Math.ceil(value);
        default:
            return Math.round(value);
    }
}

// ============================================================================
// WAGE BASIS COMPUTATION
// ============================================================================

/**
 * Calculate the wage basis for PF/ESI computation
 * 
 * @param grossWage - Total wage amount
 * @param wageType - Type of wage basis ('gross', 'basic', 'custom')
 * @returns Computed wage basis
 */
function computeWageBasis(
    grossWage: number,
    wageType: 'gross' | 'basic' | 'custom'
): number {
    switch (wageType) {
        case 'gross':
            return grossWage;

        case 'basic':
            // Basic wage is typically 50% of gross for Indian contractors
            // This is a common industry practice
            return grossWage * 0.5;

        case 'custom':
            // For custom, we'll use gross for now
            // In future, this could be configurable per employee
            return grossWage;

        default:
            return grossWage;
    }
}

// ============================================================================
// PF COMPUTATION
// ============================================================================

/**
 * Compute PF (Provident Fund) contributions
 * 
 * Rules:
 * 1. Only applicable if employee.pf_applicable is true
 * 2. Only applicable if config.pf_enabled is true
 * 3. Wage basis determined by config.pf_wage_basis
 * 4. Ceiling applied if config.pf_enforce_ceiling is true
 * 5. Employee and employer rates from config
 * 6. Amounts rounded per config.rounding_mode
 */
function computePF(
    employee: EmployeeWageInput,
    grossWage: number,
    config: StatutoryConfig
): {
    applicable: boolean;
    wageBasis: number;
    wageCapped: number;
    employeeAmount: number;
    employerAmount: number;
    totalAmount: number;
    explanation: string;
} {
    // Check if PF is applicable
    if (!config.pf_enabled || !employee.pf_applicable) {
        return {
            applicable: false,
            wageBasis: 0,
            wageCapped: 0,
            employeeAmount: 0,
            employerAmount: 0,
            totalAmount: 0,
            explanation: config.pf_enabled
                ? 'Employee not enrolled in PF'
                : 'PF disabled in configuration'
        };
    }

    // Calculate wage basis
    const wageBasis = computeWageBasis(grossWage, config.pf_wage_basis);

    // Apply ceiling if enforced
    const wageCapped = config.pf_enforce_ceiling
        ? Math.min(wageBasis, config.pf_wage_ceiling)
        : wageBasis;

    // Calculate contributions
    const employeeAmount = applyRounding(
        (wageCapped * config.pf_employee_rate) / 100,
        config.rounding_mode
    );

    const employerAmount = applyRounding(
        (wageCapped * config.pf_employer_rate) / 100,
        config.rounding_mode
    );

    const totalAmount = employeeAmount + employerAmount;

    // Build explanation
    const ceilingApplied = config.pf_enforce_ceiling && wageBasis > config.pf_wage_ceiling;
    const explanation = [
        `Wage Basis (${config.pf_wage_basis}): ₹${wageBasis.toFixed(2)}`,
        ceilingApplied ? `Capped at: ₹${config.pf_wage_ceiling.toFixed(2)}` : null,
        `Employee (${config.pf_employee_rate}%): ₹${employeeAmount}`,
        `Employer (${config.pf_employer_rate}%): ₹${employerAmount}`
    ].filter(Boolean).join(' | ');

    return {
        applicable: true,
        wageBasis,
        wageCapped,
        employeeAmount,
        employerAmount,
        totalAmount,
        explanation
    };
}

// ============================================================================
// ESI COMPUTATION
// ============================================================================

/**
 * Compute ESI (Employee State Insurance) contributions
 * 
 * Rules:
 * 1. Only applicable if employee.esi_applicable is true
 * 2. Only applicable if config.esi_enabled is true
 * 3. Only applicable if gross wage <= config.esi_threshold
 * 4. Wage basis is always gross wage for ESI
 * 5. Employee and employer rates from config
 * 6. Amounts rounded per config.rounding_mode
 */
function computeESI(
    employee: EmployeeWageInput,
    grossWage: number,
    config: StatutoryConfig
): {
    applicable: boolean;
    wageBasis: number;
    employeeAmount: number;
    employerAmount: number;
    totalAmount: number;
    explanation: string;
} {
    // Check if ESI is applicable
    if (!config.esi_enabled || !employee.esi_applicable) {
        return {
            applicable: false,
            wageBasis: 0,
            employeeAmount: 0,
            employerAmount: 0,
            totalAmount: 0,
            explanation: config.esi_enabled
                ? 'Employee not enrolled in ESI'
                : 'ESI disabled in configuration'
        };
    }

    // Check threshold (ESI only applies if wage is below threshold)
    if (grossWage > config.esi_threshold) {
        return {
            applicable: false,
            wageBasis: grossWage,
            employeeAmount: 0,
            employerAmount: 0,
            totalAmount: 0,
            explanation: `Wage (₹${grossWage.toFixed(2)}) exceeds ESI threshold (₹${config.esi_threshold.toFixed(2)})`
        };
    }

    // ESI is always calculated on gross wage
    const wageBasis = grossWage;

    // Calculate contributions
    const employeeAmount = applyRounding(
        (wageBasis * config.esi_employee_rate) / 100,
        config.rounding_mode
    );

    const employerAmount = applyRounding(
        (wageBasis * config.esi_employer_rate) / 100,
        config.rounding_mode
    );

    const totalAmount = employeeAmount + employerAmount;

    // Build explanation
    const explanation = [
        `Wage Basis (gross): ₹${wageBasis.toFixed(2)}`,
        `Employee (${config.esi_employee_rate}%): ₹${employeeAmount}`,
        `Employer (${config.esi_employer_rate}%): ₹${employerAmount}`
    ].join(' | ');

    return {
        applicable: true,
        wageBasis,
        employeeAmount,
        employerAmount,
        totalAmount,
        explanation
    };
}

// ============================================================================
// EMPLOYEE COMPUTATION
// ============================================================================

/**
 * Compute PF and ESI for a single employee
 */
export function computeEmployeeStatutory(
    employee: EmployeeWageInput,
    config: StatutoryConfig
): ComputationResult {
    // Calculate wage components
    const grossWage = employee.wage_amount;
    const basicWage = computeWageBasis(grossWage, 'basic');
    const customWage = computeWageBasis(grossWage, 'custom');

    // Compute PF
    const pf = computePF(employee, grossWage, config);

    // Compute ESI
    const esi = computeESI(employee, grossWage, config);

    // Calculate totals
    const totalEmployeeDeduction = pf.employeeAmount + esi.employeeAmount;
    const totalEmployerContribution = pf.employerAmount + esi.employerAmount;
    const netPayable = grossWage - totalEmployeeDeduction;

    return {
        employee_id: employee.employee_id,
        name: employee.name,

        // Wage Information
        gross_wage: grossWage,
        basic_wage: basicWage,
        custom_wage: customWage,

        // PF Computation
        pf_applicable: pf.applicable,
        pf_wage_basis: pf.wageBasis,
        pf_wage_capped: pf.wageCapped,
        pf_employee_amount: pf.employeeAmount,
        pf_employer_amount: pf.employerAmount,
        pf_total_amount: pf.totalAmount,
        pf_explanation: pf.explanation,

        // ESI Computation
        esi_applicable: esi.applicable,
        esi_wage_basis: esi.wageBasis,
        esi_employee_amount: esi.employeeAmount,
        esi_employer_amount: esi.employerAmount,
        esi_total_amount: esi.totalAmount,
        esi_explanation: esi.explanation,

        // Totals
        total_employee_deduction: totalEmployeeDeduction,
        total_employer_contribution: totalEmployerContribution,
        net_payable: netPayable
    };
}

// ============================================================================
// BILLING PERIOD COMPUTATION
// ============================================================================

/**
 * Compute PF and ESI for an entire billing period
 * 
 * This is the main entry point for the computation engine.
 */
export function computeBillingPeriodStatutory(
    input: BillingPeriodComputationInput
): BillingPeriodComputationResult {
    // Compute for each employee
    const employeeResults = input.employees.map(emp =>
        computeEmployeeStatutory(emp, input.config)
    );

    // Calculate aggregates
    const totals = employeeResults.reduce(
        (acc, result) => ({
            gross_wages: acc.gross_wages + result.gross_wage,
            pf_employee: acc.pf_employee + result.pf_employee_amount,
            pf_employer: acc.pf_employer + result.pf_employer_amount,
            esi_employee: acc.esi_employee + result.esi_employee_amount,
            esi_employer: acc.esi_employer + result.esi_employer_amount,
            employee_deductions: acc.employee_deductions + result.total_employee_deduction,
            employer_contributions: acc.employer_contributions + result.total_employer_contribution,
            net_payable: acc.net_payable + result.net_payable
        }),
        {
            gross_wages: 0,
            pf_employee: 0,
            pf_employer: 0,
            esi_employee: 0,
            esi_employer: 0,
            employee_deductions: 0,
            employer_contributions: 0,
            net_payable: 0
        }
    );

    return {
        billing_period_id: input.billing_period_id,
        from_date: input.from_date,
        to_date: input.to_date,
        config_snapshot: input.config,
        employee_results: employeeResults,

        // Aggregates
        total_gross_wages: totals.gross_wages,
        total_pf_employee: totals.pf_employee,
        total_pf_employer: totals.pf_employer,
        total_esi_employee: totals.esi_employee,
        total_esi_employer: totals.esi_employer,
        total_employee_deductions: totals.employee_deductions,
        total_employer_contributions: totals.employer_contributions,
        total_net_payable: totals.net_payable
    };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Validate configuration before computation
 */
export function validateConfig(config: StatutoryConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (config.pf_enabled) {
        if (config.pf_employee_rate < 0 || config.pf_employee_rate > 100) {
            errors.push('PF employee rate must be between 0 and 100');
        }
        if (config.pf_employer_rate < 0 || config.pf_employer_rate > 100) {
            errors.push('PF employer rate must be between 0 and 100');
        }
        if (config.pf_wage_ceiling <= 0) {
            errors.push('PF wage ceiling must be positive');
        }
    }

    if (config.esi_enabled) {
        if (config.esi_employee_rate < 0 || config.esi_employee_rate > 100) {
            errors.push('ESI employee rate must be between 0 and 100');
        }
        if (config.esi_employer_rate < 0 || config.esi_employer_rate > 100) {
            errors.push('ESI employer rate must be between 0 and 100');
        }
        if (config.esi_threshold <= 0) {
            errors.push('ESI threshold must be positive');
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Get a human-readable summary of computation
 */
export function getComputationSummary(result: BillingPeriodComputationResult): string {
    const lines = [
        `Billing Period: ${result.from_date} to ${result.to_date}`,
        `Employees Processed: ${result.employee_results.length}`,
        '',
        'Totals:',
        `  Gross Wages: ₹${result.total_gross_wages.toFixed(2)}`,
        `  PF Employee: ₹${result.total_pf_employee.toFixed(2)}`,
        `  PF Employer: ₹${result.total_pf_employer.toFixed(2)}`,
        `  ESI Employee: ₹${result.total_esi_employee.toFixed(2)}`,
        `  ESI Employer: ₹${result.total_esi_employer.toFixed(2)}`,
        `  Total Deductions: ₹${result.total_employee_deductions.toFixed(2)}`,
        `  Total Contributions: ₹${result.total_employer_contributions.toFixed(2)}`,
        `  Net Payable: ₹${result.total_net_payable.toFixed(2)}`
    ];

    return lines.join('\n');
}
