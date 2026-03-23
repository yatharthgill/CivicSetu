import api from './api';

const adminService = {
    getDashboardStats: async () => {
        const response = await api.get('/admin/dashboard/stats');
        return response.data;
    },

    getReportDetails: async (id) => {
        const response = await api.get(`/admin/reports/${id}`);
        return response.data;
    },

    getReports: async (params) => {
        const response = await api.get('/admin/reports', { params });
        return response.data;
    },

    updateReportStatus: async (id, data) => {
        const response = await api.patch(`/admin/reports/${id}/status`, data);
        return response.data;
    },

    rejectReport: async (id, reason) => {
        const response = await api.patch(`/admin/reports/${id}/reject`, { reason });
        return response.data;
    },

    overrideReportRouting: async (id, data) => {
        const response = await api.patch(`/admin/reports/${id}/routing`, data);
        return response.data;
    },

    getUsers: async (params) => {
        const response = await api.get('/admin/users', { params });
        return response.data;
    },

    getUserDetails: async (id) => {
        const response = await api.get(`/admin/users/${id}`);
        return response.data;
    },

    updateUserStatus: async (id, isActive) => {
        const response = await api.patch(`/admin/users/${id}/status`, { isActive });
        return response.data;
    },

    updateUserRole: async (id, role) => {
        const response = await api.patch(`/admin/users/${id}/role`, { role });
        return response.data;
    },

    deleteUser: async (id) => {
        const response = await api.delete(`/admin/users/${id}`);
        return response.data;
    }
};

export default adminService;
