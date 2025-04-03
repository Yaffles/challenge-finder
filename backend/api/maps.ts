// src/maps.ts
import { MongoClient, ObjectId, MongoClientOptions } from 'mongodb';

export interface Env {
  MONGODB_URI: string;
}

interface MapDocument {
  _id: ObjectId;          // MongoDB _id field as ObjectId
  name: string;          // Map name
  description: string;   // Map description
  likes: number;         // Number of likes
  challenges: number;    // Number of challenges
}

export async function handleMapsRequest(request: Request, env: Env): Promise<Response> {
  try {
    const url = new URL(request.url);

    const client = new MongoClient(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, // Timeout for server selection
    } as MongoClientOptions);
    const db = client.db('Cluster0');

    // Get query parameters
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '12');
    const skip = (page - 1) * limit;

    const maps = await db
      .collection<MapDocument>('maps')
      .find({})
      .sort({ challenges: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    const formattedMaps = maps.map(map => ({
      _id: map._id.toString(),
      name: map.name,
      description: map.description,
      likes: map.likes,
      challenges: map.challenges
    }));

    return Response.json(formattedMaps);
  } catch (e) {
    console.error(e);
    return Response.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
