import type { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '../../src/lib/mongodb';
import { WithId, Document } from 'mongodb';
import { Map } from '@/types/map';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Map[] | { message: string }>
) {
  try {
    const client = await clientPromise;
    const db = client.db('Cluster0'); // Replace with your actual database name

    const page = parseInt(req.query.page as string) || 1; // Default to page 1 if not provided
    const limit = parseInt(req.query.limit as string) || 12; // Default to 10 documents per page if not provided
    const sortByLikes = !!(parseInt(req.query.sortByLikes as string) || 0); // Sort by no of challenges by default
    const skip = (page - 1) * limit;

    // Fetch all documents from the 'maps' collection sorted by number of challenges
    const maps: WithId<Document>[] = await db
      .collection('maps')
      .find({})
      .sort(sortByLikes ? { likes: -1 } : { challenges: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();
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
