'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import adminService from '../../../services/adminService';
import { useAuth } from '../../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, Search, Trash2, UserCheck, UserX, Shield } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function UsersPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const queryClient = useQueryClient();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    useEffect(() => {
        if (!authLoading && (!user || user.role !== 'admin')) {
            router.push('/');
        }
    }, [user, authLoading, router]);

    const { data, isLoading } = useQuery({
        queryKey: ['admin-users', page, debouncedSearch],
        queryFn: async () => {
            return await adminService.getUsers({ page, limit: 10, search: debouncedSearch });
        },
        enabled: !!user && user.role === 'admin',
    });

    const toggleStatusMutation = useMutation({
        mutationFn: async ({ id, isActive }) => {
            return await adminService.updateUserStatus(id, isActive);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['admin-users']);
            toast.success('User status updated');
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to update status');
        }
    });

    const deleteUserMutation = useMutation({
        mutationFn: async (id) => {
            if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
            return await adminService.deleteUser(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['admin-users']);
            toast.success('User deleted successfully');
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to delete user');
        }
    });

    if (authLoading || isLoading) return <div className="flex justify-center mt-20"><Loader2 className="animate-spin h-10 w-10 text-blue-600" /></div>;
    if (!user || user.role !== 'admin') return null;

    const users = data?.data?.users || [];
    const pagination = data?.data?.pagination || {};

    return (
        <div className="max-w-7xl mx-auto">
            {/* Header — stacks on mobile */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
                <h1 className="text-2xl sm:text-3xl font-bold">User Management</h1>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none w-full sm:w-auto"
                    />
                </div>
            </div>

            {/* Table — horizontally scrollable */}
            <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Complaints</th>
                                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                                <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {users.map((u) => (
                                <tr key={u._id} className="hover:bg-gray-50">
                                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold shrink-0">
                                                {u.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-gray-900">{u.name}</div>
                                                <div className="text-sm text-gray-500">{u.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${u.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                                            }`}>
                                            {u.role === 'admin' ? <Shield size={12} className="mr-1" /> : null}
                                            {u.role.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${u.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                            }`}>
                                            {u.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {u.reportCount || 0}
                                    </td>
                                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(u.createdAt).toLocaleDateString('en-IN')}
                                    </td>
                                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex justify-end space-x-2 sm:space-x-3">
                                            <button
                                                onClick={() => toggleStatusMutation.mutate({ id: u._id, isActive: !u.isActive })}
                                                className={`p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded ${u.isActive ? 'text-orange-600 hover:text-orange-900 hover:bg-orange-50' : 'text-green-600 hover:text-green-900 hover:bg-green-50'}`}
                                                title={u.isActive ? "Deactivate User" : "Activate User"}
                                            >
                                                {u.isActive ? <UserX size={18} /> : <UserCheck size={18} />}
                                            </button>
                                            <Link href={`/admin/users/${u._id}`} className="text-blue-600 hover:text-blue-900 p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded hover:bg-blue-50" title="View Details">
                                                View
                                            </Link>
                                            <button
                                                onClick={() => deleteUserMutation.mutate(u._id)}
                                                className="text-red-600 hover:text-red-900 p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded hover:bg-red-50"
                                                title="Delete User"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
                <div className="flex justify-center mt-6 space-x-2">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50 min-h-[44px]"
                    >
                        Previous
                    </button>
                    <span className="px-4 py-2 text-gray-600 flex items-center">
                        Page {page} of {pagination.pages}
                    </span>
                    <button
                        onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                        disabled={page === pagination.pages}
                        className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50 min-h-[44px]"
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
}
