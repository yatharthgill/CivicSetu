'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '../../context/AuthContext';
import reportService from '../../services/reportService';
import { useRouter } from 'next/navigation';
import { Camera, Loader2 } from 'lucide-react';

// Dynamically import LocationPicker to avoid SSR issues with Leaflet
const LocationPicker = dynamic(() => import('../../components/LocationPicker'), {
    ssr: false,
    loading: () => <div className="h-64 bg-gray-100 flex items-center justify-center">Loading Map...</div>
});

export default function SubmitReport() {
    const { user } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: 'other',
        severity: 'medium',
        locationName: '',
        latitude: '',
        longitude: '',
    });
    const [files, setFiles] = useState([]);
    const [previews, setPreviews] = useState([]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleLocationSelect = useCallback((coords) => {
        setFormData(prev => ({
            ...prev,
            latitude: coords.latitude,
            longitude: coords.longitude
        }));
    }, []);

    const handleFileChange = (e) => {
        const selectedFiles = Array.from(e.target.files);
        // Append new files to existing ones
        const updatedFiles = [...files, ...selectedFiles];
        if (updatedFiles.length > 5) {
            alert('Maximum 5 files allowed');
            return;
        }
        setFiles(updatedFiles);

        // Create previews
        const newPreviews = selectedFiles.map(file => URL.createObjectURL(file));
        setPreviews(prev => [...prev, ...newPreviews]);
    };

    const removeFile = (index) => {
        const newFiles = files.filter((_, i) => i !== index);
        setFiles(newFiles);

        // Revoke old URL to avoid memory leaks
        URL.revokeObjectURL(previews[index]);
        const newPreviews = previews.filter((_, i) => i !== index);
        setPreviews(newPreviews);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.latitude || !formData.longitude) {
            alert('Please select a location on the map');
            return;
        }

        setLoading(true);
        const data = new FormData();
        data.append('title', formData.title);
        data.append('description', formData.description);
        data.append('category', formData.category);
        data.append('severity', formData.severity);

        // Backend expects location as a JSON string
        const locationData = {
            coordinates: [parseFloat(formData.longitude), parseFloat(formData.latitude)],
            name: formData.locationName
        };
        data.append('location', JSON.stringify(locationData));

        // Backend expects specific keys for media types
        files.forEach(file => {
            if (file.type.startsWith('image/')) {
                data.append('images', file);
            } else if (file.type.startsWith('video/')) {
                data.append('videos', file);
            } else if (file.type.startsWith('audio/')) {
                data.append('audio', file);
            }
        });

        try {
            await reportService.createReport(data);
            router.push('/reports');
        } catch (error) {
            console.error('Error submitting report:', error);
            alert('Failed to submit report. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (!user) {
        return (
            <div className="text-center mt-10">
                <p className="text-xl">Please login to submit a report.</p>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow-md">
            <h1 className="text-2xl font-bold mb-6">Submit a New Report</h1>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Title */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">Title</label>
                    <input
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleInputChange}
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 text-gray-900"
                        placeholder="Brief title of the issue"
                    />
                </div>

                {/* Category & Severity */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Category</label>
                        <select
                            name="category"
                            value={formData.category}
                            onChange={handleInputChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 text-gray-900"
                        >
                            <option value="sanitation">Sanitation</option>
                            <option value="public_works">Public Works</option>
                            <option value="transportation">Transportation</option>
                            <option value="parks_recreation">Parks & Recreation</option>
                            <option value="water_sewer">Water & Sewer</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Severity</label>
                        <select
                            name="severity"
                            value={formData.severity}
                            onChange={handleInputChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 text-gray-900"
                        >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="critical">Critical</option>
                        </select>
                    </div>
                </div>

                {/* Description */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        rows="4"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 text-gray-900"
                        placeholder="Describe the issue in detail..."
                    ></textarea>
                </div>

                {/* Location */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                    <input
                        type="text"
                        name="locationName"
                        value={formData.locationName}
                        onChange={handleInputChange}
                        required
                        className="mb-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 text-gray-900"
                        placeholder="Enter address or landmark"
                    />
                    <p className="text-xs text-gray-500 mb-2">Click on the map to pinpoint the exact location.</p>
                    <LocationPicker onLocationSelect={handleLocationSelect} />
                    {formData.latitude && (
                        <p className="text-xs text-green-600 mt-1">
                            Selected: {formData.latitude.toFixed(4)}, {formData.longitude.toFixed(4)}
                        </p>
                    )}
                </div>

                {/* Media Upload */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Photos/Videos</label>
                    <div className="flex items-center justify-center w-full">
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <Camera className="w-8 h-8 mb-4 text-gray-500" />
                                <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                                <p className="text-xs text-gray-500">PNG, JPG, MP4 (MAX. 5 files)</p>
                            </div>
                            <input type="file" className="hidden" multiple accept="image/*,video/*" onChange={handleFileChange} />
                        </label>
                    </div>
                    {previews.length > 0 && (
                        <div className="flex gap-2 mt-4 overflow-x-auto">
                            {previews.map((src, idx) => (
                                <div key={idx} className="relative flex-shrink-0">
                                    <img src={src} alt="Preview" className="h-20 w-20 object-cover rounded-md" />
                                    <button
                                        type="button"
                                        onClick={() => removeFile(idx)}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400"
                >
                    {loading ? (
                        <>
                            <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                            Submitting...
                        </>
                    ) : (
                        'Submit Report'
                    )}
                </button>
            </form>
        </div>
    );
}
