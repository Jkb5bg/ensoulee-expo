import DecodedTokenInfo from "@/types/decodedTokenInfo";

export const PostDemoQuizAnswers = async (userInfo: DecodedTokenInfo, authToken: string, answerHashes: string[]): Promise<string[] | undefined> => {
    const API_URL = process.env.EXPO_PUBLIC_ENSOULEE_API_URL;
    try {
        const response = await fetch(`${API_URL}/user/demographics`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
                'x-api-key': userInfo.apiKey
            },
            body: JSON.stringify(answerHashes)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error:', errorText);
            throw new Error('Failed to submit demographics answers');
        }

        return answerHashes;
    } catch (error) {
        console.error('Error in PostQuizAnswers:', error);
        throw error;
    }
};