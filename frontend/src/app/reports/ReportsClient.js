'use client';

import ReportCard from '../../components/ReportCard';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useState } from 'react';
import { Loader2, List, Map as MapIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import reportService from '../../services/reportService';

const ReportMap = dynamic(() => import('../../components/ReportMap'), {
    ssr: false,
    loading: () => <div className="h-[500px] bg-gray-100 flex items-center justify-center">Loading Map...</div>
});

export default function ReportsClient({ initialReports, initialFilter, initialView, sameCityOnly, user }) {
    const [viewMode, setViewMode] = useState(initialView === 'map' ? 'map' : 'list');
    const [filter, setFilter] = useState(['all', 'my', 'nearby'].includes(initialFilter) ? initialFilter : 'all');
    const router = useRouter();
    
    // Nearest location states
    const [location, setLocation] = useState(null);
    const [locationError, setLocationError] = useState(null);
    const [detectedCity, setDetectedCity] = useState('');
    const [isResolvingCity, setIsResolvingCity] = useState(false);

    const resolveCityFromCoordinates = useCallback(async (lat, lng) => {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
        );
        if (!response.ok) throw new Error('Reverse geocoding failed');
        const data = await response.json();
        const address = data.address || {};
        return address.city || address.town || address.municipality || address.village || address.county || '';
    }, []);

    const loadNearbyLocation = useCallback(() => {
        if (!navigator.geolocation) {
            setLocationError('Geolocation is not supported by your browser');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const nextLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                setLocation(nextLocation);
                setLocationError(null);

                if (!sameCityOnly) {
                    setDetectedCity('');
                    setIsResolvingCity(false);
                    return;
                }

                setIsResolvingCity(true);
                try {
                    const city = await resolveCityFromCoordinates(nextLocation.lat, nextLocation.lng);
                    if (!city) {
                        setLocationError('Unable to determine your city for same-city map results');
                        setDetectedCity('');
                        return;
                    }
                    setDetectedCity(city);
                    setLocationError(null);
                } catch (error) {
                    console.error('City lookup error:', error);
                    setDetectedCity('');
                    setLocationError('Unable to determine your city for same-city map results');
                } finally {
                    setIsResolvingCity(false);
                }
            },
            (error) => {
                setLocationError('Unable to retrieve your location');
                console.error('Geolocation error:', error);
            }
        );
    }, [resolveCityFromCoordinates, sameCityOnly]);

    useEffect(() => {
        if (filter === 'nearby' && !location) {
            loadNearbyLocation();
        }
    }, [filter, location, loadNearbyLocation]);

    const handleFilterChange = (nextFilter) => {
        // Update URL to leverage SSR and sharable links
        const params = new URLSearchParams(window.location.search);
        params.set('filter', nextFilter);
        router.push(`/reports?${params.toString()}`);
        setFilter(nextFilter);
        
        if (nextFilter !== 'nearby') {
            setLocationError(null);
            return;
        }
        if (location && (!sameCityOnly || detectedCity)) {
            setLocationError(null);
            return;
        }
        loadNearbyLocation();
    };

    const handleViewChange = (mode) => {
        const params = new URLSearchParams(window.location.search);
        params.set('view', mode);
        router.push(`/reports?${params.toString()}`);
        setViewMode(mode);
    };

    // We only use React Query to fetch dynamically IF we are filtering by 'nearby'. 
    // Otherwise, we rely on the Server Component's initialReports.
    const { data: nearbyReportsData, isLoading: isLoadingNearby, error: nearbyError } = useQuery({
        queryKey: ['reports', 'nearby', location, detectedCity, sameCityOnly],
        queryFn: async () => {
            const params = {
                lat: location.lat,
                lng: location.lng,
                radius: 5000 // 5km radius
            };
            if (sameCityOnly && detectedCity) {
                params.city = detectedCity;
            }
            return await reportService.getNearbyReports(params);
        },
        enabled: filter === 'nearby' && !!location && (!sameCityOnly || !!detectedCity) && !isResolvingCity,
    });

    const isPreparingNearbyResults = filter === 'nearby' && !!location && sameCityOnly && isResolvingCity;
    const isLoading = isPreparingNearbyResults || isLoadingNearby;
    
    // Determine active reports source
    const reports = filter === 'nearby' ? (nearbyReportsData?.data?.reports || []) : initialReports;
    const error = filter === 'nearby' ? nearbyError : null;

    if (!user) {
        return (
            <div className="text-center mt-20">
                <p className="text-xl mb-4">Please login to view reports.</p>
                <button
                    onClick={() => router.push('/login')}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                    Login
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 space-y-4 md:space-y-0">
                <h1 className="text-3xl font-bold text-gray-900">
                    {filter === 'all' ? 'All Reports' : filter === 'my' ? 'My Reports' : 'Nearby Reports'}
                </h1>

                <div className="flex items-center space-x-4">
                    {/* Filter Toggle */}
                    <div className="bg-gray-100 p-1 rounded-lg flex">
                        <button
                            onClick={() => handleFilterChange('all')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition ${filter === 'all' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
                        >
                            All Reports
                        </button>
                        <button
                            onClick={() => handleFilterChange('my')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition ${filter === 'my' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
                        >
                            My Reports
                        </button>
                        <button
                            onClick={() => handleFilterChange('nearby')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition ${filter === 'nearby' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
                        >
                            Nearby
                        </button>
                    </div>

                    {/* View Mode Toggle */}
                    <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg">
                        <button
                            onClick={() => handleViewChange('list')}
                            className={`p-2 rounded-md flex items-center ${viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
                        >
                            <List size={20} />
                        </button>
                        <button
                            onClick={() => handleViewChange('map')}
                            className={`p-2 rounded-md flex items-center ${viewMode === 'map' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
                        >
                            <MapIcon size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {filter === 'nearby' && locationError && (
                <div className="bg-red-50 text-red-700 p-4 rounded-md mb-6">
                    {locationError}. Please enable location services to see nearby reports.
                </div>
            )}

            {filter === 'nearby' && sameCityOnly && detectedCity && (
                <div className="bg-blue-50 text-blue-700 p-4 rounded-md mb-6">
                    Showing nearby reports from {detectedCity}.
                </div>
            )}

            {isLoading ? (
                <div className="flex justify-center mt-20"><Loader2 className="animate-spin h-10 w-10 text-blue-600" /></div>
            ) : error ? (
                <div className="text-center mt-20 text-red-600">Failed to load reports</div>
            ) : (
                <>
                    {viewMode === 'map' ? (
                        <ReportMap reports={reports} />
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {reports.length > 0 ? (
                                reports.map((report) => (
                                    <ReportCard key={report._id} report={report} />
                                ))
                            ) : (
                                <div className="col-span-1 md:col-span-2 text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                                    <p className="text-gray-500 text-lg">No reports found.</p>
                                    {filter === 'my' && (
                                        <button
                                            onClick={() => router.push('/submit')}
                                            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                        >
                                            Submit Your First Report
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
