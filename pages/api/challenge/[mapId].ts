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

  if (!mapId || typeof mapId !== 'string') {
    res.status(400).json({ message: 'Invalid mapId' });
    return;
  }

  try {
    const client = await clientPromise;
    const db = client.db('Cluster0'); // Replace with your actual database name

    const [challenge] = await db
      .collection('challenges')
      .aggregate([
        { $match: { mapId } },   // Match documents with the specific mapId
        { $sample: { size: 1 } } // Randomly select one document
      ])
      .toArray();

    if (!challenge) {
        res.status(404).json({ message: 'No challenges found for this map' });
        return;
    }

    res.status(200).send(challenge._id);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}
