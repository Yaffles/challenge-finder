import { IRequest } from 'itty-router'; // Use IRequest for easier access to params if needed
import { MongoClient, MongoClientOptions } from 'mongodb';


import { getChallengeInfo } from '@/utils/challenge';

export interface Env {
  MONGODB_URI: string;
}

async function processChallenge(input: string, client: any) {
  let regex = /geoguessr\.com\/challenge\/[A-Za-z0-9]+/g;
  let matches = input.match(regex);
  if (!matches) return { successes: 0, errors: 0 };

  let successes = 0;
  let errors = 0;
  let duplicates = 0;

  const db = client.db('Cluster0'); // Replace with your actual database name
  const collection = db.collection('maps');
  const challengesCollection = db.collection('challenges');

  async function process(match: string) {
    try {
      let idMatch = match.match(/geoguessr\.com\/challenge\/([A-Za-z0-9]+)/);
      let id;
      if (idMatch && idMatch[1]) {
        id = idMatch[1];
      } else {
        errors += 1;
        return;
      }
      let info = await getChallengeInfo(id);

      if (!info) {
        errors += 1;
        return;
      }

      let mapId;
      if (info['challenge']['mapSlug'] == 'country-streak') {
        mapId = 'country-streak';
      } else if (info['challenge']['mapSlug'] == 'us-state-streak') {
        mapId = 'us-state-streak';
      } else if (info['map']) {
        try {
          mapId = info['map']['id'];
        } catch (error) {
          errors += 1;
          return;
        }
      }

      const query = { _id: mapId };
      const mapExists = await collection.findOne(query);

      if (!mapExists) {
        let mapInfo;
        if (mapId == 'country-streak') {
          mapInfo = {
            "_id": mapId,
            "name": "Country Streak",
            "description": "How many countries can you guess in a row?",
            "likes": 50000
          };
        } else if (mapId == 'us-state-streak') {
          mapInfo = {
            "_id": mapId,
            "name": "US State Streak",
            "description": "How many US states can you guess in a row?",
            "likes": 10000
          };
        } else if (info['map']) {
          mapInfo = {
            "_id": mapId,
            "name": info['map']['name'],
            "description": info['map']['description'],
            "likes": info['map']['likes'],
            "challenges": 0
          };
        }
        try {
          await collection.insertOne(mapInfo);
        } catch (error: any) {
          if (error.code === 11000) {
            // not an error as from simultaneous creations

          }
          else {
            console.log('Error inserting map info:', error); // Debugging statement
            errors += 1;
            return;
          }

        }
      }

      const challengeDoc = {
        "_id": id,
        "mapId": mapId,
        "timeLimit": info.challenge.timeLimit,
        'move': !info.challenge.forbidMoving,
        'zoom': !info.challenge.forbidZooming,
        'pan': !info.challenge.forbidRotating,
        'streak': info.challenge.gameMode === 'streak'
      };
      try {
        await challengesCollection.insertOne(challengeDoc);
      } catch (error: any) {
        if (error.code === 11000) {
          // console.log('Duplicate challenge ID:', id); // Debugging statement
          duplicates += 1;
          return;
        } else {
          console.log('Error inserting challenge doc:', error); // Debugging statement
          errors += 1;
          return;
        }
      }

      const mapUpdate = { $inc: { challenges: 1 } };
      try {
        await collection.updateOne(query, mapUpdate);
      } catch (error) {
        errors += 1;
        return;
      }


      successes += 1;
    } catch (error) {
      errors += 1;
    }
  };

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

export async function handleUploadRequest(req: IRequest, env: Env): Promise<Response> {
  if (req.method === 'POST') {
    const { input } = (await req.json()) as { input: string };

    const client = new MongoClient(env.MONGODB_URI, {
          serverSelectionTimeoutMS: 5000, // Timeout for server selection
        } as MongoClientOptions);
    const result = await processChallenge(input, client);

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
