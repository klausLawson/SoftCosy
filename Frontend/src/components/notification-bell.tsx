'use client'

import { Bell, AlertTriangle, X } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { useState } from 'react'

interface LowStockAlert {
  id: number
  titre: string
  message: string
  severite: 'warning' | 'critical'
}

export default function NotificationBell() {
  const [seenIds, setSeenIds] = useState<Set<number>>(new Set())

  const { data: recentData } = useQuery({
    queryKey: ['dashboard-recent'],
    queryFn: async () => (await api.get('/dashboard/recent_data/')).data,
    refetchInterval: 60000,
  })

  const allAlerts: LowStockAlert[] = recentData?.low_stock || []
  const visibleAlerts = allAlerts.filter(a => !seenIds.has(a.id))
  const unreadCount = visibleAlerts.length

  const dismiss = (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setSeenIds(prev => new Set([...prev, id]))
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full animate-in fade-in zoom-in">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0 bg-card border-border">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Notifications Stock</h3>
          {unreadCount > 0 && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
              {unreadCount} alerte{unreadCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="max-h-[400px] overflow-auto">
          {visibleAlerts.length > 0 ? (
            visibleAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`group p-4 flex gap-3 border-b border-border/50 last:border-0 transition-colors hover:bg-muted/30 ${
                  alert.severite === 'critical'
                    ? 'border-l-4 border-l-red-500'
                    : 'border-l-4 border-l-orange-500'
                }`}
              >
                <div className="shrink-0 mt-0.5">
                  <AlertTriangle className={`w-4 h-4 ${
                    alert.severite === 'critical' ? 'text-red-500' : 'text-orange-500'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground leading-tight">{alert.titre}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{alert.message}</p>
                </div>
                <button
                  onClick={(e) => dismiss(alert.id, e)}
                  className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground p-0.5 rounded"
                  title="Fermer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-muted-foreground text-sm">
              Aucune alerte de stock active
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
