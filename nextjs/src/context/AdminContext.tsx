"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface AdminContextType {
  isAdmin: boolean;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
  adminMode: boolean;
  toggleAdminMode: () => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [adminMode, setAdminMode] = useState(false); // Default to false (User View) even if admin
  const router = useRouter();
  const pathname = usePathname();

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/check');
      if (res.ok) {
        setIsAdmin(true);
        // Restore admin mode from session storage if available
        const storedMode = sessionStorage.getItem('adminMode');
        if (storedMode === 'true') {
            setAdminMode(true);
        }
      } else {
        setIsAdmin(false);
        setAdminMode(false); // Force disable admin mode if not authenticated
        sessionStorage.removeItem('adminMode');
      }
    } catch (error) {
      console.error('Auth check failed', error);
      setIsAdmin(false);
      setAdminMode(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const toggleAdminMode = () => {
      if (!isAdmin) return;
      const newMode = !adminMode;
      setAdminMode(newMode);
      sessionStorage.setItem('adminMode', String(newMode));
  };

  // Route Guard Effect
  useEffect(() => {
    if (!isLoading) {
      // If we are on login page and already admin, redirect to home
      if (isAdmin && pathname === '/admin/login') {
        router.push('/');
      }
    }
  }, [isAdmin, isLoading, pathname, router]);

  const login = () => {
      setIsAdmin(true);
      setAdminMode(true); // Auto-enable admin mode on login
      sessionStorage.setItem('adminMode', 'true');
      checkAuth();
  };

  const logout = async () => {
    setIsAdmin(false);
    setAdminMode(false);
    sessionStorage.removeItem('adminMode');
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  return (
    <AdminContext.Provider value={{ isAdmin, isLoading, login, logout, adminMode, toggleAdminMode }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
}
