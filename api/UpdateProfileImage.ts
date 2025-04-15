import DecodedTokenInfo from "@/types/decodedTokenInfo";
import * as FileSystem from 'expo-file-system';

export const UploadProfileImage = async (
  userInfo: DecodedTokenInfo,
  authToken: string,
  imageUri: string
): Promise<boolean> => {
  const API_URL = process.env.EXPO_PUBLIC_ENSOULEE_API_URL;

  try {
    if (!authToken || !userInfo?.apiKey) {
      throw new Error('No valid token or API key');
    }

    // First, get a pre-signed URL for the image upload
    const presignedUrlResponse = await fetch(`${API_URL}/user/self/image/upload-url`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        'x-api-key': userInfo.apiKey
      }
    });

    if (!presignedUrlResponse.ok) {
      throw new Error('Failed to get image upload URL');
    }

    const { uploadUrl, key } = await presignedUrlResponse.json();

    // Upload the image to the pre-signed URL
    const fileInfo = await FileSystem.getInfoAsync(imageUri);
    if (!fileInfo.exists) {
      throw new Error('File does not exist');
    }

    const fileType = imageUri.split('.').pop()?.toLowerCase();
    let mimeType = 'image/jpeg'; // Default
    if (fileType === 'png') {
      mimeType = 'image/png';
    } else if (fileType === 'gif') {
      mimeType = 'image/gif';
    }

    const uploadResponse = await FileSystem.uploadAsync(uploadUrl, imageUri, {
      httpMethod: 'PUT',
      headers: {
        'Content-Type': mimeType
      },
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT
    });

    if (uploadResponse.status !== 200) {
      throw new Error('Failed to upload image');
    }

    // Notify backend that the image is uploaded and should be associated with the user
    const confirmResponse = await fetch(`${API_URL}/user/self/image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        'x-api-key': userInfo.apiKey
      },
      body: JSON.stringify({ key })
    });

    if (!confirmResponse.ok) {
      throw new Error('Failed to confirm image upload');
    }

    return true;
  } catch (error) {
    console.error('Error uploading profile image:', error);
    return false;
  }
};