import { IRequest } from 'itty-router';
import { MongoClient, MongoClientOptions } from 'mongodb';
import { WithId, Document } from 'mongodb';
import { Map } from '@/types/map';

export interface Env {
  MONGODB_URI: string;
}

export async function handleSearchRequest(req: IRequest, env: Env): Promise<Response> {
  try {
    const query = req.query.query as string;
    if (!query) {
      return new Response(JSON.stringify({ message: 'Query parameter is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const client = new MongoClient(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, // Timeout for server selection
    } as MongoClientOptions);
    const db = client.db('Cluster0'); // Replace with your actual database name

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

    return new Response(JSON.stringify(formattedMaps), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ message: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
