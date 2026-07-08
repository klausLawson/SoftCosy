'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Save, 
  ShoppingBag,
  Truck,
  Package,
  Calendar,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2
} from 'lucide-react'
import api from '@/lib/api'

// UI Components
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/components/AuthContext'

interface Supplier {
  id: number
  name: string
}

interface Variant {
  id: number
  sku: string
  product_name: string
  product: number
  size?: string
  model?: string
}

interface PurchaseLine {
  id?: number
  product: number
  variant: number | null
  quantity: number
  unit_cost: number
  line_cost?: number
  product_detail?: { name: string }
  variant_detail?: { sku: string }
}

interface Purchase {
  id: number
  reference: string
  sub_total: string
  purchase_cost: string
  total: string
  purchased_at: string
  status: 'COMMANDE' | 'RECU' | 'ANNULE'
  notes: string | null
  supplier: number | { id: number; name: string }
  lines: PurchaseLine[]
  created_at: string
}

export default function PurchaseDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { signOut } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  
  const isNew = id === 'new'
  
  // Local Form State
  const [formData, setFormData] = useState({
    reference: '',
    supplier: '',
    purchased_at: new Date().toISOString().split('T')[0],
    notes: '',
    status: 'COMMANDE'
  })
  
  const [lines, setLines] = useState<PurchaseLine[]>([])

  // Queries
  const { data: purchase, isLoading: purchaseLoading } = useQuery<Purchase>({
    queryKey: ['purchase', id],
    queryFn: async () => {
      const res = await api.get(`/purchases/${id}/`)
      return res.data
    },
    enabled: !isNew
  })

  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const res = await api.get('/suppliers/')
      return res.data.results || res.data
    }
  })

  const { data: variants = [] } = useQuery<Variant[]>({
    queryKey: ['variants-all'],
    queryFn: async () => {
      const res = await api.get('/variants/')
      return res.data.results || res.data
    }
  })

  const { data: products = [] } = useQuery<any[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await api.get('/products/')
      return res.data.results || res.data
    }
  })

  // Initialize form on edit
  useEffect(() => {
    if (purchase && !isNew) {
      setFormData({
        reference: purchase.reference || '',
        supplier: typeof purchase.supplier === 'object' ? String(purchase.supplier.id) : String(purchase.supplier),
        purchased_at: purchase.purchased_at || '',
        notes: purchase.notes || '',
        status: purchase.status
      })
      setLines(purchase.lines || [])
    }
  }, [purchase, isNew])

  // Mutations
  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (isNew) {
        return api.post('/purchases/', data)
      } else {
        return api.patch(`/purchases/${id}/`, data)
      }
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] })
      queryClient.invalidateQueries({ queryKey: ['purchase', id] })
      // Si le statut est RECU, invalider aussi les caches de stock
      if (formData.status === 'RECU') {
        queryClient.invalidateQueries({ queryKey: ['stocks'] })
        queryClient.invalidateQueries({ queryKey: ['movements'] })
        queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      }
      alert(isNew ? "Achat créé avec succès" : "Achat mis à jour avec succès")
      if (isNew) router.push(`/admin/dashboard/purchases/${res.data.id}`)
    },
    onError: (err: any) => {
      const msg = err.response?.data?.detail || JSON.stringify(err.response?.data) || "Erreur lors de la mise à jour"
      alert('Erreur: ' + msg)
    }
  })

  // Line helpers
  const addLine = () => {
    setLines([...lines, { product: 0, variant: null, quantity: 1, unit_cost: 0 }])
  }

  const removeLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index))
  }

  const updateLine = (index: number, field: keyof PurchaseLine, value: any) => {
    const newLines = [...lines]
    newLines[index] = { ...newLines[index], [field]: value }
    
    // Reset variant if product changes
    if (field === 'product') {
      newLines[index].variant = null
    }
    
    setLines(newLines)
  }

  const totalAmount = useMemo(() => {
    return lines.reduce((sum, line) => sum + (line.quantity * line.unit_cost), 0)
  }, [lines])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.supplier) return alert("Veuillez choisir un fournisseur")
    if (lines.length === 0) return alert("Ajoutez au moins un produit")

    const payload = {
      ...formData,
      supplier: parseInt(formData.supplier),
      lines: lines.map(l => ({
        product: l.product,
        variant: l.variant || null,
        quantity: l.quantity,
        unit_cost: l.unit_cost
      }))
    }
    mutation.mutate(payload)
  }

  if (purchaseLoading && !isNew) {
    return (
       <div className="flex h-screen items-center justify-center gap-4">
         <Loader2 className="animate-spin text-primary" />
         Chargement de la commande...
       </div>
    )
  }

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'RECU': return <Badge className="bg-green-100 text-green-700 font-black px-3 py-1 rounded-xl border-none"><CheckCircle2 className="w-4 h-4 mr-2" /> REÇU</Badge>
      case 'ANNULE': return <Badge className="bg-red-100 text-red-700 font-black px-3 py-1 rounded-xl border-none"><XCircle className="w-4 h-4 mr-2" /> ANNULÉ</Badge>
      default: return <Badge className="bg-blue-100 text-blue-700 font-black px-3 py-1 rounded-xl border-none"><Clock className="w-4 h-4 mr-2" /> COMMANDÉ</Badge>
    }
  }

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <form onSubmit={handleSubmit} className="max-w-6xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                 <Button type="button" variant="ghost" size="icon" onClick={() => router.push('/admin/dashboard/purchases')} className="rounded-full">
                    <ArrowLeft className="w-5 h-5" />
                 </Button>
                 <div>
                    <div className="flex items-center gap-3">
                      <h1 className="text-2xl font-black text-foreground">
                        {isNew ? 'Nouvel Achat' : `Détails Commande #${purchase?.id}`}
                      </h1>
                      {!isNew && getStatusBadge(formData.status)}
                    </div>
                    <p className="text-xs text-muted-foreground font-medium mt-1">
                      {isNew ? 'Enregistrez un approvisionnement fournisseur' : `Créé le ${new Date(purchase?.created_at || '').toLocaleDateString()}`}
                    </p>
                 </div>
              </div>
              
              <div className="flex items-center gap-3">
                 <Button 
                   type="submit"
                   disabled={mutation.isPending || (purchase?.status === 'RECU' && !isNew)}
                   className="gap-2 font-bold bg-primary shadow-lg shadow-primary/20 rounded-xl px-6 h-12"
                 >
                   {mutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                   {isNew ? 'Créer la commande' : 'Mettre à jour'}
                 </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
               {/* Info Card */}
               <div className="lg:col-span-1 space-y-6">
                  <Card className="p-6 border-border/50 shadow-sm space-y-6 overflow-hidden relative">
                     <div className="absolute top-0 right-0 p-3 opacity-[0.03]">
                        <ShoppingBag className="w-24 h-24" />
                     </div>
                     
                     <div className="space-y-4 relative">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-muted-foreground uppercase flex items-center gap-2">
                              <Truck className="w-3 h-3" /> Fournisseur
                           </label>
                           <select 
                             required
                             value={formData.supplier} 
                             onChange={e => setFormData({...formData, supplier: e.target.value})}
                             disabled={!isNew && purchase?.status === 'RECU'}
                             className="w-full h-11 px-4 rounded-xl border border-border/50 bg-background font-bold text-sm focus:ring-2 focus:ring-primary outline-none"
                           >
                             <option value="">Sélectionner un fournisseur</option>
                             {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                           </select>
                        </div>

                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-muted-foreground uppercase flex items-center gap-2">
                              <AlertCircle className="w-3 h-3" /> Référence Interne
                           </label>
                           <Input 
                             value={formData.reference} 
                             onChange={e => setFormData({...formData, reference: e.target.value})}
                             placeholder="Auto-généré"
                             disabled
                             className="h-11 rounded-xl font-bold border-border/50 bg-muted/50 cursor-not-allowed"
                           />
                        </div>

                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-muted-foreground uppercase flex items-center gap-2">
                              <Calendar className="w-3 h-3" /> Date d'achat
                           </label>
                           <Input 
                             type="date"
                             value={formData.purchased_at} 
                             onChange={e => setFormData({...formData, purchased_at: e.target.value})}
                             className="h-11 rounded-xl font-bold border-border/50"
                           />
                        </div>

                        {!isNew && (
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-muted-foreground uppercase">Statut de la commande</label>
                            <select 
                              value={formData.status} 
                              onChange={e => setFormData({...formData, status: e.target.value as any})}
                              className={`w-full h-11 px-4 rounded-xl border border-border/50 font-bold text-sm outline-none ${
                                formData.status === 'RECU' ? 'text-green-600' : 
                                formData.status === 'ANNULE' ? 'text-red-600' : 'text-blue-600'
                              }`}
                            >
                              <option value="COMMANDE">Commandé</option>
                              <option value="RECU">Reçu (Mise à jour stock)</option>
                              <option value="ANNULE">Annulé</option>
                            </select>
                          </div>
                        )}
                        
                        <div className="space-y-2 pt-4">
                           <label className="text-[10px] font-black text-muted-foreground uppercase">Notes / Observations</label>
                           <textarea 
                             value={formData.notes} 
                             onChange={e => setFormData({...formData, notes: e.target.value})}
                             className="w-full min-h-[100px] p-4 rounded-xl border border-border/50 bg-background text-sm font-medium focus:ring-2 focus:ring-primary outline-none transition-all"
                             placeholder="Instructions de livraison, détails particuliers..."
                           />
                        </div>
                     </div>
                  </Card>
               </div>

               {/* Lines Card */}
               <div className="lg:col-span-2 space-y-6">
                  <Card className="border-border/50 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
                     <div className="p-4 border-b border-border/50 bg-muted/20 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Package className="w-4 h-4 text-primary" />
                           </div>
                           <h3 className="font-black text-foreground uppercase text-xs tracking-wider">Produits de la commande</h3>
                        </div>
                        <Button 
                          type="button" 
                          onClick={addLine}
                          disabled={!isNew && formData.status !== 'COMMANDE'}
                          className="h-9 gap-2 font-bold rounded-lg px-4"
                        >
                          <Plus className="w-4 h-4" />
                          Ajouter un produit
                        </Button>
                     </div>
                     
                     <div className="flex-1 overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                           <thead>
                              <tr className="border-b border-border/40">
                                 <th className="p-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest w-[45%]">Produit & Variante</th>
                                 <th className="p-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">Qté</th>
                                 <th className="p-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-right">Prix Unitaire</th>
                                 <th className="p-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-right">Total</th>
                                 <th className="p-4 text-center"></th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-border/40">
                              {lines.map((line, idx) => {
                                const availableVariants = variants.filter(v => v.product === line.product);
                                return (
                                  <tr key={idx} className="hover:bg-muted/10 transition-colors">
                                     <td className="p-3">
                                        <div className="space-y-2">
                                          <select 
                                            value={line.product || 0}
                                            onChange={(e) => updateLine(idx, 'product', parseInt(e.target.value))}
                                            disabled={!isNew && purchase?.status !== 'COMMANDE'}
                                            className="w-full h-10 px-3 rounded-lg border border-border/50 bg-background text-sm font-bold focus:ring-1 focus:ring-primary outline-none"
                                          >
                                             <option value="0">Choisir un produit...</option>
                                             {products.map(p => <option key={p.id} value={p.id}>{p.name} {p.code_produit ? `(${p.code_produit})` : ''}</option>)}
                                          </select>
                                          
                                          {availableVariants.length > 0 && (
                                            <select 
                                              value={line.variant || 0}
                                              onChange={(e) => updateLine(idx, 'variant', parseInt(e.target.value))}
                                              disabled={!isNew && purchase?.status !== 'COMMANDE'}
                                              className="w-full h-9 px-2 rounded-lg border border-border/40 bg-muted/20 text-xs font-bold focus:ring-1 focus:ring-primary outline-none"
                                            >
                                               <option value="0">Produit seul / Toutes variantes</option>
                                               {availableVariants.map(v => (
                                                 <option key={v.id} value={v.id}>{v.size || ''} {v.model || ''} - {v.sku}</option>
                                               ))}
                                            </select>
                                          )}
                                        </div>
                                     </td>
                                     <td className="p-3">
                                        <div className="flex justify-center">
                                           <Input 
                                             type="number"
                                             value={line.quantity}
                                             onChange={(e) => updateLine(idx, 'quantity', e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
                                             disabled={!isNew && purchase?.status !== 'COMMANDE'}
                                             className="w-20 h-10 text-center font-black rounded-lg border-border/50"
                                           />
                                        </div>
                                     </td>
                                     <td className="p-3">
                                        <Input 
                                          type="number"
                                          value={line.unit_cost}
                                          onChange={(e) => updateLine(idx, 'unit_cost', e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                                          disabled={!isNew && purchase?.status !== 'COMMANDE'}
                                          className="w-32 h-10 text-right font-black rounded-lg border-border/50 ml-auto"
                                        />
                                     </td>
                                     <td className="p-3 text-right font-bold text-sm">
                                        {((line.quantity || 0) * (line.unit_cost || 0)).toLocaleString()}
                                     </td>
                                     <td className="p-3 text-center">
                                        <Button 
                                          type="button" 
                                          variant="ghost" 
                                          size="icon" 
                                          onClick={() => removeLine(idx)}
                                          disabled={!isNew && purchase?.status !== 'COMMANDE'}
                                          className="h-8 w-8 text-muted-foreground hover:text-destructive rounded-lg"
                                        >
                                           <Trash2 className="w-4 h-4" />
                                        </Button>
                                     </td>
                                  </tr>
                                )
                              })}
                              {lines.length === 0 && (
                                <tr>
                                  <td colSpan={5} className="p-8 text-center text-muted-foreground text-sm italic py-20 bg-muted/5">
                                    Aucun produit ajouté à cette commande.
                                  </td>
                                </tr>
                              )}
                           </tbody>
                        </table>
                     </div>

                     <div className="p-6 bg-muted/30 border-t border-border/50">
                        <div className="flex justify-end gap-12">
                           <div className="text-right space-y-1">
                              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Nombre d'articles</p>
                              <p className="text-xl font-bold text-foreground">{lines.reduce((s, l) => s + (l.quantity || 0), 0)}</p>
                           </div>
                           <div className="text-right space-y-1">
                              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Total Global</p>
                              <p className="text-3xl font-black text-primary">{totalAmount.toLocaleString()} <span className="text-sm font-bold">FCFA</span></p>
                           </div>
                        </div>
                     </div>
                  </Card>
               </div>
            </div>
          </form>
    </main>
  )
}
