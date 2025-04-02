// api/HandleReport.ts
import DecodedTokenInfo from "@/types/decodedTokenInfo";

export const HandleReport = async (
    userInfo: DecodedTokenInfo, 
    token: string, 
    matchId: string, 
    targetUserId: string,
    reason: string,
    details?: string
): Promise<boolean> => {
    try {
        const apiKey = userInfo.apiKey;

        const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/dev/user/report`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'x-api-key': apiKey,
            },
            body: JSON.stringify({
                reporterId: userInfo.userName,
                reportedId: targetUserId,
                matchId: matchId,
                reason: reason,
                details: details || ''
            }),
        });

        if (!response.ok) {
            throw new Error(`Failed to report user: ${response.status}`);
        }

        return true;
    } catch (error) {
        console.error('Error in HandleReport:', error);
        return false;
    }
};