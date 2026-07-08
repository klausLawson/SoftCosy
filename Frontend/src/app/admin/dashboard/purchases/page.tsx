'use client'

import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { 
  ShoppingBag, 
  Plus, 
  Search, 
  Filter, 
  ChevronRight, 
  Clock, 
  CheckCircle2, 
  XCircle,
  Calendar,
  Truck,
  DollarSign,
  Activity,
  ArrowUpRight
} from 'lucide-react'
import api from '@/lib/api'

// UI Components
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/components/AuthContext'

interface Purchase {
  id: number
  reference: string
  sub_total: string
  purchase_cost: string
  total: string
  purchased_at: string
  status: 'COMMANDE' | 'RECU' | 'ANNULE'
  notes: string | null
  supplier: {
    id: number
    name: string
  } | null
  created_at: string
}

export default function PurchasesListPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [hasNextPage, setHasNextPage] = useState(false)
  const [hasPrevPage, setHasPrevPage] = useState(false)

  // Queries
  const { data: purchasesData, isLoading, isError } = useQuery({
    queryKey: ['purchases', page],
    queryFn: async () => {
      const res = await api.get(`/purchases/?page=${page}`)
      setHasNextPage(!!res.data.next)
      setHasPrevPage(!!res.data.previous)
      return res.data
    }
  })

  // Accès sécurisé aux données paginées
  const purchases: Purchase[] = useMemo(() => {
    if (!purchasesData) return []
    return Array.isArray(purchasesData) ? purchasesData : (purchasesData.results || [])
  }, [purchasesData])

  const totalItems = purchasesData?.count || purchases.length

  const filteredPurchases = purchases.filter(p => {
    const matchesSearch = p.reference?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         p.supplier?.name.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const stats = useMemo(() => {
    const totalOrdered = purchases.filter(p => p.status === 'COMMANDE').length
    const totalReceived = purchases.filter(p => p.status === 'RECU').length
    const totalAmount = purchases.reduce((sum, p) => sum + (p.status === 'RECU' ? parseFloat(p.total) : 0), 0)

    return [
      { label: 'Commandes en cours', value: totalOrdered, icon: Clock, color: 'text-blue-500', bg: 'bg-blue-500/10' },
      { label: 'Réceptions ce mois', value: totalReceived, icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10' },
      { label: 'Investissement Total', value: `${totalAmount.toLocaleString()} FCFA`, icon: DollarSign, color: 'text-primary', bg: 'bg-primary/10' },
    ]
  }, [purchases])

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
                <ShoppingBag className="w-8 h-8 text-primary" />
                Gestion des Achats
              </h1>
              <p className="text-muted-foreground mt-1 text-sm font-medium">
                Suivez vos approvisionnements et réceptions de marchandises
              </p>
            </div>
            <Button 
              onClick={() => router.push('/admin/dashboard/purchases/new')}
              className="rounded-xl px-6 h-12 shadow-lg shadow-primary/25 gap-2 font-bold transition-all hover:scale-[1.02] active:scale-95"
            >
              <Plus className="w-5 h-5" />
              Nouvel Achat
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="p-6 h-28 bg-card animate-pulse shadow-sm" />
              ))
            ) : (
              stats.map((stat, idx) => {
                const Icon = stat.icon
                return (
                  <Card key={idx} className="p-6 border border-border/50 shadow-sm bg-card hover:border-primary/30 transition-all group overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 bg-primary/5 rounded-full group-hover:scale-150 transition-transform duration-500" />
                    <div className="flex items-center gap-4 relative">
                        <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center`}>
                          <Icon className={`w-6 h-6 ${stat.color}`} />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                          <p className="text-xl font-black text-foreground">{stat.value}</p>
                        </div>
                    </div>
                  </Card>
                )
              })
            )}
          </div>

          {/* Filters */}
          <Card className="p-4 border-border/50 shadow-sm bg-card/50 backdrop-blur-sm">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  placeholder="Rechercher par référence ou fournisseur..."
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
                  <option value="COMMANDE">Commandé</option>
                  <option value="RECU">Reçu</option>
                  <option value="ANNULE">Annulé</option>
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
                <div className="space-y-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-16 w-full bg-muted/40 animate-pulse rounded-2xl" />
                  ))}
                </div>
             ) : filteredPurchases.length === 0 ? (
                <Card className="p-20 border-dashed border-2 flex flex-col items-center justify-center text-center rounded-3xl opacity-60">
                   <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                      <ShoppingBag className="w-8 h-8 text-muted-foreground" />
                   </div>
                   <h3 className="font-bold">Aucun achat trouvé</h3>
                   <p className="text-sm text-muted-foreground">Enregistrez votre première commande fournisseur.</p>
                </Card>
             ) : (
                <div className="overflow-hidden rounded-2xl border border-border/50 bg-card shadow-xl overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-muted/50 border-b border-border/50">
                          <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Référence</th>
                          <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Fournisseur</th>
                          <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-center">Statut</th>
                          <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Total</th>
                          <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Date</th>
                          <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {filteredPurchases.map((p) => (
                          <tr key={p.id} className="hover:bg-muted/30 transition-colors group">
                            <td className="p-4">
                                <div className="font-bold text-foreground text-sm flex items-center gap-2">
                                   {p.reference}
                                   <ArrowUpRight className="w-3 h-3 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            </td>
                            <td className="p-4">
                               <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                                     <Truck className="w-3 h-3 text-primary" />
                                  </div>
                                  <span className="text-xs font-bold text-foreground/80">{p.supplier?.name || 'Sans fournisseur'}</span>
                               </div>
                            </td>
                            <td className="p-4">
                               <div className="flex items-center justify-center">
                                  <Badge className={`rounded-xl px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${
                                    p.status === 'RECU' ? 'bg-green-100 text-green-700 hover:bg-green-100' :
                                    p.status === 'ANNULE' ? 'bg-red-100 text-red-700 hover:bg-red-100' :
                                    'bg-blue-100 text-blue-700 hover:bg-blue-100'
                                  }`}>
                                    {p.status === 'RECU' ? <CheckCircle2 className="w-3 h-3 mr-1" /> :
                                     p.status === 'ANNULE' ? <XCircle className="w-3 h-3 mr-1" /> :
                                     <Clock className="w-3 h-3 mr-1" />}
                                    {p.status}
                                  </Badge>
                               </div>
                            </td>
                            <td className="p-4 text-right">
                               <span className="text-sm font-black text-foreground">{parseFloat(p.total).toLocaleString()} FCFA</span>
                            </td>
                            <td className="p-4">
                               <div className="flex flex-col">
                                  <span className="text-xs font-bold text-foreground">{new Date(p.purchased_at).toLocaleDateString()}</span>
                                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                     <Calendar className="w-3 h-3" />
                                     {new Date(p.created_at).toLocaleDateString()}
                                  </span>
                               </div>
                            </td>
                            <td className="p-4 text-right">
                               <Button 
                                 variant="ghost" 
                                 size="sm" 
                                 onClick={() => router.push(`/admin/dashboard/purchases/${p.id}`)}
                                 className="text-primary font-bold gap-1 hover:bg-primary/10 rounded-lg"
                               >
                                 Détails
                                 <ChevronRight className="w-4 h-4" />
                               </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                </div>
             )}
          </div>

          {/* FOOTER INFO - New Pagination Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-10 border-t border-border/50 text-muted-foreground mt-8">
            <div className="flex flex-col gap-1">
              <p className="text-xs font-medium bg-muted/50 px-4 py-2 rounded-full border border-border/30 inline-block">
                Affichage de <span className="text-foreground font-black">{filteredPurchases.length}</span> sur <span className="text-foreground font-black">{totalItems || (purchases?.length ?? 0)}</span> achats
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
  )
}
