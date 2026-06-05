// api/spotify-artist.js
// Vercel Serverless Function — récupère les données d'un artiste Spotify
// Paramètres query : ?q=nom_artiste  OU  ?id=spotify_artist_id

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  const { q, id } = req.query;

  if (!q && !id) {
    return res.status(400).json({ error: "Missing parameter: q (name) or id (artist_id)" });
  }

  try {
    // 1. Obtenir le token Spotify
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });

    if (!tokenRes.ok) {
      return res.status(401).json({ error: "Spotify authentication failed" });
    }

    const { access_token } = await tokenRes.json();
    const headers = { Authorization: `Bearer ${access_token}` };

    let artistId = id;

    // 2. Si on a un nom (ou un lien Spotify), on cherche l'artiste
    if (!artistId) {
      // Extraire l'ID si c'est un lien Spotify
      // Format : https://open.spotify.com/artist/4tZwfgrHOc3mvqYlEYSvVi
      const linkMatch = q.match(/spotify\.com\/artist\/([a-zA-Z0-9]+)/);
      if (linkMatch) {
        artistId = linkMatch[1];
      } else {
        // Recherche par nom
        const searchRes = await fetch(
          `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=artist&limit=1&market=FR`,
          { headers }
        );

        if (!searchRes.ok) {
          return res.status(searchRes.status).json({ error: "Spotify search failed" });
        }

        const searchData = await searchRes.json();
        const artists = searchData?.artists?.items;

        if (!artists || artists.length === 0) {
          return res.status(404).json({ error: "Artist not found", query: q });
        }

        artistId = artists[0].id;
      }
    }

    // 3. Récupérer les détails de l'artiste (popularity, followers, genres, images)
    const [artistRes, tracksRes] = await Promise.all([
      fetch(`https://api.spotify.com/v1/artists/${artistId}`, { headers }),
      fetch(`https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=FR`, { headers }),
    ]);

    if (!artistRes.ok) {
      return res.status(artistRes.status).json({ error: "Artist fetch failed", artistId });
    }

    const artistData = await artistRes.json();
    const tracksData = tracksRes.ok ? await tracksRes.json() : { tracks: [] };

    // 4. Formater la réponse
    const topTracks = (tracksData.tracks || []).slice(0, 5).map((t) => ({
      id: t.id,
      name: t.name,
      popularity: t.popularity,
      streams: estimateStreams(t.popularity), // Spotify ne donne pas les streams exacts via API publique
      album: t.album?.name,
      albumImage: t.album?.images?.[0]?.url || null,
      previewUrl: t.preview_url,
      externalUrl: t.external_urls?.spotify,
    }));

    return res.status(200).json({
      id: artistData.id,
      name: artistData.name,
      popularity: artistData.popularity,
      followers: artistData.followers?.total || 0,
      genres: artistData.genres || [],
      image: artistData.images?.[0]?.url || null,
      externalUrl: artistData.external_urls?.spotify,
      topTracks,
    });
  } catch (err) {
    console.error("Artist fetch error:", err);
    return res.status(500).json({ error: "Internal server error", message: err.message });
  }
}

// Estimation des streams à partir du score popularity
// Spotify ne fournit pas les streams réels via l'API publique
function estimateStreams(popularity) {
  if (popularity >= 90) return Math.floor(Math.random() * 500000000) + 1000000000;
  if (popularity >= 75) return Math.floor(Math.random() * 200000000) + 100000000;
  if (popularity >= 60) return Math.floor(Math.random() * 50000000) + 10000000;
  if (popularity >= 45) return Math.floor(Math.random() * 5000000) + 500000;
  if (popularity >= 30) return Math.floor(Math.random() * 500000) + 50000;
  if (popularity >= 15) return Math.floor(Math.random() * 50000) + 5000;
  return Math.floor(Math.random() * 10000) + 500;
}
