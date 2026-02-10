import type { NextApiRequest, NextApiResponse } from 'next';
import { getCloudflareContext } from '@opennextjs/cloudflare';

export interface Env {
  DB: D1Database;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<string | { message: string }>
) {
  const { mapId } = req.query;
  const type = req.query.type as string | undefined;
  const timeLimit = req.query.timeLimit as string | undefined;
  const userId = req.cookies.userId || null

  if (!mapId || typeof mapId !== 'string') {
    return res.status(400).json({ message: 'Invalid mapId' });
  }

  try {
    const { env, ctx } = await getCloudflareContext();
    if (!env || !env.DB) {
       console.error("DB binding not found on env");
       throw new Error("DB binding missing");
    }
    const db = env.DB.withSession();

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
      filterByType = false;
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

    // Build SQL query
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
      const userParamIndex = paramIndex++;
      sql += ` AND id NOT IN (SELECT challengeId FROM log WHERE userId = ?${userParamIndex} AND mapId = ?1 AND challengeId IS NOT NULL)`;
      params.push(userId);
    }
    sql += ` ORDER BY RANDOM() LIMIT 1`;

    const findChallengeStmt = db.prepare(sql).bind(...params);
    const randomChallengeResult: any = await findChallengeStmt.first();
    const challenge = randomChallengeResult ? randomChallengeResult.id : null;


    if (!challenge) {
      res.status(404).json({ message: 'No challenges found for this map' });
    } else {
      res.status(200).send(String(challenge));
    }


    // Prepare logs
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
      challenge ? 1 : 0,
      userId || null
    ).run();

    // Use ctx.waitUntil for background tasks
    if (ctx && ctx.waitUntil) {
        ctx.waitUntil(Promise.all([apiLogPromise, logPromise]));
    } else {
        await Promise.all([apiLogPromise, logPromise]);
    }


  } catch (e) {
    console.error(e);
    if (!res.headersSent) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
  }
}
