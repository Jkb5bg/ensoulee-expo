// app/(tabs)/messages/_layout.tsx
import React from 'react';
import { Stack } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { SQLiteProvider, SQLiteDatabase } from 'expo-sqlite';
import { initializeDatabase } from '@/storage/chatStorageSQLite';

/**
 * Database initialization function
 * This is passed to the SQLiteProvider to set up the database when it opens
 */
const setupDatabase = async (db: SQLiteDatabase) => {
  try {
    console.log('Initializing chat database...');
    await initializeDatabase(db);
    console.log('Chat database initialized successfully');
  } catch (error) {
    console.error('Error initializing chat database:', error);
  }
};

export default function MessagesLayout() {
  return (
    <SQLiteProvider databaseName="ensoulee_chats.db" onInit={setupDatabase}>
      <View style={styles.container}>
        <Stack
          screenOptions={{
            headerShown: false, // Never show the Stack header
            contentStyle: { backgroundColor: '#121212' },
            animation: 'slide_from_right',
            animationDuration: 300,
            // Use 'containedModal' for smoother transitions
            presentation: 'containedTransparentModal',
            // Add gesture handling for iOS
            gestureEnabled: true,
            gestureDirection: 'horizontal',
          }}
        >
          <Stack.Screen 
            name="index"
            options={{
              contentStyle: { backgroundColor: '#121212' }
            }} 
          />
          <Stack.Screen 
            name="chat" 
            options={{
              contentStyle: { backgroundColor: '#121212' }
            }} 
          />
        </Stack>
      </View>
    </SQLiteProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212', // Ensure the background is consistently dark
  }
});