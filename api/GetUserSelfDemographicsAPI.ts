import DecodedTokenInfo from "@/types/decodedTokenInfo"

export const GetUserSelfDemographicsAPI = async (userInfo: DecodedTokenInfo, authToken: string): Promise<String[] | undefined> => {
    const API_URL = process.env.EXPO_PUBLIC_ENSOULEE_API_URL;
    try {
        const response = await fetch(API_URL + "user/demographics", {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
                'x-api-key': userInfo.apiKey
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to fetch user info: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();     
        return data;  
    } catch (error) {
        console.log("An error occurred within GetUserSelfDemgoraphicsAPI " + error);
        return undefined
    }
}