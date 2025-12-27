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
    billing_period_id: number;
    employee_id: number;
    days_worked: number;
    wage_amount: number;
    name?: string;
    skill_type?: string;
    daily_wage?: number;
}
