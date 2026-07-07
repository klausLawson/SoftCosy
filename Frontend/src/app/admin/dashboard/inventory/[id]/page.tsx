'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { 
  ArrowLeft, 
  Save, 
  CheckCircle, 
  AlertTriangle, 
  Search, 
  Package, 
  Minus, 
  Plus,
  RefreshCw,
  Clock,
  ChevronRight,
  ChevronLeft
} from 'lucide-react'
import api from '@/lib/api'

// UI Components
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/components/AuthContext'

interface Variant {
  id: number
  sku: string
  product: number
  product_name: string
  selling_price: string
  stock: number
}

interface InventoryLine {
  id?: number
  product: number
  variant: number
  counted_qty: number
  expected_qty?: number
  product_detail?: { name: string }
  variant_detail?: { sku: string }
}

interface InventoryDetail {
  id: number
  status: 'ENCOURS' | 'FINI'
  notes: string | null
  created_at: string
  total_variantes: number
  user_name: string | null
  quantite_comptee: number | null
  ecart: number | null
  lines: InventoryLine[]
}

export default function InventoryDetailsPage() {
  const { id } = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { signOut } = useAuth()
  
  const [searchTerm, setSearchTerm] = useState('')
  const [countingData, setCountingData] = useState<Record<number, number>>({})

  // 1. Fetch Inventory Details
  const { data: inventory, isLoading: invLoading } = useQuery<InventoryDetail>({
    queryKey: ['inventory-count', id],
    queryFn: async () => {
      const res = await api.get(`/inventory-counts/${id}/`)
      return res.data
    }
  })

  // 2. Fetch all Variants for new inventory (to populate lines if empty)
  const { data: variants = [], isLoading: varLoading } = useQuery<Variant[]>({
    queryKey: ['variants-all'],
    queryFn: async () => {
      const res = await api.get('/variants/')
      return res.data.results || res.data
    },
    enabled: inventory?.status === 'ENCOURS'
  })

  // Initialize counting data from existing lines or variants
  useEffect(() => {
    if (inventory) {
      const initialData: Record<number, number> = {}
      if (inventory.lines && inventory.lines.length > 0) {
        inventory.lines.forEach(line => {
          initialData[line.variant] = line.counted_qty
        })
      } else if (variants.length > 0) {
        // Optionnel : on pourrait initialiser à 0 ou laisser vide
        // Ici on laisse vide pour forcer la saisie ou on met 0
      }
      setCountingData(initialData)
    }
  }, [inventory, variants])

  // Mutations
  const updateInventoryMutation = useMutation({
    mutationFn: async (params: { notes: string; status?: string; finish?: boolean }) => {
      // Préparez les lignes au format attendu par le backend
      // Le backend s'attend à un tableau d'objets { product, variant, counted_qty }
      const linesToSubmit = variants.map(v => ({
        product: v.product,
        variant: v.id,
        counted_qty: countingData[v.id] || 0
      }))

      const payload: any = {
        notes: params.notes,
        lines: linesToSubmit
      }

      const res = await api.patch(`/inventory-counts/${id}/`, payload)
      
      if (params.finish) {
        await api.post(`/inventory-counts/${id}/finish/`)
      }
      
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-count', id] })
      queryClient.invalidateQueries({ queryKey: ['inventory-counts'] })
      alert("Inventaire mis à jour avec succès")
    }
  })

  const handleQtyChange = (variantId: number, val: string) => {
    const num = parseInt(val) || 0
    setCountingData(prev => ({ ...prev, [variantId]: Math.max(0, num) }))
  }

  const filteredVariants = useMemo(() => {
    return variants.filter(v => {
      const pName = (v.product_name || "").toLowerCase()
      const sku = (v.sku || "").toLowerCase()
      const search = searchTerm.toLowerCase()
      
      return pName.includes(search) || sku.includes(search)
    })
  }, [variants, searchTerm])

  if (invLoading || (varLoading && inventory?.status === 'ENCOURS')) {
    return (
       <div className="flex h-screen items-center justify-center gap-4">
         <RefreshCw className="animate-spin text-primary" />
         Chargement des données...
       </div>
    )
  }

  if (!inventory) return <div className="p-10 text-center">Inventaire non trouvé</div>

  const isFinished = inventory.status === 'FINI'

  return (
    <div className="flex flex-col h-full text-foreground">
        
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
               <Button variant="ghost" size="icon" onClick={() => router.push('/admin/dashboard/inventory')} className="rounded-full">
                  <ArrowLeft className="w-5 h-5" />
               </Button>
               <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-black text-foreground">Inventaire #{inventory.id}</h1>
                    <Badge variant={isFinished ? "default" : "secondary"} className={isFinished ? "bg-green-500" : "bg-blue-500 text-white"}>
                      {isFinished ? 'Terminé' : 'En cours'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground font-medium flex items-center gap-2 mt-1">
                    <Clock className="w-3 h-3" />
                    Créé le {new Date(inventory.created_at).toLocaleDateString()} par <span className="text-foreground font-bold">{inventory.user_name}</span>
                  </p>
               </div>
            </div>
            
            {!isFinished && (
              <div className="flex items-center gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => updateInventoryMutation.mutate({ notes: inventory.notes || '' })}
                  disabled={updateInventoryMutation.isPending}
                  className="gap-2 font-bold rounded-xl"
                >
                  <Save className="w-4 h-4" />
                  Sauvegarder Brouillon
                </Button>
                <Button 
                  onClick={() => {
                    if(confirm("Une fois terminé, l'inventaire ne pourra plus être modifié. Continuer ?")) {
                      updateInventoryMutation.mutate({ notes: inventory.notes || '', finish: true })
                    }
                  }}
                  disabled={updateInventoryMutation.isPending}
                  className="gap-2 font-bold bg-green-600 hover:bg-green-700 rounded-xl"
                >
                  <CheckCircle className="w-4 h-4" />
                  Finaliser l'inventaire
                </Button>
              </div>
            )}
          </div>

          {/* Table Area */}
          <div className="space-y-4">
             {/* Search Header */}
             <Card className="p-4 border-border/50 bg-card/80 backdrop-blur-sm">
                <div className="relative group">
                   <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                   <Input
                     placeholder="Rechercher un produit à compter..."
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                     className="pl-11 h-12 bg-background/50 border-border/50 focus:ring-primary/20 rounded-xl"
                   />
                </div>
             </Card>

             {/* Main Table */}
             <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                   <thead className="bg-muted/50 border-b border-border/50">
                      <tr>
                         <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Produit / SKU</th>
                         <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-center">Attendu</th>
                         <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-center">Compté</th>
                         <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-center">Écart</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-border/40">
                      {isFinished ? (
                        // Render finalized lines
                        inventory.lines.map((line) => {
                          const diff = (line.expected_qty || 0) - (line.counted_qty || 0)
                          return (
                            <tr key={line.id} className="hover:bg-muted/30 transition-colors">
                               <td className="p-4">
                                  <div className="font-bold text-sm text-foreground">{line.product_detail?.name}</div>
                                  <div className="text-[10px] font-mono font-bold text-muted-foreground">{line.variant_detail?.sku}</div>
                               </td>
                               <td className="p-4 text-center font-bold text-muted-foreground">{line.expected_qty}</td>
                               <td className="p-4 text-center font-black text-foreground">{line.counted_qty}</td>
                               <td className="p-4 text-center">
                                  <Badge className={`font-black tracking-widest px-2 py-0.5 rounded-lg border-none ${
                                    diff === 0 ? 'bg-green-100 text-green-700' : 
                                    diff > 0 ? 'bg-red-100 text-red-700' : 
                                    'bg-blue-100 text-blue-700'
                                  }`}>
                                     {diff === 0 ? 'OK' : diff > 0 ? `-${diff}` : `+${Math.abs(diff)}`}
                                  </Badge>
                               </td>
                            </tr>
                          )
                        })
                      ) : (
                        filteredVariants.map((v) => {
                          const existingLine = inventory.lines?.find(l => l.variant === v.id)
                          const expected = existingLine?.expected_qty ?? v.stock ?? 0
                          const counted = countingData[v.id] ?? 0
                          const diff = expected - counted

                          return (
                            <tr key={v.id} className="hover:bg-muted/30 transition-colors group">
                               <td className="p-4">
                                  <div className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">{v.product_name}</div>
                                  <div className="text-[10px] font-mono font-bold text-muted-foreground">{v.sku}</div>
                               </td>
                               <td className="p-4 text-center text-muted-foreground font-bold text-sm">
                                  {expected}
                               </td>
                               <td className="p-4">
                                  <div className="flex items-center justify-center gap-2">
                                     <Button 
                                       variant="outline" 
                                       size="icon" 
                                       className="h-8 w-8 rounded-lg active:scale-95"
                                       onClick={() => handleQtyChange(v.id, String(counted - 1))}
                                     >
                                        <Minus className="w-3 h-3" />
                                     </Button>
                                     <Input
                                        type="number"
                                        className="w-20 text-center font-black h-10 rounded-xl"
                                        value={counted}
                                        onChange={(e) => handleQtyChange(v.id, e.target.value)}
                                     />
                                     <Button 
                                       variant="outline" 
                                       size="icon" 
                                       className="h-8 w-8 rounded-lg active:scale-95"
                                       onClick={() => handleQtyChange(v.id, String(counted + 1))}
                                     >
                                        <Plus className="w-3 h-3" />
                                     </Button>
                                  </div>
                               </td>
                               <td className="p-4 text-center">
                                  <Badge className={`font-black tracking-widest px-2 py-0.5 rounded-lg border-none ${
                                    diff === 0 ? 'bg-green-100 text-green-700' : 
                                    diff > 0 ? 'bg-red-100 text-red-700' : 
                                    'bg-blue-100 text-blue-700'
                                  }`}>
                                     {diff === 0 ? 'OK' : diff > 0 ? `-${diff}` : `+${Math.abs(diff)}`}
                                  </Badge>
                               </td>
                            </tr>
                          )
                        })
                      )}
                   </tbody>
                </table>
             </div>
          </div>
        </main>
    </div>
  )
}
