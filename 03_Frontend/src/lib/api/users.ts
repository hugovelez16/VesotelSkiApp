import api from "@/lib/api";
import { User } from "@/lib/types";

export interface CreateUserRequest {
    email: string;
    password?: string;
    full_name: string;
    role?: string;
}

export const getUsers = async (): Promise<User[]> => {
    const response = await api.get("/users");
    return response.data;
};

export const getUserDevices = async (userId: string) => {
    const response = await api.get(`/users/${userId}/devices`);
    return response.data;
};

export const revokeUserDevice = async (userId: string, deviceId: string) => {
    const response = await api.delete(`/users/${userId}/devices/${deviceId}`);
    return response.data;
};

export const getUser = async (userId: string): Promise<User> => {
    const response = await api.get(`/users/${userId}`);
    return response.data;
};

export const getUserCompanies = async (userId: string): Promise<any[]> => {
    const response = await api.get(`/users/${userId}/companies`);
    return response.data;
};

export const getUserRates = async (userId: string): Promise<any[]> => {
    const response = await api.get(`/users/${userId}/rates`);
    return response.data;
};

export const createUser = async (data: CreateUserRequest): Promise<User> => {
    const response = await api.post("/users", data);
    return response.data;
};

export const updateUserStatus = async (userId: string, isActive: boolean): Promise<any> => {
    const response = await api.put(`/users/${userId}/status?is_active=${isActive}`);
    return response.data;
};
export const updateUser = async (userId: string, data: Partial<User> & { password?: string }): Promise<User> => {
    const response = await api.put(`/users/${userId}`, data);
    return response.data;
};

export const updateMe = async (data: Partial<User>): Promise<User> => {
    const response = await api.put(`/users/me`, data);
    return response.data;
};

export const changePassword = async (data: any) => {
    const response = await api.post('/users/me/change-password', data);
    return response.data;
};

export const resetPasswordEmail = async (userId: string) => {
    const response = await api.post(`/users/${userId}/reset-password-email`);
    return response.data;
};

export const getNotifications = async (): Promise<any[]> => {
    const response = await api.get("/notifications");
    return response.data;
};

export const markNotificationRead = async (notificationId: string): Promise<any> => {
    const response = await api.put(`/notifications/${notificationId}/read`);
    return response.data;
};
