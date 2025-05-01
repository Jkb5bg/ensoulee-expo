import DecodedTokenInfo from "@/types/decodedTokenInfo";
import User from "@/types/user";
import AsyncStorage from '@react-native-async-storage/async-storage';

// Interface for image data returned from API
export interface UserImageData {
  filename: string;
  url: string;
}

// Cache key prefix
const IMAGE_CACHE_PREFIX = 'user_images_';

/**
 * Get all images for a user with signed URLs
 * @param userInfo The user's decoded token information
 * @param authToken JWT auth token
 * @param user
 * @returns Promise with array of image data objects
 */
export const GetUserImages = async (
  userInfo: DecodedTokenInfo,
  authToken: string,
  user: User
): Promise<UserImageData[]> => {
  if (!userInfo?.userName || !userInfo?.apiKey || !authToken) {
    console.log("Missing prerequisites for image loading");
    return [];
  }

  const API_URL = process.env.EXPO_PUBLIC_ENSOULEE_API_URL;
  const cacheKey = `${IMAGE_CACHE_PREFIX}${user.userName}`;

  try {
    // Try to load from cache first
    const cachedImagesStr = await AsyncStorage.getItem(cacheKey);
    if (cachedImagesStr) {
      const cachedData = JSON.parse(cachedImagesStr);
      // Check if cache is still valid (less than 15 minutes old)
      const cacheTime = new Date(cachedData.timestamp);
      const now = new Date();
      const minutesDiff = (now.getTime() - cacheTime.getTime()) / (1000 * 60);
      
      if (minutesDiff < 15) {
        console.log("Using cached user images");
        return cachedData.images;
      }
    }

    // Fetch all images at once from the API
    const response = await fetch(`${API_URL}api/images/user/all`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'x-api-key': userInfo.apiKey
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get images: ${response.status}`);
    }

    const imageDataArray: UserImageData[] = await response.json();
    
    // Cache the image data
    const cacheData = {
      images: imageDataArray,
      timestamp: new Date().toISOString()
    };
    await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
    
    return imageDataArray;
  } catch (error) {
    console.error("Error getting user images:", error);
    return [];
  }
};

/**
 * Clear the image cache for a specific user
 * @param userName The username to clear cache for
 */
export const ClearUserImagesCache = async (userName: string): Promise<void> => {
  try {
    await AsyncStorage.removeItem(`${IMAGE_CACHE_PREFIX}${userName}`);
    console.log(`Cleared image cache for user: ${userName}`);
  } catch (error) {
    console.error("Error clearing user images cache:", error);
  }
};

/**
 * Get profile image URL (first image in the array) for a user
 * @param userInfo The user's decoded token information 
 * @param authToken JWT auth token
 * @returns Promise with the URL string or null
 */
export const GetUserProfileImageURL = async (
  userInfo: DecodedTokenInfo,
  authToken: string,
  user: User
): Promise<string | null> => {
  try {
    const images = await GetUserImages(userInfo, authToken, user);
    if (images.length > 0) {
      return images[0].url;
    }
    return null;
  } catch (error) {
    console.error("Error getting profile image URL:", error);
    return null;
  }
};