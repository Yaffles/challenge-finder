interface ChallengeInfo {
  challenge: {
    mapSlug: string;
    timeLimit: number;
    forbidMoving: boolean;
    forbidZooming: boolean;
    forbidRotating: boolean;
    gameMode: string;
  };
  map?: {
    id: string;
    name: string;
    description: string;
    likes: number;
  };
}

export async function getChallengeInfo(challengeId: string): Promise<ChallengeInfo | null> {
  const retries = 3;
  const delay = 3000; // 3 seconds
  const timeout = 10000; // 10 seconds
  const url = "https://www.geoguessr.com/api/v3/challenges/" + challengeId;
  console.log(`Fetching info for challenge ID: ${challengeId}`);

  for (let i = 0; i < retries; i++) {
      try {
          const controller = new AbortController();
          const id = setTimeout(() => controller.abort(), timeout);

          const response = await fetch(url, { signal: controller.signal });
          clearTimeout(id);

          if (response.ok) {
              const data = await response.json() as ChallengeInfo;
              return data;
          }

          console.error(`Failed to fetch challenge info for ID ${challengeId}: ${response.statusText}`);
      } catch (error: any) {
          if (error.name === 'AbortError') {
              console.error(`Fetch request timed out for challenge ID ${challengeId}`);
          } else {
              console.error(`Error fetching challenge info for ID ${challengeId}:`, error);
          }
      }

      console.log(`Retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
  }

  return null;
}
