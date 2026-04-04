'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import adminService from '../../../../services/adminService';
import { useAuth } from '../../../../context/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { Loader2, ArrowLeft, Mail, Calendar, Shield, CheckCircle, XCircle, AlertTriangle, MapPin } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function UserDetailsPage() {
    const { user: currentUser, loading: authLoading } = useAuth();
    const router = useRouter();
    const params = useParams();
    const queryClient = useQueryClient();
    const userId = params.id;

    useEffect(() => {
        if (!authLoading && (!currentUser || currentUser.role !== 'admin')) {
            router.push('/');
        }
    }, [currentUser, authLoading, router]);

    const { data, isLoading } = useQuery({
        queryKey: ['admin-user-details', userId],
        queryFn: async () => {
            return await adminService.getUserDetails(userId);
        },
        enabled: !!currentUser && currentUser.role === 'admin' && !!userId,
    });

    // Fetch user's reports separately to reuse the reports list logic if needed, 
    // but for now we'll rely on the stats from the details endpoint and maybe fetch reports if we want to list them.
    // The plan said "Display a list of reports submitted by this user".
    // Let's add a query for that.
    const { data: userReportsData, isLoading: reportsLoading } = useQuery({
        queryKey: ['admin-user-reports', userId],
        queryFn: async () => {
            return await adminService.getReports({ userId: userId, limit: 50 });
        },
        enabled: !!currentUser && currentUser.role === 'admin' && !!userId,
    });

    const toggleStatusMutation = useMutation({
        mutationFn: async ({ id, isActive }) => {
            return await adminService.updateUserStatus(id, isActive);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['admin-user-details']);
            toast.success('User status updated');
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to update status');
        }
    });

    const updateRoleMutation = useMutation({
        mutationFn: async ({ id, role }) => {
            return await adminService.updateUserRole(id, role);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['admin-user-details']);
            toast.success('User role updated');
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to update role');
        }
    });

    if (authLoading || isLoading || reportsLoading) return <div className="flex justify-center mt-20"><Loader2 className="animate-spin h-10 w-10 text-blue-600" /></div>;
    if (!currentUser || currentUser.role !== 'admin') return null;

    const user = data?.data?.user;
    const stats = data?.data?.stats;
    const reports = userReportsData?.data?.reports || [];

    if (!user) return <div className="text-center mt-20">User not found</div>;

    return (
        <div className="max-w-7xl mx-auto">
            <button
                onClick={() => router.back()}
                className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
            >
                <ArrowLeft size={20} className="mr-2" />
                Back to Users
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* User Profile Card */}
                <div className="lg:col-span-1">
                    <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
                        <div className="flex flex-col items-center">
                            <div className="h-24 w-24 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-3xl font-bold mb-4">
                                {user.name.charAt(0).toUpperCase()}
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900">{user.name}</h2>
                            <div className="flex items-center text-gray-500 mt-2">
                                <Mail size={16} className="mr-2" />
                                {user.email}
                            </div>
                            <div className="flex items-center text-gray-500 mt-1">
                                <Calendar size={16} className="mr-2" />
                                Joined {new Date(user.createdAt).toLocaleDateString()}
                            </div>
                        </div>

                        <div className="mt-8 border-t border-gray-100 pt-6">
                            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">Account Status</h3>

                            <div className="flex justify-between items-center mb-4">
                                <span className="text-gray-700">Status</span>
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                    }`}>
                                    {user.isActive ? 'Active' : 'Inactive'}
                                </span>
                            </div>

                            <div className="flex justify-between items-center mb-6">
                                <span className="text-gray-700">Role</span>
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                                    }`}>
                                    {user.role.toUpperCase()}
                                </span>
                            </div>

                            <div className="space-y-3">
                                <button
                                    onClick={() => toggleStatusMutation.mutate({ id: user._id, isActive: !user.isActive })}
                                    className={`w-full py-2 px-4 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 ${user.isActive
                                        ? 'bg-red-50 text-red-700 hover:bg-red-100 focus:ring-red-500'
                                        : 'bg-green-50 text-green-700 hover:bg-green-100 focus:ring-green-500'
                                        }`}
                                >
                                    {user.isActive ? 'Deactivate Account' : 'Activate Account'}
                                </button>

                                {user.role === 'user' ? (
                                    <button
                                        onClick={() => updateRoleMutation.mutate({ id: user._id, role: 'admin' })}
                                        className="w-full py-2 px-4 rounded-md text-sm font-medium bg-purple-50 text-purple-700 hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                                    >
                                        Promote to Admin
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => updateRoleMutation.mutate({ id: user._id, role: 'user' })}
                                        className="w-full py-2 px-4 rounded-md text-sm font-medium bg-gray-50 text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                                    >
                                        Demote to User
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Stats Card */}
                    <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6 mt-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Activity Stats</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gray-50 p-4 rounded-lg text-center">
                                <div className="text-2xl font-bold text-gray-900">{stats?.totalReports || 0}</div>
                                <div className="text-xs text-gray-500 uppercase mt-1">Total Reports</div>
                            </div>
                            <div className="bg-green-50 p-4 rounded-lg text-center">
                                <div className="text-2xl font-bold text-green-700">{stats?.resolved || 0}</div>
                                <div className="text-xs text-green-600 uppercase mt-1">Resolved</div>
                            </div>
                            <div className="bg-red-50 p-4 rounded-lg text-center">
                                <div className="text-2xl font-bold text-red-700">{stats?.rejected || 0}</div>
                                <div className="text-xs text-red-600 uppercase mt-1">Rejected</div>
                            </div>
                            <div className="bg-blue-50 p-4 rounded-lg text-center">
                                <div className="text-2xl font-bold text-blue-700">{stats?.totalUpvotes || 0}</div>
                                <div className="text-xs text-blue-600 uppercase mt-1">Total Upvotes</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Reports List */}
                <div className="lg:col-span-2">
                    <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h3 className="text-lg font-medium text-gray-900">Submitted Reports</h3>
                        </div>

                        {reports.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                No reports submitted by this user.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Report</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {reports.map((report) => (
                                            <tr key={report._id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-start">
                                                        <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-md overflow-hidden">
                                                            {report.media && report.media.length > 0 && report.media[0].type === 'image' ? (
                                                                <img src={report.media[0].thumbnail || report.media[0].url} alt="" className="h-full w-full object-cover" />
                                                            ) : (
                                                                <div className="h-full w-full flex items-center justify-center text-gray-400">
                                                                    <AlertTriangle size={20} />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="ml-4">
                                                            <div className="text-sm font-medium text-gray-900">{report.title}</div>
                                                            <div className="text-sm text-gray-500 flex items-center mt-1">
                                                                <MapPin size={12} className="mr-1" />
                                                                {report.location.name}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${report.status === 'resolved' ? 'bg-green-100 text-green-800' :
                                                        report.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                                                            report.status === 'rejected' ? 'bg-gray-100 text-gray-800' :
                                                                'bg-red-100 text-red-800'
                                                        }`}>
                                                        {report.status.replace('_', ' ').toUpperCase()}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {new Date(report.createdAt).toLocaleDateString('en-IN')}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <Link href={`/admin/reports/${report._id}`} className="text-blue-600 hover:text-blue-900">
                                                        View
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
