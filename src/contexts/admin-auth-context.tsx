
'use client';
import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { useSettings } from './settings-context';

interface AdminAuthContextType {
  isAuthorized: boolean;
  setIsAuthorized: (isAuthorized: boolean) => void;
  checkPassword: (password: string) => boolean;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export const AdminAuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthorized, setIsAuthorizedState] = useState(false);
  const { settings } = useSettings();

  const checkPassword = useCallback((password: string) => {
    const correct = password === (settings.adminPassword || 'admin');
    if (correct) {
      setIsAuthorizedState(true);
    }
    return correct;
  }, [settings.adminPassword]);

  const setIsAuthorized = (authStatus: boolean) => {
    setIsAuthorizedState(authStatus);
  };

  const value = { isAuthorized, setIsAuthorized, checkPassword };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};
