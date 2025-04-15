import DecodedTokenInfo from "@/types/decodedTokenInfo";

export const GetDemographicsAnswers = async (userInfo: DecodedTokenInfo, authToken: string): Promise<any> => {
    const API_URL = process.env.EXPO_PUBLIC_ENSOULEE_API_URL;
    try {
        const response = await fetch(API_URL + "user/demographics", {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
                'x-api-key': userInfo.apiKey
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to fetch demographics answers: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        console.log("Incoming data from the demographics answers", data);
        return data;
    } catch (error) {
        console.log("An error occurred within GetDemographicsAnswersAPI " + error);
        return {};
    }
}