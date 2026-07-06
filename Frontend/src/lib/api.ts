// Client HTTP centralisé avec axios + gestion token
// ────────────────────────────────────────────────

import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api',
  // Ne pas définir Content-Type ici :
  // - Pour les objets JSON, Axios le définit automatiquement à 'application/json'
  // - Pour FormData (upload fichier), le browser définit 'multipart/form-data; boundary=...'
  // Forcer 'application/json' globalement empêche les uploads multipart de fonctionner
});

// Ajoute automatiquement le token dans les headers si présent
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    // N'envoie pas le token pour l'endpoint de connexion
    if (token && !config.url?.includes('/token/')) {
      config.headers.Authorization = `Token ${token}`;
    }
  }
  return config;
});

// Gère les erreurs 401 → déconnexion automatique
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      // Évite la boucle de redirection si on est déjà sur la page de login
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;