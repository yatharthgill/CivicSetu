import axios from 'axios';

const api = axios.create({
    baseURL: '/api', // Requests will hit Next.js and be proxied to the backend via rewrites
    withCredentials: true, // Important for HttpOnly cookies
    timeout: 15000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Response interceptor for global error handling (optional but good practice)
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const config = error.config || {};
        const method = (config.method || '').toLowerCase();
        const isGet = method === 'get';
        const status = error.response?.status;
        const isNetworkOrServerIssue = !status || status >= 500;

        if (isGet && isNetworkOrServerIssue) {
            config.__retryCount = config.__retryCount || 0;

            if (config.__retryCount < 2) {
                config.__retryCount += 1;
                const backoffMs = 400 * config.__retryCount;
                await new Promise((resolve) => setTimeout(resolve, backoffMs));
                return api(config);
            }
        }

        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            // Handle unauthorized access (e.g., redirect to login)
            // But be careful not to cause loops if the check-auth endpoint itself fails
        }
        return Promise.reject(error);
    }
);

export default api;
