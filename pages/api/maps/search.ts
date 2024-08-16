import type { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '../../../src/lib/mongodb';
import { WithId, Document } from 'mongodb';
import { Map } from '@/types/map';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Map[] | { message: string }>
) {
  try {
    const client = await clientPromise;
    const db = client.db('Cluster0'); // Replace with your actual database name

    const query = req.query.query as string;
    if (!query) {
      return res.status(400).json({ message: 'Query parameter is required' });
    }

    // Fetch documents from the 'maps' collection that match the search term
    const maps: WithId<Document>[] = await db
      .collection('maps')
      .find({ name: { $regex: query, $options: 'i' } }) // Case-insensitive search
      .sort({ challenges: -1 })
      .toArray();

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
