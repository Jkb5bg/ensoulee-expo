import DecodedTokenInfo from "@/types/decodedTokenInfo";
import Swipe from "@/types/swipe";

export const HandleSwipe = async(userInfo: DecodedTokenInfo, authToken: string, swipe: Swipe): Promise<boolean> => {
    const API_URL = process.env.EXPO_PUBLIC_ENSOULEE_API_URL;

    try {
        const response = await fetch(`${API_URL}stack/swipe`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
                'x-api-key': userInfo.apiKey
            },
            body: JSON.stringify(swipe)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to record swipe: ${response.status} ${response.statusText} - ${errorText}`);
        }

        return true;
    } catch (error) {
        console.error("An error occurred within HandleSwipeAPI: ", error);
        return false;
    }
}