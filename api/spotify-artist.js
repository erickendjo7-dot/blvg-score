// api/spotify-artist.js — Vercel Serverless Function
// Corrections : multi-market, meilleur error handling, logs détaillés

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  const { q, id } = req.query;
  if (!q && !id) {
    return res.status(400).json({ error: "Paramètre manquant : q (nom) ou id (artist_id)" });
  }

  try {
    // ── 1. Token Spotify ─────────────────────────────────────────────────────
    const clientId     = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return res.status(500).json({
        error: "Variables d'environnement Spotify non configurées",
        hint:  "Ajoute SPOTIFY_CLIENT_ID et SPOTIFY_CLIENT_SECRET dans Vercel → Settings → Environment Variables"
      });
    }

    const b64 = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method:  "POST",
      headers: { Authorization: `Basic ${b64}`, "Content-Type": "application/x-www-form-urlencoded" },
      body:    "grant_type=client_credentials",
    });

    if (!tokenRes.ok) {
      const txt = await tokenRes.text();
      return res.status(401).json({ error: "Authentification Spotify échouée", details: txt });
    }

    const { access_token } = await tokenRes.json();
    const auth = { Authorization: `Bearer ${access_token}` };

    // ── 2. Résoudre l'artist_id ──────────────────────────────────────────────
    let artistId = id || null;

    if (!artistId && q) {
      // Lien Spotify direct ?
      const linkMatch = q.match(/spotify\.com\/artist\/([A-Za-z0-9]+)/);
      if (linkMatch) {
        artistId = linkMatch[1];
      } else {
        // Recherche multi-market : FR d'abord, puis US, puis global
        const markets = ["FR", "US", ""];
        for (const market of markets) {
          const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=artist&limit=5${market ? `&market=${market}` : ""}`;
          const sr  = await fetch(url, { headers: auth });
          if (!sr.ok) continue;

          const sd      = await sr.json();
          const artists = sd?.artists?.items || [];

          if (artists.length > 0) {
            // Priorité : nom exact (insensible à la casse), sinon premier résultat
            const exact = artists.find(a => a.name.toLowerCase() === q.trim().toLowerCase());
            artistId = (exact || artists[0]).id;
            break;
          }
        }

        if (!artistId) {
          return res.status(404).json({
            error:   "Artiste introuvable",
            query:   q,
            hint:    "Essaie le nom exact ou colle le lien Spotify de l'artiste"
          });
        }
      }
    }

    // ── 3. Données artiste + top tracks (parallèle) ──────────────────────────
    const [aRes, tRes] = await Promise.all([
      fetch(`https://api.spotify.com/v1/artists/${artistId}`, { headers: auth }),
      fetch(`https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=FR`, { headers: auth }),
    ]);

    if (!aRes.ok) {
      return res.status(aRes.status).json({ error: "Impossible de charger l'artiste", artistId });
    }

    const aData = await aRes.json();
    const tData = tRes.ok ? await tRes.json() : { tracks: [] };

    // Si pas de top-tracks FR, essayer US
    let tracks = tData.tracks || [];
    if (tracks.length === 0) {
      const tUS = await fetch(`https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=US`, { headers: auth });
      if (tUS.ok) {
        const d = await tUS.json();
        tracks = d.tracks || [];
      }
    }

    // ── 4. Réponse formatée ──────────────────────────────────────────────────
    return res.status(200).json({
      id:          aData.id,
      name:        aData.name,
      popularity:  aData.popularity,
      followers:   aData.followers?.total || 0,
      genres:      aData.genres || [],
      image:       aData.images?.[0]?.url || null,
      externalUrl: aData.external_urls?.spotify || null,
      topTracks: tracks.slice(0, 5).map(t => ({
        id:          t.id,
        name:        t.name,
        popularity:  t.popularity,
        streams:     estimateStreams(t.popularity),
        album:       t.album?.name || "",
        albumImage:  t.album?.images?.[0]?.url || null,
        previewUrl:  t.preview_url || null,
        externalUrl: t.external_urls?.spotify || null,
      })),
    });

  } catch (err) {
    console.error("spotify-artist error:", err);
    return res.status(500).json({ error: "Erreur interne", message: err.message });
  }
}

// Estimation streams à partir du score (Spotify API publique ne donne pas les vrais streams)
function estimateStreams(p) {
  if (p >= 90) return Math.floor(Math.random() * 5e8)  + 1e9;
  if (p >= 75) return Math.floor(Math.random() * 2e8)  + 1e8;
  if (p >= 60) return Math.floor(Math.random() * 5e7)  + 1e7;
  if (p >= 45) return Math.floor(Math.random() * 5e6)  + 5e5;
  if (p >= 30) return Math.floor(Math.random() * 5e5)  + 5e4;
  if (p >= 15) return Math.floor(Math.random() * 5e4)  + 5e3;
  return Math.floor(Math.random() * 1e4) + 500;
}
