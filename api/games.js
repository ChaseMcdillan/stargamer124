// Serverless function: fetches game data from RAWG using a hidden key.
// The key lives in Vercel env vars — never exposed to the browser.

export default async function handler(req, res) {
  const API_KEY = process.env.RAWG_API_KEY;

  if (!API_KEY) {
    return res.status(500).json({ error: "RAWG_API_KEY not configured" });
  }

  const games = [
    "Brawl Stars",
    "Fortnite",
    "Clash Royale",
    "Minecraft",
    "EA Sports FC 25",
    "Grand Theft Auto V",
    "ULTRAKILL",
    "Pokémon GO",
    "Roblox",
  ];

  const fallbacks = {
    "Brawl Stars": "Fast-paced 3v3 multiplayer brawler from Supercell.",
    "Fortnite": "Battle royale with building, live events, and endless crossovers.",
    "Clash Royale": "Real-time card battler. Tower defense meets MOBA.",
    "Minecraft": "Build, survive, explore. Infinite worlds, infinite possibilities.",
    "EA Sports FC 25": "The world's game — authentic clubs, players, and leagues.",
    "Grand Theft Auto V": "Open-world crime saga across Los Santos and Blaine County.",
    "ULTRAKILL": "Retro FPS with style, speed, and pure adrenaline.",
    "Pokémon GO": "Catch, battle, and explore the world with Pokémon in AR.",
    "Roblox": "Millions of player-created worlds to explore and compete in.",
  };

  async function fetchGame(name) {
    try {
      const searchRes = await fetch(
        `https://api.rawg.io/api/games?key=${API_KEY}&search=${encodeURIComponent(name)}&page_size=1`
      );
      const searchData = await searchRes.json();
      if (!searchData.results || !searchData.results.length) return null;

      const g = searchData.results[0];
      let description = fallbacks[name] || "";

      try {
        const detailRes = await fetch(`https://api.rawg.io/api/games/${g.id}?key=${API_KEY}`);
        const detail = await detailRes.json();
        if (detail.description_raw && detail.description_raw.length > 20) {
          description = detail.description_raw.slice(0, 240).trim() + "…";
        }
      } catch (_) {}

      return {
        name: g.name,
        cover: g.background_image,
        genres: (g.genres || []).slice(0, 2).map((x) => x.name),
        released: g.released,
        description,
      };
    } catch (err) {
      return null;
    }
  }

  try {
    const results = await Promise.all(games.map(fetchGame));
    const payload = results.map((g, i) => g || {
      name: games[i],
      cover: null,
      genres: ["Game"],
      description: fallbacks[games[i]],
    });

    // Cache for 1 hour at the CDN, 24 hours stale-while-revalidate
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
    return res.status(200).json(payload);
  } catch (err) {
    return res.status(500).json({ error: "Failed to load games" });
  }
}