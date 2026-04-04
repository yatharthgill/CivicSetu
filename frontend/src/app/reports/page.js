import ReportsClient from './ReportsClient';
import { serverFetch } from '../../utils/serverFetch';

export const revalidate = 0; // Ensures data is fetched fresh

export default async function ReportsPage({ searchParams }) {
    // Resolve search parameters (Next.js 15+ searchParams is a Promise, safe to await)
    const params = await searchParams;
    const initialFilter = params?.filter || 'all';
    const initialView = params?.view || 'list';
    const sameCityOnly = params?.sameCity === 'true';

    let user = null;
    let initialReports = [];

    // Authenticate the user on the server
    try {
        const authData = await serverFetch('/auth/me');
        if (authData && authData.data && authData.data.user) {
            user = authData.data.user;
        }
    } catch (e) {
        // User not logged in
    }

    // Server-side fetching of static reports filter
    if (user && (initialFilter === 'all' || initialFilter === 'my')) {
        try {
            const endpoint = initialFilter === 'all' ? '/reports/all-reports' : '/reports/my-reports';
            const data = await serverFetch(endpoint);
            initialReports = data?.data?.reports || [];
        } catch (e) {
            console.error('Failed to fetch reports on server', e);
        }
    }

    return (
        <ReportsClient 
            initialReports={initialReports} 
            initialFilter={initialFilter} 
            initialView={initialView} 
            sameCityOnly={sameCityOnly} 
            user={user} 
        />
    );
}
