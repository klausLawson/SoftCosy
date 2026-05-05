# SoftCosy — Backend

API REST Django pour le système de gestion SoftCosy.

---

## Stack

- **Python 3.11+**
- **Django 5** + **Django REST Framework**
- **PostgreSQL** (via Supabase)
- **django-axes** — protection anti-bruteforce
- **drf-spectacular** — documentation OpenAPI/Swagger
- **Gunicorn** — serveur WSGI pour la production

---

## Installation

```bash
cd Backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Linux/Mac
pip install -r requirements.txt
```

Créer un fichier `.env` à la racine de `Backend/` :

```env
SECRET_KEY=votre-secret-key-django
DEBUG=False
ALLOWED_HOSTS=votre-backend.onrender.com,localhost,127.0.0.1

DB_NAME=votre_db
DB_USER=votre_user
DB_PASSWORD=votre_password
DB_HOST=votre_host.supabase.co
DB_PORT=5432

DEFAULT_ADMIN_EMAIL=admin@softcosy.com
DEFAULT_ADMIN_PASSWORD=MotDePasseSecurise!
DEFAULT_ADMIN_FULL_NAME=Super Admin

CORS_ALLOWED_ORIGINS=https://votre-frontend.onrender.com,http://localhost:3000
```

---

## Démarrage

```bash
python manage.py migrate
python manage.py runserver
```

---

## Applications

| App | Responsabilité |
|---|---|
| `user` | Authentification email/token, rôles (ADMIN/MANAGER/SELLER) |
| `product` | Produits, variantes, catégories |
| `stockmouvement` | Stocks, mouvements, paramètres système |
| `sale` | Ventes, lignes de vente, caisse |
| `purchase` | Bons de commande fournisseurs |
| `inventorycount` | Inventaire physique |
| `dashboard` | Statistiques, alertes dynamiques, graphiques |

---

## Endpoints Principaux

| Méthode | URL | Description |
|---|---|---|
| POST | `/api/auth/login/` | Connexion → retourne token |
| POST | `/api/auth/logout/` | Déconnexion |
| GET | `/api/users/` | Liste des utilisateurs |
| GET/POST | `/api/products/` | Produits |
| GET/POST | `/api/categories/` | Catégories |
| GET/POST | `/api/stocks/` | Stocks par variante |
| GET/POST | `/api/stock-movements/` | Mouvements de stock |
| GET/POST | `/api/sales/` | Ventes |
| GET | `/api/dashboard/summary/` | Statistiques globales |
| GET | `/api/dashboard/recent_data/` | Alertes stock + mouvements récents |
| GET | `/api/dashboard/charts/` | Données graphiques 6 mois |

Documentation Swagger : `/api/schema/swagger-ui/`

---

## Admin de Secours (Auto-création)

Au démarrage du serveur, si **aucun superutilisateur n'existe**, un compte admin est créé automatiquement à partir des variables d'environnement :

```env
DEFAULT_ADMIN_EMAIL=admin@softcosy.com
DEFAULT_ADMIN_PASSWORD=MotDePasseSecurise!
DEFAULT_ADMIN_FULL_NAME=Super Admin
```

Commande manuelle équivalente :
```bash
python manage.py ensure_admin --email admin@softcosy.com --password MonMotDePasse
```

---

## Commandes de Gestion

```bash
# Créer un admin manuellement
python manage.py ensure_admin --email admin@test.com --password admin123

# Nettoyage des anciens mouvements de stock
python manage.py clean_old_stock_movements

# Sauvegarde + archivage Google Drive
python manage.py backup_and_cleanup --dry-run
```

---

## Déploiement sur Render

1. Créer un **Web Service** sur Render
2. Connecter le dépôt GitHub
3. **Root Directory** : `Backend`
4. **Build Command** : `pip install -r requirements.txt`
5. **Start Command** : `gunicorn gestion_softcosy.wsgi:application --bind 0.0.0.0:$PORT`
6. Ajouter toutes les variables d'environnement dans l'onglet "Environment"
7. Après le premier déploiement, exécuter dans le shell Render :
   ```bash
   python manage.py migrate
   ```

---

## Sécurité

- **django-axes** : blocage après 3 tentatives échouées (cooldown 5 min)
- **CORS** : origines explicitement whitelistées via `CORS_ALLOWED_ORIGINS`
- **Throttling** : 100 req/jour (anonymes), 1000 req/heure (authentifiés)
- **SSL** : connexion DB forcée en `sslmode=require`
- **DEBUG=False** en production obligatoire
