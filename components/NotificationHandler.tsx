// components/NotificationHandler.tsx
import React, { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { Platform } from 'react-native';
import { useAuth } from '@/components/AuthContext';
import { GetUserMatches } from '@/api/GetUserMatches';
import MatchType from '@/types/matchType';

/**
 * NotificationHandler - Manages push notification responses and navigation
 * 
 * Compatible with the existing backend ExpoNotificationService
 */
const NotificationHandler: React.FC = () => {
  // References to store notification subscriptions for cleanup
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();
  
  // Get auth context for user info and API calls
  const { userInfo, authTokens, getValidToken } = useAuth();

  useEffect(() => {
    // Set up notification received listener
    // This triggers when a notification is received while the app is open
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received in foreground:', notification);
      
      // Extract and log the notification data
      const data = notification.request.content.data;
      console.log('Notification data:', data);
      
      // We could update unread message count or show in-app notification here
    });

    // Set up notification response listener
    // This triggers when a user taps on a notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response received:', response);
      handleNotificationResponse(response);
    });

    // Clean up both listeners on unmount
    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  /**
   * Extract data from notification and navigate accordingly
   */
  const handleNotificationResponse = async (response: Notifications.NotificationResponse) => {
    try {
      // Get data from the notification
      const data = response.notification.request.content.data;
      console.log('Notification data:', data);

      // Check if this is a message notification with a matchId
      if (data && (data.matchId || data.conversationId)) {
        const matchId = data.matchId || data.conversationId;
        console.log('Message notification tapped for conversation:', matchId);
        
        // Initialize match variable with a nullable type
        let match: MatchType | undefined = undefined;
        
        // We need to get additional information about the match
        // since the notification might not include sender details
        if (userInfo && authTokens?.idToken) {
          try {
            const token = await getValidToken();
            if (token) {
              // Get all matches to find this one
              const matchesResponse = await GetUserMatches(userInfo, token);
              
              if (matchesResponse && Array.isArray(matchesResponse)) {
                // Cast the response to the expected type (String[] from API -> MatchType[])
                const matches = matchesResponse as unknown as MatchType[];
                
                // Find the match by ID
                match = matches.find(m => 
                  m.matchId === matchId || m.id === matchId
                );
                
                if (match) {
                  console.log('Found match details:', match.matchedUser?.name);
                }
              }
            }
          } catch (error) {
            console.error('Error getting match details:', error);
          }
        }
        
        // Prepare navigation params based on available info
        const navParams: {
          matchId: string;
          userId?: string;
          userName?: string;
          profileImage?: string;
        } = {
          matchId: matchId as string, // Cast to string if it's not already
        };
        
        // Add user info if available from the match
        if (match && match.matchedUser) {
          navParams.userId = match.matchedUser.id;
          navParams.userName = match.matchedUser.name;
          
          if (match.matchedUser.profileImage) {
            navParams.profileImage = match.matchedUser.profileImage;
          }
        }
        
        // Fall back to data from notification if match wasn't found
        if (!navParams.userId && data.senderId) {
          navParams.userId = data.senderId as string;
        }
        
        if (!navParams.userName) {
          // Use sender name from notification title or fall back to "Unknown"
          navParams.userName = response.notification.request.content.title || "Unknown";
        }
        
        // Platform-specific navigation approach
        if (Platform.OS === 'ios') {
          // On iOS, we need a slight delay to avoid navigation issues
          setTimeout(() => {
            // Navigate to the messages tab first
            router.navigate('/(tabs)/messages');
            
            // Then to the specific chat screen
            setTimeout(() => {
              router.navigate({
                pathname: '/messages/chat',
                params: navParams
              });
            }, 300);
          }, 100);
        } else {
          // On Android, we can go directly to the chat screen
          router.navigate({
            pathname: '/messages/chat',
            params: navParams
          });
        }
      } else {
        // Generic notification with no specific target
        console.log('Generic notification tapped, navigating to messages tab');
        router.navigate('/(tabs)/messages');
      }
    } catch (error) {
      console.error('Error handling notification response:', error);
      // Fallback to messages screen on error
      router.navigate('/(tabs)/messages');
    }
  };

  // This is a non-visual component, so it doesn't render anything
  return null;
};

export default NotificationHandler;