'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import authService from '../../services/authService';

export default function ResetPassword() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const email = searchParams.get('email');

    const [formData, setFormData] = useState({
        otp: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    // Redirect if no email in query params
    useEffect(() => {
        if (!email) {
            router.push('/forgot-password');
        }
    }, [email, router]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value,
        }));
    };

    const validateForm = () => {
        const errors = [];

        if (!formData.otp.trim()) {
            errors.push('Reset code is required');
        } else if (!/^\d{6}$/.test(formData.otp)) {
            errors.push('Reset code must be 6 digits');
        }

        if (!formData.newPassword.trim()) {
            errors.push('New password is required');
        } else if (formData.newPassword.length < 8) {
            errors.push('Password must be at least 8 characters');
        } else if (formData.newPassword.length > 128) {
            errors.push('Password cannot exceed 128 characters');
        } else if (!/\d/.test(formData.newPassword)) {
            errors.push('Password must contain at least one number');
        } else if (!/[a-zA-Z]/.test(formData.newPassword)) {
            errors.push('Password must contain at least one letter');
        }

        if (!formData.confirmPassword.trim()) {
            errors.push('Confirm password is required');
        } else if (formData.newPassword !== formData.confirmPassword) {
            errors.push('Passwords do not match');
        }

        return errors;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        const validationErrors = validateForm();
        if (validationErrors.length > 0) {
            setError(validationErrors.join('\n'));
            return;
        }

        setLoading(true);

        try {
            const response = await authService.resetPassword(
                email,
                formData.otp,
                formData.newPassword
            );
            setSuccess(true);
            // Redirect to login after 2 seconds
            setTimeout(() => {
                router.push('/login');
            }, 2000);
        } catch (err) {
            const errorMessage = err.response?.data?.message || 'Failed to reset password';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    if (!email) {
        return null; // Will redirect in useEffect
    }

    return (
        <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-2 text-center">Reset Password</h2>
            <p className="text-gray-600 text-sm text-center mb-6">
                Enter the reset code we sent to <br /> <span className="font-medium">{email}</span>
            </p>

            {success && (
                <div className="bg-green-100 text-green-700 p-4 rounded mb-4">
                    <p className="font-semibold">✓ Password reset successful!</p>
                    <p className="text-sm mt-2">You can now login with your new password. Redirecting to login...</p>
                </div>
            )}

            {error && (
                <div className="bg-red-100 text-red-700 p-3 rounded mb-4 whitespace-pre-line text-sm">
                    {error}
                </div>
            )}

            {!success && (
                <>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* OTP Input */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Reset Code (6 digits)
                            </label>
                            <input
                                type="text"
                                name="otp"
                                value={formData.otp}
                                onChange={handleChange}
                                placeholder="000000"
                                maxLength="6"
                                className="w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 text-gray-900 text-center font-bold tracking-widest"
                                required
                                disabled={loading}
                            />
                        </div>

                        {/* New Password Input */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                New Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    name="newPassword"
                                    value={formData.newPassword}
                                    onChange={handleChange}
                                    placeholder="••••••••"
                                    className="w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 text-gray-900 pr-10"
                                    required
                                    disabled={loading}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {/* Confirm Password Input */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Confirm Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    placeholder="••••••••"
                                    className="w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 text-gray-900 pr-10"
                                    required
                                    disabled={loading}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                                >
                                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 text-white py-2 rounded-md font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                            {loading ? 'Resetting...' : 'Reset Password'}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-600">
                            <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                                Back to Login
                            </Link>
                        </p>
                    </div>
                </>
            )}
        </div>
    );
}
