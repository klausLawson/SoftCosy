'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { 
  FileText,
  Plus,
  Search,
  Filter,
  ChevronRight,
  Clock,
  CheckCircle2,
  Calendar,
  User,
  Activity,
  History
} from 'lucide-react'
import api from '@/lib/api'

// UI Components
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/components/AuthContext'

interface InventoryCount {
  id: number
  status: 'ENCOURS' | 'FINI'
  notes: string | null
  created_at: string
  total_variantes: number
  user_name: string | null
  quantite_comptee: number | null
  ecart: number | null
}

export default function InventoryListPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [hasNextPage, setHasNextPage] = useState(false)
  const [hasPrevPage, setHasPrevPage] = useState(false)

  // Queries
  const { data: inventoriesData, isLoading } = useQuery({
    queryKey: ['inventories', page],
    queryFn: async () => {
      const res = await api.get(`/inventory-counts/?page=${page}`)
      setHasNextPage(!!res.data.next)
      setHasPrevPage(!!res.data.previous)
      return res.data.results || res.data
    }
  })

  // Accès sécurisé aux données paginées
  const inventories = useMemo(() => {
    if (!inventoriesData) return []
    return Array.isArray(inventoriesData) ? inventoriesData : (inventoriesData.results || [])
  }, [inventoriesData])

  const totalItems = inventoriesData?.count || inventories.length

  // Mutations
  const createInventoryMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/inventory-counts/', {
        notes: `Inventaire créé le ${new Date().toLocaleDateString()}`,
        user: user?.id
      })
      return res.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['inventory-counts'] })
      router.push(`/dashboard/inventory/${data.id}`)
    }
  })

  const filteredInventories = inventories.filter((inv: InventoryCount) => {
    const matchesSearch = inv.notes?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         inv.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         inv.id.toString().includes(searchTerm)
    
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter
    return matchesSearch && matchesStatus
  })
  return (
    <div className="flex flex-col h-full text-foreground">
      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
                <History className="w-8 h-8 text-primary" />
                Gestion des Inventaires
              </h1>
              <p className="text-muted-foreground mt-1 text-sm font-medium">
                Réalisez des inventaires périodiques pour assurer la justesse de vos stocks
              </p>
            </div>
            <Button 
              onClick={() => createInventoryMutation.mutate()} 
              disabled={createInventoryMutation.isPending}
              className="rounded-xl px-6 h-12 shadow-lg shadow-primary/25 gap-2 font-bold transition-all hover:scale-[1.02] active:scale-95"
            >
              <Plus className="w-5 h-5" />
              Nouvel Inventaire
            </Button>
          </div>

          {/* Stats Cards preview (optional) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
             {isLoading ? (
               Array.from({ length: 3 }).map((_, i) => (
                 <Card key={i} className="p-6 h-24 bg-card animate-pulse" />
               ))
             ) : (
               <>
                 <Card className="p-6 border-border/50 shadow-sm bg-card hover:border-primary/30 transition-all flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <FileText className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Sessions</p>
                      <p className="text-2xl font-black text-foreground">{inventories.length}</p>
                    </div>
                 </Card>
                 <Card className="p-6 border-border/50 shadow-sm bg-card hover:border-blue-500/30 transition-all flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                      <Clock className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">En Cours</p>
                      <p className="text-2xl font-black text-foreground">{inventories.filter((i: InventoryCount) => i.status === 'ENCOURS').length}</p>
                    </div>
                 </Card>
                 <Card className="p-6 border-border/50 shadow-sm bg-card hover:border-green-500/30 transition-all flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 text-green-500" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Terminés</p>
                      <p className="text-2xl font-black text-foreground">{inventories.filter((i: InventoryCount) => i.status === 'FINI').length}</p>
                    </div>
                 </Card>
               </>
             )}
          </div>

          {/* Filters */}
          <Card className="p-4 border-border/50 shadow-sm bg-card/50 backdrop-blur-sm">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  placeholder="Rechercher par date, note ou utilisateur..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-11 h-12 bg-background/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 rounded-xl transition-all"
                />
              </div>
              <div className="flex gap-3">
                <select 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-12 px-4 rounded-xl border border-border/50 bg-background/50 text-sm font-bold focus:ring-2 focus:ring-primary outline-none transition-all"
                >
                  <option value="all">Tous les statuts</option>
                  <option value="ENCOURS">En cours</option>
                  <option value="FINI">Terminés</option>
                </select>
                <Button variant="outline" size="icon" className="h-12 w-12 rounded-xl border-border/50">
                  <Filter className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>

          {/* Table */}
          <div className="space-y-4">
            {isLoading ? (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {Array.from({ length: 6 }).map((_, i) => (
                   <Card key={i} className="p-6 h-48 bg-card animate-pulse rounded-2xl" />
                 ))}
               </div>
            ) : filteredInventories.length === 0 ? (
               <Card className="p-20 border-dashed border-2 flex flex-col items-center justify-center text-center rounded-3xl opacity-60">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                     <History className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-bold">Aucun inventaire trouvé</h3>
                  <p className="text-sm text-muted-foreground">Commencez par créer votre premier inventaire.</p>
               </Card>
            ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {filteredInventories.map((inventory: InventoryCount) => (
                   <Card 
                     key={inventory.id} 
                     className="group hover:border-primary/50 transition-all cursor-pointer overflow-hidden border-border/50 shadow-sm relative bg-card"
                     onClick={() => router.push(`/dashboard/inventory/${inventory.id}`)}
                   >
                     {/* Status Banner */}
                     <div className={`absolute top-0 right-0 px-4 py-1 rounded-bl-xl text-[10px] font-black uppercase tracking-wider ${
                       inventory.status === 'ENCOURS' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                     }`}>
                       {inventory.status === 'ENCOURS' ? 'En cours' : 'Terminé'}
                     </div>

                     <div className="p-6 space-y-4">
                        <div className="flex items-start gap-4">
                           <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                              <FileText className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                           </div>
                           <div>
                              <h3 className="font-bold text-foreground">Inventaire #{inventory.id}</h3>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                 <Calendar className="w-3 h-3" />
                                 {new Date(inventory.created_at).toLocaleDateString()}
                              </p>
                           </div>
                        </div>

                        <p className="text-sm text-foreground/80 line-clamp-2 min-h-[2.5rem]">
                           {inventory.notes || "Pas de notes particulières"}
                        </p>

                        <div className="grid grid-cols-2 gap-4 py-3 border-y border-border/40">
                           <div>
                              <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-70">Variantes</p>
                              <p className="text-lg font-black text-foreground">{inventory.total_variantes}</p>
                           </div>
                           <div>
                              <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-70">Écart</p>
                              <p className={`text-lg font-black ${
                                (inventory.ecart || 0) < 0 ? 'text-red-500' : 
                                (inventory.ecart || 0) > 0 ? 'text-blue-500' : 'text-green-500'
                              }`}>
                                {inventory.ecart || 0}
                              </p>
                           </div>
                        </div>

                        <div className="flex items-center justify-between pt-2">
                           <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                                 <User className="w-3 h-3 text-primary" />
                              </div>
                              <span className="text-xs font-semibold text-muted-foreground">{inventory.user_name || 'Inconnu'}</span>
                           </div>
                           <ChevronRight className="w-5 h-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
                        </div>
                     </div>
                   </Card>
                 ))}
               </div>
            )}
          </div>

          {/* FOOTER INFO - New Pagination Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-10 border-t border-border/50 text-muted-foreground">
            <div className="flex flex-col gap-1">
              <p className="text-xs font-medium bg-muted/50 px-4 py-2 rounded-full border border-border/30 inline-block">
                Affichage de <span className="text-foreground font-black">{filteredInventories.length}</span> sur <span className="text-foreground font-black">{totalItems || (inventories?.length ?? 0)}</span> sessions
              </p>
              {totalItems > 20 && (
                <p className="text-[10px] uppercase tracking-tighter font-bold px-4">
                  Page {page} sur {Math.ceil(totalItems / 20)}
                </p>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  setPage(p => Math.max(1, p - 1))
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
                disabled={!hasPrevPage}
                className="rounded-xl h-10 px-4 border-border/50 text-xs font-bold gap-2"
              >
                Précédent
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  setPage(p => p + 1)
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
                disabled={!hasNextPage}
                className="rounded-xl h-10 px-4 border-border/50 text-xs font-bold gap-2"
              >
                Suivant
              </Button>
            </div>

            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest">
               <Activity className="w-3 h-3" />
               Dernière mise à jour : {new Date().toLocaleTimeString()}
            </div>
          </div>
      </main>
    </div>
  )
}
