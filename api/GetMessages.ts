// api/GetMessages.ts
import DecodedTokenInfo from "@/types/decodedTokenInfo"
import MessageType from "@/types/MessageType";

export const GetMessages = async (userInfo: DecodedTokenInfo, matchId: string, authToken: string): Promise<{ messages: MessageType[] } | undefined> => {
    const API_URL = process.env.EXPO_PUBLIC_ENSOULEE_API_URL;
    try {
        const token = authToken;
        const apiKey = userInfo.apiKey;

        if (!token || !apiKey) {
            throw new Error('No token or API key available');
        }

        const response = await fetch(
            `${process.env.EXPO_PUBLIC_BACKEND_URL}/dev/messages/${matchId}`,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'x-api-key': apiKey,
                }
            }
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log(`Fetched ${data.messages?.length || 0} messages}`);

        return data;

    } catch (error) {
        console.log("An error occurred while retreiving messages:", error);
        return undefined;
    }
}