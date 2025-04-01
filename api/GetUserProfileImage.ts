import DecodedTokenInfo from "@/types/decodedTokenInfo";
import User from "@/types/user";

export const GetUserProfileImage = async (
  tokenInfo: DecodedTokenInfo,
  authToken: string,
  userData?: User | null
): Promise<string | null> => {
  const API_URL = process.env.EXPO_PUBLIC_ENSOULEE_API_URL;
  
  try {
    // If we already have user data with imageFilenames, use it directly
    if (userData && userData.imageFilenames && userData.imageFilenames.length > 0 && tokenInfo.userName) {
      // Construct API URL for the image
      const imageUrl = `${API_URL}api/images/${tokenInfo.userName}/${userData.imageFilenames[0]}`;
      
      // Fetch the image URL
      const response = await fetch(imageUrl, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'x-api-key': tokenInfo.apiKey
        }
      });
      
      if (!response.ok) {
        console.log(`Failed to fetch image: ${response.status}`);
        return null;
      }
      
      // Get the presigned URL from the response
      const presignedUrl = await response.text();
      return presignedUrl;
    } else {
      // If we don't have user data with imageFilenames, return null
      console.log("User data or image filenames not available");
      return null;
    }
  } catch (error) {
    console.error('Error loading user profile image:', error);
    return null;
  }
};