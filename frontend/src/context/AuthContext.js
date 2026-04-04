'use client';

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import authService from '../services/authService';
import { useRouter } from 'next/navigation';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const loadUser = async () => {
            try {
                // Always try to fetch user profile on mount to check for valid cookie
                const data = await authService.getMe();
                setUser(data.data.user);
            } catch (error) {
                // If 401/403, we are not logged in, which is fine
                // console.log('Not logged in');
                setUser(null);
            } finally {
                setLoading(false);
            }
        };
        loadUser();
    }, []);

    const login = useCallback(async (email, password) => {
        const data = await authService.login({ email, password });
        setUser(data.data.user);
        router.push('/dashboard');
    }, [router]);

    const register = useCallback(async (name, email, password) => {
        const data = await authService.register({ name, email, password });
        return data;
    }, []);

    const verifyOtp = useCallback(async (email, otp) => {
        const data = await authService.verifyOtp(email, otp);
        setUser(data.data.user);
        router.push('/dashboard');
    }, [router]);

    const logout = useCallback(async () => {
        try {
            await authService.logout();
        } catch (error) {
            console.error('Logout failed', error);
        }
        setUser(null);
        router.push('/login');
    }, [router]);

    const value = useMemo(() => ({
        user, login, register, verifyOtp, logout, loading
    }), [user, login, register, verifyOtp, logout, loading]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);

