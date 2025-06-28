'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import type { User } from '@/lib/data';
import { authenticateUser } from '@/lib/data-actions';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from './language-context';

type UserSession = Omit<User, 'passwordHash'>;

interface AuthContextType {
  user: UserSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const AUTH_STORAGE_KEY = 'frucio-auth-user';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const router = useRouter();
    const { toast } = useToast();
    const { t } = useLanguage();

    const [user, setUser] = useState<UserSession | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        try {
            const storedUser = localStorage.getItem(AUTH_STORAGE_KEY);
            if (storedUser) {
                setUser(JSON.parse(storedUser));
            }
        } catch (error) {
            console.error('Failed to load user from storage', error);
            localStorage.removeItem(AUTH_STORAGE_KEY);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const login = useCallback(async (username: string, password: string): Promise<boolean> => {
        setIsLoading(true);
        try {
            const authenticatedUser = await authenticateUser(username, password);
            if (authenticatedUser) {
                const { passwordHash, ...userSession } = authenticatedUser;
                setUser(userSession);
                localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userSession));
                router.push('/');
                toast({ title: t.login.loginSuccess });
                return true;
            } else {
                toast({ variant: 'destructive', title: t.errors.title, description: t.login.invalidCredentials });
                return false;
            }
        } catch (error) {
            console.error("Login failed:", error);
            toast({ variant: 'destructive', title: t.errors.title, description: t.errors.unknownError });
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [router, toast, t]);

    const logout = useCallback(() => {
        setUser(null);
        localStorage.removeItem(AUTH_STORAGE_KEY);
        router.push('/login');
    }, [router]);

    const value: AuthContextType = {
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
