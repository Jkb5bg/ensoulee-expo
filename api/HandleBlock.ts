// api/HandleBlock.ts
import DecodedTokenInfo from "@/types/decodedTokenInfo";

export const HandleBlock = async (
    userInfo: DecodedTokenInfo, 
    token: string, 
    matchId: string, 
    targetUserId: string,
    reason: string,
    details?: string
): Promise<boolean> => {
    try {
        const apiKey = userInfo.apiKey;

        const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/dev/user/block`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'x-api-key': apiKey,
            },
            body: JSON.stringify({
                blockerId: userInfo.userName,
                blockedId: targetUserId,
                matchId: matchId,
                reason: reason,
                details: details || ''
            }),
        });

        if (!response.ok) {
            throw new Error(`Failed to block user: ${response.status}`);
        }

        return true;
    } catch (error) {
        console.error('Error in HandleBlock:', error);
        return false;
    }
};