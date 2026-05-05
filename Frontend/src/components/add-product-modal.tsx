'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X, Plus, Trash2, Package, Tag, Info, Image as ImageIcon, Layers } from 'lucide-react'
import api from '@/lib/api'
import { Card } from '@/components/ui/card'
import React from 'react'

// ────────────────────────────────────────────────
// Interfaces
// ────────────────────────────────────────────────
export interface Variant {
  id?: number
  sku?: string
  size?: string
  selling_price: number
  cost_price?: number
  stock?: number          // Lecture seule depuis le backend
  initial_stock?: number  // Write-only pour la création
  is_active: boolean
}

export interface Product {
  id?: number
  name: string
  code_produit?: string
  description?: string
  image_url?: string
  image?: File | null
  category?: { id: number; name: string } | number
  total_stock?: number
  variants: Variant[]
}

interface AddEditProductModalProps {
  isOpen: boolean
  onClose: () => void
  productToEdit?: Product | null
  onSuccess?: () => void
}

// ────────────────────────────────────────────────
// API Functions
// ────────────────────────────────────────────────
const fetchCategories = async () => {
  const res = await api.get('/categories/')
  return res.data.results || res.data
}

export default function AddEditProductModal({ 
  isOpen, 
  onClose, 
  productToEdit, 
  onSuccess 
}: AddEditProductModalProps) {
  const queryClient = useQueryClient()
  const isEditMode = !!productToEdit

  // ────────────────────────────────────────────────
  // Form State
  // ────────────────────────────────────────────────
  const [formData, setFormData] = useState<Product>({
    name: '',
    code_produit: '',
    description: '',
    image_url: '',
    image: null,
    category: undefined,
    variants: []
  })

  useEffect(() => {
    if (productToEdit) {
      setFormData({
        ...productToEdit,
        category: (productToEdit.category && typeof productToEdit.category === 'object') ? productToEdit.category.id : productToEdit.category,
        variants: (productToEdit.variants || []).map(v => ({
          ...v,
          initial_stock: (v.stock as number) || 0
        }))
      })
    } else {
      setFormData({
        name: '',
        code_produit: '',
        description: '',
        image_url: '',
        image: null,
        category: undefined,
        variants: [{ selling_price: 0, is_active: true, initial_stock: 0 }]
      })
    }
  }, [productToEdit, isOpen])

  // ────────────────────────────────────────────────
  // Queries & Mutations
  // ────────────────────────────────────────────────
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    enabled: isOpen,
  })

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      // Setup payload using FormData to support file upload
      const formPayload = new FormData()
      formPayload.append('name', data.name)
      if (data.code_produit) formPayload.append('code_produit', data.code_produit)
      if (data.description) formPayload.append('description', data.description)
      if (data.image_url) formPayload.append('image_url', data.image_url)
      if (data.category) formPayload.append('category_id', String(data.category))
      
      // Append file if exists
      if (data.image instanceof File) {
        formPayload.append('image', data.image)
      }

      // Appending nested variants correctly in FormData 
      // (Django REST Framework requires JSON stringified or index-based)
      // Usually passing JSON string in a form field for variants is better when using FormData if the backend supports it,
      // but since we override create/update in the Serializer, let's keep sending JSON where possible,
      // Or we can send purely JSON if no file, and FormData if file?
      // For DRF: Let's send variants as a JSON string and parse it in the backend, 
      // or we just don't use FormData if no file?
      
      // Let's pass the variants explicitly:
      formPayload.append('variants', JSON.stringify(data.variants || []))

      // Wait, standard DRF doesn't parse JSON arrays deeply from FormData automatically unless configured.
      // We will fix the backend to parse 'variants' if it's a string, or just use multipart.
      // Alternatively, we use standard axios config for multipart.
      const config = { headers: { 'Content-Type': 'multipart/form-data' } }

      if (isEditMode && productToEdit?.id) {
        return api.patch(`/products/${productToEdit.id}/`, formPayload, config)
      }
      return api.post('/products/', formPayload, config)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      if (onSuccess) onSuccess()
      onClose()
    },
    onError: (err: any) => {
      const msg = err.response?.data?.detail || JSON.stringify(err.response?.data) || "Erreur lors de l'enregistrement"
      alert('Erreur: ' + msg)
    }
  })

  // ────────────────────────────────────────────────
  // Handlers
  // ────────────────────────────────────────────────
  const handleProductChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement
    
    if (type === 'file') {
      const file = (e.target as HTMLInputElement).files?.[0] || null
      setFormData(prev => ({ ...prev, image: file }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: name === 'category' ? (value ? Number(value) : undefined) : value
      }))
    }
  }

  const handleVariantChange = (index: number, field: keyof Variant, value: any) => {
    const newVariants = [...formData.variants]
    newVariants[index] = { ...newVariants[index], [field]: value }
    setFormData(prev => ({ ...prev, variants: newVariants }))
  }

  const addVariant = () => {
    setFormData(prev => ({
      ...prev,
      variants: [...prev.variants, { selling_price: 0, is_active: true, initial_stock: 0 }]
    }))
  }

  const removeVariant = (index: number) => {
    setFormData(prev => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== index)
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.category) {
      alert('Veuillez sélectionner une catégorie')
      return
    }
    mutation.mutate(formData)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <Card className="w-full max-w-4xl bg-card shadow-2xl border-border flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="p-6 border-b border-border flex items-center justify-between sticky top-0 bg-card z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Package className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">
                {isEditMode ? 'Modifier le produit' : 'Nouveau produit'}
              </h2>
              <p className="text-xs text-muted-foreground">Remplissez les informations détaillées</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-8">
            
            {/* Section 1: Infos Générales */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-primary font-bold text-sm tracking-widest uppercase">
                <Info className="w-4 h-4" />
                Informations Générales
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Nom du produit *</label>
                  <Input 
                    name="name" 
                    value={formData.name} 
                    onChange={handleProductChange} 
                    required 
                    placeholder="ex: Chaussures de Basket"
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Code produit (SKU Maître)</label>
                  <Input 
                    name="code_produit" 
                    value={formData.code_produit || ''} 
                    onChange={handleProductChange} 
                    placeholder="Auto-généré"
                    disabled
                    className="h-11 bg-muted/50 cursor-not-allowed"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Catégorie *</label>
                  <select
                    name="category"
                    value={formData.category as number || ''}
                    onChange={handleProductChange}
                    className="w-full h-11 px-3 py-2 rounded-md border border-input bg-background text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
                    required
                  >
                    <option value="">Sélectionner une catégorie</option>
                    {Array.isArray(categories) && categories.map((cat: any) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                {formData.variants.length <= 1 && (
                  <div className="space-y-2">
                    <label className="text-sm font-semibold flex items-center gap-2">
                      <Layers className="w-4 h-4 text-muted-foreground" />
                      Stock du produit
                    </label>
                    <Input
                      type="number"
                      min={0}
                      value={formData.variants[0]?.initial_stock ?? 0}
                      onChange={(e) => {
                        const val = Math.max(0, Number(e.target.value))
                        setFormData(prev => ({
                          ...prev,
                          variants: prev.variants.length > 0
                            ? prev.variants.map((v, i) => i === 0 ? { ...v, initial_stock: val } : v)
                            : [{ selling_price: 0, is_active: true, initial_stock: val }]
                        }))
                      }}
                      placeholder="0"
                      className="h-11"
                    />
                    {!isEditMode && (
                      <p className="text-xs text-muted-foreground">
                        Si vous ajoutez plusieurs variantes, définissez le stock de chacune dans la section Variantes.
                      </p>
                    )}
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-sm font-semibold flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-muted-foreground" />
                    Image Produit (Fichier)
                  </label>
                  <Input 
                    type="file"
                    name="image"
                    accept="image/*"
                    onChange={handleProductChange} 
                    className="h-11"
                  />
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-muted-foreground w-full text-center">Ou lien direct :</span>
                  </div>
                  <Input 
                    name="image_url" 
                    value={formData.image_url || ''} 
                    onChange={handleProductChange} 
                    placeholder="https://... (URL externe)"
                    className="h-11"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Description</label>
                <textarea 
                  name="description" 
                  value={formData.description || ''} 
                  onChange={handleProductChange}
                  className="w-full min-h-[100px] p-3 rounded-md border border-input bg-background text-sm focus:ring-2 focus:ring-primary outline-none"
                  placeholder="Décrivez votre produit..."
                />
              </div>
            </div>

            {/* Section 2: Variantes */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-primary font-bold text-sm tracking-widest uppercase">
                  <Tag className="w-4 h-4" />
                  Variantes de Produit
                </div>
                <Button 
                  type="button" 
                  onClick={addVariant} 
                  variant="outline" 
                  size="sm" 
                  className="gap-2 border-primary text-primary hover:bg-primary/10"
                >
                  <Plus className="w-4 h-4" />
                  Ajouter une variante
                </Button>
              </div>

              <div className="space-y-3">
                {formData.variants.length === 0 && (
                  <div className="p-8 border border-dashed rounded-xl text-center text-muted-foreground bg-muted/20">
                    Aucune variante définie. Un produit doit avoir au moins une variante pour être vendu.
                  </div>
                )}
                
                {formData.variants.map((variant, index) => (
                  <div key={index} className="group relative p-4 rounded-xl border border-border bg-background hover:border-primary/30 transition-all shadow-sm">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">SKU</label>
                        <Input 
                          value={variant.sku || ''} 
                          onChange={(e) => handleVariantChange(index, 'sku', e.target.value)}
                          placeholder="Auto-généré"
                          disabled
                          className="h-9 text-xs bg-muted/50 cursor-not-allowed"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Taille / Couleur</label>
                        <Input 
                          value={variant.size || ''} 
                          onChange={(e) => handleVariantChange(index, 'size', e.target.value)}
                          placeholder="M / 42 / Rouge"
                          className="h-9 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Prix Vente (FCFA) *</label>
                        <Input 
                          type="number"
                          step="0.01"
                          value={variant.selling_price} 
                          onChange={(e) => handleVariantChange(index, 'selling_price', Number(e.target.value))}
                          required
                          className="h-9 text-xs font-bold"
                        />
                      </div>
                      {/* Stock éditable pour chaque variante quand il y en a plusieurs */}
                      {formData.variants.length > 1 && (
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase">Stock</label>
                          <Input
                            type="number"
                            min={0}
                            value={variant.initial_stock ?? 0}
                            onChange={(e) => handleVariantChange(index, 'initial_stock', Math.max(0, Number(e.target.value)))}
                            className="h-9 text-xs font-bold"
                          />
                        </div>
                      )}
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => removeVariant(index)}
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer sticky */}
          <div className="p-6 border-t border-border flex gap-3 sticky bottom-0 bg-card z-10">
            <Button type="button" variant="ghost" onClick={onClose} className="flex-1 h-12 text-base">
              Annuler
            </Button>
            <Button 
              type="submit" 
              disabled={mutation.isPending}
              className="flex-1 h-12 text-base font-bold shadow-lg shadow-primary/20"
            >
              {mutation.isPending ? 'Enregistrement...' : isEditMode ? 'Mettre à jour' : 'Créer le produit'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}