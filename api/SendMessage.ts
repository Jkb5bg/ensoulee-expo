import DecodedTokenInfo from "@/types/decodedTokenInfo";

export const SendMessage = async (userInfo: DecodedTokenInfo, matchId: string, recipientId: string, senderId: string, timestamp: number, token: string, messageContent: string): Promise<String[] | undefined> => {
    try {
        const response = await fetch(`${process.env.EXPO_PUBLIC_ENSOULEE_API_URL}messages/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${token}`,
                'x-api-key': userInfo.apiKey,
            },
            body: JSON.stringify({
                matchId,
                content: messageContent,
                recipientId

            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to send message: ${response.status} ${response.statusText} - ${errorText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error sending message:', error);
        throw error; // Re-throw to allow handling by caller
    }
};