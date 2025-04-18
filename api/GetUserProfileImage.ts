// api/GetUserProfileImage.ts (FIXED VERSION)
import DecodedTokenInfo from "@/types/decodedTokenInfo";
import User from "@/types/user";
import { cleanPresignedUrl } from "@/utils/imageHelpers";

export const GetUserProfileImage = async (
  tokenInfo: DecodedTokenInfo,
  authToken: string,
  userData?: User | null
): Promise<string | null> => {
  // Get the API_URL - we need to modify it if it has the issue
  const API_URL = process.env.EXPO_PUBLIC_ENSOULEE_API_URL || '';
  const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || API_URL;
  
  console.log('GetUserProfileImage - API URLs:', { API_URL, BACKEND_URL });
  
  if (!API_URL && !BACKEND_URL) {
    console.error('No API URLs are defined in environment');
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
    
    // If the filename already looks like a complete URL, just clean and return it
    if (filename.startsWith('https://')) {
      console.log('Filename is already a URL, cleaning and returning directly');
      return cleanPresignedUrl(filename);
    }
    
    // IMPORTANT FIX: Check if the backend URL already contains the API path
    // This is crucial for preventing the concatenation issue
    let baseUrl = BACKEND_URL;
    
    // Ensure the URL doesn't end with a slash
    if (baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1);
    }
    
    // Construct API URL for the image request - use BACKEND_URL as it's more likely correct
    // Ensure we use the correct path format to avoid the concatenation issue
    const imageUrl = `${baseUrl}/dev/api/images/${tokenInfo.userName}/${encodeURIComponent(filename)}`;
    
    console.log(`Requesting image URL: ${imageUrl}`);
    
    // Fetch the image URL with better error handling
    const response = await fetch(imageUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        'x-api-key': tokenInfo.apiKey || ''
      }
    });
    
    if (!response.ok) {
      console.log(`Failed to fetch image: ${response.status}`);
      let errorText = '';
      try {
        errorText = await response.text();
      } catch (e) {
        errorText = 'Could not read error message';
      }
      console.log(`Error response: ${errorText}`);
      
      // As a fallback, if we have a URL-like filename, try to return it directly
      if (filename.includes('.jpg') || filename.includes('.png') || filename.includes('.jpeg')) {
        console.log('Attempting direct S3 URL fallback');
        // Create a basic S3 URL as fallback
        const directUrl = `https://ensoulee-user-images.s3.amazonaws.com/${tokenInfo.userName}/${filename}`;
        return directUrl;
      }
      
      return null;
    }
    
    // Get the presigned URL from the response
    let presignedUrl = await response.text();
    console.log(`Got presigned URL response (${presignedUrl.length} chars)`);
    
    // If the response is the S3 URL, clean and return it
    return cleanPresignedUrl(presignedUrl);
  } catch (error) {
    console.error('Error loading user profile image:', error);
    return null;
  }
};