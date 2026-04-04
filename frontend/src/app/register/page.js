'use client';

import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import Link from 'next/link';
import { Eye, EyeOff, Check } from 'lucide-react';

export default function Register() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [otp, setOtp] = useState('');
    const [step, setStep] = useState('register'); // 'register' or 'otp'
    const { register, verifyOtp } = useAuth();
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const passwordRequirements = [
        { label: 'At least 8 characters', regex: /.{8,}/ },
        { label: 'One uppercase letter', regex: /[A-Z]/ },
        { label: 'One lowercase letter', regex: /[a-z]/ },
        { label: 'One number', regex: /\d/ },
        { label: 'One special character', regex: /[@$!%*?&]/ },
    ];

    const validatePassword = (pwd) => {
        return passwordRequirements.every(req => req.regex.test(pwd));
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');

        if (!validatePassword(password)) {
            setError('Please meet all password requirements.');
            return;
        }

        setLoading(true);
        try {
            await register(name, email, password);
            setStep('otp');
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await verifyOtp(email, otp);
            // verifyOtp in AuthContext redirects to dashboard
        } catch (err) {
            setError(err.response?.data?.message || 'OTP verification failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-6 text-center">
                {step === 'register' ? 'Register' : 'Verify OTP'}
            </h2>
            {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm font-medium border border-red-200">{error}</div>}

            {step === 'register' ? (
                <form onSubmit={handleRegister} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 text-gray-900"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 text-gray-900"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Password</label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 text-gray-900 pr-10"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 mt-1"
                            >
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                        <div className="mt-2 space-y-1">
                            {passwordRequirements.map((req, index) => {
                                const isMet = req.regex.test(password);
                                return (
                                    <div key={index} className={`flex items-center text-xs ${isMet ? 'text-green-600 font-medium' : 'text-gray-500'}`}>
                                        <div className={`w-4 flex justify-center mr-1`}>
                                            {isMet && <Check size={14} />}
                                        </div>
                                        {req.label}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition disabled:bg-blue-400"
                    >
                        {loading ? 'Registering...' : 'Register'}
                    </button>
                </form>
            ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                    <div className="text-center mb-4">
                        <p className="text-sm text-gray-600">
                            We have sent a verification code to <strong>{email}</strong>.
                        </p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">OTP Code</label>
                        <input
                            type="text"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 text-center text-lg tracking-widest text-gray-900"
                            required
                            placeholder="123456"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition disabled:bg-blue-400"
                    >
                        {loading ? 'Verifying...' : 'Verify OTP'}
                    </button>
                    <button
                        type="button"
                        onClick={() => setStep('register')}
                        className="w-full text-blue-600 text-sm hover:underline mt-2"
                    >
                        Back to Registration
                    </button>
                </form>
            )}

            <p className="mt-4 text-center text-sm text-gray-600">
                Already have an account?{' '}
                <Link href="/login" className="text-blue-600 hover:underline">
                    Login
                </Link>
            </p>
        </div>
    );
}
