'use client';

import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { PlusCircle, List, Map as MapIcon } from 'lucide-react';

export default function Dashboard() {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    if (loading) {
        return <div className="flex justify-center items-center h-screen">Loading...</div>;
    }

    if (!user) return null;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Welcome back, {user.name}!</h1>
                <p className="mt-2 text-gray-600">What would you like to do today?</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Submit Report Card */}
                <Link href="/submit" className="block group">
                    <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow duration-300 border border-gray-200">
                        <div className="p-6 flex flex-col items-center text-center">
                            <div className="p-3 bg-blue-100 rounded-full text-blue-600 mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                <PlusCircle size={32} />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900">Submit New Report</h3>
                            <p className="mt-2 text-sm text-gray-500">
                                Report a civic issue in your area. Add photos and location details.
                            </p>
                        </div>
                    </div>
                </Link>

                {/* My Reports Card */}
                <Link href="/report-status" className="block group">
                    <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow duration-300 border border-gray-200">
                        <div className="p-6 flex flex-col items-center text-center">
                            <div className="p-3 bg-green-100 rounded-full text-green-600 mb-4 group-hover:bg-green-600 group-hover:text-white transition-colors">
                                <List size={32} />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900">Report Status</h3>
                            <p className="mt-2 text-sm text-gray-500">
                                Check the current status of your submitted reports and open them for full details.
                            </p>
                        </div>
                    </div>
                </Link>

                {/* Nearby Reports Card */}
                {/* Note: We don't have a dedicated nearby page yet, but reports page has map view. 
                    Or we could link to a map view with nearby filter if implemented. 
                    For now, linking to reports page map view if possible, or just reports page.
                    Actually, let's just link to reports page for now as it has map toggle.
                */}
                <Link href="/reports?filter=nearby&view=map&sameCity=true" className="block group">
                    <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow duration-300 border border-gray-200">
                        <div className="p-6 flex flex-col items-center text-center">
                            <div className="p-3 bg-purple-100 rounded-full text-purple-600 mb-4 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                                <MapIcon size={32} />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900">View Map</h3>
                            <p className="mt-2 text-sm text-gray-500">
                                Explore reports in your area on an interactive map.
                            </p>
                        </div>
                    </div>
                </Link>
            </div>

            {user.role === 'admin' && (
                <div className="mt-8">
                    <Link href="/admin" className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700">
                        Go to Admin Dashboard
                    </Link>
                </div>
            )}
        </div>
    );
}
