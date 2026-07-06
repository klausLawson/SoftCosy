# Plan de Fusion — Application de Gestion & Site Web SoftCosy

> **Objectif :** Faire de l'application de gestion SoftCosy la **source unique de vérité** pour
> les produits du site web. Un produit créé/modifié dans l'app de gestion apparaît
> automatiquement sur le site vitrine. Suppression de l'admin dupliqué du site web.

---

## 1. Situation actuelle

### Deux systèmes indépendants

```
┌─────────────────────────────────────────────────────────┐
│  SITE WEB  (site_softcosy/)                             │
│                                                         │
│  Frontend vitrine ──→  Express API (Node.js/Vercel)     │
│  Frontend admin   ──→  Express API (Node.js/Vercel)     │
│                              │                          │
│                         Supabase (tables Express)       │
│                         + Cloudinary (dossier softcosy/)│
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  APPLICATION DE GESTION  (SoftCosy/)                    │
│                                                         │
│  Frontend React/Next.js ──→  Django API (Render)        │
│                                   │                     │
│                              Supabase (tables Django)   │
│                              + Cloudinary               │
│                                (dossier products/images)│
└─────────────────────────────────────────────────────────┘
```

### Problèmes identifiés

| Problème | Impact |
|---|---|
| Même produit à créer deux fois (app + site admin) | Double travail, risque d'incohérence |
| Deux interfaces admin séparées | Confusion, maintenance double |
| Deux schémas de données différents | Difficile de synchroniser |
| Upload d'images en double | Stockage Cloudinary gaspillé |
| App de gestion n'accepte qu'une seule image par produit | Limitation fonctionnelle |

---

## 2. Vision cible

```
┌─────────────────────────────────────────────────────────┐
│  SITE WEB  (inchangé visuellement)                      │
│                                                         │
│  Frontend vitrine ──→  Django API (Render) ←──────┐    │
│  [/admin/ supprimé]         │                     │    │
└─────────────────────────────│─────────────────────│────┘
                              │                     │
┌─────────────────────────────│─────────────────────│────┐
│  APPLICATION DE GESTION     │                     │    │
│                             ▼                     │    │
│  Frontend React/Next.js ──→  Django API (Render)  │    │
│                                   │               │    │
│                              Supabase (1 seule DB)│    │
│                              + Cloudinary (1 seul │    │
│                                compte, unifié)    │    │
└───────────────────────────────────────────────────┘    │
         Publie automatiquement sur le site ─────────────┘
```

### Ce que ça change concrètement

- **Un seul endroit pour gérer les produits** : l'application SoftCosy
- **Un seul upload d'images** : les images uploadées dans l'app apparaissent sur le site
- **Site vitrine inchangé** pour les visiteurs (même design, même URL)
- **L'admin du site web est supprimé** (le dossier `/admin/` du site)
- **Le backend Express continue de tourner** mais uniquement pour servir le HTML statique
  de la vitrine (ou même il peut être gardé tel quel avec un proxy)

---

## 3. Décisions techniques et pourquoi

### Décision 1 : Nouveau modèle `ProductImage` (plusieurs images par produit)

**Problème actuel :**
```python
# Actuellement dans Product — UNE SEULE image possible
image = models.ImageField(upload_to='products/images/', null=True, blank=True)
image_url = models.CharField(max_length=255, blank=True, null=True)
```

**Solution :**
Créer un modèle `ProductImage` lié au produit :
```python
class ProductImage(models.Model):
    product = ForeignKey(Product, related_name='product_images', on_delete=CASCADE)
    image_url = CharField(max_length=500)  # URL Cloudinary
    order = IntegerField(default=0)        # Pour ordonner (1ère image = photo principale)
```

**Pourquoi pas garder un seul champ ?**
Le site web affiche une galerie de plusieurs photos par produit (navigation avec flèches,
miniatures, etc.). L'app de gestion doit supporter la même chose. Un tableau JSON serait
possible mais un modèle dédié est plus propre pour ajouter/supprimer des photos individuellement.

**Compatibilité :** Les champs `image` et `image_url` existants sur `Product` sont conservés
pendant la migration, puis retirés une fois toutes les images migrées vers `ProductImage`.

---

### Décision 2 : Nouveaux champs sur le modèle `Product`

Le site web nécessite des données que l'app de gestion n'a pas encore. Ces champs sont ajoutés
directement sur le modèle `Product` existant :

| Champ | Type | Valeur par défaut | Utilité |
|---|---|---|---|
| `brand` | CharField(100) | `""` | Marque (Nike, Adidas...) pour filtrage sur le site |
| `badge` | CharField(20) | `null` | Étiquette visuelle (NEW, BESTSELLER, HOT, SET, CLASSIC) |
| `icon` | CharField(10) | `"👕"` | Emoji affiché si pas d'image |
| `fabric` | TextField | `""` | Composition du tissu |
| `colors` | JSONField | `[]` | Tableau de codes hex : `["#111111", "#ffffff"]` |
| `is_published` | BooleanField | `True` | Contrôle si le produit apparaît sur le site |

**Pourquoi `brand` alors qu'on a déjà `category` ?**
Sur le site, les produits sont filtrés par **marque** (Nike, Adidas) ET par **catégorie**
(Hauts, Pantalons). La `Category` dans l'app de gestion représente la catégorie métier
(pour l'inventaire), mais le concept de marque est distinct. On ajoute un simple champ texte.

**Pourquoi `colors` sur le produit et pas sur les variantes ?**
Le site affiche les couleurs disponibles au niveau du produit (palette de sélection), pas
par variante. L'app de gestion garde ses variantes pour la gestion du stock (taille, prix,
SKU). Les couleurs sont une info d'affichage global du produit.

**Pourquoi `is_published` ?**
Permet de créer un produit dans l'app de gestion (pour l'inventaire) sans qu'il apparaisse
forcément sur le site web public. Utile pour les produits en rupture totale, les pre-stocks,
ou les articles réservés aux ventes directes.

---

### Décision 3 : Endpoints Django dédiés au site web

Le site web (Vanilla JS) appelle une API avec un format de données précis. Plutôt que de
modifier le format des endpoints existants (ce qui casserait l'app de gestion), on crée de
**nouveaux endpoints publics** sous le préfixe `/api/site/` :

```
GET  /api/site/products/       → Liste pour la vitrine (format site web, sans auth)
GET  /api/site/products/{id}/  → Détail produit (format site web, sans auth)
GET  /api/site/brands/         → Liste des marques distinctes (sans auth)
GET  /api/site/categories/     → Liste des catégories (sans auth)
```

Ces endpoints transforment les données Django en format attendu par le JS du site :
```javascript
// Format attendu par le site web pour un produit
{
  "id": 1,
  "sku": "PROD-00001",          // ← code_produit de Django
  "name": "Nike Air Force",
  "brand": "Nike",              // ← nouveau champ brand
  "category": ["tops"],         // ← catégorie name comme tableau
  "price": 15000,               // ← selling_price de la première variante
  "sizes": ["M", "L", "XL"],   // ← extrait des variantes actives
  "colors": ["#111111"],        // ← nouveau champ colors
  "fabric": "100% Polyester",   // ← nouveau champ fabric
  "description": "...",
  "images": ["https://res.cloudinary.com/..."], // ← URLs de ProductImage
  "icon": "👕",                 // ← nouveau champ icon
  "badge": "NEW"                // ← nouveau champ badge
}
```

**Pourquoi ne pas réutiliser les endpoints existants ?**
L'app de gestion retourne des variantes imbriquées, des stocks, des prix d'achat, etc. C'est
trop d'information pour la vitrine et dans un format différent. Les nouveaux endpoints font
la transformation proprement, sans impacter l'app existante.

---

### Décision 4 : Endpoint d'upload Cloudinary dans Django

Actuellement, le site web utilise `POST /api/upload` (Express) pour uploader vers Cloudinary.
On crée un équivalent dans Django :

```
POST /api/products/upload-image/   → Upload vers Cloudinary, retourne l'URL (Auth requise)
DELETE /api/products/delete-image/ → Supprime une image Cloudinary (Auth requise)
```

Ces endpoints seront utilisés par :
- Le formulaire produit de l'app de gestion (React)
- Plus du tout par le site web (l'admin est supprimé)

---

### Décision 5 : Mise à jour du site web (une seule ligne de code)

Dans le fichier `site_softcosy/frontend/index.html`, le JavaScript utilise des URLs relatives :
```javascript
// Actuel — appelle le backend Express (sur Vercel)
const res = await fetch('/api/products')
```

On change uniquement l'URL de base de l'API :
```javascript
// Après modification — appelle Django (sur Render)
const API_BASE = 'https://softcosy-backend.onrender.com'
const res = await fetch(API_BASE + '/api/site/products/')
```

**Le backend Express reste déployé sur Vercel** uniquement pour servir le HTML/CSS/JS statique
de la vitrine. Il ne sert plus de rôle API pour les produits.

**CORS :** La configuration CORS de Django doit autoriser les requêtes depuis le domaine Vercel
du site (`siteweb-softcosy.vercel.app`).

---

### Décision 6 : Migration des données existantes

Les 94 produits actuels dans la base Express doivent être importés dans Django. On crée une
**commande de migration Django** (`manage.py migrate_site_products`) qui :
1. Appelle l'API publique Express (`GET /api/products`) pour lire les produits existants
2. Crée les produits correspondants dans Django (avec variantes, images, brand, etc.)
3. Garde le mapping SKU pour éviter les doublons

Cette commande est à usage unique (exécutée une seule fois), puis conservée dans le projet
pour référence.

---

## 4. Ce qui change dans chaque projet

### 4a. Backend Django (`Backend/`)

#### Migrations de base de données

**Fichier à modifier :** `product/models.py`

```
AVANT                          APRÈS
──────                         ──────
Product                        Product
  ├─ id                          ├─ id
  ├─ name                        ├─ name
  ├─ description                 ├─ description
  ├─ code_produit                ├─ code_produit
  ├─ image         ← une image   ├─ image         ← conservé (migration)
  ├─ image_url     ← une URL     ├─ image_url     ← conservé (migration)
  └─ category FK                 ├─ category FK
                                 ├─ brand (NEW)        ← marque texte
                                 ├─ badge (NEW)        ← NEW/BESTSELLER/...
                                 ├─ icon (NEW)         ← emoji 👕
                                 ├─ fabric (NEW)       ← tissu
                                 ├─ colors (NEW)       ← ["#111111",...]
                                 └─ is_published (NEW) ← visible sur site

                               ProductImage (NEW)
                                 ├─ id
                                 ├─ product FK ──→ Product
                                 ├─ image_url          ← URL Cloudinary
                                 └─ order              ← tri photos
```

**Nouvelle app ou dans `product` ?**
Le modèle `ProductImage` est ajouté dans l'app `product` existante — c'est logiquement lié
aux produits et ça évite de créer une app juste pour un modèle.

#### Nouvelles vues/serializers

**Fichiers à créer/modifier :**

```
Backend/product/
  ├─ models.py        ← modifier (nouveaux champs + ProductImage)
  ├─ serializers.py   ← modifier (ProductFullSerializer + nouveaux champs)
  │                             + nouveau SiteProductSerializer (format site web)
  ├─ views.py         ← modifier (ajouter upload_image endpoint)
  │                             + nouvelle SiteProductViewSet (public)
  └─ urls.py          ← modifier (ajouter routes /site/ et /upload-image/)
```

**Nouveau `SiteProductViewSet` :**
- Accès public (pas d'authentification)
- Retourne uniquement les produits `is_published=True`
- Transforme les données au format attendu par le site web JS
- Supporte les mêmes filtres que le site (par brand, par catégorie)

**Endpoint upload Cloudinary :**
```python
# POST /api/products/upload-image/
# - Reçoit un fichier image (multipart)
# - L'uploade sur Cloudinary (dossier products/images/)
# - Retourne {"url": "https://res.cloudinary.com/...", "public_id": "..."}
# - Nécessite Token Auth
```

#### Commande de migration des données

```
Backend/product/management/commands/
  └─ migrate_site_products.py   ← NOUVEAU
     # Usage: python manage.py migrate_site_products
     # Importe les 94 produits depuis l'API Express vers Django
```

#### Mise à jour CORS

**Fichier :** `gestion_softcosy/settings.py`

Ajouter l'URL Vercel du site dans `CORS_ALLOWED_ORIGINS` :
```python
CORS_ALLOWED_ORIGINS = [
    ...
    'https://siteweb-softcosy.vercel.app',  # ← AJOUTER
]
```

---

### 4b. Frontend SoftCosy React (`Frontend/`)

#### Formulaire produit — `add-product-modal.tsx`

Modifications :

**Section "Informations Générales" — nouveaux champs :**
```
Avant                     Après
──────                    ──────
Nom du produit            Nom du produit
Code produit (auto)       Code produit (auto)
Catégorie                 Catégorie
Stock                     Marque (brand)          ← NOUVEAU
Image (1 seul fichier)    Badge                   ← NOUVEAU (NEW/BESTSELLER/...)
URL image                 Icône emoji             ← NOUVEAU
Description               Composition (fabric)    ← NOUVEAU
                          Publié sur site web     ← NOUVEAU (toggle)
                          Stock
                          Galerie photos          ← REMPLACE "Image (1 fichier)"
                            - Upload multiple
                            - Aperçu + supprimer
                            - Réordonner
                          Description
```

**Galerie d'images (remplace le champ image unique) :**
- Bouton "Ajouter des photos" → sélection multiple ou drag & drop
- Prévisualisation en miniatures horizontales
- Bouton ✕ sur chaque miniature pour supprimer
- Flèches ◀▶ pour réordonner
- Upload vers Django (`/api/products/upload-image/`) au moment de la sauvegarde
- Retourne des URLs Cloudinary stockées dans `ProductImage`

**Section "Variantes" — ajout couleur :**
```
Avant                     Après
──────                    ──────
SKU (auto)                SKU (auto)
Taille/Couleur (texte)    Taille (texte)          ← séparé
Prix vente                Couleur (color picker)  ← NOUVEAU (hex)
Stock                     Prix vente
                          Stock
```

La couleur d'une variante alimente automatiquement le champ `colors` du produit.

#### Interface `ProductImage` dans les listes

Dans les pages produits, afficher la première image du tableau `product_images` au lieu
de `product.image`. Si aucune image : afficher l'icône emoji (`product.icon`).

---

### 4c. Site web vitrine (`site_softcosy/frontend/`)

#### `index.html` — changement de l'URL API

Une modification dans le JavaScript pour pointer vers Django au lieu d'Express :

```javascript
// AVANT (appels relatifs → Express sur Vercel)
fetch('/api/products')
fetch('/api/brands')
fetch('/api/categories')

// APRÈS (URL absolue → Django sur Render)
const API = 'https://softcosy-backend.onrender.com'
fetch(API + '/api/site/products/')
fetch(API + '/api/site/brands/')
fetch(API + '/api/site/categories/')
```

#### Suppression de l'admin

```
site_softcosy/frontend/admin/
  ├─ index.html   ← SUPPRIMER
  ├─ admin.js     ← SUPPRIMER
  └─ admin.css    ← SUPPRIMER
```

Dans `site_softcosy/backend/server.js`, retirer les routes admin :
```javascript
// SUPPRIMER ces lignes
app.get('/admin*', (req, res) => res.sendFile('.../admin/index.html'))
```

Le fichier `robots.txt` reste inchangé (contient déjà `Disallow: /admin/`).

---

## 5. Plan d'exécution — Étapes dans l'ordre

### Étape 1 — Préparer le modèle Django (Backend)
**Fichiers :** `product/models.py`, nouvelle migration Django

1. Ajouter les champs `brand`, `badge`, `icon`, `fabric`, `colors`, `is_published` à `Product`
2. Créer le modèle `ProductImage`
3. Générer et appliquer la migration : `python manage.py makemigrations && migrate`

**Durée estimée :** 1-2h | **Risque :** Faible (ajout de champs nullables, pas de suppression)

---

### Étape 2 — Mettre à jour les serializers et vues (Backend)
**Fichiers :** `product/serializers.py`, `product/views.py`, `product/urls.py`

1. Mettre à jour `ProductFullSerializer` pour inclure les nouveaux champs + `ProductImage`
2. Créer `SiteProductSerializer` (format site web)
3. Créer `SiteProductViewSet` (liste publique pour la vitrine)
4. Créer l'endpoint `upload-image/` (upload vers Cloudinary)
5. Mettre à jour `urls.py` avec les nouvelles routes

**Durée estimée :** 2-3h | **Risque :** Moyen (modifier les serializers existants)

---

### Étape 3 — Mettre à jour le CORS (Backend)
**Fichier :** `gestion_softcosy/settings.py`

Ajouter `'https://siteweb-softcosy.vercel.app'` dans `CORS_ALLOWED_ORIGINS`.

**Durée estimée :** 5min | **Risque :** Nul

---

### Étape 4 — Mettre à jour le formulaire produit (Frontend SoftCosy)
**Fichier :** `Frontend/src/components/add-product-modal.tsx`

1. Ajouter les champs `brand`, `badge`, `icon`, `fabric`, `is_published`
2. Remplacer le champ image unique par la galerie multi-images
3. Ajouter le color picker sur les variantes
4. Connecter l'upload au nouvel endpoint Django

**Durée estimée :** 4-6h | **Risque :** Moyen (formulaire complexe existant)

---

### Étape 5 — Déployer le backend sur Render (Backend)
Pousser sur GitHub → Render redéploie automatiquement.
Vérifier que les nouveaux endpoints `/api/site/products/` fonctionnent.

**Durée estimée :** 10-15min (déploiement automatique) | **Risque :** Faible

---

### Étape 6 — Migrer les données existantes (Migration)
**Fichier :** `product/management/commands/migrate_site_products.py`

1. Créer la commande de migration
2. La tester en local
3. L'exécuter sur Render : `python manage.py migrate_site_products`

**Durée estimée :** 1-2h | **Risque :** Moyen (données existantes)

> **Avant d'exécuter :** Faire un export/backup de la base Supabase Django.

---

### Étape 7 — Mettre à jour le site web vitrine (Site web)
**Fichier :** `site_softcosy/frontend/index.html`

1. Changer les URLs API de relatifs → absolues vers Django
2. Adapter le format JSON si nécessaire (le SiteProductSerializer retourne le bon format)
3. Tester en local

**Durée estimée :** 1-2h | **Risque :** Moyen (tester que l'affichage est identique)

---

### Étape 8 — Supprimer l'admin du site web (Site web)
**Fichiers :** `site_softcosy/frontend/admin/`, `site_softcosy/backend/server.js`

1. Supprimer le dossier `admin/`
2. Retirer les routes admin de `server.js`
3. Déployer sur Vercel

**Durée estimée :** 30min | **Risque :** Faible (suppression propre)

---

### Étape 9 — Déployer le site web (Site web)
Pousser sur GitHub → Vercel redéploie automatiquement.
Vérifier que la vitrine affiche bien les produits depuis Django.

**Durée estimée :** 10-15min | **Risque :** Faible si étape 7 bien testée

---

## 6. Plan de migration des données

### Situation actuelle des données

```
Base Express (Supabase — tables site web)
  products : ~94 enregistrements
  brands   : 3 (Nike, Adidas, Under Armour)
  categories : 3 (Hauts, Pantalons, Ensembles)

Base Django (Supabase — tables gestion)
  product  : quelques produits créés dans l'app
  category : quelques catégories
  variant  : quelques variantes
```

### Stratégie de migration

La commande `migrate_site_products` va :

1. **Lire** les produits depuis l'API Express publique
2. **Mapper** les données :

| Champ Express | Champ Django | Transformation |
|---|---|---|
| `name` | `Product.name` | Direct |
| `sku` | `Product.code_produit` | Direct |
| `brand` | `Product.brand` | Direct |
| `category[0]` | `Product.category` | Lookup/create Category |
| `description` | `Product.description` | Direct |
| `fabric` | `Product.fabric` | Direct |
| `badge` | `Product.badge` | Direct |
| `icon` | `Product.icon` | Direct |
| `colors` | `Product.colors` | Direct (tableau hex) |
| `images[0..n]` | `ProductImage` (n lignes) | Créer une ligne par URL |
| `sizes` | `Variant.size` | Créer une variante par taille |
| `price` | `Variant.selling_price` | Même prix pour toutes les variantes |
| `is_published` | `Product.is_published` | True par défaut |

3. **Éviter les doublons** : si un produit avec le même `code_produit`/`sku` existe déjà
   dans Django, il est ignoré (pas de double création).

4. **Résultat attendu** :
   - ~94 produits importés
   - ~94 × 3 variantes créées (selon les tailles)
   - ~94 × N images `ProductImage` créées
   - Catégories créées si elles n'existent pas

### Important avant la migration

- Faire un `pg_dump` (backup) de la base Supabase Django avant d'exécuter
- La migration est idempotente (peut être relancée sans créer de doublons)
- Après migration, vérifier visuellement que les produits s'affichent bien
  dans l'app de gestion avant de changer l'API du site web

---

## 7. Récapitulatif des fichiers touchés

### Backend Django (à modifier)
| Fichier | Type de changement |
|---|---|
| `product/models.py` | Ajout champs + modèle `ProductImage` |
| `product/serializers.py` | Mise à jour + nouveau `SiteProductSerializer` |
| `product/views.py` | Mise à jour + `SiteProductViewSet` + `upload_image` |
| `product/urls.py` | Nouvelles routes `/site/` et `/upload-image/` |
| `gestion_softcosy/settings.py` | CORS + ALLOWED_HOSTS |
| `product/management/commands/migrate_site_products.py` | NOUVEAU |

### Frontend SoftCosy React (à modifier)
| Fichier | Type de changement |
|---|---|
| `src/components/add-product-modal.tsx` | Galerie multi-images + nouveaux champs |
| `src/app/dashboard/products/page.tsx` | Afficher première image de la galerie |

### Site web vitrine (à modifier)
| Fichier | Type de changement |
|---|---|
| `frontend/index.html` | Changer URL API → Django |
| `frontend/admin/` | SUPPRIMER le dossier entier |
| `backend/server.js` | Retirer routes admin |

---

## 8. Points d'attention et risques

### Risque 1 — Compatibilité du format de réponse
Le JavaScript du site web est écrit pour un format de données précis. Si le
`SiteProductSerializer` ne retourne pas exactement le même format, des bugs
d'affichage peuvent apparaître (images manquantes, filtres cassés, etc.).

**Mitigation :** Tester le site en local avec le nouveau backend avant de déployer.
Comparer la réponse de l'ancienne API Express avec la nouvelle API Django.

### Risque 2 — Performance du site vitrine
L'API Django est sur Render (plan gratuit = cold start possible de ~30s). Si le site
appelle Django et que le serveur est en veille, la vitrine sera lente au premier chargement.

**Mitigation :** Render plan payant, ou implémenter un cache (Redis / CDN Vercel).
Pour l'instant, documenter ce comportement pour les utilisateurs.

### Risque 3 — Images des 94 produits migrés
Les images des produits existants sont sur Cloudinary (dossier `softcosy/`) et sur ibb.co.
La migration crée des `ProductImage` avec ces URLs. Elles seront affichées sur le site.
Si ibb.co est lent ou indisponible, les images ne s'affichent pas.

**Mitigation :** Après migration, ré-uploader les images ibb.co vers Cloudinary depuis
l'app de gestion. Les URLs seront mises à jour automatiquement.

### Risque 4 — Double base de données pendant la transition
Pendant les étapes 1-6, il y a deux sources de données pour les produits (Express et Django).
Le site web pointe toujours sur Express. Il faut terminer toutes les étapes avant de switcher.

**Mitigation :** Ne pas faire le switch (étape 7) tant que toutes les données ne sont pas
migrées et vérifiées.

---

## 9. Résultat final attendu

Une fois toutes les étapes terminées :

```
┌─ SITE VITRINE (Vercel) ────────────────────────────────┐
│  URL : https://siteweb-softcosy.vercel.app             │
│  Frontend : HTML/CSS/JS inchangé (même design)         │
│  Admin : SUPPRIMÉ                                      │
│  Data source : Django API (Render)                     │
└────────────────────────────────────────────────────────┘
                           │
                    appelle Django
                           │
                           ▼
┌─ BACKEND DJANGO (Render) ──────────────────────────────┐
│  URL : https://softcosy-backend.onrender.com           │
│  /api/products/ (app gestion, auth requise)            │
│  /api/site/products/ (vitrine, public)                 │
│  /api/products/upload-image/ (upload Cloudinary)       │
└────────────────────────────────────────────────────────┘
         ▲                         │
         │                    Cloudinary
         │                  (1 seul compte)
         │
┌─ APP GESTION (Vercel) ─────────────────────────────────┐
│  URL : https://soft-cosy.vercel.app                    │
│  Gère : produits (avec galerie), variants, stock,      │
│         ventes, achats, inventaires, utilisateurs      │
│  Publie automatiquement sur le site                    │
└────────────────────────────────────────────────────────┘
```

**En pratique pour l'utilisateur :**
1. Tu vas dans l'app SoftCosy → Produits → Créer un produit
2. Tu remplis nom, catégorie, marque, badge, et tu uploades **plusieurs photos**
3. Tu cliques "Créer" → Le produit est créé dans la base
4. Quelques secondes plus tard, le produit **apparaît sur le site vitrine**
5. Plus jamais besoin d'aller dans l'admin du site web (qui n'existe plus)

---

*Document rédigé le 2026-06-12 — À mettre à jour si des décisions changent en cours d'implémentation.*

---

## 10. Journal d'implémentation — Actions réalisées (session du 2026-06-18)

> Cette section documente ce qui a été **effectivement réalisé** lors de la session d'implémentation, avec les détails techniques, les problèmes rencontrés et les solutions appliquées.

---

### 10.1 Étape 1 — Extension du modèle Django (TERMINÉE)

**Fichier modifié :** `Backend/product/models.py`

Nouveaux champs ajoutés sur le modèle `Product` :

```python
brand        = models.CharField(max_length=100, blank=True, default='')
badge        = models.CharField(max_length=20, null=True, blank=True,
                   choices=[('NEW','NEW'),('BESTSELLER','BESTSELLER'),
                            ('HOT','HOT'),('SET','SET'),('CLASSIC','CLASSIC')])
icon         = models.CharField(max_length=10, blank=True, default='👕')
fabric       = models.TextField(blank=True, default='')
colors       = models.JSONField(default=list)
is_published = models.BooleanField(default=True)
```

Nouveau modèle `ProductImage` créé dans la même app `product` :

```python
class ProductImage(models.Model):
    product               = models.ForeignKey(Product, related_name='product_images',
                                on_delete=models.CASCADE)
    image_url             = models.CharField(max_length=500)
    cloudinary_public_id  = models.CharField(max_length=255, blank=True, default='')
    order                 = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']
```

**Migration appliquée :**
`Backend/product/migrations/0005_ajout_champs_site_et_model_productimage.py`

Les champs existants `image` et `image_url` sur `Product` ont été **conservés** pour la compatibilité descendante. Le nouveau modèle `ProductImage` est la référence principale pour les images.

---

### 10.2 Étape 2 — Sérialiseurs et vues API publics (TERMINÉE)

**Fichier modifié :** `Backend/product/serializers.py`

Deux nouveaux sérialiseurs créés :

- **`ProductImageSerializer`** : sérialise les champs `image_url`, `cloudinary_public_id`, `order`
- **`SiteProductSerializer`** : transforme un `Product` Django au format attendu par le JavaScript du site vitrine :

```python
# Format retourné par SiteProductSerializer
{
  "id": 1,
  "sku": "PROD-00001",      # <- code_produit
  "name": "Nike Air Force",
  "brand": "Nike",
  "category": ["Hauts"],    # <- nom de la catégorie comme tableau
  "price": 15000,           # <- selling_price de la première variante active
  "sizes": ["S", "M", "L"], # <- tailles de toutes les variantes actives
  "colors": ["#111111"],
  "fabric": "100% Polyester",
  "description": "...",
  "images": ["https://res.cloudinary.com/..."],  # <- URLs de ProductImage (triées par order)
  "icon": "👕",
  "badge": "NEW",
  "is_published": true
}
```

**Fichier modifié :** `Backend/product/views.py`

Nouvelles vues ajoutées :

- **`SiteProductViewSet`** : ViewSet en lecture seule (list + retrieve), accès public (pas d'authentification), filtre automatiquement `is_published=True`, supporte `FlexiblePagination` avec paramètre `page_size`
- **`upload_image`** : endpoint `POST /api/products/upload-image/` — reçoit un fichier via `multipart/form-data`, l'uploade sur Cloudinary dans le dossier `products/images/`, retourne `{"url": "...", "public_id": "..."}`
- **`delete_image`** : endpoint `DELETE /api/products/delete-image/` — supprime une image Cloudinary via son `public_id`

**Fichier modifié :** `Backend/gestion_softcosy/urls.py`

Nouvelles routes enregistrées :
```
GET  /api/site/products/       -> SiteProductViewSet (liste publique paginée)
GET  /api/site/products/{id}/  -> SiteProductViewSet (détail produit)
POST /api/products/upload-image/   -> upload_image (auth requise)
DELETE /api/products/delete-image/ -> delete_image (auth requise)
```

---

### 10.3 Étape 3 — Mise à jour CORS (TERMINÉE)

**Fichier modifié :** `Backend/gestion_softcosy/settings.py`

Ajout dans `CORS_ALLOWED_ORIGINS` :
```python
'https://siteweb-softcosy.vercel.app',  # <- site vitrine sur Vercel
'http://localhost:3001',                 # <- site vitrine en développement local
```

---

### 10.4 Étape 4 — Formulaire produit React (TERMINÉE)

**Fichier réécrit :** `Frontend/src/components/add-product-modal.tsx`

Le formulaire a été **entièrement réécrit** pour supporter les nouvelles fonctionnalités.

#### Nouvelles interfaces TypeScript

```typescript
interface GalleryImage {
  tempId?:                string   // identifiant temporaire pendant l'upload
  image_url:              string   // URL finale Cloudinary OU blob:// pendant l'upload
  cloudinary_public_id:   string
  order:                  number
  uploading?:             boolean  // true pendant l'upload en cours
  error?:                 boolean  // true si l'upload a échoué
}
```

L'interface `Product` a été étendue avec : `brand`, `badge`, `icon`, `fabric`, `is_published`, `colors` (string[]), `product_images` (GalleryImage[]).

#### Constantes ajoutées

```typescript
const BADGE_CHOICES = ['', 'NEW', 'BESTSELLER', 'HOT', 'SET', 'CLASSIC']
const PRESET_COLORS = [/* 20 couleurs hex prédéfinies */]
```

#### Flux d'upload galerie (avec suivi par tempId)

Lorsque l'utilisateur sélectionne des images, la logique suivante s'exécute :

1. Création immédiate d'un placeholder `blob://` pour l'aperçu visuel instantané
2. Chaque placeholder a un `tempId` unique (`temp_${Date.now()}_${idx}`)
3. L'upload vers Cloudinary se fait en arrière-plan via `POST /api/products/upload-image/`
4. A la réussite, le `tempId` est utilisé pour retrouver le placeholder dans l'état et le remplacer par l'URL Cloudinary définitive
5. La `blob://` URL est révoquée via `URL.revokeObjectURL()` pour libérer la mémoire

```typescript
// Suivi par tempId -- évite les conditions de course
setGalleryImages((prev) => {
  const idx = prev.findIndex((img) => img.tempId === tempId)
  URL.revokeObjectURL(prev[idx].image_url)
  const updated = [...prev]
  updated[idx] = {
    image_url: result.url,
    cloudinary_public_id: result.public_id,
    order: updated[idx].order,
    uploading: false,
  }
  return updated
})
```

#### Gestion des couleurs

- Palette de 20 couleurs prédéfinies cliquables
- Champ saisie libre pour couleur hex personnalisée
- Validation : format `#RRGGBB` requis
- Affichage en pastilles colorées avec bouton suppression

#### Sections du formulaire (4 au total)

1. **Informations Générales** : nom, code produit (auto), catégorie, marque, badge, icône emoji, composition, publié sur site
2. **Couleurs** : palette prédéfinie + saisie hex personnalisée
3. **Galerie d'images** : upload multiple, grille avec contrôles hover (fleche gauche, corbeille, fleche droite), badge "Principal" sur la première image
4. **Variantes** : SKU auto, taille, prix vente, stock

#### Soumission du formulaire

Le `FormData` envoyé inclut maintenant :
- `is_published` : `"true"` ou `"false"`
- `colors` : tableau JSON sérialisé (`JSON.stringify(colors)`)
- `product_images_data` : tableau JSON des images galerie (`JSON.stringify(galleryImages.map(...))`)

Le bouton de soumission est **désactivé** pendant qu'un upload est en cours (`isUploading` = au moins une image a `uploading: true`).

**Fichier modifié :** `Frontend/src/app/dashboard/products/page.tsx`

- Interface `APIProduct` étendue avec les nouveaux champs
- Fonction `getImageUrl()` vérifie `product.product_images[0]?.image_url` en premier, puis `product.image_url` en fallback

**Compilation TypeScript vérifiée :**
```
npx tsc --noEmit  ->  Aucune erreur
```

---

### 10.5 Étape 5 — Commande de migration des données (TERMINÉE)

**Fichiers créés :**
- `Backend/product/management/__init__.py` (vide)
- `Backend/product/management/commands/__init__.py` (vide)
- `Backend/product/management/commands/migrate_site_products.py`

#### Logique de la commande

La commande appelle l'API publique Express (`GET https://siteweb-softcosy.vercel.app/api/products`), récupère les produits en JSON, puis pour chaque produit :

1. **Mapping catégorie** : Express stockait la catégorie ET la marque dans le même tableau JSONB (ex. `["tops", "nike"]`). La commande filtre les slugs de marques (`nike`, `adidas`, `ua`, etc.) et mappe le reste vers les noms français (`tops->Hauts`, `pants->Pantalons`, `sets->Ensembles`)

2. **Création des objets Django** :
   - `Category.objects.get_or_create()` insensible à la casse
   - `Product.objects.create()` avec tous les champs mappés
   - `ProductImage.objects.create()` pour chaque URL du tableau `images`
   - `Variant.objects.create()` pour chaque taille dans `sizes` (ou `Unique` si aucune taille)

3. **Déduplication** : si un produit avec le même `code_produit`/`sku` existe déjà, il est ignoré (sauf avec `--force-update`)

#### Arguments disponibles

```
python manage.py migrate_site_products
python manage.py migrate_site_products --dry-run          # aperçu sans écriture
python manage.py migrate_site_products --force-update     # réimporter même si déjà présent
python manage.py migrate_site_products --url https://...  # URL personnalisée
```

#### Résultat de l'exécution (2026-06-18)

```
=== Migration des produits Express -> Django ===
Recuperation depuis : https://siteweb-softcosy.vercel.app/api/products
-> 20 produit(s) recupere(s)
  OK Cree    : Complet pour les equipes.           | Ensembles    | 5 img | 3 variante(s)
  OK Cree    : T-shirt avec manche                 | Hauts        | 5 img | 4 variante(s)
  OK Cree    : Complet habit avec culotte Adidas   | Ensembles    | 1 img | 6 variante(s)
  [... 17 autres produits ...]
  OK Cree    : Chaussure de sport                  | Chaussures   | 4 img | 6 variante(s)

OK 20 produit(s) importe(s)
```

**Bilan de la migration :**
- 20 produits importés (sur les 20 disponibles dans l'API Express)
- 59 images `ProductImage` créées
- 146 variantes `Variant` créées
- 6 catégories Django créées : Hauts, Pantalons, Ensembles, Shorts, Serviettes, Chaussures

**Problème rencontré — encodage Windows :**
PowerShell sur Windows utilise l'encodage `cp1252` qui ne supporte pas les caractères Unicode
dans les appels `self.stdout.write()`. Toutes les chaînes de sortie ont été réécrites en ASCII pur :

| Caractère original | Remplacement |
|---|---|
| `→` | `->` |
| `✓ Créé` | `OK Cree` |
| `⊘ Ignoré` | `-- Ignore` |
| `✗` | `!!` |
| `—` | `--` |

---

### 10.6 Étape 6 — Mise à jour du site vitrine (TERMINÉE)

**Fichier modifié :** `d:\TOUT LES PROJETS\site_softcosy\frontend\index.html`

#### Changement principal — URL de l'API

L'URL de l'API a été extraite dans une constante pour faciliter le passage
développement/production :

```javascript
// DÉVELOPPEMENT LOCAL : utilise le Django local sur port 8000
// PRODUCTION : utiliser 'https://softcosy-backend.onrender.com/api/site/products/?page_size=100'
const API_PRODUITS_URL = 'http://localhost:8000/api/site/products/?page_size=100';
```

> **IMPORTANT avant le déploiement :** Remettre l'URL de production avant de pousser sur GitHub.

#### Adaptation au format paginé de Django

L'ancienne API Express retournait un **tableau plat** `[...]`.
La nouvelle API Django retourne un **objet paginé** `{ count, next, previous, results: [...] }`.

```javascript
// AVANT
const rawProducts = await res.json();  // tableau direct

// APRÈS
const data = await res.json();
const rawProducts = Array.isArray(data) ? data : (data.results || []);
```

#### Correction de la logique de filtrage

Sur le site Express, les **marques** étaient stockées dans le tableau `category` aux côtés des
catégories (ex. `["tops", "nike"]`). Après migration vers Django, `brand` est un champ séparé.
La fonction `renderProducts()` a été mise à jour pour vérifier les deux :

```javascript
// AVANT — cherchait uniquement dans category[]
products.filter(p => p.category.some(c => c.toLowerCase().includes(filter)))

// APRÈS — vérifie category[] ET brand
products.filter(p => {
  if (p.category && p.category.some(c => c.toLowerCase().includes(filter.toLowerCase()))) return true;
  if (p.brand && p.brand.toLowerCase().includes(filter.toLowerCase())) return true;
  return false;
});
```

#### Mise à jour des libellés des boutons de filtre

| Ancien libellé | Nouveau libellé | Filtre |
|---|---|---|
| `data-filter="tops"` | `data-filter="hauts"` | Hauts |
| `data-filter="pants"` | `data-filter="pantalons"` | Pantalons |
| `data-filter="sets"` | `data-filter="ensembles"` | Ensembles |
| `data-filter="ua"` | `data-filter="under armour"` | Marque Under Armour |

---

### 10.7 Architecture de l'upload d'images (Cloudinary)

#### Flux complet d'ajout d'une image depuis l'app de gestion

```
Utilisateur sélectionne un fichier dans le navigateur
              |
              v (immédiat)
Aperçu blob:// affiché dans la galerie (tempId = "temp_...")
              |
              v (asynchrone, en arrière-plan)
POST /api/products/upload-image/     <- React (avec token JWT)
              |
              v
Django reçoit le fichier (multipart/form-data)
              |
              v
cloudinary.uploader.upload(file, folder='products/images/')
              |
              v
Cloudinary retourne {"url": "https://res.cloudinary.com/...", "public_id": "..."}
              |
              v
Django retourne le JSON au React
              |
              v
React remplace le blob:// par l'URL Cloudinary définitive
(retrouvé par tempId pour éviter les conditions de course)
              |
              v
A la soumission du formulaire :
POST /api/products/  avec product_images_data: JSON.stringify([...])
              |
              v
Django crée les entrées ProductImage en base de données
```

#### Suppression d'une image

```
Utilisateur clique "Supprimer" sur une miniature
              |
              v
Si cloudinary_public_id présent :
  DELETE /api/products/delete-image/  {public_id: "..."}
              |
              v
  Django appelle cloudinary.uploader.destroy(public_id)
              |
              v
React retire l'image de galleryImages[]
URL.revokeObjectURL() si c'était encore un blob://
```

---

### 10.8 Configuration du test local (3 composants simultanés)

Pour tester l'intégration complète en local, les 3 composants doivent tourner simultanément :

| Composant | Port | Commande de démarrage |
|---|---|---|
| Backend Django | 8000 | `cd Backend; .\venv\Scripts\python.exe manage.py runserver` |
| Frontend React (app gestion) | 3000 | `cd Frontend; npm run dev` |
| Site vitrine (Express) | 3001 | depuis `d:\TOUT LES PROJETS\site_softcosy` : `$env:PORT="3001"; node backend/server.js` |

**Point important :** Le site vitrine (`site_softcosy/`) est du **HTML/CSS/JS vanilla**, pas un
projet Node.js. Il n'a pas de `package.json` dans le dossier `frontend/`. Pour le démarrer, il
faut utiliser `node backend/server.js` depuis le répertoire `site_softcosy/` — et non `npm run dev`.
L'Express sert uniquement les fichiers statiques ; il n'a plus de rôle API pour les produits.

---

### 10.9 Problème identifié — CLOUDINARY_API_SECRET sur Render

**Problème :** La clé `CLOUDINARY_API_SECRET` configurée dans les variables d'environnement
Render ne correspond pas à l'API Key (`693317933183869`). Cela provoque une erreur 401
lorsque le backend en production essaie d'uploader sur Cloudinary.

**Solution manuelle requise (action de l'utilisateur) :**
1. Aller sur cloudinary.com -> Settings -> Access Keys
2. Trouver l'API Key `693317933183869`
3. Copier l'API Secret correspondant
4. Aller sur Render -> Service `softcosy-backend` -> Environment
5. Mettre à jour la variable `CLOUDINARY_API_SECRET` avec la valeur correcte
6. Render redéploie automatiquement

---

### 10.10 État des fichiers modifiés

#### Fichiers modifiés dans le dépôt SoftCosy

| Fichier | Changements |
|---|---|
| `Backend/gestion_softcosy/settings.py` | CORS étendu (`localhost:3001`, `siteweb-softcosy.vercel.app`) |
| `Backend/gestion_softcosy/urls.py` | Nouvelles routes `/api/site/` et `/api/products/upload-image/` |
| `Backend/product/models.py` | Nouveaux champs `Product` + nouveau modèle `ProductImage` |
| `Backend/product/serializers.py` | `ProductImageSerializer` + `SiteProductSerializer` |
| `Backend/product/views.py` | `SiteProductViewSet` + `upload_image` + `delete_image` |
| `Frontend/src/app/dashboard/products/page.tsx` | Interface étendue + `getImageUrl()` mis à jour |
| `Frontend/src/components/add-product-modal.tsx` | Réécriture complète (galerie, couleurs, nouveaux champs) |

#### Fichiers nouveaux dans le dépôt SoftCosy

| Fichier | Description |
|---|---|
| `Backend/product/management/__init__.py` | Vide (requis par Python) |
| `Backend/product/management/commands/__init__.py` | Vide (requis par Python) |
| `Backend/product/management/commands/migrate_site_products.py` | Commande de migration |
| `Backend/product/migrations/0005_ajout_champs_site_et_model_productimage.py` | Migration Django |
| `PLAN_FUSION_SITEWEB.md` | Ce fichier de documentation |
| `SoftCosy.code-workspace` | Fichier workspace VS Code |

#### Fichier modifié hors du dépôt SoftCosy

| Fichier | Changements |
|---|---|
| `d:\TOUT LES PROJETS\site_softcosy\frontend\index.html` | `API_PRODUITS_URL` (temporairement localhost), filtres mis à jour |

---

### 10.11 Ce qui reste à faire avant le déploiement en production

#### 1. Remettre l'URL de production dans index.html (OBLIGATOIRE)

Dans `site_softcosy/frontend/index.html` :

```javascript
// Changer :
const API_PRODUITS_URL = 'http://localhost:8000/api/site/products/?page_size=100';

// Par :
const API_PRODUITS_URL = 'https://softcosy-backend.onrender.com/api/site/products/?page_size=100';
```

#### 2. Étape 7 — Supprimer l'admin du site vitrine

Fichiers à supprimer dans `site_softcosy/frontend/` :
```
admin/index.html
admin/admin.js
admin/admin.css
```

Dans `site_softcosy/backend/server.js`, supprimer les routes admin.

#### 3. Corriger CLOUDINARY_API_SECRET sur Render

Voir section 10.9 ci-dessus.

#### 4. Déployer sur GitHub

Pour le dépôt SoftCosy :
```
git add Backend/product/models.py Backend/product/serializers.py Backend/product/views.py
git add Backend/gestion_softcosy/settings.py Backend/gestion_softcosy/urls.py
git add Backend/product/migrations/0005_ajout_champs_site_et_model_productimage.py
git add Backend/product/management/
git add Frontend/src/components/add-product-modal.tsx
git add Frontend/src/app/dashboard/products/page.tsx
git add PLAN_FUSION_SITEWEB.md
git commit -m "feat: fusion site vitrine - Django devient source unique de vérité"
git push origin master
```

Pour le dépôt site_softcosy (après avoir remis l'URL production) :
```
git add frontend/index.html
git commit -m "feat: passer l'API produits de Express vers Django"
git push
```

#### 5. Vérifications post-déploiement

- [ ] `https://softcosy-backend.onrender.com/api/site/products/` retourne les 20 produits
- [ ] `https://siteweb-softcosy.vercel.app` affiche les produits depuis Django
- [ ] Les filtres par catégorie et par marque fonctionnent sur le site vitrine
- [ ] L'upload d'une image dans l'app de gestion fonctionne (test Cloudinary)
- [ ] Un nouveau produit créé dans l'app apparaît sur le site vitrine

---

*Section 10 ajoutée le 2026-06-18 — Documente la session d'implémentation complète.*
