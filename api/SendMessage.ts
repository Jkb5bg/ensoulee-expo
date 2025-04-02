import DecodedTokenInfo from "@/types/decodedTokenInfo";

export const SendMessage = async (userInfo: DecodedTokenInfo, matchId: string, recipientId: string, senderId: string, timestamp: number, token: string, messageContent: string): Promise<String[] | undefined> => {
    const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/dev/messages/send`, {
        method: 'POST',
        headers: {
            'Content-Type': 'applcation/json',
            'Authorization': `Bearer ${token}`,
            'x-api-key': userInfo.apiKey,
        },
        body: JSON.stringify({
            matchId,
            content: messageContent,
            recipientId: recipientId,
            senderId: senderId,
            timestamp: timestamp
        }),
    });

    if (!response.ok) throw new Error('Failed to send message');
}