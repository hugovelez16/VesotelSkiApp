import api from "@/lib/api";
import { Company } from "@/lib/types";
import { CompanyResponse, CompanyWithMembers, CompanyMemberResponse } from "@/lib/types"; // Ensure types exist or infer

export interface CompanyCreate {
    name: string;
    fiscalId?: string;
}

// CompanyWithMembers is imported from @/lib/types

export const createCompany = async (company: { name: string; fiscal_id?: string; social_security_deduction?: number }) => {
    const response = await api.post("/companies", company);
    return response.data;
};

export const updateCompany = async (companyId: string, data: any): Promise<CompanyResponse> => {
    const response = await api.put<CompanyResponse>(`/companies/${companyId}`, data);
    return response.data;
};

export const getCompaniesDetailed = async (): Promise<CompanyWithMembers[]> => {
    const response = await api.get<CompanyWithMembers[]>("/companies/detailed");
    return response.data;
};

export const getAvailableCompanies = async (): Promise<CompanyResponse[]> => {
    const response = await api.get<CompanyResponse[]>("/companies/available");
    return response.data;
};

export const joinCompany = async (companyId: string): Promise<CompanyMemberResponse> => {
    const response = await api.post<CompanyMemberResponse>(`/companies/${companyId}/join`);
    return response.data;
};

// For user's joined companies (active)
export const getMyCompanies = async (): Promise<CompanyResponse[]> => {
    const response = await api.get<CompanyResponse[]>("/users/me/companies");
    return response.data;
};

// For Admin
export const updateMemberStatus = async (companyId: string, userId: string, status: string): Promise<CompanyMemberResponse> => {
    const response = await api.put<CompanyMemberResponse>(`/companies/${companyId}/members/${userId}/status?status=${status}`);
    return response.data;
};

export const addCompanyMember = async (companyId: string, email: string): Promise<CompanyMemberResponse> => {
    const response = await api.post<CompanyMemberResponse>(`/companies/${companyId}/members/add`, { email });
    return response.data;
};

export const updateCompanyMember = async (companyId: string, userId: string, data: any): Promise<CompanyMemberResponse> => {
    const response = await api.put<CompanyMemberResponse>(`/companies/${companyId}/members/${userId}`, data);
    return response.data;
};

export const getCompanyRates = async (companyId: string): Promise<any[]> => {
    console.log(`Getting company rates for ${companyId} from /companies/${companyId}/rates-v2`);
    try {
        const response = await api.get<any[]>(`/companies/${companyId}/rates-v2`);
        console.log('Rates response:', response.status, response.data);
        return response.data;
    } catch (error: any) {
        console.error('Error fetching company rates:', error.response?.status, error.message);
        throw error;
    }
};

export const getCompanyMembers = async (companyId: string, status?: string): Promise<CompanyMemberResponse[]> => {
    let url = `/companies/${companyId}/members`;
    if (status) {
        url += `?status=${status}`;
    }
    const response = await api.get<CompanyMemberResponse[]>(url);
    return response.data;
};

export const notifyCompanyMember = async (companyId: string, userId: string): Promise<void> => {
    await api.post(`/companies/${companyId}/members/${userId}/notify`);
};
