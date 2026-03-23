'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function ReportMap({ reports }) {
    const defaultCenter = [20.5937, 78.9629]; // India Center
    const center = reports.length > 0 && reports[0].location.coordinates
        ? [reports[0].location.coordinates[1], reports[0].location.coordinates[0]]
        : defaultCenter;

    return (
        <div className="h-[500px] w-full rounded-lg overflow-hidden border border-gray-300 shadow-md z-0">
            <MapContainer center={center} zoom={5} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {reports.map((report) => (
                    report.location && report.location.coordinates ? (
                        <Marker
                            key={report._id}
                            position={[report.location.coordinates[1], report.location.coordinates[0]]}
                        >
                            <Popup>
                                <div className="min-w-[200px]">
                                    <h3 className="font-bold text-lg">{report.title}</h3>
                                    <p className="text-sm text-gray-600 mb-1">{report.location.name}</p>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={`px-2 py-1 text-xs rounded-full ${report.status === 'resolved' ? 'bg-green-100 text-green-800' :
                                            report.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-red-100 text-red-800'
                                            }`}>
                                            {report.status.replace('_', ' ').toUpperCase()}
                                        </span>
                                        <span className="text-xs text-gray-500 capitalize border border-gray-200 px-2 py-1 rounded-full">
                                            {report.category.replace('_', ' ')}
                                        </span>
                                    </div>
                                    {report.media && report.media.length > 0 && report.media[0].type === 'image' && (
                                        <img src={report.media[0].url} alt="Report" className="mt-2 w-full h-32 object-cover rounded mb-2" />
                                    )}
                                    <a href={`/reports/${report._id}`} className="block text-center w-full bg-blue-600 !text-white text-sm py-1.5 rounded hover:bg-blue-700 transition">
                                        View Details
                                    </a>
                                </div>
                            </Popup>
                        </Marker>
                    ) : null
                ))}
            </MapContainer>
        </div>
    );
}
