import DecodedTokenInfo from "@/types/decodedTokenInfo";

interface MessageUpdateResponse {
  isMostRecent: boolean;
}

export const CheckForMessageUpdate = async (
  userInfo: DecodedTokenInfo,
  authToken: string,
  matchId: string,
  timestamp: number | string
): Promise<boolean> => {
  const API_URL = process.env.EXPO_PUBLIC_ENSOULEE_API_URL;
  try {
    const response = await fetch(`${API_URL}matches/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        'x-api-key': userInfo.apiKey
      },
      body: JSON.stringify({ matchId, timestamp })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to fetch message update info: ` +
        `${response.status} ${response.statusText} – ${errorText}`
      );
    }

    const { isMostRecent } = (await response.json()) as MessageUpdateResponse;
    console.log("Incoming data from the check for messages update", { isMostRecent });

    // if it's not the most recent, there _are_ updates → return true
    return !isMostRecent;
  } catch (error) {
    console.error("An error occurred within CheckForMessageUpdateAPI:", error);
    // on error, fallback to syncing
    return true;
  }
};
