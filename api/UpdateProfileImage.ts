import DecodedTokenInfo from "@/types/decodedTokenInfo";
import * as FileSystem from 'expo-file-system';

export const UploadProfileImage = async (
  userInfo: DecodedTokenInfo,
  authToken: string,
  imageUri: string
): Promise<boolean> => {
  const API_URL = process.env.EXPO_PUBLIC_ENSOULEE_API_URL;
  console.log('Uploading profile image...');
  console.log('API URL:', API_URL);

  try {
    if (!authToken || !userInfo?.apiKey) {
      throw new Error('No valid token or API key');
    }

    // Get local file info
    const fileInfo = await FileSystem.getInfoAsync(imageUri);
    console.log('File exists:', fileInfo.exists);
    
    if (!fileInfo.exists) {
      throw new Error('File does not exist');
    }

    // Determine file type
    let fileType = 'image/jpeg'; // Default
    if (imageUri.endsWith('.png')) {
      fileType = 'image/png';
    } else if (imageUri.endsWith('.gif')) {
      fileType = 'image/gif';
    }

    // Create form data
    const formData = new FormData();
    formData.append('file', {
      uri: imageUri,
      name: 'profile_image.jpg',
      type: fileType,
    } as any);

    // Direct upload to the server
    const response = await fetch(`${API_URL}api/images/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'x-api-key': userInfo.apiKey,
        // Important: Do NOT set Content-Type here, it will be set automatically with the boundary
      },
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', response.status, errorText);
      throw new Error(`Failed to upload image: ${response.status} ${errorText}`);
    }

    // Parse the response
    const data = await response.json();
    console.log('Upload response:', data);

    return true;
  } catch (error) {
    console.error('Error uploading profile image:', error);
    return false;
  }
};