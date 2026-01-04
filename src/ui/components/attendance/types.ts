/**
 * Employee data structure
 */
export interface Employee {
    employee_id: number;
    name: string;
    skill_type: string;
    daily_wage: number;
    pf_applicable?: boolean;
    esi_applicable?: boolean;
    is_active?: boolean;
}

/**
 * Billing Employee (employee assigned to a billing period)
 */
export interface BillingEmployee extends Employee {
    days_worked: number;
    total_wage: number;
    overtime_hours?: number;
    overtime_wage?: number;
}

/**
 * Calendar day representation
 */
export interface CalendarDay {
    date: string;
    inRange: boolean;
    isWeekend: boolean;
    dayName: string;
}

/**
 * Billing Period data structure
 */
export interface Period {
    id: number;
    project_id: number;
    project_name?: string;
    from_date: string;
    to_date: string;
    status: 'draft' | 'finalized';
    finalized_at?: string;
    employees?: BillingEmployee[];
}

/**
 * Attendance record
 */
export interface AttendanceRecord {
    id: number;
    billing_period_id: number;
    employee_id: number;
    attendance_date: string;
    status: 'full' | 'half' | 'absent';
    overtime_hours: number;
    created_at?: string;
    updated_at?: string;
}

/**
 * Overtime configuration
 */
export interface OTConfig {
    ot_enabled: boolean;
    ot_rate?: number;
    daily_cap?: number;
    period_cap?: number;
    rounding_mode?: 'round' | 'floor' | 'ceil';
}

/**
 * Save state for UI feedback
 */
export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

/**
 * Attendance status type
 */
export type AttendanceStatus = 'full' | 'half' | 'absent' | 'week_off';

/**
 * Employee stats for display
 */
export interface EmployeeStats {
    days: number;
    ot: number;
}
