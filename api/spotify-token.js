// api/spotify-token.js
// Vercel Serverless Function — génère un token Spotify (Client Credentials Flow)
// Cette fonction ne doit JAMAIS être appelée directement depuis le front-end public
// Elle est protégée côté serveur Vercel

export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return res.status(500).json({ error: "Spotify credentials not configured" });
    }

    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });

    if (!response.ok) {
      const error = await response.text();
      return res.status(response.status).json({ error: "Spotify auth failed", details: error });
    }

    const data = await response.json();

    // Retourne le token (expire dans 3600s)
    return res.status(200).json({
      access_token: data.access_token,
      expires_in: data.expires_in,
    });
  } catch (err) {
    console.error("Token error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
