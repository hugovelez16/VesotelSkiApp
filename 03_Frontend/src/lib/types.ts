/**
 * User Profile Interface.
 * Represents the logged-in user's profile information.
 */

export interface UserDevice {
    id: string;
    device_identifier: string;
    name: string | null;
    last_used: string;
    expires_at: string;
    created_at: string;
}

export interface UserProfile {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    role: string;
    is_active: boolean;
    is_active_worker?: boolean;
    is_supervisor?: boolean;
    default_company_id?: string;
    created_at?: string;
}

export type User = UserProfile;

export interface Company {
    id: string;
    name: string;
    social_security_deduction?: number;
    membership_status?: string;
    settings?: CompanySettings;
}

export interface CompanySettings {
    features?: {
        tutorials?: boolean;
        coordination?: boolean;
        night_shifts?: boolean;
        supplements?: boolean;
        pickup_point?: boolean;
        worker_daily_report?: boolean;
    };
    billing?: {
        price_type?: 'gross' | 'net';
        cost_markup_percent?: number;
    };
    input_mode?: 'manual_single' | 'manual_total';
}

export interface UserCompanyRate {
    userId: string;
    companyId: string;
    hourlyRate: number;
    dailyRate: number;
    nightRate: number;
    coordinationRate: number;
    isGross: boolean;
    deductionSs?: number;
    deductionIrpf?: number;
    deductionExtra?: number;
    firstName?: string; // Optional for admin views
    lastName?: string;
    user?: UserProfile;
}

// Deprecated alias for backward compatibility during migration if needed, 
// though we should update all usages.
export type UserSettings = UserCompanyRate;

export interface WorkLog {
    id: string;
    userId: string;
    companyId?: string; // New field
    type: 'particular' | 'tutorial';
    description?: string;
    status?: string;

    // Particular fields
    date?: string;
    startTime?: string;
    endTime?: string;

    // Tutorial fields
    startDate?: string;
    endDate?: string;
    client?: string; // New field
    pickupPoint?: string;

    // Modifiers
    hasCoordination: boolean;
    hasNight: boolean;
    arrivesPrior: boolean;

    // Calculated
    durationHours: number;
    rateApplied: number;
    amount: number;
    grossAmount?: number; // Added for gross billing
    isGrossCalculation: boolean;

    createdAt: string;
}


export interface CompanyResponse {
    id: string;
    name: string;
    fiscal_id?: string;
    social_security_deduction?: number;
    created_at?: string;
    settings?: Record<string, any>;
    role?: string;
}

export interface CompanyMemberResponse {
    user_id: string;
    role: string;
    status: string;
    joined_at: string;
    user?: UserProfile;
    settings?: Record<string, any>;
}

export interface CompanyWithMembers extends CompanyResponse {
    members: CompanyMemberResponse[];
}

export interface WorkLogCreate {
    type: 'particular' | 'tutorial';
    companyId?: string;
    date?: string;
    startDate?: string;
    client?: string;
    pickupPoint?: string; // New field
    endDate?: string;
    startTime?: string;
    endTime?: string;
    description: string;
    hasCoordination?: boolean;
    hasNight?: boolean;
    arrivesPrior?: boolean;
    userId?: string;
    amount?: number; // Manual override
}

export interface Token {
    access_token: string;
    token_type: string;
    requires_2fa?: boolean;
    device_token?: string;
}
