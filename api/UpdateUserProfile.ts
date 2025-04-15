import DecodedTokenInfo from "@/types/decodedTokenInfo";
import UserProfileDataType from "@/types/userProfileDataType";

export const UpdateUserProfile = async (
  userInfo: DecodedTokenInfo, 
  authToken: string, 
  userData: UserProfileDataType
): Promise<boolean> => {
  const API_URL = process.env.EXPO_PUBLIC_ENSOULEE_API_URL;
  
  try {
    if (!authToken || !userInfo?.apiKey) {
      throw new Error('No valid token or API key');
    }

    const response = await fetch(`${API_URL}/user/self`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        'x-api-key': userInfo.apiKey
      },
      body: JSON.stringify(userData)
    });

    if (!response.ok) {
      console.error('Error response from API:', response.status);
      throw new Error('Failed to update user profile');
    }

    return true;
  } catch (error) {
    console.error('Error updating user profile:', error);
    return false;
  }
};