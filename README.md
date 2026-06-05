# BLVG·SCORE — Spotify Popularity Score Tool

Clone du Spotify Score Checker, prêt à déployer sur Vercel.

## Setup

1. **Installer les dépendances**
```bash
npm install
```

2. **Configurer les variables d'environnement**
```bash
cp .env.local .env.local
# Éditer .env.local avec tes vraies clés Spotify
```

3. **Lancer en local**
```bash
npm install -g vercel
vercel dev
# → http://localhost:3000
```

4. **Déployer sur Vercel**
```bash
vercel deploy --prod
```

## Variables d'environnement Vercel

Dans le dashboard Vercel → Settings → Environment Variables :
- `SPOTIFY_CLIENT_ID` = ton Client ID Spotify
- `SPOTIFY_CLIENT_SECRET` = ton Client Secret Spotify

## Structure

```
├── api/
│   ├── spotify-token.js     ← Génère le token Spotify (sécurisé)
│   └── spotify-artist.js    ← Récupère les données artiste
├── src/
│   ├── App.jsx              ← Interface React complète
│   └── main.jsx
├── vercel.json              ← Config Vercel
├── vite.config.js
└── package.json
```

## Domaine personnalisé

Dans Vercel → Settings → Domains → Add Domain :
- `score.blvg1977.com` (ou ton domaine)
