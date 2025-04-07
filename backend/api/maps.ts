export interface Env {
  DB: D1Database;
}

export async function handleMapsRequest(request: Request, env: Env): Promise<Response> {
  try {
    const url = new URL(request.url);

    const db = env.DB;

    // Get query parameters
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '12');

    const validPage = Math.max(1, page); // Ensure page is at least 1
    const validLimit = Math.max(1, Math.min(100, limit)); // Ensure limit is positive and maybe capped (e.g., max 100)

    const offset = (validPage - 1) * validLimit; // Calculate offset (skip)


    const stmt = db.prepare(
      `SELECT id, name, description, likes, challenges
       FROM maps
       ORDER BY challenges DESC
       LIMIT ?1 OFFSET ?2` // Using numbered placeholders is clear
    ).bind(validLimit, offset); // Bind the validated limit and calculated offset

    const { results } = await stmt.all(); // Fetch all results

    if (!results) {
      console.warn('No results found in the database.');
      return Response.json({ message: 'No maps found' }, { status: 404 });
    }



    return Response.json(results);
  } catch (e) {
    console.error(e);
    return Response.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
