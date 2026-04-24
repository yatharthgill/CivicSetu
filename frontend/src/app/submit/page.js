'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '../../context/AuthContext';
import reportService from '../../services/reportService';
import { useRouter } from 'next/navigation';
import { Camera, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

// Dynamically import LocationPicker to avoid SSR issues with Leaflet
const LocationPicker = dynamic(() => import('../../components/LocationPicker'), {
    ssr: false,
    loading: () => <div className="h-48 sm:h-64 bg-gray-100 flex items-center justify-center skeleton">Loading Map...</div>
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
        const updatedFiles = [...files, ...selectedFiles];
        if (updatedFiles.length > 5) {
            toast.error('Maximum 5 files allowed');
            return;
        }
        setFiles(updatedFiles);
        const newPreviews = selectedFiles.map(file => URL.createObjectURL(file));
        setPreviews(prev => [...prev, ...newPreviews]);
    };

    const removeFile = (index) => {
        const newFiles = files.filter((_, i) => i !== index);
        setFiles(newFiles);
        URL.revokeObjectURL(previews[index]);
        const newPreviews = previews.filter((_, i) => i !== index);
        setPreviews(newPreviews);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.latitude || !formData.longitude) {
            toast.error('Please select a location on the map');
            return;
        }

        setLoading(true);
        const data = new FormData();
        data.append('title', formData.title);
        data.append('description', formData.description);
        data.append('category', formData.category);
        data.append('severity', formData.severity);

        const locationData = {
            coordinates: [parseFloat(formData.longitude), parseFloat(formData.latitude)],
            name: formData.locationName
        };
        data.append('location', JSON.stringify(locationData));

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
            toast.success('Complaint submitted successfully!');
            router.push('/reports');
        } catch (error) {
            console.error('Error submitting report:', error);
            toast.error('Failed to submit complaint. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (!user) {
        return (
            <div className="text-center mt-10">
                <p className="text-xl">Please login to submit a complaint.</p>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto bg-white p-4 sm:p-6 rounded-lg shadow-md">
            <h1 className="text-xl sm:text-2xl font-bold mb-6">Submit a New Complaint</h1>

            <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
                {/* Title */}
                <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title</label>
                    <input
                        type="text"
                        id="title"
                        name="title"
                        value={formData.title}
                        onChange={handleInputChange}
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2.5 text-gray-900"
                        placeholder="Brief title of the issue"
                    />
                </div>

                {/* Category & Severity */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="category" className="block text-sm font-medium text-gray-700">Category</label>
                        <select
                            id="category"
                            name="category"
                            value={formData.category}
                            onChange={handleInputChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2.5 text-gray-900"
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
                        <label htmlFor="severity" className="block text-sm font-medium text-gray-700">Severity</label>
                        <select
                            id="severity"
                            name="severity"
                            value={formData.severity}
                            onChange={handleInputChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2.5 text-gray-900"
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
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea
                        id="description"
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        rows="4"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2.5 text-gray-900"
                        placeholder="Describe the issue in detail..."
                    ></textarea>
                </div>

                {/* Location */}
                <div>
                    <label htmlFor="locationName" className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                    <input
                        type="text"
                        id="locationName"
                        name="locationName"
                        value={formData.locationName}
                        onChange={handleInputChange}
                        required
                        className="mb-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2.5 text-gray-900"
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
                        <label className="flex flex-col items-center justify-center w-full h-28 sm:h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition">
                            <div className="flex flex-col items-center justify-center py-4">
                                <Camera className="w-8 h-8 mb-3 text-gray-500" />
                                <p className="mb-1 text-sm text-gray-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                                <p className="text-xs text-gray-500">PNG, JPG, MP4, MP3, WAV (MAX. 5 files)</p>
                            </div>
                            <input type="file" className="hidden" multiple accept="image/*,video/*,audio/*" onChange={handleFileChange} />
                        </label>
                    </div>
                    {previews.length > 0 && (
                        <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                            {previews.map((src, idx) => (
                                <div key={idx} className="relative flex-shrink-0">
                                    <img src={src} alt="Preview" className="h-20 w-20 object-cover rounded-md" />
                                    <button
                                        type="button"
                                        onClick={() => removeFile(idx)}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 min-w-[24px] min-h-[24px]"
                                        aria-label={`Remove file ${idx + 1}`}
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
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400 min-h-[48px]"
                >
                    {loading ? (
                        <>
                            <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                            Submitting...
                        </>
                    ) : (
                        'Submit Complaint'
                    )}
                </button>
            </form>
        </div>
    );
}
