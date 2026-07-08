'use client'

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Truck, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Phone, 
  MapPin, 
  MoreHorizontal,
  Activity,
  X,
  Save,
  Loader2
} from 'lucide-react'
import api from '@/lib/api'

// UI Components
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/components/AuthContext'

interface Supplier {
  id: number
  name: string
  phone: string | null
  address: string | null
  created_at: string
}

export default function SuppliersPage() {
  const queryClient = useQueryClient()
  const { signOut } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [formData, setFormData] = useState({ name: '', phone: '', address: '' })

  // Queries
  const { data: suppliers = [], isLoading } = useQuery<Supplier[]>({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const res = await api.get('/suppliers/')
      return res.data.results || res.data
    }
  })

  // Mutations
  const createMutation = useMutation({
    mutationFn: (newSup: any) => api.post('/suppliers/', newSup),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      closeModal()
    }
  })

  const updateMutation = useMutation({
    mutationFn: (sup: any) => api.patch(`/suppliers/${sup.id}/`, sup),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      closeModal()
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/suppliers/${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
    }
  })

  const openModal = (supplier?: Supplier) => {
    if (supplier) {
      setEditingSupplier(supplier)
      setFormData({ name: supplier.name, phone: supplier.phone || '', address: supplier.address || '' })
    } else {
      setEditingSupplier(null)
      setFormData({ name: '', phone: '', address: '' })
    }
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingSupplier(null)
    setFormData({ name: '', phone: '', address: '' })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingSupplier) {
      updateMutation.mutate({ ...formData, id: editingSupplier.id })
    } else {
      createMutation.mutate(formData)
    }
  }

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.phone && s.phone.includes(searchTerm))
  )

  return (
    <div className="flex flex-col h-full text-foreground">
      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
                <Truck className="w-8 h-8 text-primary" />
                Liste des Fournisseurs
              </h1>
              <p className="text-muted-foreground mt-1 text-sm font-medium">
                Gérez vos partenaires et leurs coordonnées
              </p>
            </div>
            <Button 
              onClick={() => openModal()} 
              className="rounded-xl px-6 h-12 shadow-lg shadow-primary/25 gap-2 font-bold transition-all hover:scale-[1.02] active:scale-95"
            >
              <Plus className="w-5 h-5" />
              Nouveau Fournisseur
            </Button>
          </div>

          {/* Search bar */}
          <Card className="p-4 border-border/50 shadow-sm bg-card/50 backdrop-blur-sm">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="Rechercher par nom ou téléphone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-11 h-12 bg-background/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 rounded-xl transition-all"
              />
            </div>
          </Card>

          {/* Table */}
          <div className="space-y-4">
             {isLoading ? (
                <div className="flex flex-col items-center justify-center p-20 gap-4">
                  <Activity className="w-8 h-8 text-primary animate-spin" />
                  <p className="text-muted-foreground font-medium">Chargement des fournisseurs...</p>
                </div>
             ) : filteredSuppliers.length === 0 ? (
                <Card className="p-20 border-dashed border-2 flex flex-col items-center justify-center text-center rounded-3xl opacity-60">
                   <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                      <Truck className="w-8 h-8 text-muted-foreground" />
                   </div>
                   <h3 className="font-bold">Aucun fournisseur trouvé</h3>
                   <p className="text-sm text-muted-foreground">Ajoutez votre premier fournisseur pour commencer.</p>
                </Card>
             ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredSuppliers.map((supplier) => (
                    <Card key={supplier.id} className="group hover:border-primary/50 transition-all border-border/50 shadow-sm bg-card overflow-hidden">
                       <div className="p-6 space-y-4">
                          <div className="flex items-start justify-between">
                             <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                   <Truck className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                   <h3 className="font-bold text-foreground">{supplier.name}</h3>
                                   <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">ID: SUP-{supplier.id}</p>
                                </div>
                             </div>
                             <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                   <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-muted rounded-lg">
                                      <MoreHorizontal className="w-4 h-4" />
                                   </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-xl border-border/50">
                                   <DropdownMenuItem onClick={() => openModal(supplier)} className="gap-2 cursor-pointer">
                                      <Edit2 className="w-4 h-4" /> Modifier
                                   </DropdownMenuItem>
                                   <DropdownMenuItem 
                                      onClick={() => { if(confirm('Supprimer ce fournisseur ?')) deleteMutation.mutate(supplier.id) }}
                                      className="text-destructive gap-2 focus:bg-destructive/5 focus:text-destructive cursor-pointer"
                                   >
                                      <Trash2 className="w-4 h-4" /> Supprimer
                                   </DropdownMenuItem>
                                </DropdownMenuContent>
                             </DropdownMenu>
                          </div>

                          <div className="space-y-2">
                             <div className="flex items-center gap-2 text-sm text-foreground/80">
                                <Phone className="w-4 h-4 text-primary/60" />
                                <span className="font-medium">{supplier.phone || 'Non renseigné'}</span>
                             </div>
                             <div className="flex items-center gap-2 text-sm text-foreground/80">
                                <MapPin className="w-4 h-4 text-primary/60" />
                                <span className="font-medium line-clamp-1">{supplier.address || 'Pas d\'adresse'}</span>
                             </div>
                          </div>

                          <div className="pt-4 border-t border-border/40 flex items-center justify-between">
                             <Badge variant="outline" className="text-[9px] font-bold border-border/50 text-muted-foreground uppercase">
                                Ajouté le {new Date(supplier.created_at).toLocaleDateString()}
                             </Badge>
                          </div>
                       </div>
                    </Card>
                  ))}
                </div>
             )}
          </div>
    </main>

      {/* Slide-over or Modal for Create/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeModal} />
          <Card className="relative w-full max-w-md shadow-2xl border-border/50 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-border/50 flex items-center justify-between">
              <h2 className="text-xl font-black text-foreground">
                {editingSupplier ? 'Modifier Fournisseur' : 'Nouveau Fournisseur'}
              </h2>
              <Button variant="ghost" size="icon" onClick={closeModal} className="rounded-full">
                <X className="w-5 h-5" />
              </Button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase">Nom du Fournisseur</label>
                <Input 
                  required 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="Ex: SoftCosy Global"
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase">Téléphone</label>
                <Input 
                  value={formData.phone} 
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                  placeholder="+228 90 00 00 00"
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase">Adresse</label>
                <Input 
                  value={formData.address} 
                  onChange={e => setFormData({...formData, address: e.target.value})}
                  placeholder="Lomé, Togo"
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="pt-4 flex gap-3">
                <Button variant="outline" type="button" onClick={closeModal} className="flex-1 rounded-xl h-11 font-bold">Annuler</Button>
                <Button disabled={createMutation.isPending || updateMutation.isPending} className="flex-1 rounded-xl h-11 font-bold gap-2">
                  {(createMutation.isPending || updateMutation.isPending) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Enregistrer
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
