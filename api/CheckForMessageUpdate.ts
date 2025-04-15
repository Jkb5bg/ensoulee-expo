import DecodedTokenInfo from "@/types/decodedTokenInfo";

export const CheckForMessageUpdate = async (userInfo: DecodedTokenInfo, authToken: string, matchId: string, timestamp: number | string): Promise<boolean> => {
    const API_URL = process.env.EXPO_PUBLIC_ENSOULEE_API_URL;
    try {
        const response = await fetch(API_URL + "matches/update", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
                'x-api-key': userInfo.apiKey
            },
            body: JSON.stringify({
                matchId: matchId,
                timestamp: timestamp
            })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch message update info: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log("Incoming data from the check for messages update", data);
    return false;
    } catch (error) {
        console.log("An error occurred within CheckForMessageUpdateAPI " + error);
        return true;
    }
}