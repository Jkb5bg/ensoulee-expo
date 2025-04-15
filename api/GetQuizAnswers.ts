// api/GetQuizAnswers.ts
import DecodedTokenInfo from "@/types/decodedTokenInfo";

export const GetQuizAnswers = async (userInfo: DecodedTokenInfo, authToken: string): Promise<Record<string, string> | null> => {
    const API_URL = process.env.EXPO_PUBLIC_ENSOULEE_API_URL;
    try {
        if (!authToken || !userInfo?.apiKey) {
            throw new Error('No valid token or API key');
        }

        const response = await fetch(`${API_URL}/user/self/quiz`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
                'x-api-key': userInfo.apiKey
            },
        });

        if (!response.ok) {
            console.log(response);
            throw new Error('Failed to fetch answers');
        }

        return await response.json();
    } catch (error) {
        console.error('Error retrieving answers from backend:', error);
        return null;
    }
};