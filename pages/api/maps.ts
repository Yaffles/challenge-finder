import type { NextApiRequest, NextApiResponse } from 'next';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { Map } from '@/types/map';

export interface Env {
  DB: D1Database;
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

    const dbSession = env.DB.withSession();

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 12;

    const validPage = Math.max(1, page);
    const validLimit = Math.max(1, Math.min(100, limit));
    const offset = (validPage - 1) * validLimit;

    const stmt = dbSession.prepare(
      `SELECT id, name, description, likes, challenges
       FROM maps
       ORDER BY challenges DESC
       LIMIT ?1 OFFSET ?2`
    ).bind(validLimit, offset);

    const { results } = await stmt.all<any>();

    const formattedMaps: Map[] = results.map((map) => ({
      _id: String(map.id),
      name: map.name,
      description: map.description,
      likes: map.likes,
      challenges: map.challenges
    }));

    // Cache is great for static data
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.status(200).json(formattedMaps);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}
