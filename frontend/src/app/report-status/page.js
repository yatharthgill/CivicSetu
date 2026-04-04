'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
    AlertTriangle,
    CheckCircle2,
    ChevronRight,
    Clock3,
    FileText,
    Loader2,
    MapPin,
    XCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import reportService from '../../services/reportService';

const statusConfig = {
    reported: {
        label: 'Reported',
        tone: 'bg-red-100 text-red-700',
        progress: 20,
        icon: AlertTriangle,
    },
    acknowledged: {
        label: 'Acknowledged',
        tone: 'bg-orange-100 text-orange-700',
        progress: 40,
        icon: Clock3,
    },
    in_progress: {
        label: 'In Progress',
        tone: 'bg-yellow-100 text-yellow-700',
        progress: 65,
        icon: Clock3,
    },
    resolved: {
        label: 'Resolved',
        tone: 'bg-green-100 text-green-700',
        progress: 100,
        icon: CheckCircle2,
    },
    closed: {
        label: 'Closed',
        tone: 'bg-slate-100 text-slate-700',
        progress: 100,
        icon: CheckCircle2,
    },
    rejected: {
        label: 'Rejected',
        tone: 'bg-rose-100 text-rose-700',
        progress: 100,
        icon: XCircle,
    },
};

export default function ReportStatusPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [authLoading, router, user]);

    const { data, isLoading, error } = useQuery({
        queryKey: ['report-status', user?._id],
        queryFn: async () => reportService.getMyReports({
            limit: 100,
            sortBy: 'createdAt',
            order: 'desc',
        }),
        enabled: !!user,
    });

    if (authLoading || (isLoading && user)) {
        return (
            <div className="flex justify-center mt-20">
                <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
            </div>
        );
    }

    if (!user) {
        return null;
    }

    if (error) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
                <p className="text-lg text-red-600 mb-4">Failed to load your report statuses.</p>
                <button
                    onClick={() => router.refresh()}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                    Try Again
                </button>
            </div>
        );
    }

    const reports = data?.data?.reports || [];
    const totalReports = reports.length;
    const activeReports = reports.filter((report) => !['resolved', 'closed', 'rejected'].includes(report.status)).length;
    const resolvedReports = reports.filter((report) => ['resolved', 'closed'].includes(report.status)).length;
    const rejectedReports = reports.filter((report) => report.status === 'rejected').length;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900">My Report Status</h1>
                <p className="mt-2 text-gray-600">
                    Check the latest status of every report you have submitted and open a report to see full details and updates.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-5">
                    <p className="text-sm text-gray-500">Total Reports</p>
                    <p className="mt-2 text-3xl font-bold text-gray-900">{totalReports}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-5">
                    <p className="text-sm text-gray-500">Active</p>
                    <p className="mt-2 text-3xl font-bold text-yellow-700">{activeReports}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-5">
                    <p className="text-sm text-gray-500">Resolved / Closed</p>
                    <p className="mt-2 text-3xl font-bold text-green-700">{resolvedReports}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-5">
                    <p className="text-sm text-gray-500">Rejected</p>
                    <p className="mt-2 text-3xl font-bold text-red-700">{rejectedReports}</p>
                </div>
            </div>

            {reports.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    <FileText className="mx-auto h-10 w-10 text-gray-400" />
                    <h2 className="mt-4 text-xl font-semibold text-gray-900">No reports submitted yet</h2>
                    <p className="mt-2 text-gray-500">Once you submit a report, its current status will appear here.</p>
                    <Link
                        href="/submit"
                        className="mt-6 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        Submit a Report
                    </Link>
                </div>
            ) : (
                <div className="space-y-4">
                    {reports.map((report) => {
                        const config = statusConfig[report.status] || statusConfig.reported;
                        const StatusIcon = config.icon;

                        return (
                            <Link
                                key={report._id}
                                href={`/reports/${report._id}`}
                                className="block bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition"
                            >
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-3">
                                            <h2 className="text-xl font-semibold text-gray-900">{report.title}</h2>
                                            <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium ${config.tone}`}>
                                                <StatusIcon className="h-4 w-4" />
                                                {config.label}
                                            </span>
                                        </div>

                                        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-gray-500">
                                            <span className="inline-flex items-center gap-1">
                                                <MapPin className="h-4 w-4" />
                                                {report.location?.name || 'Location unavailable'}
                                            </span>
                                            <span>
                                                Submitted on {new Date(report.createdAt).toLocaleDateString('en-IN')}
                                            </span>
                                            <span className="capitalize">
                                                {report.category?.replace('_', ' ')}
                                            </span>
                                        </div>

                                        <div className="mt-4">
                                            <div className="mb-2 flex items-center justify-between text-sm">
                                                <span className="font-medium text-gray-700">Status Progress</span>
                                                <span className="text-gray-500">{config.progress}%</span>
                                            </div>
                                            <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                                                <div
                                                    className="h-full rounded-full bg-blue-600 transition-all"
                                                    style={{ width: `${config.progress}%` }}
                                                />
                                            </div>
                                        </div>

                                        {report.status === 'rejected' && report.rejectionReason && (
                                            <p className="mt-3 text-sm text-red-600">
                                                Rejection reason: {report.rejectionReason}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex items-center text-sm font-medium text-blue-600">
                                        View full details
                                        <ChevronRight className="ml-1 h-4 w-4" />
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
