import type { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '../../src/lib/mongodb';
import { WithId, Document } from 'mongodb';

type Map = {
  _id: string;
  name: string;
  description: string;
  likes: number;
  challenges: number;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Map[] | { message: string }>
) {
  try {
    const client = await clientPromise;
    const db = client.db('Cluster0'); // Replace with your actual database name

    // get query params for 'challenges'
    const minChallenges = req.query.challenges;
    const total = req.query.total; // get query param for 'total'

    // Fetch all documents from the 'maps' collection
    const query: any = {}
    if (minChallenges) {
      query.challenges = { $gte: parseInt(minChallenges as string) }
    }

    // Fetch all documents from the 'maps' collection
    const maps: WithId<Document>[] = await db.collection('maps').find(query).toArray()

    // const maps: WithId<Document>[] = await db.collection('maps').find({}).toArray();

    // Transform the documents into Map[] type
    const formattedMaps: Map[] = maps.map(map => ({
      _id: map._id.toString(),
      name: map.name,
      description: map.description,
      likes: map.likes,
      challenges: map.challenges
    }));

    res.status(200).json(formattedMaps);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}
