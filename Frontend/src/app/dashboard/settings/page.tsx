'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTheme } from 'next-themes'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Moon, Sun, Bell, Palette,
  Settings as SettingsIcon, ShieldCheck,
  RefreshCw, CheckCircle2, AlertTriangle, Info
} from 'lucide-react'
import api from '@/lib/api'
import { ThemeColorsProvider, useThemeColors } from '@/components/theme-colors-context'
import { useToast } from '@/hooks/use-toast'

const colorPresets = [
  { name: 'Bleu Royal', primary: '#4f46e5', accent: '#f97316' },
  { name: 'Émeraude', primary: '#059669', accent: '#f59e0b' },
  { name: 'Améthyste', primary: '#7c3aed', accent: '#06b6d4' },
  { name: 'Framboise', primary: '#db2777', accent: '#14b8a6' },
  { name: 'Océan', primary: '#0ea5e9', accent: '#f43f5e' },
]

export default function SettingsPage() {
  const [currentPage, setCurrentPage] = useState('settings')
  const { theme, setTheme } = useTheme()
  const { colors, setColors } = useThemeColors()
  const { toast } = useToast()
  const [mounted, setMounted] = useState(false)
  
  // États locaux pour la saisie fluide avant sauvegarde
  const [localLowStock, setLocalLowStock] = useState<string>('')
  const [localCriticalStock, setLocalCriticalStock] = useState<string>('')

  const router = useRouter()
  const queryClient = useQueryClient()

  // S'assurer que le composant est monté côté client pour next-themes
  useEffect(() => {
    setMounted(true)
  }, [])

  // 1. Récupération des réglages globaux depuis le backend Django
  const { data: systemSettings } = useQuery({
    queryKey: ['system-settings'],
    queryFn: async () => {
      const res = await api.get('/settings/current/')
      return res.data
    }
  })

  // Synchroniser l'état local quand les données arrivent du backend
  useEffect(() => {
    if (systemSettings) {
        setLocalLowStock(systemSettings.low_stock_threshold.toString())
        setLocalCriticalStock(systemSettings.critical_stock_threshold.toString())
    }
  }, [systemSettings])

  // 2. Alertes de stock calculées dynamiquement (sans DB)
  const [seenAlertIds, setSeenAlertIds] = useState<Set<number>>(new Set())

  const { data: recentData } = useQuery({
    queryKey: ['dashboard-recent'],
    queryFn: async () => (await api.get('/dashboard/recent_data/')).data,
  })
  const allAlerts: Array<{ id: number; titre: string; message: string; severite: string }> = recentData?.low_stock || []
  const alerts = allAlerts.filter(a => !seenAlertIds.has(a.id))

  const dismissAlert = (id: number) => {
    setSeenAlertIds(prev => new Set([...prev, id]))
  }

  // 3. Mutation pour sauvegarder les réglages système
  const updateSettingsMutation = useMutation({
    mutationFn: (data: any) => api.patch('/settings/current/', data),
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['system-settings'] })
        toast({
            title: "Réglages mis à jour",
            description: "Les paramètres système ont été synchronisés avec succès.",
        })
    },
    onError: () => {
        toast({
            variant: "destructive",
            title: "Erreur de synchronisation",
            description: "Impossible de communiquer avec le serveur. Vérifiez votre connexion.",
        })
    }
  })

  // Handlers pour les interactions
  const handleToggle = (key: string, currentVal: boolean) => {
    updateSettingsMutation.mutate({ [key]: !currentVal })
  }

  const handleSaveThreshold = (key: string, value: string) => {
    const num = parseInt(value)
    if (!isNaN(num)) {
      updateSettingsMutation.mutate({ [key]: num })
    }
  }

  if (!mounted) return null

  return (
    <div className="flex flex-col h-full text-foreground">
      <main className="flex-1 overflow-auto p-4 md:p-8">
          <div className="max-w-5xl mx-auto space-y-10 pb-20">
            
            {/* Header / En-tête */}
            <div className="flex items-center gap-5">
              <div className="p-4 bg-primary/10 rounded-3xl shadow-inner">
                <SettingsIcon className="w-9 h-9 text-primary animate-spin-slow" />
              </div>
              <div>
                <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">Paramètres Système</h1>
                <p className="text-muted-foreground font-semibold mt-1">Configurez l'intelligence de SoftCosy et votre interface</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Colonne Gauche: Design et Algorithmes de Stock */}
              <div className="lg:col-span-2 space-y-8">
                
                {/* Section Apparence & Thème */}
                <Card className="p-8 border-0 shadow-2xl shadow-slate-200/60 dark:shadow-none bg-white dark:bg-zinc-900 rounded-[2.5rem] space-y-8 overflow-hidden relative group">
                  <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-bl-full -mr-16 -mt-16 group-hover:bg-primary/10 transition-colors" />
                  
                  <div className="flex items-center gap-3 relative z-10">
                    <Palette className="w-6 h-6 text-primary" />
                    <h3 className="text-2xl font-black tracking-tight">Identité Visuelle</h3>
                  </div>

                  {/* Mode Sombre / Clair (Next Themes) */}
                  <div className="space-y-4 relative z-10">
                    <label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/70 ml-1">Mode d'affichage</label>
                    <div className="flex p-2 bg-slate-100 dark:bg-zinc-800 rounded-2xl gap-2 shadow-inner">
                      {[
                        { id: 'light', label: 'Clair', icon: Sun },
                        { id: 'dark', label: 'Sombre', icon: Moon },
                        { id: 'system', label: 'Système', icon: RefreshCw },
                      ].map((m) => (
                        <button
                          key={m.id}
                          onClick={() => setTheme(m.id)}
                          className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-black text-sm transition-all duration-300 ${
                            theme === m.id 
                            ? 'bg-white dark:bg-zinc-700 shadow-xl text-primary scale-100' 
                            : 'text-muted-foreground hover:text-foreground hover:bg-white/50 dark:hover:bg-zinc-700/50'
                          }`}
                        >
                          <m.icon className={`w-4 h-4 ${theme === m.id ? 'animate-pulse' : ''}`} />
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sélecteur de Palettes (Theme Colors Custom) */}
                  <div className="space-y-4 pt-6 border-t border-slate-100 dark:border-zinc-800 relative z-10">
                    <label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/70 ml-1">Palettes Fondamentales</label>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      {colorPresets.map((preset) => (
                        <button
                          key={preset.name}
                          onClick={() => setColors({ primary: preset.primary, accent: preset.accent })}
                          className={`group p-4 rounded-3xl border-2 transition-all duration-300 flex flex-col items-center gap-3 ${
                            colors.primary === preset.primary 
                            ? 'border-primary bg-primary/5 shadow-lg scale-105' 
                            : 'border-transparent bg-slate-50 dark:bg-zinc-800 hover:scale-105 hover:bg-slate-100 dark:hover:bg-zinc-700'
                          }`}
                        >
                          <div className="flex gap-1.5 ring-4 ring-white dark:ring-zinc-800 rounded-full p-1 bg-white dark:bg-zinc-800 shadow-sm">
                            <div className="w-4 h-4 rounded-full shadow-md" style={{ backgroundColor: preset.primary }} />
                            <div className="w-4 h-4 rounded-full shadow-md" style={{ backgroundColor: preset.accent }} />
                          </div>
                          <span className={`${colors.primary === preset.primary ? 'text-primary' : 'text-muted-foreground'} text-[9px] font-black uppercase tracking-tighter`}>
                            {preset.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </Card>

                {/* Section seuils d'intelligence (Stock Monitor) */}
                <Card className="p-8 border-0 shadow-2xl shadow-slate-200/60 dark:shadow-none bg-white dark:bg-zinc-900 rounded-[2.5rem] space-y-8 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-bl-full -mr-16 -mt-16 group-hover:bg-orange-500/10 transition-colors" />
                  
                  <div className="flex items-center gap-3 relative z-10">
                    <ShieldCheck className="w-6 h-6 text-orange-500" />
                    <h3 className="text-2xl font-black tracking-tight">Seuils Critiques de Stock</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10 relative z-10">
                    <div className="space-y-4">
                        <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/70 px-1">Seuil "Stock Faible"</label>
                        <div className="relative group/input">
                            <Input 
                                type="number" 
                                value={localLowStock}
                                onChange={(e) => setLocalLowStock(e.target.value)}
                                onBlur={() => handleSaveThreshold('low_stock_threshold', localLowStock)}
                                className="h-16 rounded-[1.25rem] bg-slate-50 dark:bg-zinc-800 border-0 text-2xl font-black pr-20 focus:ring-2 ring-primary/30 transition-all"
                            />
                            <div className="absolute right-6 top-1/2 -translate-y-1/2 px-2 py-1 bg-white dark:bg-zinc-700 rounded-lg shadow-sm border border-slate-100 dark:border-zinc-600">
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">PCS</span>
                            </div>
                        </div>
                        <p className="text-[11px] text-muted-foreground/60 font-semibold px-2 leading-relaxed">
                            SoftCosy générera une alerte <span className="text-orange-500 underline decoration-orange-500/30">Jaune</span> au passage sous ce niveau.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/70 px-1 text-red-500/70">Seuil Critique (Urgence)</label>
                        <div className="relative group/input">
                            <Input 
                                type="number" 
                                value={localCriticalStock}
                                onChange={(e) => setLocalCriticalStock(e.target.value)}
                                onBlur={() => handleSaveThreshold('critical_stock_threshold', localCriticalStock)}
                                className="h-16 rounded-[1.25rem] bg-red-50 dark:bg-red-950/20 border-0 text-2xl font-black text-red-600 pr-20 focus:ring-2 ring-red-500/30 transition-all"
                            />
                            <div className="absolute right-6 top-1/2 -translate-y-1/2 px-2 py-1 bg-white dark:bg-zinc-800 rounded-lg shadow-sm border border-red-100 dark:border-red-900/30">
                                <span className="text-[9px] font-black text-red-500 uppercase tracking-tighter">S.O.S</span>
                            </div>
                        </div>
                        <p className="text-[11px] text-red-400 font-semibold px-2 leading-relaxed opacity-80">
                            Attention: Ce niveau déclenche une alerte <span className="font-black underline">Rouge</span> et bloque certaines opérations critiques.
                        </p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Colonne Droite: Filtres de notifications et Historique Log */}
              <div className="space-y-8">
                
                {/* Switcher de Notifications Actives */}
                <Card className="p-8 border-0 shadow-2xl shadow-slate-200/60 dark:shadow-none bg-white dark:bg-zinc-900 rounded-[2.5rem] space-y-6 overflow-hidden relative group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-bl-full -mr-12 -mt-12 group-hover:bg-indigo-500/10 transition-colors" />
                  
                  <div className="flex items-center gap-3 relative z-10">
                    <Bell className="w-6 h-6 text-indigo-500" />
                    <h3 className="text-2xl font-black tracking-tight">Canaux Actifs</h3>
                  </div>

                  <div className="space-y-4 relative z-10">
                    {[
                      { key: 'notify_low_stock', label: 'Monitor de Stock', icon: ShieldCheck, color: 'text-orange-500' },
                      { key: 'notify_system_updates', label: 'Alertes Système', icon: RefreshCw, color: 'text-blue-500' },
                      { key: 'notify_weekly_report', label: 'Reporting Hebdo', icon: CheckCircle2, color: 'text-emerald-500' },
                    ].map((n) => (
                      <div key={n.key} className="flex items-center justify-between p-4.5 bg-slate-50/50 dark:bg-zinc-800/40 rounded-[1.5rem] border border-transparent hover:border-indigo-100 dark:hover:border-zinc-700 transition-all group/item">
                        <div className="flex items-center gap-3 mr-4">
                          <div className={`p-2 rounded-xl bg-white dark:bg-zinc-900 shadow-sm ${n.color}`}>
                            <n.icon className="w-4 h-4" />
                          </div>
                          <p className="font-black text-xs uppercase tracking-tighter text-slate-700 dark:text-zinc-300 group-hover/item:text-primary transition-colors">{n.label}</p>
                        </div>
                        <button 
                            onClick={() => handleToggle(n.key, (systemSettings as any)?.[n.key])}
                            className={`w-14 h-7 rounded-full transition-all relative p-1 ${
                                (systemSettings as any)?.[n.key] ? 'bg-indigo-600 shadow-xl shadow-indigo-100 dark:shadow-none' : 'bg-slate-300 dark:bg-zinc-700'
                            }`}
                        >
                            <div className={`w-5 h-5 bg-white rounded-full transition-all shadow-md ${(systemSettings as any)?.[n.key] ? 'translate-x-7' : 'translate-x-0'}`} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl flex items-center gap-3 relative z-10 border border-emerald-100 dark:border-emerald-900/10">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <p className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-tighter">Réglages réels & synchronisés</p>
                  </div>
                </Card>

                {/* Historique des Notifications réelles du Backend */}
                <Card className="p-8 border-0 shadow-2xl shadow-slate-200/60 dark:shadow-none bg-white dark:bg-zinc-900 rounded-[2.5rem] space-y-7 max-h-[500px] flex flex-col relative overflow-hidden">
                   <div className="flex items-center justify-between relative z-10 pb-2">
                    <h3 className="text-xl font-black tracking-tight">Journal des Alertes</h3>
                    <div className="flex items-center gap-2">
                         <span className="px-3 py-1 bg-slate-100 dark:bg-zinc-800 rounded-full text-[10px] font-black uppercase text-slate-500 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700">{alerts.length}</span>
                    </div>
                  </div>

                  <div className="flex-1 overflow-auto space-y-4 pr-1 scrollbar-thin scrollbar-thumb-slate-200 relative z-10">
                    {alerts.length === 0 ? (
                        <div className="py-20 text-center space-y-4 opacity-20 flex flex-col items-center">
                            <Info className="w-12 h-12" />
                            <p className="text-[10px] font-black uppercase tracking-[0.2em]">Flux d'alertes vierge</p>
                        </div>
                    ) : (
                        alerts.map((alert: any) => (
                          <div
                            key={alert.id}
                            onClick={() => dismissAlert(alert.id)}
                            className={`group/alert p-5 rounded-[1.75rem] flex gap-4 transition-all hover:translate-x-1 cursor-pointer hover:opacity-70 ${
                               alert.severite === 'critical' ? 'bg-red-50/50 dark:bg-red-950/10 border-l-[6px] border-red-500' :
                               alert.severite === 'warning' ? 'bg-orange-50/50 dark:bg-orange-950/10 border-l-[6px] border-orange-500' :
                               'bg-indigo-50/50 dark:bg-indigo-950/10 border-l-[6px] border-indigo-500'
                            }`}
                          >
                            <div className="shrink-0 mt-1">
                                {alert.severite === 'critical' ? <AlertTriangle className="w-5 h-5 text-red-500 animate-bounce-slow" /> : <Bell className={`w-5 h-5 ${alert.severite === 'warning' ? 'text-orange-500' : 'text-indigo-500'}`} />}
                            </div>
                            <div className="space-y-1.5 min-w-0 flex-1">
                                <p className="text-sm font-black tracking-tight leading-none group-hover/alert:text-primary transition-colors truncate">{alert.titre}</p>
                                <p className="text-[11px] text-muted-foreground font-semibold leading-relaxed line-clamp-2">{alert.message}</p>
                                <div className="pt-2 flex items-center justify-between">
                                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-tighter">Stock en temps réel</span>
                                    <span className="text-[9px] text-slate-400 opacity-0 group-hover/alert:opacity-100 transition-opacity">Cliquer pour fermer ×</span>
                                </div>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </Card>
              </div>
            </div>
          </div>
      </main>
    </div>
  )
}
