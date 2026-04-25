'use client';

import { useQuery } from '@tanstack/react-query';
import adminService from '../../services/adminService';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, Filter, CheckCircle, Clock, AlertTriangle, Users } from 'lucide-react';

export default function AdminDashboard() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        if (!authLoading && (!user || user.role !== 'admin')) {
            router.push('/');
        }
    }, [user, authLoading, router]);

    const { data: statsData, isLoading: statsLoading } = useQuery({
        queryKey: ['admin-stats'],
        queryFn: async () => {
            return await adminService.getDashboardStats();
        },
        enabled: !!user && user.role === 'admin',
    });

    const { data: reportsData, isLoading: reportsLoading } = useQuery({
        queryKey: ['admin-reports', filter],
        queryFn: async () => {
            const params = filter !== 'all' ? { status: filter } : {};
            return await adminService.getReports(params);
        },
        enabled: !!user && user.role === 'admin',
    });

    if (authLoading || statsLoading || reportsLoading) return <div className="flex justify-center mt-20"><Loader2 className="animate-spin h-10 w-10 text-blue-600" /></div>;
    if (!user || user.role !== 'admin') return null;

    const stats = statsData?.data?.reports || {
        totalReports: 0,
        resolved: 0,
    };

    const pendingCount = (stats.reported || 0) + (stats.acknowledged || 0) + (stats.inProgress || 0);
    const criticalCount = statsData?.data?.severity?.find(s => s._id === 'critical')?.count || 0;
    const reports = reportsData?.data?.reports || [];

    return (
        <div className="max-w-7xl mx-auto">
            {/* Header — stacks on mobile */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
                <h1 className="text-2xl sm:text-3xl font-bold">Admin Dashboard</h1>
                <Link href="/admin/users" className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 min-h-[44px]">
                    <Users className="mr-2" size={20} />
                    Manage Users
                </Link>
            </div>

            {/* Stats Cards — 2 cols on mobile, 4 on desktop */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-8">
                <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
                    <h3 className="text-gray-500 text-xs sm:text-sm font-medium">Total Complaints</h3>
                    <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-2">{stats.totalReports}</p>
                </div>
                <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
                    <h3 className="text-gray-500 text-xs sm:text-sm font-medium">Resolved</h3>
                    <div className="flex items-center mt-2">
                        <CheckCircle className="text-green-500 mr-2 shrink-0" size={20} />
                        <p className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.resolved}</p>
                    </div>
                </div>
                <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
                    <h3 className="text-gray-500 text-xs sm:text-sm font-medium">Pending</h3>
                    <div className="flex items-center mt-2">
                        <Clock className="text-yellow-500 mr-2 shrink-0" size={20} />
                        <p className="text-2xl sm:text-3xl font-bold text-gray-900">{pendingCount}</p>
                    </div>
                </div>
                <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
                    <h3 className="text-gray-500 text-xs sm:text-sm font-medium">Critical Issues</h3>
                    <div className="flex items-center mt-2">
                        <AlertTriangle className="text-red-500 mr-2 shrink-0" size={20} />
                        <p className="text-2xl sm:text-3xl font-bold text-gray-900">{criticalCount}</p>
                    </div>
                </div>
            </div>

            {/* Filters — scrollable on mobile */}
            <div className="flex items-center mb-6 overflow-x-auto gap-3 pb-1">
                <Filter size={20} className="text-gray-500 shrink-0" />
                <button
                    onClick={() => setFilter('all')}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap min-h-[40px] ${filter === 'all' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                    All
                </button>
                <button
                    onClick={() => setFilter('reported')}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap min-h-[40px] ${filter === 'reported' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                    New
                </button>
                <button
                    onClick={() => setFilter('in_progress')}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap min-h-[40px] ${filter === 'in_progress' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                    In Progress
                </button>
                <button
                    onClick={() => setFilter('resolved')}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap min-h-[40px] ${filter === 'resolved' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                    Resolved
                </button>
            </div>

            {/* Complaints Table — horizontally scrollable */}
            <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Severity</th>
                                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {reports?.map((report) => (
                                <tr key={report._id} className="hover:bg-gray-50">
                                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">{report.title}</div>
                                        <div className="text-sm text-gray-500">{report.location.name}</div>
                                    </td>
                                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                                        {report.category.replace(/_/g, ' ')}
                                    </td>
                                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${report.status === 'resolved' ? 'bg-green-100 text-green-800' :
                                            report.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-red-100 text-red-800'
                                            }`}>
                                            {report.status.replace(/_/g, ' ').toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                                        {report.severity}
                                    </td>
                                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(report.createdAt).toLocaleDateString('en-IN')}
                                    </td>
                                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <Link href={`/admin/reports/${report._id}`} className="text-blue-600 hover:text-blue-900">
                                            Manage
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
