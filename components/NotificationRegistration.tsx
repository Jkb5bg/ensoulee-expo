import React, { useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '@/components/AuthContext';
import { RegisterExpoTokenAPI } from '@/api/RegisterExpoToken';

// Key for storing registration status
const EXPO_TOKEN_REGISTERED_KEY = 'expo_token_registered';

interface NotificationRegistrationProps {
  expoPushToken: string;
}

export default function NotificationRegistration({ expoPushToken }: NotificationRegistrationProps) {
  const [isTokenRegistered, setIsTokenRegistered] = useState(false);
  const auth = useAuth();

  useEffect(() => {
    const registerTokenWithBackend = async () => {
      // Skip if no token or already registered
      if (!expoPushToken || isTokenRegistered) return;
      
      try {
        // Check if we have stored that this token is already registered
        const storedStatus = await SecureStore.getItemAsync(EXPO_TOKEN_REGISTERED_KEY);
        const storedToken = await SecureStore.getItemAsync('expo_push_token');
        
        // If token changed or not yet stored, we need to register
        const tokenChanged = storedToken !== expoPushToken;
        
        // If token is the same and already registered, skip registration
        if (storedStatus === 'true' && !tokenChanged) {
          console.log('Expo token already registered with backend');
          setIsTokenRegistered(true);
          return;
        }
        
        // Make sure user is authenticated before registering
        if (!auth.isAuthenticated || !auth.userInfo) {
          console.log('User not authenticated, skipping token registration');
          return;
        }
        
        // Get a valid token for API call
        const validToken = await auth.getValidToken();
        if (!validToken) {
          console.log('No valid auth token available, skipping registration');
          return;
        }
        
        // Register the token with the backend
        const success = await RegisterExpoTokenAPI(
          auth.userInfo, 
          validToken, 
          expoPushToken
        );
        
        if (success) {
          console.log('Successfully registered Expo token with backend');
          // Save registration status and token to SecureStore
          await SecureStore.setItemAsync(EXPO_TOKEN_REGISTERED_KEY, 'true');
          await SecureStore.setItemAsync('expo_push_token', expoPushToken);
          setIsTokenRegistered(true);
        } else {
          console.log('Failed to register token with backend, will try again later');
        }
      } catch (error) {
        console.error('Error in registerTokenWithBackend:', error);
      }
    };

    registerTokenWithBackend();
  }, [expoPushToken, auth.isAuthenticated, auth.userInfo, isTokenRegistered]);

  // This is a non-visual component
  return null;
}