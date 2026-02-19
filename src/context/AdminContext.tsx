"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

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
      // 1. Check Supabase Auth
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        setIsAdmin(true);
        // Restore admin mode from session storage if available
        const storedMode = sessionStorage.getItem('adminMode');
        if (storedMode === 'true') {
            setAdminMode(true);
        }
      } else {
        // 2. Fallback: Check Simple Auth (admin_token)
        try {
          const res = await fetch('/api/auth/check');
          if (res.ok) {
            const data = await res.json();
            if (data.isAdmin) {
              setIsAdmin(true);
              const storedMode = sessionStorage.getItem('adminMode');
              if (storedMode === 'true') {
                  setAdminMode(true);
              }
              return; // Successfully authenticated via Simple Auth
            }
          }
        } catch (ignore) {
          // Ignore fetch errors
        }

        // If both failed
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

    // Listen for auth changes
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setIsAdmin(true);
        setAdminMode(true);
        sessionStorage.setItem('adminMode', 'true');
      } else if (event === 'SIGNED_OUT') {
        setIsAdmin(false);
        setAdminMode(false);
        sessionStorage.removeItem('adminMode');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
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
      if (isAdmin && pathname === '/login') {
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
      const supabase = createClient();
      await supabase.auth.signOut();
      // await fetch('/api/auth/logout', { method: 'POST' }); // Also clear simple auth cookie
      router.push('/'); // Redirect to home instead of login
    } catch (error) {
      console.error('Logout failed', error);
      router.push('/'); // Redirect even on error
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
