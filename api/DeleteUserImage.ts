import DecodedTokenInfo from "@/types/decodedTokenInfo";
import User from "@/types/user";

/**
 * Delete a single image from the user's profile
 * @param userInfo The user's decoded token information
 * @param authToken JWT auth token
 * @param filename The filename of the image to delete
 * @returns Promise<boolean> True if deletion was successful
 */
export const DeleteUserImage = async (
  userInfo: DecodedTokenInfo, 
  authToken: string, 
  filename: string,
): Promise<boolean> => {
  const API_URL = process.env.EXPO_PUBLIC_ENSOULEE_API_URL;

  try {
    const response = await fetch(`${API_URL}api/images/${filename}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'x-api-key': userInfo.apiKey
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to delete image: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return true;
  } catch (error) {
    console.error("An error occurred while deleting image:", error);
    return false;
  }
};

/**
 * Delete multiple images from the user's profile
 * @param userInfo The user's decoded token information
 * @param authToken JWT auth token
 * @param filenames Array of filenames to delete
 * @returns Promise with deletion results
 */
export const DeleteUserImages = async (
  userInfo: DecodedTokenInfo,
  authToken: string,
  filenames: string[]
): Promise<{ 
  success: boolean; 
  deletedImages: string[]; 
  failedImages: string[]; 
  message: string;
}> => {
  const API_URL = process.env.EXPO_PUBLIC_ENSOULEE_API_URL;

  try {
    // Convert array of filenames to comma-separated string for the API
    const filenamesParam = filenames.join(',');
    
    const response = await fetch(`${API_URL}api/images/batch/${filenamesParam}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'x-api-key': userInfo.apiKey
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to batch delete images: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("An error occurred during batch image deletion:", error);
    return {
      success: false,
      deletedImages: [],
      failedImages: filenames,
      message: `Error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
};

/**
 * Get all images for a user
 * @param userInfo The user's decoded token information
 * @param authToken JWT auth token
 * @returns Promise with array of image URLs
 */
export const GetUserImages = async (
  userInfo: DecodedTokenInfo,
  authToken: string,
  user: User
): Promise<{ filename: string; url: string }[]> => {
  const API_URL = process.env.EXPO_PUBLIC_ENSOULEE_API_URL;

  try {
    // First get the list of image filenames
    const listResponse = await fetch(`${API_URL}api/images/list`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'x-api-key': userInfo.apiKey
      }
    });

    if (!listResponse.ok) {
      throw new Error(`Failed to get image list: ${listResponse.status}`);
    }

    const filenames: string[] = await listResponse.json();
    
    if (!filenames.length) {
      return [];
    }

    // Then fetch the signed URL for each image
    const imageUrls = await Promise.all(
      filenames.map(async (filename) => {
        const urlResponse = await fetch(
          `${API_URL}api/images/${user.userName}/${filename}`,
          {
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'x-api-key': userInfo.apiKey
            }
          }
        );

        if (urlResponse.ok) {
          const url = await urlResponse.text();
          return { filename, url };
        }
        
        return null;
      })
    );

    return imageUrls.filter(Boolean) as { filename: string; url: string }[];
  } catch (error) {
    console.error("Error getting user images:", error);
    return [];
  }
};