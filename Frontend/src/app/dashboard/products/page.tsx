'use client'

import React, { useState, useMemo } from 'react'
import {
  Plus,
  Search,
  MoreHorizontal,
  Package,
  Layers,
  Trash2,
  Edit2,
  ChevronDown,
  ChevronUp,
  Activity,
  ArrowUpDown,
  Info,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

// UI Components
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// Custom Modals
import AddEditProductModal from '@/components/add-product-modal'
import CategoryManagementModal from '@/components/category-management-modal'

// Type des données reçues de l'API (image = string URL, pas File)
interface APIVariant {
  id: number
  sku?: string
  size?: string
  selling_price: number
  cost_price?: number
  stock?: number
  is_active: boolean
}

interface APIProduct {
  id: number
  name: string
  code_produit?: string
  description?: string
  image?: string
  image_url?: string
  category?: { id: number; name: string }
  total_stock?: number
  variants: APIVariant[]
}

export default function ProductsPage() {
  const queryClient = useQueryClient()
  
  // ── Page States ───────────────────────────────
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [productToEdit, setProductToEdit] = useState<APIProduct | null>(null)
  const [page, setPage] = useState(1)
  const [hasNextPage, setHasNextPage] = useState(false)
  const [hasPrevPage, setHasPrevPage] = useState(false)

  // ── Data Fetching ─────────────────────────────
  const { data: productsData, isLoading, isError } = useQuery({
    queryKey: ['products', page],
    queryFn: async () => {
      const res = await api.get(`/products/?page=${page}`)
      setHasNextPage(!!res.data.next)
      setHasPrevPage(!!res.data.previous)
      return res.data
    }
  })

  // Accès sécurisé aux données paginées
  const products: APIProduct[] = useMemo(() => {
    if (!productsData) return []
    return Array.isArray(productsData) ? productsData : (productsData.results || [])
  }, [productsData])

  const totalItems = productsData?.count || products.length

  // ── Mutations ─────────────────────────────────
  const deleteProductMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/products/${id}/`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  })

  // ── Filtered Data ─────────────────────────────
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const categoryName = (p.category && typeof p.category === 'object') ? p.category.name : ''
      return (
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.code_produit?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        categoryName.toLowerCase().includes(searchTerm.toLowerCase())
      )
    })
  }, [products, searchTerm])

  // ── Helpers ──────────────────────────────────
  const getMainPrice = (variants: APIVariant[]) => {
    if (!variants || variants.length === 0) return 0
    return variants[0].selling_price || 0
  }

  const getImageUrl = (product: APIProduct): string | undefined => {
    if (product.image_url) return product.image_url
    if (product.image) return product.image
    return undefined
  }

  // On ne bloque plus tout l'affichage

  return (
    <div className="flex flex-col h-full text-foreground">
      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-8 text-foreground">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
            <Package className="w-8 h-8 text-primary" />
            Catalogue Produits
          </h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">
            Gérez vos produits, variantes et stocks en temps réel
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button 
            onClick={() => setIsCategoryModalOpen(true)} 
            variant="outline" 
            className="rounded-xl px-5 h-12 border-primary/20 hover:bg-primary/5 text-primary gap-2 transition-all font-semibold"
          >
            <Layers className="w-4 h-4" />
            Catégories
          </Button>
          <Button 
            onClick={() => setIsAddModalOpen(true)} 
            className="rounded-xl px-6 h-12 shadow-lg shadow-primary/25 gap-2 font-bold transition-all hover:scale-[1.02] active:scale-95"
          >
            <Plus className="w-5 h-5" />
            Nouveau Produit
          </Button>
        </div>
      </div>

      {/* SEARCH AND FILTERS */}
      <Card className="p-2 sm:p-4 border-border/50 shadow-sm bg-card/50 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Rechercher par nom, SKU ou catégorie..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-11 h-12 bg-background/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 rounded-xl transition-all"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" className="h-12 w-12 rounded-xl border-border/50">
              <ArrowUpDown className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* MAIN CONTENT */}
      {isLoading ? (
        <div className="space-y-6">
          <div className="hidden lg:block overflow-hidden rounded-2xl border border-border/50 bg-card shadow-xl">
             <div className="p-4 bg-muted/50 border-b border-border/50 h-12 animate-pulse" />
             <div className="p-8 space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex gap-4 items-center">
                    <div className="w-12 h-12 rounded-xl bg-muted animate-pulse" />
                    <div className="flex-1 space-y-2">
                       <div className="h-4 w-1/4 bg-muted rounded animate-pulse" />
                       <div className="h-3 w-1/6 bg-muted rounded animate-pulse" />
                    </div>
                    <div className="w-24 h-4 bg-muted animate-pulse" />
                    <div className="w-24 h-4 bg-muted animate-pulse" />
                  </div>
                ))}
             </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:hidden">
             {Array.from({ length: 4 }).map((_, i) => (
               <Card key={i} className="p-6 h-32 bg-card animate-pulse" />
             ))}
          </div>
        </div>
      ) : isError ? (
        <div className="p-8 flex-1 flex items-center justify-center">
          <div className="max-w-md w-full border border-destructive/20 bg-destructive/5 rounded-2xl text-center p-8">
            <p className="text-destructive font-bold mb-2">Erreur de connexion</p>
            <p className="text-sm text-muted-foreground">Impossible de charger les produits.</p>
            <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['products'] })} variant="outline" className="mt-4 border-destructive text-destructive px-8 rounded-xl">
              Réessayer
            </Button>
          </div>
        </div>
      ) : filteredProducts.length === 0 ? (
        <Card className="p-16 border-dashed border-2 flex flex-col items-center justify-center text-center opacity-80 rounded-3xl">
          <div className="w-20 h-20 rounded-full bg-muted/30 flex items-center justify-center mb-6">
            <Package className="w-10 h-10 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-bold mb-2">Aucun produit trouvé</h3>
          <p className="text-muted-foreground max-w-sm mb-8">
            Nous n'avons trouvé aucun produit correspondant à votre recherche. Try other words or create one.
          </p>
          <Button onClick={() => setSearchTerm('')} variant="link" className="text-primary font-bold">
            Effacer la recherche
          </Button>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Desktop Table */}
          <div className="hidden lg:block overflow-hidden rounded-2xl border border-border/50 bg-card shadow-xl overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/50 border-b border-border/50">
                  <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Produit</th>
                  <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Catégorie</th>
                  <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-center">Stock Total</th>
                  <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Prix (Dès)</th>
                  <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredProducts.map((product) => {
                  const totalStock = product.total_stock || 0
                  const categoryName = (product.category && typeof product.category === 'object') ? product.category.name : 'N/A'
                  
                  return (
                    <React.Fragment key={product.id}>
                      <tr className="hover:bg-muted/30 transition-colors group cursor-pointer" onClick={() => setExpandedId(expandedId === product.id ? null : (product.id ?? null))}>
                        <td className="p-4">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-primary/5 border border-primary/10 overflow-hidden flex items-center justify-center shrink-0 shadow-inner">
                              {getImageUrl(product) ? (
                                <img src={getImageUrl(product)} alt={product.name} className="w-full h-full object-cover" />
                              ) : (
                                <Package className="w-6 h-6 text-primary/40" />
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-foreground text-sm group-hover:text-primary transition-colors">{product.name}</div>
                              <div className="text-[10px] font-bold text-muted-foreground bg-muted px-1.5 rounded mt-1 inline-block uppercase tracking-tighter">
                                {product.code_produit || 'SANS SKU'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge variant="outline" className="bg-background/50 border-primary/20 text-primary rounded-lg px-2 py-0 text-[10px] font-bold uppercase">
                            {categoryName}
                          </Badge>
                        </td>
                        <td className="p-4 text-center">
                          <span className={`text-sm font-bold ${totalStock <= 5 ? 'text-destructive' : 'text-green-600'}`}>
                            {totalStock}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="text-sm font-black text-foreground">{getMainPrice(product.variants).toLocaleString()} FCFA</div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1.5">
                            <div className={`w-2 h-2 rounded-full ${totalStock > 0 ? 'bg-green-500' : 'bg-destructive'} animate-pulse`} />
                            <span className="text-[10px] font-bold uppercase tracking-wide">
                              {totalStock > 0 ? 'En Stock' : 'Épuisé'}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setProductToEdit(product)}
                              className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-muted rounded-lg">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-xl border-border/50">
                                <DropdownMenuItem onClick={() => setExpandedId(expandedId === product.id ? null : (product.id ?? null))} className="gap-2 focus:bg-primary/5 focus:text-primary cursor-pointer">
                                  {expandedId === product.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                  {expandedId === product.id ? 'Masquer détails' : 'Voir détails'}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => { if(confirm('Supprimer ce produit ?')) deleteProductMutation.mutate(product.id!) }}
                                  className="text-destructive gap-2 focus:bg-destructive/5 focus:text-destructive cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Supprimer
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                      
                      {expandedId === product.id && (
                        <tr className="bg-muted/20 animate-in slide-in-from-top-2 duration-200">
                          <td colSpan={6} className="p-4 pb-8">
                            <div className="ml-16 rounded-2xl border border-border/50 bg-background/50 overflow-hidden shadow-inner">
                              <div className="p-3 bg-muted/30 border-b border-border/50 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                                <Activity className="w-3 h-3" />
                                Détails des Variantes
                              </div>
                              <table className="w-full text-left text-xs">
                                <thead>
                                  <tr className="border-b border-border/30">
                                    <th className="p-3 font-bold text-muted-foreground">SKU</th>
                                    <th className="p-3 font-bold text-muted-foreground">Taille/Modèle</th>
                                    <th className="p-3 font-bold text-muted-foreground">Prix Vente</th>
                                    <th className="p-3 font-bold text-muted-foreground">Stock</th>
                                    <th className="p-3 font-bold text-muted-foreground">Statut</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border/20">
                                  {product.variants.map((v, i) => (
                                    <tr key={v.id || i} className="hover:bg-muted/40 transition-colors">
                                      <td className="p-3 font-mono font-medium">{v.sku || 'N/A'}</td>
                                      <td className="p-3"><Badge variant="secondary" className="px-1.5 py-0 rounded text-[9px] font-bold">{v.size || 'Unique'}</Badge></td>
                                      <td className="p-3 font-bold">{(v.selling_price || 0).toLocaleString()} FCFA</td>
                                      <td className="p-3 font-medium">{v.stock || 0}</td>
                                      <td className="p-3">
                                        <Badge className={`rounded-full text-[9px] h-4 ${v.is_active ? 'bg-green-100 text-green-700 hover:bg-green-100' : 'bg-muted text-muted-foreground hover:bg-muted'}`}>
                                          {v.is_active ? 'Actif' : 'Inactif'}
                                        </Badge>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:hidden">
            {filteredProducts.map((product) => {
               const totalStock = product.total_stock || 0
               const categoryName = (product.category && typeof product.category === 'object') ? product.category.name : 'N/A'
               
               return (
                 <Card key={product.id} className="p-0 overflow-hidden border-border/50 bg-card rounded-2xl shadow-sm">
                   <div className="p-4 flex gap-4 border-b border-border/40">
                      <div className="w-16 h-16 rounded-xl bg-muted/30 border overflow-hidden flex items-center justify-center shrink-0">
                        {getImageUrl(product) ? (
                          <img src={getImageUrl(product)} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <Package className="w-8 h-8 text-muted-foreground/30" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                         <div className="flex justify-between items-start">
                            <Badge className="mb-1 text-[9px] font-black uppercase tracking-wider">{categoryName}</Badge>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 -mt-1 -mr-1">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setProductToEdit(product)} className="gap-2">
                                  <Edit2 className="w-4 h-4" /> Modifier
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => { if(confirm('Supprimer ce produit ?')) deleteProductMutation.mutate(product.id!) }}
                                  className="text-destructive gap-2"
                                >
                                  <Trash2 className="w-4 h-4" /> Supprimer
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                         </div>
                         <h3 className="font-bold text-foreground text-base truncate">{product.name}</h3>
                         <p className="text-[10px] text-muted-foreground font-mono">{product.code_produit || 'SANS SKU'}</p>
                      </div>
                   </div>
                   <div className="p-4 grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.1em] mb-1">Stock Total</p>
                        <p className={`text-sm font-bold ${totalStock <= 5 ? 'text-destructive' : 'text-green-600'}`}>{totalStock} unités</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.1em] mb-1">Prix (Dès)</p>
                        <p className="text-sm font-black">{getMainPrice(product.variants).toLocaleString()} FCFA</p>
                      </div>
                   </div>
                   
                   <button 
                     onClick={() => setExpandedId(expandedId === product.id ? null : (product.id ?? null))}
                     className="w-full p-3 bg-muted/20 border-t border-border/30 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:bg-muted/40 transition-colors"
                   >
                     {expandedId === product.id ? 'Masquer les variantes' : 'Voir les variantes'}
                     {expandedId === product.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                   </button>
                   
                   {expandedId === product.id && (
                     <div className="p-4 bg-muted/10 space-y-3 animate-in slide-in-from-top-2 duration-300">
                        {product.variants.map((v, i) => (
                          <div key={v.id || i} className="p-3 rounded-xl bg-background border border-border/40 shadow-sm flex justify-between items-center">
                            <div>
                              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter mb-1">{v.sku || 'SANS SKU'}</p>
                              <p className="text-xs font-bold text-foreground">{v.size || 'Unique'}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-black text-primary">{(v.selling_price || 0).toLocaleString()} FCFA</p>
                              <p className="text-[10px] font-bold text-muted-foreground">{v.stock || 0} en stock</p>
                            </div>
                          </div>
                        ))}
                     </div>
                   )}
                 </Card>
               )
            })}
          </div>
        </div>
      )}

      {/* FOOTER INFO */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-10 border-t border-border/50 text-muted-foreground">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium bg-muted/50 px-4 py-2 rounded-full border border-border/30 inline-block">
            Affichage de <span className="text-foreground font-black">{filteredProducts.length}</span> sur <span className="text-foreground font-black">{totalItems || (products?.length ?? 0)}</span> produits
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
           <Info className="w-3 h-3" />
           Dernière mise à jour : {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* MODALS */}
      <AddEditProductModal
        isOpen={isAddModalOpen || !!productToEdit}
        onClose={() => {
          setIsAddModalOpen(false)
          setProductToEdit(null)
        }}
        productToEdit={productToEdit as any}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['products'] })
          setProductToEdit(null)
        }}
      />

      <CategoryManagementModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
      />

    </main>
    </div>
  )
}