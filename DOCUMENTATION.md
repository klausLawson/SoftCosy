# SoftCosy — Documentation Technique Complète

> Système de gestion commerciale (POS, stocks, achats, inventaires, rapports)
> Version : 1.0 — Dernière mise à jour : Juin 2026

---

## Table des matières

1. [Vue d'ensemble](#1-vue-densemble)
2. [Architecture générale](#2-architecture-générale)
3. [Backend — Django](#3-backend--django)
   - 3.1 [Stack et dépendances](#31-stack-et-dépendances)
   - 3.2 [Structure des applications](#32-structure-des-applications)
   - 3.3 [Modèles de données (Base de données)](#33-modèles-de-données-base-de-données)
   - 3.4 [API REST — Endpoints](#34-api-rest--endpoints)
   - 3.5 [Authentification et sécurité](#35-authentification-et-sécurité)
   - 3.6 [Système de signaux (Signals)](#36-système-de-signaux-signals)
   - 3.7 [Stockage des médias](#37-stockage-des-médias)
   - 3.8 [Commandes de gestion](#38-commandes-de-gestion)
   - 3.9 [Variables d'environnement Backend](#39-variables-denvironnement-backend)
4. [Frontend — Next.js](#4-frontend--nextjs)
   - 4.1 [Stack et dépendances](#41-stack-et-dépendances)
   - 4.2 [Structure des pages](#42-structure-des-pages)
   - 4.3 [Authentification côté frontend](#43-authentification-côté-frontend)
   - 4.4 [Communication avec l'API](#44-communication-avec-lapi)
   - 4.5 [Composants principaux](#45-composants-principaux)
   - 4.6 [Thème et styles](#46-thème-et-styles)
   - 4.7 [Variables d'environnement Frontend](#47-variables-denvironnement-frontend)
5. [Base de données — PostgreSQL / Supabase](#5-base-de-données--postgresql--supabase)
   - 5.1 [Schéma des tables](#51-schéma-des-tables)
   - 5.2 [Relations entre tables](#52-relations-entre-tables)
6. [Stockage des images — Supabase Storage](#6-stockage-des-images--supabase-storage)
7. [Fonctionnalités détaillées](#7-fonctionnalités-détaillées)
   - 7.1 [Tableau de bord (Dashboard)](#71-tableau-de-bord-dashboard)
   - 7.2 [Gestion des produits](#72-gestion-des-produits)
   - 7.3 [Gestion des stocks](#73-gestion-des-stocks)
   - 7.4 [Caisse (POS)](#74-caisse-pos)
   - 7.5 [Ventes](#75-ventes)
   - 7.6 [Achats fournisseurs](#76-achats-fournisseurs)
   - 7.7 [Inventaires physiques](#77-inventaires-physiques)
   - 7.8 [Gestion des fournisseurs](#78-gestion-des-fournisseurs)
   - 7.9 [Gestion des utilisateurs](#79-gestion-des-utilisateurs)
   - 7.10 [Rapports](#710-rapports)
   - 7.11 [Paramètres système](#711-paramètres-système)
   - 7.12 [Notifications stock bas](#712-notifications-stock-bas)
8. [Déploiement sur Render](#8-déploiement-sur-render)
   - 8.1 [Configuration render.yaml](#81-configuration-renderyaml)
   - 8.2 [Variables d'environnement à configurer sur Render](#82-variables-denvironnement-à-configurer-sur-render)
   - 8.3 [Processus de build](#83-processus-de-build)
9. [Rôles et permissions](#9-rôles-et-permissions)
10. [Flux de travail principaux](#10-flux-de-travail-principaux)
11. [Sécurité](#11-sécurité)
12. [Maintenance et opérations](#12-maintenance-et-opérations)
13. [Guide de développement local](#13-guide-de-développement-local)

---

## 1. Vue d'ensemble

**SoftCosy** est une application web de gestion commerciale complète, destinée aux petites et moyennes entreprises de vente au détail. Elle couvre l'ensemble du cycle de vie commercial :

- Caisse (POS) pour les ventes en magasin
- Gestion du catalogue produits et variantes
- Suivi des stocks en temps réel avec alertes automatiques
- Gestion des achats fournisseurs
- Inventaires physiques
- Rapports et analytics
- Gestion des utilisateurs avec rôles

**Application en production** :
- Frontend : `https://softcosy-frontend.onrender.com`
- Backend API : `https://softcosy-backend.onrender.com/api`
- Documentation API : `https://softcosy-backend.onrender.com/api/docs/`

**Créé par** : [Virkas](https://wa.me/+22893953658)

---

## 2. Architecture générale

```
┌─────────────────────────────────────────────────────────┐
│                    UTILISATEUR (Browser)                 │
└─────────────────────┬───────────────────────────────────┘
                      │ HTTPS
┌─────────────────────▼───────────────────────────────────┐
│           FRONTEND — Next.js 16 (Render.com)             │
│   React 19 · TypeScript · Tailwind CSS · React Query     │
│              softcosy-frontend.onrender.com              │
└─────────────────────┬───────────────────────────────────┘
                      │ REST API (JSON)
                      │ Authorization: Token xxx
┌─────────────────────▼───────────────────────────────────┐
│           BACKEND — Django 6 (Render.com)                │
│    DRF · Gunicorn · WhiteNoise · django-axes · boto3     │
│             softcosy-backend.onrender.com                │
└──────────┬──────────────────────┬───────────────────────┘
           │ PostgreSQL SSL        │ S3 API
┌──────────▼──────────┐  ┌────────▼────────────────────────┐
│  Supabase Database  │  │  Supabase Storage (S3-compat.)   │
│  PostgreSQL 15      │  │  Bucket: media                   │
│  (hébergé Supabase) │  │  (images produits, utilisateurs) │
└─────────────────────┘  └─────────────────────────────────┘
```

---

## 3. Backend — Django

### 3.1 Stack et dépendances

| Package | Version | Rôle |
|---------|---------|------|
| **Django** | 6.0.2 | Framework web principal |
| **djangorestframework** | 3.16.1 | API REST |
| **drf-spectacular** | 0.29.0 | Documentation API (Swagger/ReDoc) |
| **django-cors-headers** | 4.9.0 | Gestion des headers CORS |
| **django-axes** | 8.3.1 | Protection brute-force (lockout) |
| **django-filter** | latest | Filtres avancés sur les ViewSets |
| **psycopg2-binary** | 2.9.11 | Driver PostgreSQL |
| **Pillow** | 12.2.0 | Traitement des images |
| **argon2-cffi** | 23.1.0 | Hachage des mots de passe (Argon2) |
| **gunicorn** | latest | Serveur WSGI en production |
| **whitenoise** | latest | Serveur de fichiers statiques |
| **django-storages[s3]** | latest | Stockage S3 (Supabase) |
| **boto3** | latest | Client AWS/S3 |
| **reportlab** | 4.2.5 | Génération de PDFs |
| **google-api-python-client** | 2.162.0 | API Google Drive (backups) |
| **python-dotenv** | 1.0.1 | Chargement du fichier `.env` |
| **APScheduler** | 3.11.2 | Planification de tâches |

### 3.2 Structure des applications

Le projet Django contient **7 applications** :

```
Backend/
├── gestion_softcosy/        # Projet principal (settings, urls, wsgi)
│   ├── settings.py          # Configuration globale
│   ├── urls.py              # URLs racines
│   ├── pagination.py        # FlexiblePagination (défaut 20, max 100)
│   └── utils.py             # axes_lockout_json (réponse 403 JSON)
├── user/                    # Gestion des utilisateurs
├── product/                 # Catalogue produits et catégories
├── sale/                    # Ventes et clients
├── purchase/                # Achats et fournisseurs
├── stockmouvement/          # Stocks, mouvements, paramètres système
├── inventorycount/          # Inventaires physiques
└── dashboard/               # Analytics et rapports
```

**Middleware actif (dans l'ordre d'exécution)** :

1. `corsheaders.CorsMiddleware` — Headers CORS (doit être en premier)
2. `axes.AxesMiddleware` — Protection brute-force
3. `SecurityMiddleware` — Headers de sécurité HTTP
4. `whitenoise.WhiteNoiseMiddleware` — Fichiers statiques compressés
5. `SessionMiddleware` — Gestion des sessions
6. `CommonMiddleware` — Utilitaires HTTP standard
7. `CsrfViewMiddleware` — Protection CSRF
8. `AuthenticationMiddleware` — Injection de `request.user`
9. `MessageMiddleware` — Flash messages
10. `XFrameOptionsMiddleware` — Protection clickjacking
11. `DebugToolbarMiddleware` — *(uniquement si `DEBUG=True`)*

### 3.3 Modèles de données (Base de données)

#### Table `user` (application `user`)

| Champ | Type | Description |
|-------|------|-------------|
| `id` | AutoField PK | Identifiant |
| `email` | EmailField UNIQUE | **Identifiant principal** (pas le username) |
| `username` | CharField UNIQUE nullable | Optionnel |
| `full_name` | CharField(50) | Nom complet |
| `phone` | IntegerField nullable | Téléphone |
| `address` | TextField nullable | Adresse |
| `role` | CharField | `ADMIN` \| `SELLER` \| `MANAGER` |
| `is_active` | BooleanField | `False` par défaut — l'admin doit activer |
| `is_staff` | BooleanField | Accès à l'admin Django |
| `is_superuser` | BooleanField | Super-administrateur |
| `image` | ImageField nullable | Photo de profil (stockée S3 ou local) |
| `image_url` | URLField nullable | URL externe de la photo |
| `created_at` | DateField auto | Date de création |

#### Table `category` (application `product`)

| Champ | Type | Description |
|-------|------|-------------|
| `id` | AutoField PK | Identifiant |
| `name` | CharField(255) | Nom de la catégorie |
| `description` | TextField nullable | Description |
| `image_url` | CharField nullable | URL de l'image |
| `created_at` | DateTimeField auto | Date de création |

#### Table `product` (application `product`)

| Champ | Type | Description |
|-------|------|-------------|
| `id` | AutoField PK | Identifiant |
| `name` | CharField(255) | Nom du produit |
| `description` | TextField nullable | Description |
| `code_produit` | CharField | Code auto-généré : `PROD-00001` |
| `image` | ImageField nullable | Image principale (S3 ou local) |
| `image_url` | CharField nullable | URL externe de l'image |
| `category` | FK → Category | Catégorie (SET_NULL si supprimée) |

#### Table `variant` (application `product`)

| Champ | Type | Description |
|-------|------|-------------|
| `id` | AutoField PK | Identifiant |
| `product` | FK → Product | Produit parent (CASCADE) |
| `sku` | CharField | Code auto-généré : `SKU-00001` |
| `barcode` | CharField nullable | Code-barres |
| `model` | CharField nullable | Modèle/référence |
| `size` | CharField nullable | Taille/pointure |
| `selling_price` | DecimalField(10,2) | Prix de vente |
| `cost_price` | DecimalField nullable | Prix de revient |
| `attributes` | JSONField nullable | Attributs libres (couleur, spec, etc.) |
| `is_active` | BooleanField | Actif/inactif |
| `created_or_updated_at` | DateField auto | Date MAJ |

#### Table `stock` (application `stockmouvement`)

| Champ | Type | Description |
|-------|------|-------------|
| `id` | AutoField PK | Identifiant |
| `variant` | FK → Variant | Variante concernée (CASCADE) |
| `on_hand_qty` | IntegerField | Quantité physique en stock |
| `reserved_qty` | IntegerField | Quantité réservée pour commandes |
| `available_qty` | IntegerField | Calculé : `on_hand_qty - reserved_qty` |
| `last_counted_at` | DateField nullable | Dernier inventaire |
| `created_or_updated_at` | DateTimeField auto | Date MAJ |

> **Note** : Un enregistrement Stock est créé automatiquement (via signal) quand une variante est créée.

#### Table `stockmovement` (application `stockmouvement`)

| Champ | Type | Description |
|-------|------|-------------|
| `id` | AutoField PK | Identifiant |
| `stock` | FK → Stock nullable | Stock concerné |
| `product` | FK → Product nullable | Produit (SET_NULL) |
| `sale_line` | FK → SaleLine nullable | Lien vers la ligne de vente (SET_NULL) |
| `purchase_line` | FK → PurchaseLine nullable | Lien vers la ligne d'achat (SET_NULL) |
| `user` | FK → User nullable | Utilisateur responsable (SET_NULL) |
| `movement_type` | CharField | `ENTREE` \| `SORTIE` \| `AJUSTEMENT` |
| `quantite` | IntegerField | Quantité déplacée |
| `reason` | CharField | Motif (voir liste complète ci-dessous) |
| `date` | DateField auto | Date du mouvement |
| `notes` | TextField nullable | Notes libres |

**Motifs disponibles** :
- `ACHAT_FOURNISSEUR` — Réception achat
- `RETOUR_TEST` — Retour test
- `CORRECTION_INVENTAIRE` — Correction après inventaire
- `CADEAU_PROMO` — Cadeau/promotion
- `VENTE` — Vente en caisse (automatique)
- `SORTIE_MAGASIN` — Sortie physique
- `CASSE_PERTE` — Casse ou perte
- `ECHANTILLON` — Échantillon
- `INVENTAIRE_ANNUEL` — Inventaire annuel
- `CORRECTION_MANUELLE` — Correction manuelle
- `PEREMPTION` — Péremption
- `RETOUR_CLIENT` — Retour client (remboursement)
- `REMBOURSEMENT` — Remboursement
- `AUTRE` — Autre motif

#### Table `systemsettings` (application `stockmouvement`)

Singleton — une seule ligne avec `id=1`.

| Champ | Type | Description |
|-------|------|-------------|
| `low_stock_threshold` | IntegerField | Seuil d'alerte stock bas (défaut : 10) |
| `critical_stock_threshold` | IntegerField | Seuil critique (défaut : 5) |
| `notify_low_stock` | BooleanField | Activer alertes stock bas |
| `notify_system_updates` | BooleanField | Alertes mises à jour système |
| `notify_weekly_report` | BooleanField | Rapport hebdomadaire |

#### Table `customer` (application `sale`)

| Champ | Type | Description |
|-------|------|-------------|
| `id` | AutoField PK | Identifiant |
| `name` | CharField(255) | Nom du client |
| `phone` | CharField nullable | Téléphone |
| `address` | CharField nullable | Adresse |
| `created_at` | DateField nullable | Date création |

#### Table `sale` (application `sale`)

| Champ | Type | Description |
|-------|------|-------------|
| `id` | AutoField PK | Identifiant |
| `invoice_number` | IntegerField nullable | Numéro de facture séquentiel |
| `user` | FK → User nullable | Vendeur qui a effectué la vente (SET_NULL) |
| `customer` | FK → Customer nullable | Client enregistré (SET_NULL) |
| `customer_name` | CharField nullable | Nom client rapide (sans fiche) |
| `sold_at` | DateTimeField nullable | Horodatage de la vente |
| `channel` | CharField | `store` (magasin) \| `enLigne` (en ligne) |
| `subtotal` | DecimalField | Sous-total calculé |
| `discount_amount` | DecimalField | Remise globale (défaut : 0) |
| `total` | DecimalField | Total : `subtotal - discount_amount` |
| `status` | CharField | `PAYE` \| `NONPAYE` \| `PARTIEL` |
| `notes` | TextField nullable | Notes |
| `created_at` | DateTimeField auto | Date création |

#### Table `saleline` (application `sale`)

| Champ | Type | Description |
|-------|------|-------------|
| `id` | AutoField PK | Identifiant |
| `sale` | FK → Sale | Vente parente (CASCADE) |
| `product` | FK → Product | Produit (PROTECT) |
| `variant` | FK → Variant nullable | Variante choisie (SET_NULL) |
| `quantity` | IntegerField | Quantité vendue |
| `unit_price` | DecimalField | Prix unitaire au moment de la vente |
| `line_discount` | DecimalField | Remise sur la ligne (défaut : 0) |
| `line_total` | DecimalField | `(qty × prix_unit) - remise_ligne` |
| `created_at` | DateTimeField auto | Date création |

> **Signal** : La création d'une SaleLine crée automatiquement un StockMovement SORTIE. La suppression crée un StockMovement ENTREE (retour client).

#### Table `supplier` (application `purchase`)

| Champ | Type | Description |
|-------|------|-------------|
| `id` | AutoField PK | Identifiant |
| `name` | CharField(255) | Nom du fournisseur |
| `phone` | CharField nullable | Téléphone |
| `address` | CharField nullable | Adresse |
| `created_at` | DateField nullable | Date création |

#### Table `purchase` (application `purchase`)

| Champ | Type | Description |
|-------|------|-------------|
| `id` | AutoField PK | Identifiant |
| `reference` | CharField | Référence auto : `CMD-2025-0001` |
| `supplier` | FK → Supplier nullable | Fournisseur (SET_NULL) |
| `sub_total` | DecimalField | Sous-total calculé |
| `purchase_cost` | DecimalField | Coût total d'achat |
| `total` | DecimalField | Total calculé |
| `purchased_at` | DateField nullable | Date de commande |
| `status` | CharField nullable | Statut (`RECU` déclenche l'entrée en stock) |
| `notes` | TextField nullable | Notes |
| `created_at` | DateTimeField auto | Date création |

#### Table `purchaseline` (application `purchase`)

| Champ | Type | Description |
|-------|------|-------------|
| `id` | AutoField PK | Identifiant |
| `purchase` | FK → Purchase | Achat parent (CASCADE) |
| `product` | FK → Product | Produit (PROTECT) |
| `variant` | FK → Variant nullable | Variante (SET_NULL) |
| `quantity` | IntegerField | Quantité commandée |
| `unit_cost` | DecimalField | Prix unitaire d'achat |
| `line_cost` | DecimalField | `qty × unit_cost` |
| `note` | CharField nullable | Note de ligne |
| `created_at` | DateTimeField auto | Date création |

#### Table `inventorycount` (application `inventorycount`)

| Champ | Type | Description |
|-------|------|-------------|
| `id` | AutoField PK | Identifiant |
| `user` | FK → User nullable | Utilisateur responsable (CASCADE) |
| `status` | CharField | `ENCOURS` \| `FINI` |
| `notes` | TextField nullable | Notes |
| `created_at` | DateField auto | Date création |
| `total_variantes` | IntegerField | Nombre de variantes comptées |
| `quantite_comptee` | IntegerField nullable | Total unités comptées |
| `ecart` | IntegerField nullable | Écart : `comptée - attendue` |

#### Table `inventoryline` (application `inventorycount`)

| Champ | Type | Description |
|-------|------|-------------|
| `id` | AutoField PK | Identifiant |
| `inventory_count` | FK → InventoryCount | Inventaire parent (CASCADE) |
| `product` | FK → Product | Produit (PROTECT) |
| `variant` | FK → Variant nullable | Variante (PROTECT) |
| `expected_qty` | IntegerField nullable | Quantité théorique (depuis Stock) |
| `counted_qty` | IntegerField nullable | Quantité comptée physiquement |
| `discrepancy` | CharField nullable | Écart en chaîne de caractères |
| `created_or_updated_at` | DateTimeField auto | Date MAJ |

### 3.4 API REST — Endpoints

**URL de base** : `/api/`  
**Authentification requise** pour tous les endpoints sauf `/api/token/`  
**Header** : `Authorization: Token <votre_token>`

#### Authentification

| Méthode | URL | Description |
|---------|-----|-------------|
| `POST` | `/api/token/` | Connexion — retourne un token |

**Corps de la requête** :
```json
{
  "email": "admin@softcosy.com",
  "password": "votre_mot_de_passe"
}
```
**Réponse** :
```json
{
  "token": "abc123def456...",
  "user_id": 1,
  "email": "admin@softcosy.com"
}
```

#### Utilisateurs

| Méthode | URL | Description | Rôle requis |
|---------|-----|-------------|-------------|
| `GET` | `/api/users/` | Liste tous les utilisateurs | ADMIN |
| `POST` | `/api/users/` | Créer un utilisateur | ADMIN |
| `GET` | `/api/users/{id}/` | Détail d'un utilisateur | ADMIN ou soi-même |
| `PATCH` | `/api/users/{id}/` | Modifier un utilisateur | ADMIN ou soi-même |
| `DELETE` | `/api/users/{id}/` | Supprimer un utilisateur | ADMIN |
| `GET` | `/api/users/me/` | Profil de l'utilisateur connecté | Tous |
| `PATCH` | `/api/users/me/` | Modifier son propre profil | Tous |
| `POST` | `/api/users/change_password/` | Changer son mot de passe | Tous |
| `POST` | `/api/users/{id}/activate/` | Activer un compte | ADMIN |
| `POST` | `/api/users/{id}/deactivate/` | Désactiver un compte | ADMIN |

#### Catégories

| Méthode | URL | Description |
|---------|-----|-------------|
| `GET` | `/api/categories/` | Liste toutes les catégories |
| `POST` | `/api/categories/` | Créer une catégorie |
| `GET` | `/api/categories/{id}/` | Détail d'une catégorie |
| `PATCH` | `/api/categories/{id}/` | Modifier une catégorie |
| `DELETE` | `/api/categories/{id}/` | Supprimer une catégorie |

#### Produits

| Méthode | URL | Description |
|---------|-----|-------------|
| `GET` | `/api/products/` | Liste produits (filtre: `category_id`, search: `name/code/SKU`) |
| `POST` | `/api/products/` | Créer un produit avec variantes |
| `GET` | `/api/products/{id}/` | Détail produit avec variantes |
| `PATCH` | `/api/products/{id}/` | Modifier produit et variantes |
| `DELETE` | `/api/products/{id}/` | Supprimer un produit |

#### Variantes

| Méthode | URL | Description |
|---------|-----|-------------|
| `GET` | `/api/variants/` | Liste variantes (filtre: `product`, `is_active`, `size`) |
| `POST` | `/api/variants/` | Créer une variante |
| `GET` | `/api/variants/{id}/` | Détail d'une variante |
| `PATCH` | `/api/variants/{id}/` | Modifier une variante |
| `DELETE` | `/api/variants/{id}/` | Supprimer une variante |

#### Clients

| Méthode | URL | Description |
|---------|-----|-------------|
| `GET` | `/api/customers/` | Liste des clients |
| `POST` | `/api/customers/` | Créer un client |
| `GET` | `/api/customers/{id}/` | Détail d'un client |
| `PATCH` | `/api/customers/{id}/` | Modifier un client |
| `DELETE` | `/api/customers/{id}/` | Supprimer un client |

#### Ventes

| Méthode | URL | Description |
|---------|-----|-------------|
| `GET` | `/api/sales/` | Liste ventes (search: `invoice_number`, `customer_name`) |
| `POST` | `/api/sales/` | Créer une vente avec lignes |
| `GET` | `/api/sales/{id}/` | Détail d'une vente avec lignes |
| `PATCH` | `/api/sales/{id}/` | Modifier une vente |
| `DELETE` | `/api/sales/{id}/` | Supprimer une vente |

#### Lignes de vente

| Méthode | URL | Description |
|---------|-----|-------------|
| `GET` | `/api/sale-lines/` | Liste lignes (filtre: `sale`, `product`, `variant`) |
| `POST` | `/api/sale-lines/` | Créer une ligne |
| `GET` | `/api/sale-lines/{id}/` | Détail d'une ligne |
| `PATCH` | `/api/sale-lines/{id}/` | Modifier une ligne |
| `DELETE` | `/api/sale-lines/{id}/` | Supprimer une ligne (rembourse le stock) |

#### Fournisseurs

| Méthode | URL | Description |
|---------|-----|-------------|
| `GET` | `/api/suppliers/` | Liste des fournisseurs |
| `POST` | `/api/suppliers/` | Créer un fournisseur |
| `GET` | `/api/suppliers/{id}/` | Détail d'un fournisseur |
| `PATCH` | `/api/suppliers/{id}/` | Modifier un fournisseur |
| `DELETE` | `/api/suppliers/{id}/` | Supprimer un fournisseur |

#### Achats

| Méthode | URL | Description |
|---------|-----|-------------|
| `GET` | `/api/purchases/` | Liste achats (tri: `-id`) |
| `POST` | `/api/purchases/` | Créer un achat avec lignes |
| `GET` | `/api/purchases/{id}/` | Détail d'un achat |
| `PATCH` | `/api/purchases/{id}/` | Modifier (status=`RECU` → entrée stock automatique) |
| `DELETE` | `/api/purchases/{id}/` | Supprimer un achat |

#### Lignes d'achat

| Méthode | URL | Description |
|---------|-----|-------------|
| `GET` | `/api/purchase-lines/` | Liste des lignes d'achat |
| `POST` | `/api/purchase-lines/` | Créer une ligne |
| `GET` | `/api/purchase-lines/{id}/` | Détail d'une ligne |
| `PATCH` | `/api/purchase-lines/{id}/` | Modifier une ligne |
| `DELETE` | `/api/purchase-lines/{id}/` | Supprimer une ligne |

#### Stocks

| Méthode | URL | Description |
|---------|-----|-------------|
| `GET` | `/api/stocks/` | Liste stocks (filtre: `variant`, search: `SKU/nom`) |
| `PATCH` | `/api/stocks/{id}/` | Modifier un stock manuellement |

#### Mouvements de stock

| Méthode | URL | Description |
|---------|-----|-------------|
| `GET` | `/api/stock-movements/` | Liste mouvements (filtre: `movement_type`, `reason`, `stock`, `product`) |
| `POST` | `/api/stock-movements/` | Créer un mouvement manuel |
| `GET` | `/api/stock-movements/{id}/` | Détail d'un mouvement |
| `PATCH` | `/api/stock-movements/{id}/` | Modifier un mouvement |
| `DELETE` | `/api/stock-movements/{id}/` | Supprimer un mouvement |

#### Inventaires physiques

| Méthode | URL | Description |
|---------|-----|-------------|
| `GET` | `/api/inventory-counts/` | Liste des inventaires |
| `POST` | `/api/inventory-counts/` | Démarrer un inventaire |
| `GET` | `/api/inventory-counts/{id}/` | Détail avec lignes |
| `PATCH` | `/api/inventory-counts/{id}/` | Modifier et saisir les comptages |
| `POST` | `/api/inventory-counts/{id}/finish/` | Marquer comme terminé |
| `DELETE` | `/api/inventory-counts/{id}/` | Supprimer un inventaire |

#### Lignes d'inventaire

| Méthode | URL | Description |
|---------|-----|-------------|
| `GET` | `/api/inventory-lines/` | Liste des lignes |
| `POST` | `/api/inventory-lines/` | Créer une ligne |
| `PATCH` | `/api/inventory-lines/{id}/` | Saisir la quantité comptée |
| `DELETE` | `/api/inventory-lines/{id}/` | Supprimer une ligne |

#### Paramètres système

| Méthode | URL | Description |
|---------|-----|-------------|
| `GET` | `/api/settings/current/` | Lire les paramètres actuels |
| `PATCH` | `/api/settings/current/` | Modifier les seuils d'alerte |

#### Dashboard Analytics

| Méthode | URL | Description |
|---------|-----|-------------|
| `GET` | `/api/dashboard/summary/` | Métriques clés (produits, stock, alertes, ventes) |
| `GET` | `/api/dashboard/charts/` | Tendances 6 mois (ventes + entrées) |
| `GET` | `/api/dashboard/categories/` | Répartition par catégorie (camembert) |
| `GET` | `/api/dashboard/product_performance/` | Top 5 produits + taux de rotation |
| `GET` | `/api/dashboard/recent_data/` | Alertes stock bas + derniers mouvements |

#### Documentation API interactive

| URL | Description |
|-----|-------------|
| `/api/docs/` | Swagger UI — tester les endpoints directement |
| `/api/redoc/` | ReDoc — documentation lisible |
| `/api/schema/` | Schéma OpenAPI 3.0 (JSON) |

### 3.5 Authentification et sécurité

**Système d'authentification** :
- Basé sur l'email (pas le username standard Django)
- Classe backend : `user.backends.EmailBackend`
- Token DRF : `rest_framework.authtoken` — token fixe par utilisateur
- Session Django pour l'admin back-office

**Protection brute-force (django-axes)** :
- Verrouillage après **3 tentatives échouées**
- Durée de verrouillage : **5 minutes** (AXES_COOLOFF_TIME = 0.0833)
- Champ d'identification : email
- Réponse 403 en JSON (compatible API)
- Réinitialisation automatique après succès

**Hachage des mots de passe** (par ordre de priorité) :
1. **Argon2** (recommandé 2026, résistant aux GPU)
2. PBKDF2SHA256
3. PBKDF2SHA1
4. BCryptSHA256
5. Scrypt

**Validation des mots de passe** :
- Pas similaire aux attributs utilisateur
- Longueur minimale (défaut Django : 8 caractères)
- Pas dans la liste des mots de passe communs
- Pas 100% numérique

**Rate Limiting** :
- Anonymes : 100 requêtes/jour
- Authentifiés : 1000 requêtes/heure

### 3.6 Système de signaux (Signals)

Les signaux Django permettent des actions automatiques sans modifier le code des ViewSets.

**Fichier** : `Backend/stockmouvement/signals.py`

| Signal | Déclencheur | Action |
|--------|-------------|--------|
| `post_save` sur `Variant` (création) | Nouvelle variante créée | Crée automatiquement un `Stock` avec `on_hand_qty=0` |
| `post_save` sur `SaleLine` (création) | Ligne ajoutée à une vente | Crée un `StockMovement` SORTIE, motif VENTE |
| `pre_delete` sur `SaleLine` | Ligne supprimée (remboursement) | Crée un `StockMovement` ENTREE, motif RETOUR_CLIENT |
| `post_save` sur `StockMovement` (création) | Nouveau mouvement | Met à jour `Stock.on_hand_qty` (+/−) |
| `post_delete` sur `StockMovement` | Mouvement supprimé | Annule l'effet sur `Stock.on_hand_qty` |
| `pre_save` sur `StockMovement` (update) | Mouvement modifié | Mémorise anciens valeurs pour recalcul |
| `post_save` sur `StockMovement` (update) | Mouvement modifié | Annule ancien effet + applique nouvel effet |
| `pre_save` sur `Stock` | Avant sauvegarde Stock | Recalcule `available_qty = on_hand_qty - reserved_qty` |

### 3.7 Stockage des médias

**Développement local** :
```
MEDIA_URL  = '/media/'
MEDIA_ROOT = Backend/media/
```
Les fichiers sont servis directement par Django (`DEBUG=True`).

**Production (Supabase Storage S3)** :  
Activé automatiquement quand les 3 variables d'environnement Supabase sont présentes :
```
SUPABASE_S3_ENDPOINT      = https://[project-id].supabase.co/storage/v1/s3
SUPABASE_ACCESS_KEY_ID    = [votre_access_key]
SUPABASE_SECRET_ACCESS_KEY = [votre_secret_key]
```

Configuration résultante :
```python
DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
AWS_DEFAULT_ACL      = 'public-read'   # Fichiers accessibles publiquement
AWS_QUERYSTRING_AUTH = False           # URLs propres sans signature temporaire
AWS_S3_FILE_OVERWRITE = False          # Garde les anciens fichiers
MEDIA_URL = f"{SUPABASE_S3_ENDPOINT}/{SUPABASE_BUCKET_NAME}/"
```

**Structure des fichiers dans le bucket** :
```
media/
├── users/
│   └── [user_id]/profile.jpg
└── products/
    └── images/
        └── [product_id]/image.jpg
```

### 3.8 Commandes de gestion

Lancer avec : `python manage.py <commande> [options]`

| Commande | Description |
|----------|-------------|
| `ensure_admin --email x --password y [--full_name "Nom"]` | Crée le super-admin s'il n'existe pas encore |
| `flush_test_data --confirm` | Vide toutes les données de test (garde les utilisateurs) |
| `backup_and_cleanup [--date YYYY-MM-DD] [--dry-run]` | Génère PDFs des mouvements/ventes et uploade sur Google Drive |
| `clean_old_stock_movements` | Supprime les mouvements de stock de plus de 180 jours |
| `setup_google_drive` | Configure les credentials OAuth Google Drive |

**Création auto de l'admin au démarrage** :  
Dans `user/apps.py`, la méthode `ready()` appelle `_ensure_default_admin()` qui lit les variables d'environnement `DEFAULT_ADMIN_EMAIL`, `DEFAULT_ADMIN_PASSWORD`, `DEFAULT_ADMIN_FULL_NAME` et crée l'admin s'il n'existe aucun superuser.

### 3.9 Variables d'environnement Backend

Fichier : `Backend/.env`

```env
# ───── Django ─────────────────────────────────────────────
SECRET_KEY=votre_cle_secrete_longue_et_aleatoire
DEBUG=False
ALLOWED_HOSTS=softcosy-backend.onrender.com,localhost

# ───── Base de données PostgreSQL (Supabase) ──────────────
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=votre_mot_de_passe_db
DB_HOST=db.xxxx.supabase.co
DB_PORT=5432

# ───── CORS ───────────────────────────────────────────────
CORS_ALLOWED_ORIGINS=https://softcosy-frontend.onrender.com

# ───── Admin par défaut (création automatique) ────────────
DEFAULT_ADMIN_EMAIL=admin@softcosy.com
DEFAULT_ADMIN_PASSWORD=VotreMotDePasseSecurise!
DEFAULT_ADMIN_FULL_NAME=Super Admin

# ───── Supabase Storage (S3) — médias en production ───────
SUPABASE_S3_ENDPOINT=https://xxxx.supabase.co/storage/v1/s3
SUPABASE_ACCESS_KEY_ID=votre_access_key_id
SUPABASE_SECRET_ACCESS_KEY=votre_secret_access_key
SUPABASE_BUCKET_NAME=media
SUPABASE_REGION=eu-west-2

# ───── Google Drive (backup quotidien) ───────────────────
GOOGLE_OAUTH_CLIENT_SECRETS_PATH=/chemin/vers/client_secrets.json
GOOGLE_DRIVE_PARENT_FOLDER_ID=votre_folder_id_drive
```

---

## 4. Frontend — Next.js

### 4.1 Stack et dépendances

| Package | Version | Rôle |
|---------|---------|------|
| **Next.js** | 16.1.6 | Framework React (App Router) |
| **React** | 19.2.3 | Bibliothèque UI |
| **TypeScript** | 5.x | Typage statique |
| **Tailwind CSS** | 4.x | Framework CSS utilitaire |
| **@tanstack/react-query** | 5.90.21 | Gestion état serveur (cache, refetch) |
| **axios** | 1.13.6 | Client HTTP (appels API) |
| **react-hook-form** | 7.75.0 | Gestion des formulaires |
| **recharts** | 3.7.0 | Graphiques (ligne, camembert, barres) |
| **lucide-react** | 0.576.0 | Icônes (500+) |
| **next-themes** | 0.4.6 | Mode sombre/clair |
| **@radix-ui/react-*** | 1.x–2.x | Composants UI accessibles (27 packages) |
| **date-fns** | 4.1.0 | Manipulation des dates |
| **react-resizable-panels** | 4.11.0 | Panneaux redimensionnables |
| **sonner** | 2.0.7 | Notifications toast |
| **vaul** | 1.1.2 | Drawer mobile |
| **cmdk** | 1.1.1 | Palette de commandes (Command Menu) |
| **jwt-decode** | 4.0.0 | Décodage JWT (inspection, pas vérification) |

### 4.2 Structure des pages

```
Frontend/src/app/
├── layout.tsx              # Layout racine (providers, HTML/body)
├── layout-client.tsx       # Wrapper côté client (QueryClient, AuthContext, Theme)
├── page.tsx                # Page d'accueil → redirige vers /dashboard ou /login
├── login/
│   └── page.tsx            # Page de connexion
└── dashboard/
    ├── layout.tsx          # Layout dashboard (sidebar + navbar + footer copyright)
    ├── page.tsx            # Analytics / Tableau de bord
    ├── products/
    │   └── page.tsx        # Catalogue produits
    ├── stocks/
    │   └── page.tsx        # Gestion des stocks
    ├── cashier/
    │   └── page.tsx        # Caisse / POS
    ├── sales/
    │   └── page.tsx        # Historique des ventes
    ├── inventory/
    │   ├── page.tsx        # Liste des inventaires physiques
    │   └── [id]/page.tsx   # Détail d'un inventaire
    ├── purchases/
    │   ├── page.tsx        # Liste des achats
    │   └── [id]/page.tsx   # Détail d'un achat
    ├── suppliers/
    │   └── page.tsx        # Gestion des fournisseurs
    ├── users/
    │   └── page.tsx        # Gestion des utilisateurs (ADMIN)
    ├── reports/
    │   └── page.tsx        # Rapports (ADMIN)
    └── settings/
        └── page.tsx        # Paramètres système (ADMIN)
```

### 4.3 Authentification côté frontend

**Flux de connexion** :
```
1. Utilisateur saisit email + mot de passe
           ↓
2. POST /api/token/ → token reçu
           ↓
3. localStorage.setItem('token', token)
           ↓
4. GET /api/users/me/ → profil utilisateur
           ↓
5. localStorage.setItem('user', JSON.stringify(user))
           ↓
6. Redirection vers /dashboard
```

**Déconnexion** :
```
1. localStorage.removeItem('token')
2. localStorage.removeItem('user')
3. Redirection vers /login
```

**Auto-déconnexion** :  
L'intercepteur Axios détecte les erreurs 401 et redirige automatiquement vers `/login`.

**AuthContext** (`src/components/AuthContext.tsx`) :
```typescript
interface AuthUser {
  id: number;
  email: string;
  full_name: string;
  role: 'ADMIN' | 'SELLER' | 'MANAGER';
  is_active: boolean;
  phone?: number;
  address?: string;
}

// Hook d'accès depuis n'importe quel composant :
const { user, loading, signIn, signOut, isAuthenticated } = useAuth();
```

### 4.4 Communication avec l'API

**Instance Axios** (`src/lib/api.ts`) :
```typescript
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api',
  headers: { 'Content-Type': 'application/json' },
});

// Injection automatique du token sur chaque requête
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Token ${token}`;
  return config;
});

// Déconnexion automatique si 401
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

**React Query — Exemple de pattern** :
```typescript
// Lecture de données
const { data: products, isLoading } = useQuery({
  queryKey: ['products', page, search],
  queryFn: () => api.get(`/products/?page=${page}&search=${search}`).then(r => r.data),
});

// Mutation (create/update/delete)
const deleteProduct = useMutation({
  mutationFn: (id: number) => api.delete(`/products/${id}/`),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
});
```

### 4.5 Composants principaux

**Sidebar** (`src/components/sidebar.tsx`) :
- Menu de navigation latéral avec **filtrage par rôle**
- ADMIN : 11 éléments (tout)
- MANAGER : tout sauf Utilisateurs
- SELLER : Caisse, Produits, Stocks, Ventes, Inventaire, Fournisseurs
- Surlignage de l'élément actif (basé sur `usePathname()`)
- Section profil en bas avec nom + badge de rôle + bouton déconnexion
- Mobile : off-canvas avec overlay

**Navbar** (`src/components/navbar.tsx`) :
- Logo "S&C"
- Bouton menu mobile
- Cloche de notifications (alertes stock bas)
- Bouton thème sombre/clair

**NotificationBell** (`src/components/notification-bell.tsx`) :
- Polling toutes les **60 secondes** vers `/api/dashboard/recent_data/`
- Badge rouge avec compteur (≥ 10 : affiche "9+")
- Liste déroulante des produits en stock bas
- Code couleur : orange (avertissement), rouge (critique)
- Bouton "Ignorer" pour masquer une alerte

**AddEditProductModal** (`src/components/add-product-modal.tsx`) :
- Formulaire de création/modification produit
- Variantes dynamiques (ajouter/supprimer dans le formulaire)
- Upload d'image (envoyé en multipart/form-data)
- Validation : champs obligatoires, format prix

**AddMovementModal** (`src/components/add-movement-modal.tsx`) :
- Création/modification de mouvements de stock manuels
- Sélection type (ENTREE/SORTIE/AJUSTEMENT) + motif
- Validation : empêche le stock négatif

**CategoryManagementModal** (`src/components/category-management-modal.tsx`) :
- CRUD complet des catégories en modal
- Liste + formulaire inline d'édition

**UserProfileModal** (`src/components/user-profile-modal.tsx`) :
- Modifier son profil (nom, téléphone, adresse, photo)
- PATCH vers `/api/users/me/`

**Composants UI (shadcn/ui)** :  
Plus de 70 composants pré-construits dans `src/components/ui/` :
Button, Card, Input, Select, Dialog, Dropdown, Badge, Table, Pagination, Tabs, Accordion, Alert, Avatar, Calendar, Checkbox, Command, DatePicker, Form, Progress, RadioGroup, ScrollArea, Sheet, Skeleton, Slider, Switch, Textarea, Toast, Toggle, Tooltip, Resizable panels, etc.

### 4.6 Thème et styles

**Tailwind CSS 4** avec mode sombre (`class`-based) :
- Couleur primaire : Bleu
- Mode sombre : persisté dans `localStorage` via `next-themes`
- Breakpoints responsive : `sm` (640px), `md` (768px), `lg` (1024px), `xl` (1280px)

**Détection mobile** (`src/hooks/use-mobile.ts`) :
```typescript
export function useIsMobile() {
  // Retourne true si largeur < 768px
  // Utilise matchMedia pour les mises à jour temps réel
}
```

**Copyright footer** (dans `dashboard/layout.tsx`) :
```
© 2026 SoftCosy — Tous droits réservés. Réalisé par Virkas [lien WhatsApp]
```

### 4.7 Variables d'environnement Frontend

Fichier : `Frontend/.env.local`

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api    # Développement local
# NEXT_PUBLIC_API_URL=https://softcosy-backend.onrender.com/api  # Production
```

---

## 5. Base de données — PostgreSQL / Supabase

### 5.1 Schéma des tables

**Base de données** : PostgreSQL 15 hébergée sur Supabase  
**Connexion** : SSL obligatoire (`sslmode=require`)

| Table | App | Lignes estimées |
|-------|-----|----------------|
| `user` | user | ~10–100 |
| `category` | product | ~5–50 |
| `product` | product | ~50–5000 |
| `variant` | product | ~100–20000 |
| `stock` | stockmouvement | ~100–20000 (1:1 avec variant) |
| `stockmovement` | stockmouvement | ~10000+ (audit trail complet) |
| `systemsettings` | stockmouvement | 1 (singleton) |
| `customer` | sale | ~50–5000 |
| `sale` | sale | ~1000–100000 |
| `saleline` | sale | ~3000–500000 |
| `supplier` | purchase | ~5–100 |
| `purchase` | purchase | ~100–10000 |
| `purchaseline` | purchase | ~300–50000 |
| `inventorycount` | inventorycount | ~10–500 |
| `inventoryline` | inventorycount | ~500–100000 |

### 5.2 Relations entre tables

```
User ─────────────────────────────────── Sale (vendeur)
  └── InventoryCount (compteur)

Category ────────────────────────────── Product (appartient à)

Product ──────┬──────────────────────── Variant (a plusieurs)
              ├── SaleLine (produit vendu)
              ├── PurchaseLine (produit acheté)
              ├── StockMovement (mouvement lié)
              └── InventoryLine (ligne inventaire)

Variant ──────┬──────────────────────── Stock (1 pour 1)
              ├── SaleLine (variante vendue)
              ├── PurchaseLine (variante achetée)
              └── InventoryLine (ligne inventaire)

Stock ─────────────────────────────────── StockMovement (historique)

Sale ─────────┬──────────────────────── SaleLine (articles)
              └── Customer (client)

Purchase ──────┬─────────────────────── PurchaseLine (articles)
               └── Supplier (fournisseur)

InventoryCount ──────────────────────── InventoryLine (articles comptés)
```

---

## 6. Stockage des images — Supabase Storage

### Ce qui est enregistré dans la base de données

**L'image elle-même n'est JAMAIS stockée dans PostgreSQL.**

La colonne `image` de la table `product` (et `user`) contient uniquement **le chemin relatif du fichier** sous forme de texte :

```
products/images/mon_produit.jpg
```

Ce n'est pas le fichier binaire, juste une chaîne de caractères. Le fichier physique est ailleurs (disque local ou Supabase Storage).

### Flux complet de l'upload d'une image produit

```
1. Admin sélectionne une image dans le modal produit
         ↓
2. Frontend garde le fichier en mémoire React (objet File)
         ↓
3. Clic "Enregistrer" → requête multipart/form-data :
   POST /api/products/
   Content-Type: multipart/form-data
   Body: name=..., category_id=..., image=<binaire>, variants=...
         ↓
4. Django reçoit la requête
   → Pillow valide que c'est bien une image
   → Selon la config (DEV ou PROD), le fichier est sauvegardé :
      • DEV  → Backend/media/products/images/fichier.jpg  (disque local)
      • PROD → Supabase Storage via boto3/S3             (cloud)
         ↓
5. PostgreSQL enregistre seulement le chemin relatif :
   image = "products/images/fichier.jpg"
         ↓
6. Quand le frontend récupère le produit, Django génère l'URL complète :
   • DEV  → http://localhost:8000/media/products/images/fichier.jpg
   • PROD → https://[project].supabase.co/storage/v1/object/public/media/products/images/fichier.jpg
```

### Configuration développement (local)

```
MEDIA_URL  = http://localhost:8000/media/
MEDIA_ROOT = Backend/media/
```

Django sert les fichiers directement en mode `DEBUG=True` via `urls.py`.  
Le dossier `Backend/media/products/images/` contient les images uploadées localement.

### Configuration production (Supabase S3)

**Supabase Storage** est compatible avec l'API Amazon S3, ce qui permet d'utiliser `django-storages` avec `boto3`.

**Étapes pour configurer Supabase Storage** :

1. Dans la console Supabase → **Storage** → créer un bucket `media`
2. Rendre le bucket **public** (Policy : `SELECT` pour `anon`)
3. Dans **Project Settings → Storage** → récupérer les credentials S3 :
   - Endpoint S3 (ex: `https://xxx.supabase.co/storage/v1/s3`) → `SUPABASE_S3_ENDPOINT`
   - `Access Key ID` → `SUPABASE_ACCESS_KEY_ID`
   - `Secret Access Key` → `SUPABASE_SECRET_ACCESS_KEY`
4. Ajouter ces variables dans Render (Dashboard → Environment → Add Environment Variable)

**Comment ça fonctionne** :
```
Upload image → Django → boto3 (API S3) → Supabase Storage (bucket "media")
                                                    ↓
                         URL publique générée automatiquement par AWS_S3_CUSTOM_DOMAIN :
                         https://[project].supabase.co/storage/v1/object/public/media/products/images/fichier.jpg
```

### Point critique — Différence entre endpoint S3 et URL publique

Supabase a **deux chemins différents** qui sont souvent confondus :

| Chemin | Usage | Exemple |
|--------|-------|---------|
| `/storage/v1/s3` | API S3 (pour upload/download via boto3) | `https://xxx.supabase.co/storage/v1/s3` |
| `/storage/v1/object/public` | URL publique HTTP (pour afficher l'image) | `https://xxx.supabase.co/storage/v1/object/public/media/...` |

`django-storages` utilise `AWS_S3_CUSTOM_DOMAIN` pour générer les URLs publiques des fichiers. Sans ce paramètre, il génère des URLs avec `/s3/` qui sont inaccessibles via un navigateur.

**Configuration correcte dans `settings.py`** :
```python
AWS_S3_ENDPOINT_URL = os.getenv('SUPABASE_S3_ENDPOINT')   # pour l'API d'upload
# Extrait le domaine : "https://xxx.supabase.co/storage/v1/s3" → "xxx.supabase.co"
_supabase_domain = AWS_S3_ENDPOINT_URL.split('/storage/')[0].replace('https://', '')
# Construit le chemin public correct
AWS_S3_CUSTOM_DOMAIN = f"{_supabase_domain}/storage/v1/object/public/{AWS_STORAGE_BUCKET_NAME}"
MEDIA_URL = f"https://{AWS_S3_CUSTOM_DOMAIN}/"
```

### Impact de la mise en pause Supabase

Sur le **plan gratuit Supabase**, le projet entier est mis en pause après une semaine d'inactivité. Cela affecte à la fois :
- La **base de données** (plus de connexion PostgreSQL possible)
- Le **Storage** (les images ne sont plus accessibles via leur URL)

Quand le projet est **réactivé** depuis la console Supabase :
- La base de données revient avec toutes ses données intactes
- Le Storage revient avec tous les fichiers intacts
- Les images doivent à nouveau s'afficher normalement

Si les images ne s'affichent toujours pas après réactivation, vérifier :
1. Que `SUPABASE_S3_ENDPOINT`, `SUPABASE_ACCESS_KEY_ID` et `SUPABASE_SECRET_ACCESS_KEY` sont bien définis dans les variables d'environnement Render
2. Que le bucket `media` est bien en accès **public** dans la console Supabase
3. Que le backend a bien été redéployé après la modification de `settings.py`

**Fichiers concernés** :
- Images des produits (`product.image`) → `products/images/`
- Photos de profil utilisateur (`user.image`) → `users/`

---

## 7. Fonctionnalités détaillées

### 7.1 Tableau de bord (Dashboard)

**Route** : `/dashboard`

**Métriques affichées** (depuis `/api/dashboard/summary/`) :
- Nombre total de produits actifs
- Valeur totale du stock
- Nombre d'alertes stock bas actives
- Total des ventes

**Graphiques** (depuis `/api/dashboard/charts/`) :
- Courbe des ventes sur 6 mois
- Courbe des entrées de stock sur 6 mois

**Répartition par catégorie** (depuis `/api/dashboard/categories/`) :
- Camembert montrant la distribution des produits

**Produits haute rotation** (depuis `/api/dashboard/product_performance/`) :
- Top 5 produits par volume de ventes
- Taux de rotation calculé

**Activité récente** (depuis `/api/dashboard/recent_data/`) :
- 5 derniers mouvements de stock
- Liste des produits en stock bas

### 7.2 Gestion des produits

**Route** : `/dashboard/products`

**Fonctionnalités** :
- Catalogue paginé (20 par page) avec recherche par nom/code/SKU
- Filtre par catégorie
- Vue desktop : tableau avec rangées expansibles montrant les variantes
- Vue mobile : grille de cartes
- Création/modification via modal avec variantes imbriquées
- Upload d'image produit
- Gestion des catégories dans une modal dédiée
- Auto-génération du code produit (`PROD-00001`) et des SKUs (`SKU-00001`)

**Champs d'une variante** :
- SKU (auto-généré)
- Code-barres (optionnel)
- Taille / Modèle
- Prix de vente (obligatoire)
- Prix de revient (optionnel)
- Attributs JSON libres
- Statut actif/inactif

### 7.3 Gestion des stocks

**Route** : `/dashboard/stocks`

**Fonctionnalités** :
- Vue groupée par produit
- Statistiques : total pièces, articles stock bas, articles critiques, mouvements du jour
- Recherche par produit, filtre par type de mouvement
- Historique des mouvements avec détails (SKU, type, quantité, motif, date, notes)
- Création de mouvements manuels (ENTREE/SORTIE/AJUSTEMENT)
- Édition et suppression des mouvements
- Validation : empêche les quantités négatives

### 7.4 Caisse (POS)

**Route** : `/dashboard/cashier`

**Fonctionnalités** :
- Grille de produits avec filtre par catégorie et recherche
- 12 produits par page avec pagination
- Sélection de variante (taille, modèle, etc.)
- Panier avec ajustement des quantités et suppression
- Nom du client (optionnel, sans fiche client)
- **Modal de paiement** :
  - Affichage du sous-total et total
  - Saisie de la remise globale
  - Saisie du montant payé
  - Calcul automatique de la monnaie rendue
  - Calcul du pourboire (optionnel)
- Confirmation → création de la vente en base

**Flux de données** :
```
Sélection produits → Panier → Paiement → POST /api/sales/
                                              ↓
                               Backend crée Sale + SaleLines
                                              ↓
                               Signal: StockMovement SORTIE pour chaque ligne
                                              ↓
                               Stock.on_hand_qty décrémenté automatiquement
```

### 7.5 Ventes

**Route** : `/dashboard/sales`

**Fonctionnalités** :
- Liste de toutes les ventes (triées par date, les plus récentes en premier)
- Recherche par numéro de facture ou nom client
- Filtre par période (date de début / fin)
- Détail d'une vente : lignes, totaux, statut, vendeur
- **Remboursement** : supprimer une ligne de vente
  - Le stock est automatiquement restitué (signal RETOUR_CLIENT)
  - Les totaux de la vente sont recalculés

### 7.6 Achats fournisseurs

**Route** : `/dashboard/purchases` et `/dashboard/purchases/[id]`

**Fonctionnalités** :
- Liste des commandes fournisseurs
- Création avec sélection du fournisseur et ajout de lignes (produit, variante, quantité, coût)
- Référence auto-générée : `CMD-2025-0001`
- Statuts : en attente → reçu
- **Réception** (`status = "RECU"`) :
  - Déclenche automatiquement l'entrée en stock
  - Un `StockMovement ENTREE` est créé pour chaque ligne
  - Le stock est incrémenté via les signaux
- Page détail avec toutes les lignes de la commande

### 7.7 Inventaires physiques

**Route** : `/dashboard/inventory` et `/dashboard/inventory/[id]`

**Fonctionnalités** :
- Démarrer un nouvel inventaire (capture l'état actuel des stocks)
- Saisie ligne par ligne des quantités comptées
- Calcul automatique des écarts (comptée vs théorique)
- Statuts : `ENCOURS` → `FINI`
- L'inventaire ne modifie pas automatiquement les stocks — il sert d'enregistrement
- Possibilité de créer des mouvements d'ajustement séparément après analyse

### 7.8 Gestion des fournisseurs

**Route** : `/dashboard/suppliers`

**Fonctionnalités** :
- Liste CRUD complète des fournisseurs
- Informations : nom, téléphone, adresse
- Utilisés dans les achats pour le suivi et les rapports

### 7.9 Gestion des utilisateurs

**Route** : `/dashboard/users` — **ADMIN uniquement**

**Fonctionnalités** :
- Liste de tous les utilisateurs avec rôle et statut
- Création de nouveaux comptes (email, nom, rôle, mot de passe)
- Modification des informations
- Activation / désactivation de compte (`is_active`)
- Suppression de compte
- Un compte est **inactif** par défaut à la création — l'admin doit l'activer

### 7.10 Rapports

**Route** : `/dashboard/reports` — **ADMIN uniquement**

**Fonctionnalités** :
- Rapports analytiques détaillés sur les ventes et les stocks
- Données exportables
- Graphiques de tendances
- Données alimentées par les endpoints dashboard

### 7.11 Paramètres système

**Route** : `/dashboard/settings` — **ADMIN uniquement**

**Fonctionnalités** :
- Seuil stock bas (`low_stock_threshold`, défaut : 10)
- Seuil stock critique (`critical_stock_threshold`, défaut : 5)
- Activer/désactiver les alertes stock bas
- Activer/désactiver les alertes mises à jour système
- Activer/désactiver le rapport hebdomadaire
- Sauvegardé via `PATCH /api/settings/current/`

### 7.12 Notifications stock bas

**Composant** : `NotificationBell` dans la navbar

**Fonctionnement** :
1. Polling toutes les 60 secondes vers `/api/dashboard/recent_data/`
2. Filtre les produits dont `available_qty ≤ low_stock_threshold`
3. Badge rouge animé avec le nombre d'alertes
4. Menu déroulant liste chaque produit en alerte avec sa quantité
5. Code couleur :
   - Orange : `qty ≤ low_stock_threshold` (avertissement)
   - Rouge : `qty ≤ critical_stock_threshold` (critique)

---

## 8. Déploiement sur Render

### 8.1 Configuration render.yaml

Le fichier `render.yaml` à la racine du dépôt définit les deux services en tant que Blueprint Render :

```yaml
services:
  - type: web
    name: softcosy-backend
    runtime: python
    plan: free
    rootDir: Backend
    buildCommand: pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate
    startCommand: gunicorn gestion_softcosy.wsgi:application --bind 0.0.0.0:$PORT

  - type: web
    name: softcosy-frontend
    runtime: node
    plan: free
    rootDir: Frontend
    buildCommand: npm install && npm run build
    startCommand: npm run start
```

**Points importants** :
- `plan: free` est obligatoire pour éviter la demande de paiement
- `preDeployCommand` n'est pas supporté sur le plan gratuit (migrations incluses dans `buildCommand`)
- `npm run start` utilise `next start -p $PORT` (variable `$PORT` injectée par Render)

### 8.2 Variables d'environnement à configurer sur Render

**Service Backend** (`softcosy-backend`) :

| Variable | Valeur | Description |
|----------|--------|-------------|
| `DEBUG` | `False` | Mode production |
| `SECRET_KEY` | (générer aléatoirement) | Clé secrète Django |
| `ALLOWED_HOSTS` | `softcosy-backend.onrender.com` | Hôtes autorisés |
| `CORS_ALLOWED_ORIGINS` | `https://softcosy-frontend.onrender.com` | Frontend autorisé |
| `DB_NAME` | `postgres` | Nom de la base |
| `DB_USER` | `postgres` | Utilisateur PostgreSQL |
| `DB_PASSWORD` | (depuis Supabase) | Mot de passe DB |
| `DB_HOST` | `db.xxxx.supabase.co` | Hôte Supabase |
| `DB_PORT` | `5432` | Port PostgreSQL |
| `DEFAULT_ADMIN_EMAIL` | (votre email) | Email du premier admin |
| `DEFAULT_ADMIN_PASSWORD` | (mot de passe fort) | Mot de passe admin initial |
| `DEFAULT_ADMIN_FULL_NAME` | `Super Admin` | Nom de l'admin |
| `SUPABASE_S3_ENDPOINT` | (depuis Supabase) | Endpoint S3 |
| `SUPABASE_ACCESS_KEY_ID` | (depuis Supabase) | Clé d'accès S3 |
| `SUPABASE_SECRET_ACCESS_KEY` | (depuis Supabase) | Clé secrète S3 |
| `SUPABASE_BUCKET_NAME` | `media` | Nom du bucket |

**Service Frontend** (`softcosy-frontend`) :

| Variable | Valeur | Description |
|----------|--------|-------------|
| `NEXT_PUBLIC_API_URL` | `https://softcosy-backend.onrender.com/api` | URL de l'API |

### 8.3 Processus de build

**Backend** :
1. `pip install -r requirements.txt` — Installe Python et Django
2. `python manage.py collectstatic --noinput` — Compile les fichiers statiques dans `staticfiles/`
3. `python manage.py migrate` — Applique les migrations en base
4. Démarrage : `gunicorn gestion_softcosy.wsgi:application --bind 0.0.0.0:$PORT`
5. Au démarrage de l'app Django : `AppConfig.ready()` crée le compte admin si inexistant

**Frontend** :
1. `npm install` — Installe les dépendances Node.js
2. `npm run build` — Build Next.js (optimisation, TypeScript check, bundling)
3. Démarrage : `next start -p $PORT`

**Fichiers statiques** :
- Django : WhiteNoise sert les fichiers depuis `staticfiles/` avec compression gzip
- Next.js : sert ses propres assets statiques nativement

---

## 9. Rôles et permissions

| Fonctionnalité | ADMIN | MANAGER | SELLER |
|----------------|:-----:|:-------:|:------:|
| Tableau de bord | ✓ | ✓ | ✓ |
| Produits (voir + modifier) | ✓ | ✓ | ✓ |
| Stocks (voir + mouvements) | ✓ | ✓ | ✓ |
| Caisse POS | ✓ | ✓ | ✓ |
| Ventes (voir + rembourser) | ✓ | ✓ | ✓ |
| Inventaires physiques | ✓ | ✓ | ✓ |
| Fournisseurs | ✓ | ✓ | ✓ |
| Achats | ✓ | ✓ | ✗ |
| Rapports | ✓ | ✓ | ✗ |
| Gestion utilisateurs | ✓ | ✗ | ✗ |
| Paramètres système | ✓ | ✗ | ✗ |
| Activer/désactiver comptes | ✓ | ✗ | ✗ |

> **Note** : Les permissions sont appliquées à la fois côté frontend (masquage du menu) et côté backend (vérification dans les ViewSets).

---

## 10. Flux de travail principaux

### Vente en caisse (POS)

```
1. Vendeur ouvre la page Caisse (/dashboard/cashier)
2. Cherche/filtre les produits par catégorie ou nom
3. Sélectionne la variante souhaitée (taille, modèle)
4. Ajoute au panier, ajuste les quantités si besoin
5. Optionnel : entre le nom du client
6. Clique "Passer au paiement"
7. Entre le montant remis → calcul monnaie automatique
8. Valide la vente

→ Backend : POST /api/sales/
→ Création de la Sale + SaleLines
→ Signal : StockMovement SORTIE × nombre d'articles
→ Stock.on_hand_qty décrémenté
→ Panier vidé, confirmation affichée
```

### Réception d'une commande fournisseur

```
1. Manager crée un achat (/dashboard/purchases)
   → Sélectionne le fournisseur, ajoute les lignes
   → Statut initial : "en attente"
2. À la livraison, change le statut vers "RECU"
   → PATCH /api/purchases/{id}/ avec status="RECU"
3. Backend détecte le changement de statut
   → Crée un StockMovement ENTREE par ligne de commande
   → Stock.on_hand_qty incrémenté
4. Stock immédiatement disponible pour la vente
```

### Remboursement client

```
1. Admin/Manager ouvre la vente dans /dashboard/sales
2. Clique sur la ligne à rembourser
3. Supprime la ligne (DELETE /api/sale-lines/{id}/)
4. Signal déclenché :
   → StockMovement ENTREE créé, motif RETOUR_CLIENT
   → Stock.on_hand_qty incrémenté
   → Totaux de la vente recalculés
5. La vente est mise à jour, le stock restitué
```

### Ajustement manuel de stock

```
1. Utilisateur ouvre /dashboard/stocks
2. Clique "Ajouter un mouvement"
3. Sélectionne le stock/produit concerné
4. Choisit le type : ENTREE | SORTIE | AJUSTEMENT
5. Entre la quantité et le motif
6. Ajoute des notes optionnelles
7. Valide → POST /api/stock-movements/
8. Signal met à jour Stock.on_hand_qty
```

### Inventaire physique

```
1. Démarre un inventaire : POST /api/inventory-counts/
   → Capture l'état actuel des stocks théoriques
2. Pour chaque produit/variante, entre la quantité comptée
   → PATCH /api/inventory-counts/{id}/ avec les lignes
   → Calcul automatique des écarts (comptée - théorique)
3. Analyse les écarts
4. Si corrections nécessaires : crée des mouvements AJUSTEMENT manuellement
5. Marque l'inventaire comme terminé
   → POST /api/inventory-counts/{id}/finish/
```

---

## 11. Sécurité

### Couche réseau
- **HTTPS uniquement** sur Render (certificat Let's Encrypt automatique)
- **PostgreSQL SSL** : connexion chiffrée (`sslmode=require`)
- **CORS restrictif** : seul le frontend déclaré peut appeler l'API

### Authentification
- **Tokens DRF** : token unique par utilisateur, révocable
- **django-axes** : lockout après 3 échecs, 5 minutes de blocage
- **Argon2** : hachage de mots de passe résistant aux attaques GPU

### Autorisation
- **Vérification côté backend** sur chaque endpoint (pas seulement côté frontend)
- **Comptes inactifs** par défaut — activation manuelle requise par un admin

### Validation des données
- Validation DRF sur tous les champs (type, longueur, format)
- Empêche les stocks négatifs (validation dans StockMovement)
- Images validées via Pillow avant stockage

### En-têtes de sécurité HTTP
- `X-Frame-Options: DENY` — anti-clickjacking
- `X-Content-Type-Options: nosniff`
- `Strict-Transport-Security` — HTTPS forcé
- `Content-Security-Policy` — restriction des sources

### Rate limiting
- Anonymes : 100 req/jour (empêche le scraping)
- Authentifiés : 1000 req/heure

---

## 12. Maintenance et opérations

### Backups quotidiens (automatisé)

```bash
# Génère des PDFs des ventes/mouvements et upload sur Google Drive
python manage.py backup_and_cleanup

# Avec une date spécifique
python manage.py backup_and_cleanup --date 2026-01-15

# Test sans suppression
python manage.py backup_and_cleanup --dry-run
```

**Prérequis** : Variables `GOOGLE_OAUTH_CLIENT_SECRETS_PATH` et `GOOGLE_DRIVE_PARENT_FOLDER_ID` configurées.

### Nettoyage des anciens mouvements

```bash
# Supprime les mouvements de stock de plus de 180 jours
python manage.py clean_old_stock_movements
```

**Recommandé** : Exécuter mensuellement (1er du mois).

### Vider les données de test

```bash
# Supprime TOUTES les données sauf les utilisateurs
python manage.py flush_test_data --confirm

# Tables vidées : saleline, sale, stockmovement, stock, variant,
# product, category, purchaseline, purchase, inventoryline,
# inventorycount, systemsettings
```

### Créer le premier admin

```bash
python manage.py ensure_admin \
  --email admin@softcosy.com \
  --password MotDePasseFort! \
  --full_name "Super Admin"
```

Ou via les variables d'environnement (création automatique au démarrage) :
```env
DEFAULT_ADMIN_EMAIL=admin@softcosy.com
DEFAULT_ADMIN_PASSWORD=MotDePasseFort!
DEFAULT_ADMIN_FULL_NAME=Super Admin
```

### Surveillance

- **Render Logs** : Dashboard → Service → Logs (temps réel)
- **Supabase Console** : Surveillance connexions DB, utilisation disque
- **API Health** : `GET /api/` retourne la liste des endpoints disponibles
- **Django Admin** : `https://softcosy-backend.onrender.com/admin/` (accès superuser)

---

## 13. Guide de développement local

### Prérequis

- Python 3.11+
- Node.js 20+
- PostgreSQL (ou compte Supabase)
- Git

### Installation Backend

```bash
cd Backend

# Créer l'environnement virtuel
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows

# Installer les dépendances
pip install -r requirements.txt

# Configurer les variables d'environnement
cp .env.example .env
# Éditer .env avec vos credentials DB

# Appliquer les migrations
python manage.py migrate

# Créer le super-admin
python manage.py ensure_admin --email admin@softcosy.com --password admin123

# Lancer le serveur
python manage.py runserver
# → http://localhost:8000
```

### Installation Frontend

```bash
cd Frontend

# Installer les dépendances
npm install

# Configurer les variables d'environnement
echo "NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api" > .env.local

# Lancer le serveur
npm run dev
# → http://localhost:3000
```

### URLs locales

| Service | URL |
|---------|-----|
| Frontend | `http://localhost:3000` |
| Backend API | `http://localhost:8000/api` |
| Django Admin | `http://localhost:8000/admin` |
| Swagger UI | `http://localhost:8000/api/docs/` |
| ReDoc | `http://localhost:8000/api/redoc/` |
| Debug Toolbar | Visible dans les réponses HTML (DEBUG=True) |

### Structure de dépôt

```
SoftCosy/
├── Backend/                 # Application Django
│   ├── gestion_softcosy/    # Configuration Django
│   ├── user/                # App utilisateurs
│   ├── product/             # App produits
│   ├── sale/                # App ventes
│   ├── purchase/            # App achats
│   ├── stockmouvement/      # App stocks
│   ├── inventorycount/      # App inventaires
│   ├── dashboard/           # App analytics
│   ├── requirements.txt     # Dépendances Python
│   └── manage.py            # CLI Django
├── Frontend/                # Application Next.js
│   ├── src/
│   │   ├── app/             # Pages (App Router)
│   │   ├── components/      # Composants React
│   │   ├── hooks/           # Hooks personnalisés
│   │   └── lib/             # Utilitaires (api, auth, queryClient)
│   ├── public/              # Assets statiques
│   ├── package.json         # Dépendances Node.js
│   └── next.config.ts       # Configuration Next.js
├── render.yaml              # Configuration déploiement Render
└── DOCUMENTATION.md         # Ce fichier
```

---

*Documentation générée pour SoftCosy v1.0 — Juin 2026*  
*Réalisé par [Virkas](https://wa.me/+22893953658)*
