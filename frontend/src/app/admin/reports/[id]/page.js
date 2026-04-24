'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import adminService from '../../../../services/adminService';
import { useAuth } from '../../../../context/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2, ArrowLeft, Camera, X } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { toast } from 'react-hot-toast';

const ReportMap = dynamic(() => import('../../../../components/ReportMap'), {
    ssr: false,
    loading: () => <div className="h-48 sm:h-64 bg-gray-100 flex items-center justify-center skeleton">Loading Map...</div>
});

export default function AdminReportDetail() {
    const { id } = useParams();
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const queryClient = useQueryClient();

    const [status, setStatus] = useState('');
    const [notes, setNotes] = useState('');
    const [resolutionFiles, setResolutionFiles] = useState([]);
    const [resolutionPreviews, setResolutionPreviews] = useState([]);

    useEffect(() => {
        if (!authLoading && (!user || user.role !== 'admin')) {
            router.push('/');
        }
    }, [user, authLoading, router]);

    const { data: reportData, isLoading } = useQuery({
        queryKey: ['report', id],
        queryFn: async () => {
            return await adminService.getReportDetails(id);
        },
        enabled: !!id && !!user && user.role === 'admin',
    });

    const report = reportData?.data?.report;

    useEffect(() => {
        if (report) {
            setStatus(report.status);
        }
    }, [report]);

    const updateMutation = useMutation({
        mutationFn: async (data) => {
            if (data.status === 'rejected') {
                await adminService.rejectReport(id, data.notes);
            } else if (data.status === 'resolved') {
                const formData = new FormData();
                formData.append('status', data.status);
                if (data.notes) formData.append('notes', data.notes);
                data.files.forEach((file) => {
                    formData.append('resolutionImages', file);
                });
                await adminService.updateReportStatus(id, formData);
            } else {
                await adminService.updateReportStatus(id, { status: data.status, notes: data.notes });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['report', id]);
            queryClient.invalidateQueries(['admin-reports']);
            toast.success('Complaint updated successfully');
            setNotes('');
            setResolutionFiles([]);
            setResolutionPreviews([]);
        },
        onError: (error) => {
            console.error(error);
            toast.error('Failed to update: ' + (error.response?.data?.message || error.message));
        },
    });

    const handleResolutionFileChange = (e) => {
        const selected = Array.from(e.target.files);
        const updated = [...resolutionFiles, ...selected].slice(0, 3);
        setResolutionFiles(updated);
        const newPreviews = updated.map(f => URL.createObjectURL(f));
        resolutionPreviews.forEach(url => URL.revokeObjectURL(url));
        setResolutionPreviews(newPreviews);
    };

    const removeResolutionFile = (index) => {
        URL.revokeObjectURL(resolutionPreviews[index]);
        const newFiles = resolutionFiles.filter((_, i) => i !== index);
        const newPreviews = resolutionPreviews.filter((_, i) => i !== index);
        setResolutionFiles(newFiles);
        setResolutionPreviews(newPreviews);
    };

    const handleUpdate = (e) => {
        e.preventDefault();
        if (status === 'rejected' && !notes) {
            toast.error('Please provide a reason for rejection in the notes field.');
            return;
        }
        if (status === 'resolved' && resolutionFiles.length === 0) {
            toast.error('Please upload at least one resolution image as proof.');
            return;
        }
        updateMutation.mutate({ status, notes, files: resolutionFiles });
    };

    if (authLoading || isLoading) return <div className="flex justify-center mt-20"><Loader2 className="animate-spin h-10 w-10 text-blue-600" /></div>;
    if (!report) return <div className="text-center mt-20">Complaint not found</div>;

    return (
        <div className="max-w-5xl mx-auto">
            <Link href="/admin" className="inline-flex items-center text-gray-600 hover:text-blue-600 mb-6 min-h-[44px]">
                <ArrowLeft size={20} className="mr-2" /> Back to Dashboard
            </Link>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-4">
                            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{report.title}</h1>
                            <span className={`px-3 py-1 rounded-full text-sm font-semibold whitespace-nowrap self-start ${report.status === 'resolved' ? 'bg-green-100 text-green-800' :
                                report.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'
                                }`}>
                                {report.status.replace(/_/g, ' ').toUpperCase()}
                            </span>
                        </div>

                        <p className="text-gray-700 mb-6 whitespace-pre-wrap">{report.description}</p>

                        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-6">
                            <div>
                                <span className="font-semibold block">Category:</span>
                                {report.category.replace(/_/g, ' ')}
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
                                <span className="font-semibold block">Complained By:</span>
                                {report.user?.name || 'Anonymous'}
                            </div>
                        </div>

                        {report.media && report.media.length > 0 && (
                            <div className="mb-6">
                                <h3 className="font-semibold mb-2">Attached Media</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {report.media.map((item, idx) => (
                                        item.type === 'image' ? (
                                            <img key={idx} src={item.url} alt="Evidence" className="rounded-lg w-full h-48 object-cover" loading="lazy" />
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

                        {/* Resolution Evidence */}
                        {report.resolutionMedia && report.resolutionMedia.length > 0 && (
                            <div className="mt-6">
                                <h3 className="font-semibold mb-2 text-green-700">✅ Resolution Evidence</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {report.resolutionMedia.map((item, idx) => (
                                        <img key={idx} src={item.url} alt={`Resolution ${idx + 1}`} className="rounded-lg w-full h-48 object-cover border-2 border-green-200" loading="lazy" />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* History */}
                    <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
                        <h3 className="font-bold text-lg mb-4">Activity History</h3>
                        <div className="space-y-4">
                            {report.history && report.history.length > 0 ? (
                                report.history.map((item, idx) => (
                                    <div key={idx} className="flex items-start border-l-2 border-gray-200 pl-4 pb-4">
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900">
                                                Status changed to {item.status.replace(/_/g, ' ').toUpperCase()}
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
                    <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200 sticky top-20">
                        <h3 className="font-bold text-lg mb-4">Manage Complaint</h3>
                        <form onSubmit={handleUpdate} className="space-y-4">
                            <div>
                                <label htmlFor="status" className="block text-sm font-medium text-gray-700">Update Status</label>
                                <select
                                    id="status"
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value)}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2.5"
                                >
                                    <option value="reported">Reported</option>
                                    <option value="acknowledged">Acknowledged</option>
                                    <option value="in_progress">In Progress</option>
                                    <option value="resolved">Resolved</option>
                                    <option value="closed">Closed</option>
                                    <option value="rejected">Rejected</option>
                                </select>
                            </div>

                            <div>
                                <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                                    {status === 'rejected' ? 'Rejection Reason' : 'Add Notes'}
                                </label>
                                <textarea
                                    id="notes"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    rows="3"
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2.5"
                                    placeholder={status === 'rejected' ? "Reason for rejection..." : "Internal notes or public update..."}
                                    required={status === 'rejected'}
                                ></textarea>
                            </div>

                            {/* Resolution Image Upload */}
                            {status === 'resolved' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Resolution Image(s) <span className="text-red-500">*</span>
                                    </label>
                                    <p className="text-xs text-gray-500 mb-2">Upload proof of the fixed work (max 3 images)</p>
                                    <div className="flex items-center justify-center w-full">
                                        <label className="flex flex-col items-center justify-center w-full h-20 sm:h-24 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition">
                                            <div className="flex flex-col items-center justify-center py-3">
                                                <Camera className="w-6 h-6 mb-1 text-gray-500" />
                                                <p className="text-xs text-gray-500"><span className="font-semibold">Click to upload</span></p>
                                            </div>
                                            <input type="file" className="hidden" multiple accept="image/*" onChange={handleResolutionFileChange} />
                                        </label>
                                    </div>
                                    {resolutionPreviews.length > 0 && (
                                        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                                            {resolutionPreviews.map((src, idx) => (
                                                <div key={idx} className="relative flex-shrink-0">
                                                    <img src={src} alt="Preview" className="h-16 w-16 object-cover rounded-md border" />
                                                    <button
                                                        type="button"
                                                        onClick={() => removeResolutionFile(idx)}
                                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                                                        aria-label={`Remove resolution image ${idx + 1}`}
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={updateMutation.isPending}
                                className="w-full bg-blue-600 text-white py-2.5 px-4 rounded-md hover:bg-blue-700 transition disabled:bg-blue-400 min-h-[44px]"
                            >
                                {updateMutation.isPending ? 'Updating...' : 'Update Complaint'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
