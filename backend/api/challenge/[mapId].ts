import { IRequest } from 'itty-router'; // Use IRequest for easier access to params if needed
import { parse } from 'cookie';
import { ExecutionContext } from '@cloudflare/workers-types'; // Import type

export interface Env {
  DB: D1Database;
}

export async function handleChallengeRequest(req: IRequest, env: Env, ctx: ExecutionContext): Promise<Response> {
  const mapId = req.params?.id;
  const type = req.query.type as string | undefined;
  const timeLimit = req.query.timeLimit as string | undefined;
  const cookies = parse(req.headers.get('Cookie') || '');
  const userId = cookies.userId || null; // Access the specific cookie


  if (!mapId || typeof mapId !== 'string') {
    return new Response(JSON.stringify({ message: 'Missing challenge ID' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const db = env.DB;

    const match: any = {
      mapId: mapId,
      move: null,
      pan: null,
      zoom: null,
      timeLimit: null
    };

    let filterByType = true;
    if (type === 'm') {
      match.move = 1;
      match.pan = 1;
      match.zoom = 1;
    } else if (type === 'nm') {
      match.move = 0;
      match.pan = 1;
      match.zoom = 1;
    } else if (type == 'nmpz') {
      match.move = 0;
      match.pan = 0;
      match.zoom = 0;
    } else {
      filterByType = false; // Default to false if no valid type is provided
    }

    let filterByTimeLimit = false;
    if (timeLimit && timeLimit !== '0') {
      filterByTimeLimit = true;
      if (timeLimit === '360') {
        match.timeLimit = 0;
      } else {
        match.timeLimit = parseInt(timeLimit);
      }
    }

    let sql = `SELECT id FROM challenges WHERE mapId = ?1`;
    const params: any[] = [mapId];
    let paramIndex = 2;

    if (filterByType) {
      sql += ` AND move = ?${paramIndex++} AND pan = ?${paramIndex++} AND zoom = ?${paramIndex++}`;
      params.push(match.move, match.pan, match.zoom);
    }
    if (filterByTimeLimit) {
      sql += ` AND timeLimit = ?${paramIndex++}`;
      params.push(match.timeLimit);
    }
    if (userId) {
      sql += ` AND id NOT IN (SELECT challengeId FROM log WHERE userId = ?${paramIndex++} AND mapId = ?1 AND challengeId IS NOT NULL)`;
      params.push(userId); // Add userId parameter for the subquery
    }
    sql += ` ORDER BY RANDOM() LIMIT 1`;

    const findChallengeStmt = db.prepare(sql).bind(...params);
    const randomChallengeResult = await findChallengeStmt.first();
    const challenge = randomChallengeResult ? randomChallengeResult.id : null;


    let response: Response;
    if (!challenge) {
      response = new Response(JSON.stringify({ message: 'No challenges found for this map' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    else {
      // response with the challenge ID in plain text 200
      response = new Response(String(challenge), {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    const apiLogPromise = db.prepare(
      `INSERT INTO api_logs (endpoint, count) VALUES (?, 1) ON CONFLICT(endpoint) DO UPDATE SET count = count + 1`
    ).bind('/api/challenge/[mapId]').run();

    const logPromise = db.prepare(
      `INSERT INTO log (mapId, challengeId, move, pan, zoom, timeLimit, timestamp, success, userId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      mapId,
      challenge || null,
      match.move,
      match.pan,
      match.zoom,
      match.timeLimit || null,
      new Date().toISOString(),
      challenge ? 1 : 0, // success = 1 if challenge is found, otherwise 0
      userId || null
    ).run();

    ctx.waitUntil(Promise.all([apiLogPromise, logPromise]));

    return response;

  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ message: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
