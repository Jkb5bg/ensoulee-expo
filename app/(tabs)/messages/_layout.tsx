import React from 'react';
import { Stack } from 'expo-router';
import { View } from 'react-native';
import { useAppContext } from '@/components/TabsContext';

export default function MessagesLayout() {
  const { setCustomHeader } = useAppContext();
  
  return (
    <View style={{ flex: 1, backgroundColor: '#121212' }}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#121212' },
          animation: 'slide_from_right',
          // Slightly faster animation for smoother transition
          animationDuration: 250,
          presentation: 'card', // Changed from 'modal' to 'card'
          gestureEnabled: true,
          gestureDirection: 'horizontal',
        }}
      >
        <Stack.Screen 
          name="index" 
          listeners={{
            beforeRemove: () => {
              // Set custom header to true before navigating away
              setCustomHeader(true);
            },
          }}
        />
        <Stack.Screen 
          name="chat" 
          options={{
            contentStyle: { backgroundColor: '#121212' }
          }}
          listeners={{
            beforeRemove: () => {
              // Reset custom header when navigating back from chat
              setCustomHeader(false);
            },
          }}
        />
      </Stack>
    </View>
  );
}