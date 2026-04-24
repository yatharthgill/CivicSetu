import { MapPin, Clock, ThumbsUp } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import reportService from '../services/reportService';
import { useAuth } from '../context/AuthContext';

export default function ReportCard({ report }) {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const reportOwnerId = report.user?._id || report.user || null;
    const reporterName = report.user?.name || 'Anonymous user';
    const [upvotes, setUpvotes] = useState(typeof report.upvotes === 'number' ? report.upvotes : 0);
    const [isUpvoted, setIsUpvoted] = useState(
        Array.isArray(report.upvotedBy) && user ? report.upvotedBy.includes(user._id) : false
    );
    const [loading, setLoading] = useState(false);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        setUpvotes(typeof report.upvotes === 'number' ? report.upvotes : 0);
        setIsUpvoted(
            Array.isArray(report.upvotedBy) && user
                ? report.upvotedBy.some((id) => id?.toString() === user._id)
                : false
        );
    }, [report.upvotes, report.upvotedBy, user]);

    const handleUpvote = async (e) => {
        e.preventDefault();
        if (!user) return;
        if (loading) return;

        setLoading(true);
        try {
            const data = await reportService.upvoteReport(report._id);
            const { upvotes, hasUpvoted } = data.data;
            setUpvotes(upvotes);
            setIsUpvoted(hasUpvoted);
        } catch (error) {
            console.error('Failed to upvote', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (e) => {
        e.preventDefault();
        if (!confirm('Are you sure you want to delete this complaint?')) return;

        setDeleting(true);
        try {
            await reportService.deleteReport(report._id);
            toast.success('Complaint deleted successfully');
            // Invalidate all report-related queries instead of full page reload
            queryClient.invalidateQueries({ predicate: (query) => {
                const key = String(query.queryKey?.[0] || '');
                return ['reports', 'report', 'report-status', 'admin-reports'].includes(key);
            }});
        } catch (err) {
            console.error('Failed to delete', err);
            toast.error('Failed to delete complaint');
        } finally {
            setDeleting(false);
        }
    };

    const statusColors = {
        reported: 'bg-red-100 text-red-800',
        acknowledged: 'bg-orange-100 text-orange-800',
        in_progress: 'bg-yellow-100 text-yellow-800',
        resolved: 'bg-green-100 text-green-800',
        closed: 'bg-gray-100 text-gray-800',
        rejected: 'bg-red-50 text-red-600',
    };

    const priorityColors = {
        low: 'bg-slate-100 text-slate-700',
        medium: 'bg-blue-100 text-blue-700',
        high: 'bg-amber-100 text-amber-700',
        critical: 'bg-rose-100 text-rose-700',
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden card-hover flex flex-col h-full">
            {report.media && report.media.length > 0 && report.media[0].type === 'image' ? (
                <img
                    src={report.media[0].url}
                    alt={report.title}
                    className="w-full h-40 object-cover"
                    loading="lazy"
                />
            ) : (
                <div className="w-full h-40 bg-gray-100 flex items-center justify-center text-gray-400">
                    No Image
                </div>
            )}

            <div className="p-3 sm:p-4 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2 flex-wrap gap-1">
                    <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${statusColors[report.status] || 'bg-gray-100'}`}>
                        {report.status.replace(/_/g, ' ').toUpperCase()}
                    </span>
                    <div className="flex items-center gap-2">
                        {report.priorityLevel && (
                            <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${priorityColors[report.priorityLevel] || 'bg-gray-100 text-gray-700'}`}>
                                PRIORITY {String(report.priorityLevel).toUpperCase()}
                            </span>
                        )}
                        <span className="text-xs text-gray-500 flex items-center">
                            <Clock size={12} className="mr-1" />
                            {new Date(report.createdAt).toLocaleDateString('en-IN')}
                        </span>
                    </div>
                </div>

                <h3 className="text-base font-bold text-gray-900 mb-1 truncate">{report.title}</h3>

                <div className="flex items-center text-gray-600 text-xs mb-2">
                    <MapPin size={12} className="mr-1 shrink-0" />
                    <span className="truncate">{report.location.name}</span>
                </div>

                <p className="text-xs text-gray-500 mb-2">
                    Complained by {reporterName}
                </p>

                <p className="text-gray-600 text-xs line-clamp-2 mb-3 flex-1">
                    {report.description}
                </p>

                <div className="flex justify-between items-center pt-3 border-t border-gray-100 mt-auto">
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={handleUpvote}
                            className={`flex items-center text-xs font-medium transition min-h-[44px] min-w-[44px] justify-center ${isUpvoted ? 'text-blue-600' : 'text-gray-500 hover:text-blue-600'}`}
                            disabled={loading}
                            aria-label={isUpvoted ? 'Remove upvote' : 'Upvote this complaint'}
                        >
                            <ThumbsUp size={14} className={`mr-1 ${isUpvoted ? 'fill-current' : ''}`} />
                            {upvotes}
                        </button>
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                            {report.category.replace(/_/g, ' ')}
                        </span>
                    </div>
                    <div className="flex items-center space-x-3">
                        {user && reportOwnerId === user._id && (
                            <button
                                onClick={handleDelete}
                                disabled={deleting}
                                className="text-red-600 text-xs font-medium hover:text-red-800 min-h-[44px] px-2 flex items-center disabled:opacity-50"
                                aria-label="Delete this complaint"
                            >
                                {deleting ? 'Deleting...' : 'Delete'}
                            </button>
                        )}
                        <Link href={`/reports/${report._id}`} className="text-blue-600 text-xs font-medium hover:text-blue-800 min-h-[44px] flex items-center">
                            View Details
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
