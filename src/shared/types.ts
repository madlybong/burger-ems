/**
 * Shared types used by both server and UI
 */

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
