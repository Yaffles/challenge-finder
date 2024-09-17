import type { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '../../../src/lib/mongodb';
import { ObjectId, WithId, Document } from 'mongodb';

type Challenge = {
  _id: string;
  mapId: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<string | { message: string }>
) {
  const { mapId } = req.query;
  const type = req.query.type as string | undefined;
  const timeLimit = req.query.timeLimit as string | undefined;

  if (!mapId || typeof mapId !== 'string') {
    res.status(400).json({ message: 'Invalid mapId' });
    return;
  }

  try {
    const client = await clientPromise;
    const db = client.db('Cluster0'); // Replace with your actual database name



    const match: any = { mapId };

    if (type === 'm') {
      match.move = true;
      match.pan = true;
      match.zoom = true;
    } else if (type === 'nm') {
      match.move = false;
      match.pan = true;
      match.zoom = true;
    } else if (type == 'nmpz') {
      match.move = false;
      match.pan = false;
      match.zoom = false;
    }

    if (timeLimit && timeLimit !== '0') {
      if (timeLimit === '360') {
        match.timeLimit = 0;
      } else {
        match.timeLimit = parseInt(timeLimit);
      }
    }

    const [challenge] = await db
      .collection('challenges')
      .aggregate([
        { $match: match },   // Match documents with the specific mapId
        { $sample: { size: 1 } } // Randomly select one document
      ])
      .toArray();



    if (!challenge) {
      res.status(404).json({ message: 'No challenges found for this map' });
    }
    else {
      res.status(200).send(challenge._id);
    }


    const apiLogPromise = db.collection('api_logs').updateOne(
      { endpoint: '/api/challenge/[mapId]' },
      { $inc: { count: 1 } },
      { upsert: true } // Create the document if it doesn't exist
    );
    const logPromise = db.collection('log').insertOne({
      mapId: mapId,
      move: match.move,
      pan: match.pan,
      zoom: match.zoom,
      timeLimit: match.timeLimit, // Only include if relevant
      timestamp: new Date(),
      success: !!challenge, // whether the API request was successful or not
    });


    // Log the API call asynchronously, after sending the response
    await Promise.allSettled([logPromise, apiLogPromise]);

  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}
