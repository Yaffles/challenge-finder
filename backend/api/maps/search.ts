import { IRequest } from 'itty-router';
import { Map } from '@/types/map';

export interface Env {
  DB: D1Database;
}
interface MapRow {
  id: number | string; // D1 ID could be number (INTEGER) or string (TEXT)
  name: string;
  description: string | null;
  likes: number;
  challenges: number;
}


export async function handleSearchRequest(req: IRequest, env: Env): Promise<Response> {
  try {
    const query = req.query.query as string;
    if (!query) {
      return new Response(JSON.stringify({ message: 'Query parameter is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const db = env.DB;

    // Fetch documents from the 'maps' collection that match the search term
    const sql = `
      SELECT id, name, description, likes, challenges
      FROM maps
      WHERE name LIKE ?1 COLLATE NOCASE -- Explicitly use NOCASE collation if needed/available
      ORDER BY challenges DESC
    `;
    const searchTerm = `%${query}%`; // Add wildcards for substring search
    const stmt = db.prepare(sql).bind(searchTerm);
    const { results } = await stmt.all<MapRow>(); // Fetch all results
    let maps: MapRow[] = [];
    if (results) {
        maps = results;
    } else {
         console.warn("D1 query returned null/undefined instead of { results: [] }");
    }

    const formattedMaps: Map[] = maps.map(map => ({
      _id: map.id.toString(),
      name: map.name,
      description: map.description ?? '', // Use nullish coalescing for default empty string
      likes: map.likes,
      challenges: map.challenges
    }));


    return new Response(JSON.stringify(formattedMaps), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ message: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
