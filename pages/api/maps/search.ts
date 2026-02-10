import type { NextApiRequest, NextApiResponse } from 'next';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { Map } from '@/types/map';

export interface Env {
  DB: D1Database;
}

interface MapRow {
  id: number | string;
  name: string;
  description: string | null;
  likes: number;
  challenges: number;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Map[] | { message: string }>
) {
  try {
    const { env } = await getCloudflareContext() as { env: Env };

    if (!env || !env.DB) {
       console.error("DB binding not found on env");
       throw new Error("DB binding missing");
    }
    const db = env.DB.withSession();

    const query = req.query.query as string;
    if (!query) {
      return res.status(400).json({ message: 'Query parameter is required' });
    }

    // Fetch documents from the 'maps' collection that match the search term
    const sql = `
      SELECT id, name, description, likes, challenges
      FROM maps
      WHERE name LIKE ?1
      ORDER BY challenges DESC
    `;
    // SQLite matching is case-insensitive by default for ASCII characters only
    // but explicit wildcards are needed for "contains" logic
    const searchTerm = `%${query}%`;

    const stmt = db.prepare(sql).bind(searchTerm);
    const { results } = await stmt.all<MapRow>();

    const safeResults = results || [];

    const formattedMaps: Map[] = safeResults.map(map => ({
      _id: map.id.toString(),
      name: map.name,
      description: map.description ?? '',
      likes: map.likes,
      challenges: map.challenges
    }));

    res.status(200).json(formattedMaps);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}
