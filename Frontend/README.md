# SoftCosy — Frontend

Interface web Next.js pour le système de gestion SoftCosy.

---

## Stack

- **Next.js 16** (App Router)
- **React 19** + **TypeScript**
- **Tailwind CSS 4**
- **Tanstack React Query** — gestion des données serveur
- **Axios** — appels API
- **Recharts** — graphiques
- **Lucide React** — icônes
- **Radix UI** — composants accessibles (shadcn/ui)

---

## Installation

```bash
cd Frontend
npm install
```

Créer `.env.local` :

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

---

## Démarrage

```bash
npm run dev      # développement → http://localhost:3000
npm run build    # build production
npm run start    # serveur production
```

---

## Pages du Dashboard

| Route | Description |
|---|---|
| `/dashboard` | Vue générale : stats, graphiques, alertes |
| `/dashboard/products` | Catalogue produits + variantes |
| `/dashboard/stocks` | Suivi des stocks par variante |
| `/dashboard/cashier` | Interface caisse (point de vente) |
| `/dashboard/sales` | Historique des ventes |
| `/dashboard/users` | Gestion des utilisateurs |
| `/dashboard/settings` | Paramètres système + alertes stock |

---

## Variables d'Environnement

| Variable | Description | Exemple |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | URL de base de l'API backend | `https://votre-backend.onrender.com/api` |

---

## Structure

```
Frontend/
├── src/
│   ├── app/
│   │   ├── dashboard/          # Layout + pages
│   │   │   ├── layout.tsx      # Sidebar + Navbar + Footer copyright
│   │   │   ├── page.tsx        # Dashboard principal
│   │   │   ├── products/       # Gestion produits
│   │   │   ├── stocks/         # Suivi stocks
│   │   │   ├── cashier/        # Interface caisse
│   │   │   ├── sales/          # Historique ventes
│   │   │   ├── users/          # Gestion utilisateurs
│   │   │   └── settings/       # Paramètres
│   │   └── login/              # Authentification
│   ├── components/
│   │   ├── ui/                 # Composants shadcn/ui
│   │   ├── sidebar.tsx
│   │   ├── navbar.tsx
│   │   ├── notification-bell.tsx   # Alertes stock en temps réel
│   │   ├── add-product-modal.tsx
│   │   ├── add-movement-modal.tsx
│   │   └── theme-colors-context.tsx
│   └── lib/
│       ├── api.ts              # Instance Axios configurée
│       └── utils.ts
```

---

## Déploiement sur Render

1. Créer un **Web Service** sur Render
2. Connecter le dépôt GitHub
3. **Root Directory** : `Frontend`
4. **Build Command** : `npm install && npm run build`
5. **Start Command** : `npm run start`
6. **Variable d'environnement** :
   - `NEXT_PUBLIC_API_URL` = `https://votre-backend.onrender.com/api`
7. **Port** : `3000`

> Next.js sur Render nécessite un Web Service (pas un Static Site) car il utilise le SSR.
