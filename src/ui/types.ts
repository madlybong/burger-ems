export const SKILL_TYPES = ['unskilled', 'skilled', 'supervisor', 'engineer'];

export interface Project {
    id?: number;
    company_id: number;
    client_name: string;
    site_name: string;
    work_order_no: string;
    start_date: string;
    end_date: string;
    status: 'active' | 'completed' | 'hold';
}

export interface Employee {
    id?: number;
    company_id: number;
    name: string;
    skill_type: 'unskilled' | 'skilled' | 'supervisor' | 'engineer';
    daily_wage: number;
    uan: string | null;
    pf_applicable: boolean;
    esi_applicable: boolean;
    gp_number: string | null;
    active: boolean;
    username?: string;
}

export interface BillingPeriod {
    id?: number;
    project_id: number;
    from_date: string;
    to_date: string;
    label?: string;
    client_name?: string;
    site_name?: string;
    work_order_no?: string;
}

export interface BillingEmployee {
    id?: number;
    billing_period_id: number;
    employee_id: number;
    days_worked: number;
    wage_amount: number;
    name?: string;
    skill_type?: string;
    daily_wage?: number;
    uan?: string | null;
    gp_number?: string | null;
}

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
