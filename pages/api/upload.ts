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

  const db = client.db('Cluster0'); // Replace with your actual database name
  const collection = db.collection('maps');
  const challengesCollection = db.collection('challenges');

  const tasks = matches.map(async (match) => {
    try {
      let id = match.split("/").pop();
      if (!id) {
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
        } catch (error) {
          errors += 1;
          return;
        }
      }

      const challengeDoc = {
        "_id": id,
        "mapId": mapId
      };
      try {
        await challengesCollection.insertOne(challengeDoc);
      } catch (error: any) {
        if (error.code === 11000) {
          return;
        } else {
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
  return { successes, errors };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { input } = req.body;
    console.log('Received input:', input);

    const client = await clientPromise;
    const result = await processChallenge(input, client);

    res.status(200).json({ message: `${result.successes} challenges successfully created, ${result.errors} errors occurred` });
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
