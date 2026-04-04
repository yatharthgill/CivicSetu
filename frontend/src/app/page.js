import Link from 'next/link';
import { MapPin, Camera, CheckCircle } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center">
      <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
        Make Your City <span className="text-blue-600">Better</span>
      </h1>
      <p className="text-xl text-gray-600 mb-8 max-w-2xl">
        Report issues like potholes, garbage, or streetlights directly to the municipal corporation. Track progress in real-time.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 mb-16">
        <Link href="/submit" className="bg-blue-600 text-white px-8 py-3 rounded-full text-lg font-semibold hover:bg-blue-700 transition shadow-lg">
          Report an Issue
        </Link>
        <Link href="/reports" className="bg-white text-gray-700 border border-gray-300 px-8 py-3 rounded-full text-lg font-semibold hover:bg-gray-50 transition shadow-sm">
          View Live Map
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl w-full">
        <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Camera size={24} />
          </div>
          <h3 className="text-xl font-semibold mb-2">Snap a Photo</h3>
          <p className="text-gray-600">Take a picture of the issue. Our system automatically captures the location.</p>
        </div>
        <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <MapPin size={24} />
          </div>
          <h3 className="text-xl font-semibold mb-2">Pin Location</h3>
          <p className="text-gray-600">Verify the location on the map to ensure the team finds it easily.</p>
        </div>
        <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={24} />
          </div>
          <h3 className="text-xl font-semibold mb-2">Get Resolved</h3>
          <p className="text-gray-600">Track the status of your report and get notified when it's fixed.</p>
        </div>
      </div>
    </div>
  );
}
