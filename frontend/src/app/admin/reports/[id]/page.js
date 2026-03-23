'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import adminService from '../../../../services/adminService';
import { useAuth } from '../../../../context/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const ReportMap = dynamic(() => import('../../../../components/ReportMap'), {
    ssr: false,
    loading: () => <div className="h-64 bg-gray-100 flex items-center justify-center">Loading Map...</div>
});

export default function AdminReportDetail() {
    const { id } = useParams();
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const queryClient = useQueryClient();

    const [status, setStatus] = useState('');
    const [notes, setNotes] = useState('');
    // Department feature not supported by backend yet
    // const [department, setDepartment] = useState('');

    useEffect(() => {
        if (!authLoading && (!user || user.role !== 'admin')) {
            router.push('/');
        }
    }, [user, authLoading, router]);

    const { data: reportData, isLoading } = useQuery({
        queryKey: ['report', id],
        queryFn: async () => {
            // Use admin endpoint for full details including history
            // adminService.getReports is for list, we need getReportDetails which maps to GET /admin/reports/:id
            // But adminService.js I created earlier didn't have getReportDetails!
            // I need to check adminService.js again.
            // If it's missing, I should add it or use api.get directly for now (but I should fix service).
            // Let's assume I will fix adminService.js to include getReportDetails.
            // Wait, I can just add it to adminService.js in a separate step.
            // For now, I'll use a direct call or assume it exists and fix it next.
            // Actually, I should check adminService.js content I wrote.
            // I wrote: getDashboardStats, getReports, updateReportStatus, rejectReport, getUsers, updateUserStatus, updateUserRole, deleteUser.
            // I MISSED getReportDetails!
            // I will add it to adminService.js first.
            return await adminService.getReportDetails(id);
        },
        enabled: !!id && !!user && user.role === 'admin',
    });

    // Initialize state when report loads
    const report = reportData?.data?.report;

    useEffect(() => {
        if (report) {
            setStatus(report.status);
            // setDepartment(report.department || '');
        }
    }, [report]);

    const updateMutation = useMutation({
        mutationFn: async (data) => {
            if (data.status === 'rejected') {
                await adminService.rejectReport(id, data.notes); // notes as reason
            } else {
                await adminService.updateReportStatus(id, { status: data.status, notes: data.notes });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['report', id]);
            queryClient.invalidateQueries(['admin-reports']);
            alert('Report updated successfully');
            setNotes(''); // Clear notes after update
        },
        onError: (error) => {
            console.error(error);
            alert('Failed to update report: ' + (error.response?.data?.message || error.message));
        },
    });

    const handleUpdate = (e) => {
        e.preventDefault();
        if (status === 'rejected' && !notes) {
            alert('Please provide a reason for rejection in the notes field.');
            return;
        }
        updateMutation.mutate({ status, notes });
    };

    if (authLoading || isLoading) return <div className="flex justify-center mt-20"><Loader2 className="animate-spin h-10 w-10 text-blue-600" /></div>;
    if (!report) return <div className="text-center mt-20">Report not found</div>;

    return (
        <div className="max-w-5xl mx-auto">
            <Link href="/admin" className="inline-flex items-center text-gray-600 hover:text-blue-600 mb-6">
                <ArrowLeft size={20} className="mr-2" /> Back to Dashboard
            </Link>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <div className="flex justify-between items-start mb-4">
                            <h1 className="text-2xl font-bold text-gray-900">{report.title}</h1>
                            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${report.status === 'resolved' ? 'bg-green-100 text-green-800' :
                                report.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'
                                }`}>
                                {report.status.replace('_', ' ').toUpperCase()}
                            </span>
                        </div>

                        <p className="text-gray-700 mb-6 whitespace-pre-wrap">{report.description}</p>

                        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-6">
                            <div>
                                <span className="font-semibold block">Category:</span>
                                {report.category.replace('_', ' ')}
                            </div>
                            <div>
                                <span className="font-semibold block">Severity:</span>
                                {report.severity}
                            </div>
                            <div>
                                <span className="font-semibold block">Location:</span>
                                {report.location.name}
                            </div>
                            <div>
                                <span className="font-semibold block">Reported By:</span>
                                {report.user?.name || 'Anonymous'}
                            </div>
                        </div>

                        {report.media && report.media.length > 0 && (
                            <div className="mb-6">
                                <h3 className="font-semibold mb-2">Attached Media</h3>
                                <div className="grid grid-cols-2 gap-2">
                                    {report.media.map((item, idx) => (
                                        item.type === 'image' ? (
                                            <img key={idx} src={item.url} alt="Evidence" className="rounded-lg w-full h-48 object-cover" />
                                        ) : (
                                            <video key={idx} src={item.url} controls className="rounded-lg w-full h-48 object-cover" />
                                        )
                                    ))}
                                </div>
                            </div>
                        )}

                        <div>
                            <h3 className="font-semibold mb-2">Location Map</h3>
                            <ReportMap reports={[report]} />
                        </div>
                    </div>

                    {/* History */}
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <h3 className="font-bold text-lg mb-4">Activity History</h3>
                        <div className="space-y-4">
                            {report.history && report.history.length > 0 ? (
                                report.history.map((item, idx) => (
                                    <div key={idx} className="flex items-start border-l-2 border-gray-200 pl-4 pb-4">
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900">
                                                Status changed to {item.status.replace('_', ' ').toUpperCase()}
                                            </p>
                                            <p className="text-sm text-gray-600">{item.notes}</p>
                                            <p className="text-xs text-gray-400 mt-1">
                                                {new Date(item.timestamp).toLocaleString('en-IN')}
                                                {item.updatedBy && ` by ${item.updatedBy.name || 'Admin'}`}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-gray-500">No history available.</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sidebar Actions */}
                <div className="lg:col-span-1">
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 sticky top-6">
                        <h3 className="font-bold text-lg mb-4">Manage Report</h3>
                        <form onSubmit={handleUpdate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Update Status</label>
                                <select
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value)}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                                >
                                    <option value="reported">Reported</option>
                                    <option value="acknowledged">Acknowledged</option>
                                    <option value="in_progress">In Progress</option>
                                    <option value="resolved">Resolved</option>
                                    <option value="closed">Closed</option>
                                    <option value="rejected">Rejected</option>
                                </select>
                            </div>

                            {/* Department assignment removed as not supported by backend */}

                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    {status === 'rejected' ? 'Rejection Reason' : 'Add Notes'}
                                </label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    rows="3"
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                                    placeholder={status === 'rejected' ? "Reason for rejection..." : "Internal notes or public update..."}
                                    required={status === 'rejected'}
                                ></textarea>
                            </div>

                            <button
                                type="submit"
                                disabled={updateMutation.isPending}
                                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition disabled:bg-blue-400"
                            >
                                {updateMutation.isPending ? 'Updating...' : 'Update Report'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
