'use client'

import { useState } from 'react'
import Sidebar from '@/components/sidebar'
import Navbar from '@/components/navbar'
import { useAuth } from '@/components/AuthContext'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const { signOut } = useAuth()

  return (
    <div className="flex h-screen bg-muted/20">
      <Sidebar 
        isOpen={isSidebarOpen} 
        onLogout={signOut} 
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar
          onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
          sidebarOpen={isSidebarOpen}
        />
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          {children}
        </div>
        <footer className="shrink-0 border-t border-border/40 bg-background/80 backdrop-blur-sm px-6 py-2 text-center text-[11px] text-muted-foreground">
          © {new Date().getFullYear()} SoftCosy — Tous droits réservés. Réalisé par{' '}
          <a
            href="https://wa.me/+22893953658"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-primary hover:underline"
          >
            Virkas
          </a>
        </footer>
      </div>
    </div>
  )
}
