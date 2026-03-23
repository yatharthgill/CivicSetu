import api from './api';

const reportService = {
    createReport: async (formData) => {
        const response = await api.post('/reports/create', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    getMyReports: async (params) => {
        const response = await api.get('/reports/my-reports', { params });
        return response.data;
    },

    getAllReports: async (params) => {
        const response = await api.get('/reports/all-reports', { params });
        return response.data;
    },

    getReportById: async (id) => {
        const response = await api.get(`/reports/${id}`);
        return response.data;
    },

    getNearbyReports: async (params) => {
        const response = await api.get('/reports/nearby', { params });
        return response.data;
    },

    upvoteReport: async (id) => {
        const response = await api.patch(`/reports/${id}/upvote`);
        return response.data;
    },

    deleteReport: async (id) => {
        const response = await api.delete(`/reports/${id}`);
        return response.data;
    }
};

export default reportService;
