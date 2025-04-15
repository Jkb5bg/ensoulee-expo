// storage/migration.ts
import * as SecureStore from 'expo-secure-store';
import { SQLiteDatabase } from 'expo-sqlite';
import MessageType from '@/types/MessageType';
import { saveChatMessages } from './chatStorageSQLite';

// Key prefix for the old SecureStore-based storage
const CHAT_STORAGE_PREFIX = 'chat_messages_';

/**
 * Migrate chats from SecureStore to SQLite database
 * This should be called once after updating your app
 */
export async function migrateFromSecureStoreToSQLite(
  db: SQLiteDatabase
): Promise<{ success: boolean; migrated: number; errors: number }> {
  console.log('Starting migration from SecureStore to SQLite...');
  
  // Stats to track migration progress
  const stats = {
    success: false,
    migrated: 0,
    errors: 0
  };
  
  try {
    // We can't list all keys in SecureStore, so we'll check for known match IDs
    // This would need to be adapted to your specific use case
    // You could store a list of match IDs somewhere, or try to get them from your backend
    
    // For this example, let's assume we have a list of match IDs
    const matchIds = await getKnownMatchIds();
    
    console.log(`Found ${matchIds.length} potential chats to migrate`);
    
    // Migrate each chat to SQLite
    for (const matchId of matchIds) {
      try {
        const key = `${CHAT_STORAGE_PREFIX}${matchId}`;
        const storedData = await SecureStore.getItemAsync(key);
        
        if (storedData) {
          try {
            const parsedData = JSON.parse(storedData);
            
            if (parsedData.messages && Array.isArray(parsedData.messages)) {
              // Store in SQLite
              await saveChatMessages(db, matchId, parsedData.messages);
              
              // Delete from SecureStore to free up space
              await SecureStore.deleteItemAsync(key);
              
              stats.migrated++;
              console.log(`Successfully migrated chat ${matchId}`);
            } else {
              console.warn(`Invalid chat data format for ${matchId}`);
            }
          } catch (parseError) {
            console.error(`Error parsing data for chat ${matchId}:`, parseError);
            stats.errors++;
          }
        }
      } catch (chatError) {
        console.error(`Error migrating chat ${matchId}:`, chatError);
        stats.errors++;
      }
    }
    
    stats.success = true;
    console.log(`Migration completed. Migrated: ${stats.migrated}, Errors: ${stats.errors}`);
  } catch (error) {
    console.error('Migration failed:', error);
    stats.success = false;
  }
  
  return stats;
}

/**
 * Get a list of known match IDs
 * This is just an example - you'll need to implement this based on your app's architecture
 */
async function getKnownMatchIds(): Promise<string[]> {
  // Option 1: Get IDs from a list you store in AsyncStorage or elsewhere
  // Option 2: Try to extract from known SecureStore patterns
  // Option 3: Get from your backend API
  
  // For this example, we'll simulate finding keys in SecureStore
  // In a real app, you might want to maintain a registry of chats somewhere
  const matchIds: string[] = [];
  
  // This is where you'd add your logic to get match IDs
  // For example, you might have them stored in your app state
  // or you could fetch them from your backend
  
  return matchIds;
}

/**
 * Check if migration is needed
 * You can call this at app startup to determine if migration should run
 */
export async function isMigrationNeeded(): Promise<boolean> {
  try {
    // Check if we've already completed migration
    const migrationCompleted = await SecureStore.getItemAsync('sqlite_migration_completed');
    
    if (migrationCompleted === 'true') {
      return false;
    }
    
    // Check if there are any chats in SecureStore
    const hasChatsInSecureStore = await checkForChatsInSecureStore();
    
    return hasChatsInSecureStore;
  } catch (error) {
    console.error('Error checking migration status:', error);
    return false;
  }
}

/**
 * Check if there are any chats stored in SecureStore
 */
async function checkForChatsInSecureStore(): Promise<boolean> {
  // Again, you'll need to adapt this to your specific use case
  // This is just a placeholder
  
  // For example, you might check a few known match IDs
  return false;
}

/**
 * Mark migration as completed
 */
export async function markMigrationCompleted(): Promise<void> {
  await SecureStore.setItemAsync('sqlite_migration_completed', 'true');
}