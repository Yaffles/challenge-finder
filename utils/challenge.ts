// utils/challenge.ts

export async function getChallengeInfo(challengeId: string) {
    // Placeholder for actual logic to get challenge info
    // This could be an API call or database query
    console.log(`Fetching info for challenge ID: ${challengeId}`);
    const url = "https://www.geoguessr.com/api/v3/challenges/" + challengeId;

    const response = await fetch(url);
    if (!response.ok) {
      console.error('Failed to fetch challenge info:', response.statusText);
      return null;
    }
    const data = await response.json();
    return data;
  }
