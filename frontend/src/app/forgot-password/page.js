'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import authService from '../../services/authService';

export default function ForgotPassword() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await authService.forgotPassword(email);
            setSuccess(true);
            // Redirect to reset password page after 2 seconds
            setTimeout(() => {
                router.push(`/reset-password?email=${encodeURIComponent(email)}`);
            }, 2000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to send password reset email');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-6 text-center">Forgot Password</h2>
            
            {success && (
                <div className="bg-green-100 text-green-700 p-4 rounded mb-4">
                    <p className="font-semibold">✓ Check your email!</p>
                    <p className="text-sm mt-2">Password reset instructions have been sent to your email. Redirecting to reset page...</p>
                </div>
            )}
            
            {error && (
                <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
                    {error}
                </div>
            )}

            {!success && (
                <>
                    <p className="text-gray-600 text-sm mb-6">
                        Enter your email address and we&apos;ll send you a code to reset your password.
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Email Address
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="your@email.com"
                                className="w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 text-gray-900"
                                required
                                disabled={loading}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 text-white py-2 rounded-md font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                            {loading ? 'Sending...' : 'Send Reset Code'}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-600">
                            Remember your password?{' '}
                            <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                                Back to Login
                            </Link>
                        </p>
                    </div>
                </>
            )}

            {success && (
                <div className="mt-6 text-center">
                    <p className="text-sm text-gray-600 mb-2">Didn&apos;t receive the email?</p>
                    <button
                        onClick={() => {
                            setSuccess(false);
                            setEmail('');
                        }}
                        className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                    >
                        Try again with a different email
                    </button>
                </div>
            )}
        </div>
    );
}
