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
  const userId = req.cookies.userId || null

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

    console.log("fetching");
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

console.log("finished fetching");




    if (!challenge) {
      res.status(404).json({ message: 'No challenges found for this map' });
    }
    else {
      res.status(200).send(challenge);
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
      userId: req.cookies.userId || null,
    });


    // Log the API call asynchronously, after sending the response
    await Promise.allSettled([logPromise, apiLogPromise]);

  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}
