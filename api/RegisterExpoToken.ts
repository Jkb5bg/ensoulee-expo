import DecodedTokenInfo from "@/types/decodedTokenInfo";
import * as Device from 'expo-device';
import { Platform } from 'react-native';

export const RegisterExpoTokenAPI = async (
  userInfo: DecodedTokenInfo, 
  authToken: string, 
  expoToken: string
): Promise<boolean> => {
  const API_URL = process.env.EXPO_PUBLIC_ENSOULEE_API_URL;
  
  try {
    // Prepare device info
    const deviceInfo = {
      platform: Platform.OS,
      osVersion: Platform.Version.toString(),
      model: Device.modelName || 'Unknown',
      deviceName: Device.deviceName || 'Unknown Device'
    };
    
    // Prepare the payload
    const payload = {
      expoToken: expoToken,
      deviceInfo: deviceInfo
    };
    
    // Log the complete request details
    console.log('===== EXPO TOKEN REGISTRATION DEBUG =====');
    console.log('API URL:', `${API_URL}expo/token/registration`);
    console.log('Headers:', {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken.substring(0, 10)}...`,
      'x-api-key': userInfo.apiKey
    });
    console.log('Payload:', JSON.stringify(payload, null, 2));
    
    // Send the request
    const response = await fetch(`${API_URL}expo/token/registration`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        'x-api-key': userInfo.apiKey
      },
      body: JSON.stringify(payload)
    });
    
    // Log detailed response info
    console.log('Response status:', response.status, response.statusText);
    console.log('Response headers:', JSON.stringify(Object.fromEntries([...response.headers.entries()]), null, 2));
    
    const responseText = await response.text();
    console.log('Response body:', responseText);
    console.log('========================================');

    // Check if response is successful
    if (!response.ok) {
      console.error('Error registering token. Status:', response.status);
      return false;
    }
    
    try {
      // Try to parse the response as JSON if possible
      const jsonResponse = JSON.parse(responseText);
      console.log('Parsed response:', jsonResponse);
      return jsonResponse.success === true;
    } catch {
      // If not JSON, just check if response was ok
      return response.ok;
    }
  } catch (error) {
    console.error('Error registering Expo token:', error);
    // Log more details about the error
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    return false;
  }
};