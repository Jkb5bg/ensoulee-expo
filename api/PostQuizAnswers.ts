import DecodedTokenInfo from "@/types/decodedTokenInfo";

export const PostQuizAnswers = async (userInfo: DecodedTokenInfo, authToken: string): Promise<String[] | undefined> => {
    const API_URL = process.env.EXPO_PUBLIC_ENSOULEE_API_URL;
    try {
        const response = await fetch(API_URL + "/quiz/answers",
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`,
                    'x-api-key': userInfo.apiKey
                },
                body: 
            }
        )
    }
}