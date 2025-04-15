// storage/chatStorageSQLite.ts
import { SQLiteDatabase } from 'expo-sqlite';
import MessageType from '@/types/MessageType';

// Database name
const DB_NAME = 'chats.db';

// Map to track sync status
const syncInProgressMap = new Map<string, boolean>();

/**
 * Initialize database and tables
 */
export async function initializeDatabase(db: SQLiteDatabase): Promise<void> {
  try {
    // Set WAL mode for better performance
    await db.execAsync('PRAGMA journal_mode = WAL;');
    
    // Create chats table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS chats (
        match_id TEXT PRIMARY KEY,
        last_synced INTEGER
      );
    `);
    
    // Create messages table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        match_id TEXT,
        content TEXT,
        sender_id TEXT,
        timestamp INTEGER,
        pending INTEGER DEFAULT 0,
        FOREIGN KEY (match_id) REFERENCES chats (match_id)
      );
    `);
    
    // Create index for faster queries
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_match_timestamp 
      ON messages (match_id, timestamp);
    `);
    
    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

/**
 * Save chat messages and update last synced time
 */
export async function saveChatMessages(
  db: SQLiteDatabase,
  matchId: string, 
  messages: MessageType[]
): Promise<void> {
  try {
    const now = Date.now();
    
    // Use a transaction for atomicity
    await db.execAsync('BEGIN TRANSACTION;');
    
    try {
      // Insert or update chat entry with new sync time
      await db.runAsync(
        'INSERT OR REPLACE INTO chats (match_id, last_synced) VALUES (?, ?);',
        [matchId, now]
      );
      
      // Delete existing messages for this match
      await db.runAsync('DELETE FROM messages WHERE match_id = ?;', [matchId]);
      
      // Insert all messages
      for (const message of messages) {
        await db.runAsync(
          `INSERT INTO messages (match_id, content, sender_id, timestamp, pending)
           VALUES (?, ?, ?, ?, ?);`,
          [
            matchId,
            message.content,
            message.senderId,
            message.timestamp,
            message.pending ? 1 : 0
          ]
        );
      }
      
      // Commit the transaction
      await db.execAsync('COMMIT;');
      console.log(`Saved ${messages.length} messages for ${matchId}`);
    } catch (error) {
      // Rollback the transaction on error
      await db.execAsync('ROLLBACK;');
      throw error;
    }
  } catch (error) {
    console.error('Error in saveChatMessages:', error);
    throw error;
  }
}

/**
 * Get chat messages from database
 */
export async function getChatMessages(
  db: SQLiteDatabase,
  matchId: string
): Promise<{ messages: MessageType[], lastSynced: number } | null> {
  try {
    // Get last synced time for this chat
    const chatResult = await db.getFirstAsync<{ last_synced: number }>(
      'SELECT last_synced FROM chats WHERE match_id = ?;',
      [matchId]
    );
    
    if (!chatResult) {
      // No chat found
      return null;
    }
    
    // Get messages for this chat
    const messagesResult = await db.getAllAsync<{
      content: string;
      sender_id: string;
      timestamp: number;
      pending: number;
    }>(
      `SELECT content, sender_id, timestamp, pending 
       FROM messages 
       WHERE match_id = ? 
       ORDER BY timestamp ASC;`,
      [matchId]
    );
    
    // Convert result to MessageType array
    const messages: MessageType[] = messagesResult.map(row => ({
      content: row.content,
      senderId: row.sender_id,
      timestamp: row.timestamp,
      pending: row.pending === 1
    }));
    
    console.log(`Loaded ${messages.length} messages for ${matchId}`);
    return { 
      messages, 
      lastSynced: chatResult.last_synced 
    };
  } catch (error) {
    console.error('Error in getChatMessages:', error);
    return null;
  }
}

/**
 * Add a single message to the database
 */
export async function addMessageToStorage(
  db: SQLiteDatabase,
  matchId: string,
  message: MessageType
): Promise<void> {
  try {
    // Ensure chat exists with updated sync time
    const now = Date.now();
    
    // Begin transaction
    await db.execAsync('BEGIN TRANSACTION;');
    
    try {
      // Insert or update chat entry
      await db.runAsync(
        'INSERT OR REPLACE INTO chats (match_id, last_synced) VALUES (?, ?);',
        [matchId, now]
      );
      
      // Insert the message
      await db.runAsync(
        `INSERT INTO messages (match_id, content, sender_id, timestamp, pending)
         VALUES (?, ?, ?, ?, ?);`,
        [
          matchId,
          message.content,
          message.senderId,
          message.timestamp,
          message.pending ? 1 : 0
        ]
      );
      
      // Commit transaction
      await db.execAsync('COMMIT;');
      console.log(`Added message to ${matchId}`);
    } catch (error) {
      // Rollback on error
      await db.execAsync('ROLLBACK;');
      throw error;
    }
  } catch (error) {
    console.error('Error in addMessageToStorage:', error);
    throw error;
  }
}

/**
 * Update a message in the database
 */
export async function updateMessageInStorage(
  db: SQLiteDatabase,
  matchId: string,
  timestamp: number,
  updates: Partial<MessageType>
): Promise<void> {
  try {
    // Start building the query
    let query = 'UPDATE messages SET ';
    const queryParams: any[] = [];
    
    // Add fields to update
    if (updates.content !== undefined) {
      query += 'content = ?, ';
      queryParams.push(updates.content);
    }
    
    if (updates.pending !== undefined) {
      query += 'pending = ?, ';
      queryParams.push(updates.pending ? 1 : 0);
    }
    
    // Remove trailing comma and space
    query = query.slice(0, -2);
    
    // Add WHERE clause
    query += ' WHERE match_id = ? AND timestamp = ?;';
    queryParams.push(matchId, timestamp);
    
    // Execute the query if we have fields to update
    if (queryParams.length > 2) { // matchId and timestamp are always included
      await db.runAsync(query, queryParams);
      console.log(`Updated message in ${matchId} at timestamp ${timestamp}`);
    }
  } catch (error) {
    console.error('Error in updateMessageInStorage:', error);
    throw error;
  }
}

/**
 * Clear all messages for a specific chat
 */
export async function clearChatStorage(
  db: SQLiteDatabase,
  matchId: string
): Promise<void> {
  try {
    // Use a transaction for atomicity
    await db.execAsync('BEGIN TRANSACTION;');
    
    try {
      // Delete messages for this match
      await db.runAsync('DELETE FROM messages WHERE match_id = ?;', [matchId]);
      
      // Delete chat entry
      await db.runAsync('DELETE FROM chats WHERE match_id = ?;', [matchId]);
      
      // Commit the transaction
      await db.execAsync('COMMIT;');
      console.log(`Cleared chat storage for ${matchId}`);
    } catch (error) {
      // Rollback on error
      await db.execAsync('ROLLBACK;');
      throw error;
    }
  } catch (error) {
    console.error('Error in clearChatStorage:', error);
    throw error;
  }
}

/**
 * Get the timestamp of the most recent message
 */
export async function getLastMessageTimestamp(
  db: SQLiteDatabase,
  matchId: string
): Promise<number | null> {
  try {
    const result = await db.getFirstAsync<{ latest_timestamp: number | null }>(
      `SELECT MAX(timestamp) as latest_timestamp 
       FROM messages 
       WHERE match_id = ?;`,
      [matchId]
    );
    
    if (!result || result.latest_timestamp === null) {
      return null;
    }
    
    return result.latest_timestamp;
  } catch (error) {
    console.error('Error in getLastMessageTimestamp:', error);
    return null;
  }
}

/**
 * Sync tracking methods
 */
export function setSyncInProgress(matchId: string, inProgress: boolean): void {
  syncInProgressMap.set(matchId, inProgress);
  console.log(`Sync ${inProgress ? 'started' : 'completed'} for ${matchId}`);
}

export function isSyncInProgress(matchId: string): boolean {
  return syncInProgressMap.get(matchId) || false;
}