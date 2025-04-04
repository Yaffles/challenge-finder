import { IRequest } from 'itty-router'; // Use IRequest for easier access to params if needed
import { MongoClient, MongoClientOptions } from 'mongodb';

import { parse } from 'cookie';
import { ExecutionContext } from '@cloudflare/workers-types'; // Import type

export interface Env {
  MONGODB_URI: string;
}

export async function handleChallengeRequest(req: IRequest, env: Env, ctx: ExecutionContext): Promise<Response> {
  const mapId = req.params?.id;
  const type = req.query.type as string | undefined;
  const timeLimit = req.query.timeLimit as string | undefined;
  const cookies = parse(req.headers.get('Cookie') || '');
  const userId = cookies.userId || null; // Access the specific cookie


  if (!mapId || typeof mapId !== 'string') {
    return new Response(JSON.stringify({ message: 'Missing challenge ID' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const client = new MongoClient(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, // Timeout for server selection
    } as MongoClientOptions);

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

  // Step 1: Get all played challenge IDs for the user
const playedChallenges = await db.collection('log')
.find({ userId: userId, mapId: mapId })
.project({ challengeId: 1 })
.toArray();

  // Extract challenge IDs into an array
  const playedChallengeIds = playedChallenges.map(log => log.challengeId);

  // Step 2: Use aggregation to find a random challenge that is not played
  const randomChallenge = await db.collection('challenges').aggregate([
  {
    $match: {
      ...match,
      _id: { $nin: playedChallengeIds }
    }
  },
  {
    $sample: { size: 1 } // This selects a random document
  }
  ]).toArray();

  // Ensure we have a challenge before accessing
  const challenge = randomChallenge.length > 0 ? randomChallenge[0]._id.toString() : null;



  let response: Response;
    if (!challenge) {
      response = new Response(JSON.stringify({ message: 'No challenges found for this map' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    else {
      // response with the challenge ID in plain text 200
      response = new Response(challenge, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    }


    const apiLogPromise = db.collection('api_logs').updateOne(
      { endpoint: '/api/challenge/[mapId]' },
      { $inc: { count: 1 } },
      { upsert: true } // Create the document if it doesn't exist
    );

    const logPromise = db.collection('log').insertOne({
      mapId: mapId,
      challengeId: challenge || null,
      move: match.move,
      pan: match.pan,
      zoom: match.zoom,
      timeLimit: match.timeLimit, // Only include if relevant
      timestamp: new Date(),
      success: !!challenge, // whether the API request was successful or not
      userId: userId || null,
    });

    ctx.waitUntil(Promise.all([apiLogPromise, logPromise]));

    return response;

  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ message: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
