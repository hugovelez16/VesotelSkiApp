import api from '../api';
import { UserCompanyRate } from '@/lib/types';

export const getUserRates = async (companyId?: string) => {
    const params = companyId ? { company_id: companyId } : {};
    const response = await api.get<UserCompanyRate[]>('/users/me/rates', { params });
    return response.data;
};

// Deprecated alias
export const getUserSettings = async () => {
    // Return the first rate found or empty object to avoid crashes, 
    // but caller should be updated.
    const rates = await getUserRates();
    return rates.length > 0 ? rates[0] : null;
}

export const updateUserRates = async (data: any) => {
    const response = await api.put('/users/me/rates', data);
    return response.data;
};

// Deprecated alias
export const updateUserSettings = updateUserRates;

export const getCompanies = async () => {
    const response = await api.get('/companies');
    return response.data;
};
