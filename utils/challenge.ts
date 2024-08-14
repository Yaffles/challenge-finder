// utils/challenge.ts

export async function getChallengeInfo(challengeId: string) {
    const retries = 3;
    const delay = 3000; // 3 seconds
    const url = "https://www.geoguessr.com/api/v3/challenges/" + challengeId;
    console.log(`Fetching info for challenge ID: ${challengeId}`);

    for (let i = 0; i < retries; i++) {
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        return data;
      }

      console.error(`Failed to fetch challenge info for ID ${challengeId}: ${response.statusText}`);
      console.log(`Retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    return null;
  }
