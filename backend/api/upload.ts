import { IRequest } from 'itty-router'; // Use IRequest for easier access to params if needed
import { getChallengeInfo } from '@/utils/challenge';

export interface Env {
  DB: D1Database;
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
      const info = await getChallengeInfo(id);

      if (!info || !info['challenge']) {
        errors += 1;
        return;
      }

      if (info['challenge']['mapSlug'] == 'country-streak') {
        mapId = 'country-streak';
      } else if (info['challenge']['mapSlug'] == 'us-state-streak') {
        mapId = 'us-state-streak';
      } else if (info['map'] && info['map']['id']) {
          mapId = info['map']['id'];
      } else {
          errors += 1;
          return;
      }

      let mapExists = false;
      try {
          const checkMapStmt = db.prepare(
              `SELECT id FROM maps WHERE id = ?1 LIMIT 1`
          ).bind(mapId);
          const mapResult = await checkMapStmt.first();
          mapExists = !!mapResult; // True if mapResult is not null
      } catch (dbError) {
          console.error(`Error checking map existence for mapId ${mapId}:`, dbError);
          errors += 1;
          return;
      }

      if (!mapExists) {
        let mapInfo;
        if (mapId == 'country-streak') {
          mapInfo = {
            "id": mapId,
            "name": "Country Streak",
            "description": "How many countries can you guess in a row?",
            "likes": 50000,
            "challenges": 0
          };
        } else if (mapId == 'us-state-streak') {
          mapInfo = {
            "id": mapId,
            "name": "US State Streak",
            "description": "How many US states can you guess in a row?",
            "likes": 10000,
            "challenges": 0
          };
        } else if (info['map']) {
          mapInfo = {
            "id": mapId,
            "name": info['map']['name'],
            "description": info['map']['description'],
            "likes": info['map']['likes'],
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
             ON CONFLICT(id) DO NOTHING` // Assumes id is PRIMARY KEY
          ).bind(
            mapInfo.id,
            mapInfo.name,
            mapInfo.description,
            mapInfo.likes,
            mapInfo.challenges // Start challenges at 0
          );
          await insertMapStmt.run();
          // We don't increment errors here if the conflict occurs, as it's expected behavior
        } catch (dbError: any) {
          // Catch errors *other* than the conflict (e.g., schema issues, connection errors)
          console.error(`Error inserting map info for mapId ${mapId}:`, dbError);
          errors += 1;
          return;
        }
      } // End if (!mapExists)

      const challengeData = {
        id: id,
        mapId: mapId,
        timeLimit: info.challenge.timeLimit ?? 0, // Default timeLimit if null/undefined
        move: info.challenge.forbidMoving ? 0 : 1,  // Convert boolean to 1/0
        zoom: info.challenge.forbidZooming ? 0 : 1, // Convert boolean to 1/0
        pan: info.challenge.forbidRotating ? 0 : 1,// Convert boolean to 1/0
        streak: info.challenge.gameMode === 'streak' ? 1 : 0 // Convert boolean to 1/0
      };
      let challengeInsertedSuccessfully = false;
      try {
        const insertChallengeStmt = db.prepare(
          `INSERT INTO challenges (id, mapId, timeLimit, move, zoom, pan, streak)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
           ON CONFLICT(id) DO NOTHING` // Assumes id is PRIMARY KEY
        ).bind(
          challengeData.id,
          challengeData.mapId,
          challengeData.timeLimit,
          challengeData.move,
          challengeData.zoom,
          challengeData.pan,
          challengeData.streak
        );

        const insertResult: D1Result = await insertChallengeStmt.run();

        // Check if a row was actually inserted (meta.changes === 1)
        // If meta.changes === 0, it means ON CONFLICT likely occurred (duplicate)
        if (insertResult.meta.changes === 1) {
            challengeInsertedSuccessfully = true;
        } else {
            // This challenge ID already existed
            duplicates += 1;
            // Do not proceed to update map count for duplicates
            return;
        }

      } catch (dbError: any) {
        errors += 1;
        return;
      }

      // --- Increment Map Challenge Count (Only if challenge was newly inserted) ---
      if (challengeInsertedSuccessfully) {
        try {
          const updateMapStmt = db.prepare(
            `UPDATE maps SET challenges = challenges + 1 WHERE id = ?1`
          ).bind(mapId);
          await updateMapStmt.run();
          successes += 1; // Count success only after successful insert AND update
        } catch (dbError: any) {
            console.error(`Error updating challenge count for mapId ${mapId} after inserting challenge ${id}:`, dbError);
            return;
        }
      } // End if (challengeInsertedSuccessfully)

    } catch (error) { // Catch unexpected errors in the overall process logic or getChallengeInfo
      console.error(`Unexpected error processing match for challenge ID ${id || 'unknown'}:`, error);
      errors += 1;
    }
  } // End of inner process function


  const batchSize = 1000;
  let tasks = [];

  for (let i = 0; i < matches.length; i++) {
    tasks.push(process(matches[i]));
    if (tasks.length >= batchSize) {
      await Promise.all(tasks);
      tasks = [];
    }
  }

  // Run remaining tasks
  if (tasks.length > 0) {
    await Promise.all(tasks);
  }

  console.log(`async tasks done.`); // Keep log


  return { successes, errors, duplicates };
}

export async function handleUploadRequest(req: IRequest, env: Env): Promise<Response> {
  if (req.method === 'POST') {
    const { input } = (await req.json()) as { input: string };


    const result = await processChallenge(input, env);

    return new Response(JSON.stringify({ message: `${result.successes} challenges successfully created, ${result.errors} errors occurred and ${result.duplicates} duplicates` }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } else {
    return new Response(JSON.stringify({ message: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
