import api from '../api';

export const getWorkLogs = async (params?: { company_id?: string; user_id?: string; start_date?: string; end_date?: string; limit?: number }) => {
    const response = await api.get('/work-logs/', { params });
    return response.data;
};

export const createWorkLog = async (data: any) => {
    const response = await api.post('/work-logs/', data);
    return response.data;
};

export const updateWorkLog = async (id: string, data: any) => {
    const response = await api.put(`/work-logs/${id}`, data);
    return response.data;
};

export const deleteWorkLog = async (id: string) => {
    const response = await api.delete(`/work-logs/${id}`);
    return response.data;
};
