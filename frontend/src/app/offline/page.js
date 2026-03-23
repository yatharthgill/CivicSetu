'use client';

export default function OfflinePage() {
  return (
    <div className="max-w-xl mx-auto mt-20 bg-white border border-gray-200 rounded-xl shadow-sm p-8 text-center">
      <h1 className="text-2xl font-bold text-gray-900 mb-3">You are offline</h1>
      <p className="text-gray-600 mb-6">
        CivicSetu could not reach the network. You can still browse recently cached pages and retry when your connection improves.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="px-4 py-2 rounded-md bg-teal-700 text-white hover:bg-teal-800 transition"
      >
        Retry Connection
      </button>
    </div>
  );
}
