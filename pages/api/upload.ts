import type { NextApiRequest, NextApiResponse } from 'next';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { getChallengeInfo } from '@/utils/challenge';

export interface Env {
  DB: D1Database; // Ensure proper type or use 'any' if D1Database is not globally defined
}

async function processChallenge(input: string, env: Env) {
  let regex = /geoguessr\.com\/challenge\/[A-Za-z0-9]+/g;
  let matches = input.match(regex);
  if (!matches) return { successes: 0, errors: 0, duplicates: 0 };

  let successes = 0;
  let errors = 0;
  let duplicates = 0;

  const db = env.DB;

  async function process(match: string) {
    let id: string | undefined;
    let mapId: string | undefined;

    try {
      const idMatch = match.match(/geoguessr\.com\/challenge\/([A-Za-z0-9]+)/);
      if (idMatch && idMatch[1]) {
        id = idMatch[1];
      } else {
        errors += 1;
        return;
      }
      const info: any = await getChallengeInfo(id);

      if (!info || !info['challenge']) {
        errors += 1;
        return;
      }

      const challengeInfo = info['challenge'];
      const mapInfoRaw = info['map'];

      if (challengeInfo['mapSlug'] == 'country-streak') {
        mapId = 'country-streak';
      } else if (challengeInfo['mapSlug'] == 'us-state-streak') {
        mapId = 'us-state-streak';
      } else if (mapInfoRaw && mapInfoRaw['id']) {
        mapId = mapInfoRaw['id'];
      } else {
        errors += 1;
        return;
      }

      // Check if map exists
      let mapExists = false;
      try {
        const checkMapStmt = db.prepare(
          `SELECT id FROM maps WHERE id = ?1 LIMIT 1`
        ).bind(mapId);
        const mapResult = await checkMapStmt.first();
        mapExists = !!mapResult;
      } catch (dbError) {
        console.error(`Error checking map existence for mapId ${mapId}:`, dbError);
        errors += 1;
        return;
      }

      if (!mapExists) {
        let newMapData;
        if (mapId == 'country-streak') {
          newMapData = {
            "id": mapId,
            "name": "Country Streak",
            "description": "How many countries can you guess in a row?",
            "likes": 50000,
            "challenges": 0
          };
        } else if (mapId == 'us-state-streak') {
          newMapData = {
            "id": mapId,
            "name": "US State Streak",
            "description": "How many US states can you guess in a row?",
            "likes": 10000,
            "challenges": 0
          };
        } else if (mapInfoRaw) {
          newMapData = {
            "id": mapId,
            "name": mapInfoRaw['name'],
            "description": mapInfoRaw['description'],
            "likes": mapInfoRaw['likes'],
            "challenges": 0
          };
        } else {
          errors += 1;
          return;
        }

        try {
          const insertMapStmt = db.prepare(
            `INSERT INTO maps (id, name, description, likes, challenges)
             VALUES (?1, ?2, ?3, ?4, ?5)
             ON CONFLICT(id) DO NOTHING`
          ).bind(
            newMapData.id,
            newMapData.name,
            newMapData.description,
            newMapData.likes,
            newMapData.challenges
          );
          await insertMapStmt.run();
        } catch (dbError: any) {
          console.error(`Error inserting map info for mapId ${mapId}:`, dbError);
          errors += 1;
          return;
        }
      }

      const challengeData = {
        id: id,
        mapId: mapId,
        timeLimit: challengeInfo.timeLimit ?? 0,
        move: challengeInfo.forbidMoving ? 0 : 1,
        zoom: challengeInfo.forbidZooming ? 0 : 1,
        pan: challengeInfo.forbidRotating ? 0 : 1,
        streak: challengeInfo.gameMode === 'streak' ? 1 : 0
      };

      let challengeInsertedSuccessfully = false;
      try {
        const insertChallengeStmt = db.prepare(
          `INSERT INTO challenges (id, mapId, timeLimit, move, zoom, pan, streak)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
           ON CONFLICT(id) DO NOTHING`
        ).bind(
          challengeData.id,
          challengeData.mapId,
          challengeData.timeLimit,
          challengeData.move,
          challengeData.zoom,
          challengeData.pan,
          challengeData.streak
        );

        // Using 'any' for the result to avoid strictly typed D1Result requirement in this file
        const insertResult: any = await insertChallengeStmt.run();

        // Check if a row was actually inserted (meta.changes === 1)
        if (insertResult.meta && insertResult.meta.changes === 1) {
          challengeInsertedSuccessfully = true;
        } else {
          duplicates += 1;
          return;
        }

      } catch (dbError: any) {
        errors += 1;
        return;
      }

      if (challengeInsertedSuccessfully) {
        try {
          const updateMapStmt = db.prepare(
            `UPDATE maps SET challenges = challenges + 1 WHERE id = ?1`
          ).bind(mapId);
          await updateMapStmt.run();
          successes += 1;
        } catch (dbError: any) {
          console.error(`Error updating challenge count for mapId ${mapId}:`, dbError);
          return;
        }
      }

    } catch (error) {
      console.error(`Unexpected error processing match for challenge ID ${id || 'unknown'}:`, error);
      errors += 1;
    }
  }

  const batchSize = 1000; // You can adjust the batch size for better performance
  let tasks = [];

  for (let i = 0; i < matches.length; i++) {
    tasks.push(process(matches[i])); // Replace with your actual async task
    if (tasks.length >= batchSize) {
      await Promise.all(tasks); // Wait for batch to complete
      tasks = []; // Clear tasks for the next batch
    }
  }

  // Run remaining tasks
  if (tasks.length > 0) {
    await Promise.all(tasks);
  }

  console.log(`async tasks done.`);



  await Promise.all(tasks);
  return { successes, errors, duplicates };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { env } = await getCloudflareContext() as { env: Env };

    if (!env || !env.DB) {
       console.error("DB binding not found on env");
       throw new Error("DB binding missing");
    }

    const { input } = req.body;

    if (!input || typeof input !== 'string') {
        return res.status(400).json({ message: 'Invalid or missing input string' });
    }

    const result = await processChallenge(input, env);

    res.status(200).json({
      message: `${result.successes} challenges successfully created, ${result.errors} errors occurred and ${result.duplicates} duplicates`
    });

  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}
