'use client';

import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { Menu, X, LogOut } from 'lucide-react';
import { useState } from 'react';

export default function Navbar() {
    const { user, logout } = useAuth();

    
    const [isOpen, setIsOpen] = useState(false);

    return (
        <nav className="bg-white shadow-md">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex">
                        <Link href="/" className="flex-shrink-0 flex items-center">
                            <span className="text-2xl font-bold text-blue-600">CivicSetu</span>
                        </Link>
                    </div>

                    <div className="hidden sm:ml-6 sm:flex sm:items-center space-x-4">
                        <Link href="/reports" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">
                            View Reports
                        </Link>
                        {user ? (
                            <>
                                <Link href="/dashboard" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">
                                    Dashboard
                                </Link>
                                <Link href="/report-status" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">
                                    My Status
                                </Link>
                                <Link href="/submit" className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700">
                                    Report Issue
                                </Link>
                                {user.role === 'admin' && (
                                    <>
                                        <Link href="/admin" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">
                                            Admin
                                        </Link>
                                        <Link href="/admin/users" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">
                                            Users
                                        </Link>
                                    </>
                                )}
                                <div className="relative ml-3 flex items-center space-x-2">
                                    <span className="text-sm text-gray-700">Hi, {user.name}</span>
                                    <button onClick={logout} className="text-gray-500 hover:text-red-600">
                                        <LogOut size={20} />
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <Link href="/login" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">
                                    Login
                                </Link>
                                <Link href="/register" className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700">
                                    Register
                                </Link>
                            </>
                        )}
                    </div>

                    <div className="-mr-2 flex items-center sm:hidden">
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                        >
                            {isOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </div>
                </div>
            </div>

            {isOpen && (
                <div className="sm:hidden">
                    <div className="pt-2 pb-3 space-y-1">
                        <Link href="/reports" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50">
                            View Reports
                        </Link>
                        {user ? (
                            <>
                                <Link href="/dashboard" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50">
                                    Dashboard
                                </Link>
                                <Link href="/report-status" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50">
                                    My Status
                                </Link>
                                <Link href="/submit" className="block px-3 py-2 rounded-md text-base font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                    Report Issue
                                </Link>
                                {user.role === 'admin' && (
                                    <>
                                        <Link href="/admin" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50">
                                            Admin
                                        </Link>
                                        <Link href="/admin/users" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50">
                                            Users
                                        </Link>
                                    </>
                                )}
                                <button onClick={logout} className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-red-600 hover:text-red-700 hover:bg-red-50">
                                    Logout
                                </button>
                            </>
                        ) : (
                            <>
                                <Link href="/login" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50">
                                    Login
                                </Link>
                                <Link href="/register" className="block px-3 py-2 rounded-md text-base font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                    Register
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
}
