'use client';

import { useQuery } from '@tanstack/react-query';
import reportService from '../../../services/reportService';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, ArrowLeft, MapPin, Calendar, AlertTriangle, CheckCircle, Clock, ThumbsUp } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useAuth } from '../../../context/AuthContext';
import { useState, useEffect } from 'react';

const ReportMap = dynamic(() => import('../../../components/ReportMap'), {
    ssr: false,
    loading: () => <div className="h-64 bg-gray-100 flex items-center justify-center">Loading Map...</div>
});

export default function ReportDetail() {
    const { id } = useParams();
    const { user } = useAuth();
    const router = useRouter();
    const [upvotes, setUpvotes] = useState(0);
    const [isUpvoted, setIsUpvoted] = useState(false);
    const [upvoteLoading, setUpvoteLoading] = useState(false);

    const { data: reportData, isLoading, error } = useQuery({
        queryKey: ['report', id],
        queryFn: async () => {
            return await reportService.getReportById(id);
        },
        enabled: !!id,
    });

    const report = reportData?.data?.report;
    const reportOwnerId = report?.user?._id || report?.user || null;
    const reporterName = report?.user?.name || 'Anonymous user';

    useEffect(() => {
        if (report) {
            setUpvotes(typeof report.upvotes === 'number' ? report.upvotes : 0);
            setIsUpvoted(
                Array.isArray(report.upvotedBy) && user
                    ? report.upvotedBy.some((upvotedUserId) => upvotedUserId?.toString() === user._id)
                    : false
            );
        }
    }, [report, user]);

    const handleUpvote = async () => {
        if (!user) return;
        if (upvoteLoading) return;

        setUpvoteLoading(true);
        try {
            const data = await reportService.upvoteReport(report._id);
            const { upvotes, hasUpvoted } = data.data;
            setUpvotes(upvotes);
            setIsUpvoted(hasUpvoted);
        } catch (error) {
            console.error('Failed to upvote', error);
        } finally {
            setUpvoteLoading(false);
        }
    };

    if (isLoading) return <div className="flex justify-center mt-20"><Loader2 className="animate-spin h-10 w-10 text-blue-600" /></div>;

    if (error) {
        return (
            <div className="text-center mt-20">
                <p className="text-red-600 text-xl mb-4">Failed to load complaint details.</p>
                <Link href="/reports" className="text-blue-600 hover:underline">Back to Complaints</Link>
            </div>
        );
    }

    if (!report) return <div className="text-center mt-20">Complaint not found</div>;

    const getStatusColor = (status) => {
        switch (status) {
            case 'resolved': return 'bg-green-100 text-green-800';
            case 'in_progress': return 'bg-yellow-100 text-yellow-800';
            case 'rejected': return 'bg-gray-100 text-gray-800';
            default: return 'bg-red-100 text-red-800';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'resolved': return <CheckCircle className="w-5 h-5 mr-1" />;
            case 'in_progress': return <Clock className="w-5 h-5 mr-1" />;
            default: return <AlertTriangle className="w-5 h-5 mr-1" />;
        }
    };

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <Link href="/reports" className="inline-flex items-center text-gray-600 hover:text-blue-600 mb-6">
                <ArrowLeft size={20} className="mr-2" /> Back to Complaints
            </Link>

            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="p-6 md:p-8">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2 md:mb-0">{report.title}</h1>
                        <div className="flex items-center space-x-3">
                            <button
                                onClick={handleUpvote}
                                className={`flex items-center px-3 py-1 rounded-full border transition ${isUpvoted ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                disabled={upvoteLoading}
                            >
                                <ThumbsUp size={16} className={`mr-1.5 ${isUpvoted ? 'fill-current' : ''}`} />
                                <span className="text-sm font-medium">{upvotes} Upvotes</span>
                            </button>
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(report.status)}`}>
                                {getStatusIcon(report.status)}
                                {report.status.replace('_', ' ').toUpperCase()}
                            </span>
                            {user && reportOwnerId === user._id && (
                                <button
                                    onClick={async () => {
                                        if (confirm('Are you sure you want to delete this complaint?')) {
                                            try {
                                                await reportService.deleteReport(report._id);
                                                router.push('/reports');
                                            } catch (err) {
                                                console.error('Failed to delete', err);
                                                alert('Failed to delete complaint');
                                            }
                                        }
                                    }}
                                    className="px-3 py-1 rounded-full border border-red-200 text-red-600 hover:bg-red-50 text-sm font-medium"
                                >
                                    Delete
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div className="space-y-4">
                            <div className="flex items-start">
                                <MapPin className="w-5 h-5 text-gray-400 mt-1 mr-2" />
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Location</p>
                                    <p className="text-gray-900">{report.location.name}</p>
                                </div>
                            </div>
                            <div className="flex items-center">
                                <Calendar className="w-5 h-5 text-gray-400 mr-2" />
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Complained On</p>
                                    <p className="text-gray-900">{new Date(report.createdAt).toLocaleDateString('en-IN')}</p>
                                </div>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">Complained By</p>
                                <p className="text-gray-900">{reporterName}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">Category</p>
                                <p className="text-gray-900 capitalize">{report.category.replace('_', ' ')}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">Severity</p>
                                <p className="text-gray-900 capitalize">{report.severity}</p>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold mb-2">Description</h3>
                            <p className="text-gray-700 whitespace-pre-wrap">{report.description}</p>
                        </div>
                    </div>

                    {report.media && report.media.length > 0 && (
                        <div className="mb-8">
                            <h3 className="text-lg font-semibold mb-4">Media Evidence</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {report.media.map((item, idx) => (
                                    <div key={idx} className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
                                        {item.type === 'image' ? (
                                            <img src={item.url} alt={`Evidence ${idx + 1}`} className="w-full h-full object-cover" />
                                        ) : (
                                            <video src={item.url} controls className="w-full h-full object-cover" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="mb-8">
                        <h3 className="text-lg font-semibold mb-4">Location Map</h3>
                        <div className="h-64 rounded-lg overflow-hidden border border-gray-200">
                            <ReportMap reports={[report]} />
                        </div>
                    </div>

                    {report.history && report.history.length > 0 && (
                        <div>
                            <h3 className="text-lg font-semibold mb-4">Updates</h3>
                            <div className="space-y-4">
                                {report.history.map((item, idx) => (
                                    <div key={idx} className="flex items-start border-l-2 border-gray-200 pl-4 pb-4">
                                        <div>
                                            <p className="font-medium text-gray-900">
                                                Status updated to {item.status.replace('_', ' ').toUpperCase()}
                                            </p>
                                            {item.notes && <p className="text-gray-600 mt-1">{item.notes}</p>}
                                            <p className="text-xs text-gray-400 mt-1">
                                                {new Date(item.timestamp).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
