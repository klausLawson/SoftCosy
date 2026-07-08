'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AuthProvider, useAuth } from '@/components/AuthContext';
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/queryClient'
import { ThemeProvider } from '@/components/theme-provider'
import { ThemeColorsProvider } from '@/components/theme-colors-context'

// Composant pour les routes protégées
function ProtectedRoutes({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Les routes publiques qui ne nécessitent pas d'authentification
  const publicRoutes = ['/admin', '/signup'];
  const isPublicRoute = publicRoutes.includes(pathname);

  useEffect(() => {
    if (!loading && !isAuthenticated && !isPublicRoute) {
      router.push('/admin');
    }
  }, [isAuthenticated, loading, isPublicRoute, router, pathname]);

  if (loading) {
    return <div className="flex h-screen items-center justify-center">Chargement...</div>;
  }

  return <>{children}</>;
}

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
    <ThemeColorsProvider>
    <AuthProvider>
      <ProtectedRoutes>{children}</ProtectedRoutes>
    </AuthProvider>
    </ThemeColorsProvider>
    </ThemeProvider>
    </QueryClientProvider>
  );
}
