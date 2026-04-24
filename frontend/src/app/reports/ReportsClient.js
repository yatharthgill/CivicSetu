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
    loading: () => <div className="h-[300px] sm:h-[400px] lg:h-[500px] bg-gray-100 flex items-center justify-center skeleton">Loading Map...</div>
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

    const { data: nearbyReportsData, isLoading: isLoadingNearby, error: nearbyError } = useQuery({
        queryKey: ['reports', 'nearby', location, detectedCity, sameCityOnly],
        queryFn: async () => {
            const params = {
                lat: location.lat,
                lng: location.lng,
                radius: 5000
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
    
    const reports = filter === 'nearby' ? (nearbyReportsData?.data?.reports || []) : initialReports;
    const error = filter === 'nearby' ? nearbyError : null;

    if (!user) {
        return (
            <div className="text-center mt-20">
                <p className="text-xl mb-4">Please login to view complaints.</p>
                <button
                    onClick={() => router.push('/login')}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 min-h-[48px]"
                >
                    Login
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto">
            {/* Header and controls */}
            <div className="flex flex-col gap-4 mb-6">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                    {filter === 'all' ? 'All Complaints' : filter === 'my' ? 'My Complaints' : 'Nearby Complaints'}
                </h1>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    {/* Filter Toggle — scrollable on mobile */}
                    <div className="bg-gray-100 p-1 rounded-lg flex overflow-x-auto no-scrollbar">
                        <button
                            onClick={() => handleFilterChange('all')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition whitespace-nowrap ${filter === 'all' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
                        >
                            All Complaints
                        </button>
                        <button
                            onClick={() => handleFilterChange('my')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition whitespace-nowrap ${filter === 'my' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
                        >
                            My Complaints
                        </button>
                        <button
                            onClick={() => handleFilterChange('nearby')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition whitespace-nowrap ${filter === 'nearby' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
                        >
                            Nearby
                        </button>
                    </div>

                    {/* View Mode Toggle */}
                    <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg self-start">
                        <button
                            onClick={() => handleViewChange('list')}
                            className={`p-2 rounded-md flex items-center min-w-[44px] min-h-[44px] justify-center ${viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
                            aria-label="List view"
                        >
                            <List size={20} />
                        </button>
                        <button
                            onClick={() => handleViewChange('map')}
                            className={`p-2 rounded-md flex items-center min-w-[44px] min-h-[44px] justify-center ${viewMode === 'map' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
                            aria-label="Map view"
                        >
                            <MapIcon size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {filter === 'nearby' && locationError && (
                <div className="bg-red-50 text-red-700 p-4 rounded-md mb-6">
                    {locationError}. Please enable location services to see nearby complaints.
                </div>
            )}

            {filter === 'nearby' && sameCityOnly && detectedCity && (
                <div className="bg-blue-50 text-blue-700 p-4 rounded-md mb-6">
                    Showing nearby complaints from {detectedCity}.
                </div>
            )}

            {isLoading ? (
                <div className="flex justify-center mt-20"><Loader2 className="animate-spin h-10 w-10 text-blue-600" /></div>
            ) : error ? (
                <div className="text-center mt-20 text-red-600">Failed to load complaints</div>
            ) : (
                <>
                    {viewMode === 'map' ? (
                        <ReportMap reports={reports} />
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                            {reports.length > 0 ? (
                                reports.map((report) => (
                                    <ReportCard key={report._id} report={report} />
                                ))
                            ) : (
                                <div className="col-span-full text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                                    <p className="text-gray-500 text-lg">No complaints found.</p>
                                    {filter === 'my' && (
                                        <button
                                            onClick={() => router.push('/submit')}
                                            className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 min-h-[48px]"
                                        >
                                            Submit Your First Complaint
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
