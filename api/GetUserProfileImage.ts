// api/GetUserProfileImage.ts
import DecodedTokenInfo from "@/types/decodedTokenInfo";
import User from "@/types/user";
import { cleanPresignedUrl } from "@/utils/imageHelpers";

export const GetUserProfileImage = async (
  tokenInfo: DecodedTokenInfo,
  authToken: string,
  userData?: User | null
): Promise<string | null> => {
  const API_URL = process.env.EXPO_PUBLIC_ENSOULEE_API_URL;
  
  if (!API_URL) {
    console.error('API URL is undefined');
    return null;
  }
  
  try {
    if (!tokenInfo || !tokenInfo.userName || !authToken) {
      console.warn('Missing required parameters:', { 
        hasTokenInfo: !!tokenInfo,
        hasUserName: tokenInfo?.userName,
        hasAuthToken: !!authToken 
      });
      return null;
    }
    
    // If we have user data with image filenames, use it
    const hasImageFilenames = userData?.imageFilenames && 
                             Array.isArray(userData.imageFilenames) && 
                             userData.imageFilenames.length > 0;
                             
    if (!hasImageFilenames) {
      console.log('No image filenames available');
      return null;
    }
    
    // Take the first filename
    const filename = userData!.imageFilenames[0];
    
    // Construct API URL for the image
    const imageUrl = `${API_URL}api/images/${tokenInfo.userName}/${filename}`;
    
    console.log(`Requesting image URL: ${imageUrl}`);
    
    // Fetch the image URL with better error handling
    const response = await fetch(imageUrl, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'x-api-key': tokenInfo.apiKey || ''
      }
    });
    
    if (!response.ok) {
      console.log(`Failed to fetch image: ${response.status}`);
      const errorText = await response.text();
      console.log(`Error response: ${errorText}`);
      return null;
    }
    
    // Get the presigned URL from the response
    const presignedUrl = await response.text();
    console.log(`Got presigned URL (${presignedUrl.length} chars)`);
    
    // Clean and validate the URL
    return cleanPresignedUrl(presignedUrl);
  } catch (error) {
    console.error('Error loading user profile image:', error);
    return null;
  }
};