// pages/api/upload.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { getChallengeInfo } from '@/utils/challenge';
import clientPromise from '../../src/lib/mongodb';

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

  const tasks = matches.map(async (match) => {
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
      } else {
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
        } else {
          mapInfo = {
            "_id": mapId,
            "name": info['map']['name'],
            "description": info['map']['description'],
            "likes": info['map']['likes']
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
  });

  await Promise.all(tasks);
  return { successes, errors, duplicates };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { input } = req.body;

    const client = await clientPromise;
    const result = await processChallenge(input, client);

    res.status(200).json({ message: `${result.successes} challenges successfully created, ${result.errors} errors occurred and ${result.duplicates} duplicates` });
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
