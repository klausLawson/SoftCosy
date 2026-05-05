# SoftCosy — Système de Gestion de Commerce

Application web complète de gestion de stock, ventes et caisse pour commerces de détail.
Développée par **[Virkas](https://wa.me/+22893953658)**.

---

## Stack Technique

| Couche | Technologie |
|---|---|
| Frontend | Next.js 16 · React 19 · TypeScript · Tailwind CSS |
| Backend | Django 5 · Django REST Framework · Python |
| Base de données | PostgreSQL (Supabase) |
| Authentification | Token-based (DRF) · Email/Password |
| Déploiement | Render (backend + frontend) |

---

## Fonctionnalités

### Gestion des Produits
- Création / modification / suppression de produits avec variantes (taille, SKU, prix)
- Gestion des catégories
- Upload d'images produit

### Gestion des Stocks
- Entrées, sorties, ajustements de stock par variante
- Alertes dynamiques : stock faible et rupture (sans stockage en base)
- Seuils configurables depuis les paramètres

### Caisse (Point de Vente)
- Interface dédiée vendeur
- Panier, calcul automatique, paiement et reçu
- Filtre : seuls les produits avec un prix sont affichés

### Dashboard & Reporting
- Statistiques en temps réel (CA, stock, alertes actives)
- Graphiques : mouvements sur 6 mois, répartition par catégorie
- Top produits par rotation

### Utilisateurs & Sécurité
- Rôles : ADMIN · MANAGER · SELLER
- Blocage automatique après 3 tentatives de connexion (django-axes)
- Création automatique d'un admin de secours au démarrage (via variables d'environnement)

---

## Variables d'Environnement

### Backend (`.env`)
```env
SECRET_KEY=...
DEBUG=False
ALLOWED_HOSTS=votre-backend.onrender.com,localhost

DB_NAME=...
DB_USER=...
DB_PASSWORD=...
DB_HOST=...
DB_PORT=5432

# Admin de secours (créé automatiquement si aucun superuser n'existe)
DEFAULT_ADMIN_EMAIL=admin@softcosy.com
DEFAULT_ADMIN_PASSWORD=MotDePasseSecurise!
DEFAULT_ADMIN_FULL_NAME=Super Admin

CORS_ALLOWED_ORIGINS=https://votre-frontend.onrender.com
```

### Frontend (`.env.local`)
```env
NEXT_PUBLIC_API_URL=https://votre-backend.onrender.com/api
```

---

## Lancement Local

### Backend
```bash
cd Backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
python manage.py migrate
python manage.py ensure_admin --email admin@test.com --password admin123
python manage.py runserver
```

### Frontend
```bash
cd Frontend
npm install
npm run dev
```

---

## Structure du Projet

```
SoftCosy/
├── Backend/
│   ├── user/               # Authentification & gestion utilisateurs
│   ├── product/            # Produits & variantes
│   ├── stockmouvement/     # Stocks & mouvements
│   ├── sale/               # Ventes & caisse
│   ├── purchase/           # Achats fournisseurs
│   ├── inventorycount/     # Inventaire physique
│   ├── dashboard/          # API statistiques & alertes
│   └── gestion_softcosy/   # Configuration Django
└── Frontend/
    ├── src/app/dashboard/  # Pages principales
    └── src/components/     # Composants réutilisables
```

---

## Licence

Projet privé — toute utilisation nécessite une autorisation.
Contact : **[Virkas](https://wa.me/+22893953658)**
