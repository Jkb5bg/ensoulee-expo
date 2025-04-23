// api/GetUserProfile.ts
import DecodedTokenInfo from "@/types/decodedTokenInfo";
import UserProfileType from "@/types/userProfileType";

export const GetUserProfile = async (userInfo: DecodedTokenInfo, authToken: string, userName: string): Promise<UserProfileType | undefined> => {
    const API_URL = process.env.EXPO_PUBLIC_ENSOULEE_API_URL;
    try {
        const response = await fetch(`${API_URL}/user/profile`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
                'x-api-key': userInfo.apiKey
            },
            body: JSON.stringify({ userName: userName})
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.log(errorText);
            throw new Error('Failed to retrieve user profile');
        }
        const data = await response.json();
        console.log(data);
        return await data;
    } catch (error) {
        console.error('Error retrieving user profile:', error);
        throw error;
    }
};