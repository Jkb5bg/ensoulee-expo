import DecodedTokenInfo from "@/types/decodedTokenInfo";

export const HandleUnmatch = async (userInfo: DecodedTokenInfo, token: string, matchId: string): Promise<boolean> => {
    try {
        const apiKey = userInfo.apiKey;

        const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/dev/matches`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'x-api-key': apiKey,
            },
            body: JSON.stringify({ matchId }),
        });

        if (!response.ok) {
            throw new Error(`Failed to unmatch: ${response.status}`);
        }

        return true;
    } catch (error) {
        console.error('Error in HandleUnmatch:', error);
        return false;
    }
};