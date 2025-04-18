// api/PostQuizAnswers.ts
import DecodedTokenInfo from "@/types/decodedTokenInfo";

export const PostQuizAnswers = async (userInfo: DecodedTokenInfo, authToken: string, answerHashes: string[]): Promise<string | undefined> => {
    const API_URL = process.env.EXPO_PUBLIC_ENSOULEE_API_URL;
    try {
        const response = await fetch(`${API_URL}/quiz/answers`, {
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
            console.log(errorText);
            throw new Error('Failed to submit answers');
        }

        return await response.text();
    } catch (error) {
        console.error('Error submitting answers:', error);
        throw error;
    }
};