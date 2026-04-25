'use client';

import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { Menu, X, LogOut } from 'lucide-react';
import { useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';

export default function Navbar() {
    const { user, logout } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();

    const closeMenu = useCallback(() => setIsOpen(false), []);
    const toggleMenu = useCallback(() => setIsOpen((prev) => !prev), []);

    const isActive = (href) => {
        if (href === '/') return pathname === '/';
        return pathname.startsWith(href);
    };

    const linkClass = (href, base = '') =>
        `${base} transition-colors ${
            isActive(href)
                ? 'text-blue-600 font-semibold'
                : 'text-gray-700 hover:text-blue-600'
        }`;

    return (
        <nav className="bg-white shadow-md sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex">
                        <Link href="/" className="flex-shrink-0 flex items-center" onClick={closeMenu}>
                            <span className="text-2xl font-bold text-blue-600">CivicSetu</span>
                        </Link>
                    </div>

                    {/* Desktop nav */}
                    <div className="hidden sm:ml-6 sm:flex sm:items-center space-x-4">
                        <Link href="/reports" className={linkClass('/reports', 'px-3 py-2 rounded-md text-sm font-medium')}>
                            View Complaints
                        </Link>
                        {user ? (
                            <>
                                <Link href="/dashboard" className={linkClass('/dashboard', 'px-3 py-2 rounded-md text-sm font-medium')}>
                                    Dashboard
                                </Link>
                                <Link href="/report-status" className={linkClass('/report-status', 'px-3 py-2 rounded-md text-sm font-medium')}>
                                    My Status
                                </Link>
                                <Link href="/submit" className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700">
                                    Complain
                                </Link>
                                {user.role === 'admin' && (
                                    <>
                                        <Link href="/admin" className={linkClass('/admin', 'px-3 py-2 rounded-md text-sm font-medium')}>
                                            Admin
                                        </Link>
                                        <Link href="/admin/users" className={linkClass('/admin/users', 'px-3 py-2 rounded-md text-sm font-medium')}>
                                            Users
                                        </Link>
                                    </>
                                )}
                                <div className="relative ml-3 flex items-center space-x-2">
                                    <span className="text-sm text-gray-700">Hi, {user.name}</span>
                                    <button
                                        onClick={logout}
                                        className="text-gray-500 hover:text-red-600 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
                                        aria-label="Logout"
                                    >
                                        <LogOut size={20} />
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <Link href="/login" className={linkClass('/login', 'px-3 py-2 rounded-md text-sm font-medium')}>
                                    Login
                                </Link>
                                <Link href="/register" className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700">
                                    Register
                                </Link>
                            </>
                        )}
                    </div>

                    {/* Mobile hamburger */}
                    <div className="-mr-2 flex items-center sm:hidden">
                        <button
                            onClick={toggleMenu}
                            className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 min-w-[44px] min-h-[44px]"
                            aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
                            aria-expanded={isOpen}
                        >
                            {isOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile menu with smooth transition */}
            <div className={`sm:hidden mobile-menu-enter ${isOpen ? 'open' : ''}`}>
                <div className="pt-2 pb-3 space-y-1">
                    <Link href="/reports" onClick={closeMenu} className={linkClass('/reports', 'block px-3 py-3 rounded-md text-base font-medium')}>
                        View Complaints
                    </Link>
                    {user ? (
                        <>
                            <Link href="/dashboard" onClick={closeMenu} className={linkClass('/dashboard', 'block px-3 py-3 rounded-md text-base font-medium')}>
                                Dashboard
                            </Link>
                            <Link href="/report-status" onClick={closeMenu} className={linkClass('/report-status', 'block px-3 py-3 rounded-md text-base font-medium')}>
                                My Status
                            </Link>
                            <Link href="/submit" onClick={closeMenu} className="block px-3 py-3 rounded-md text-base font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                Complain
                            </Link>
                            {user.role === 'admin' && (
                                <>
                                    <Link href="/admin" onClick={closeMenu} className={linkClass('/admin', 'block px-3 py-3 rounded-md text-base font-medium')}>
                                        Admin
                                    </Link>
                                    <Link href="/admin/users" onClick={closeMenu} className={linkClass('/admin/users', 'block px-3 py-3 rounded-md text-base font-medium')}>
                                        Users
                                    </Link>
                                </>
                            )}
                            <button onClick={() => { logout(); closeMenu(); }} className="block w-full text-left px-3 py-3 rounded-md text-base font-medium text-red-600 hover:text-red-700 hover:bg-red-50 min-h-[44px]">
                                Logout
                            </button>
                        </>
                    ) : (
                        <>
                            <Link href="/login" onClick={closeMenu} className={linkClass('/login', 'block px-3 py-3 rounded-md text-base font-medium')}>
                                Login
                            </Link>
                            <Link href="/register" onClick={closeMenu} className="block px-3 py-3 rounded-md text-base font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                Register
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
}
