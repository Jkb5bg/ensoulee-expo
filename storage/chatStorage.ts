// storage/chatStorage.ts
import * as SecureStore from 'expo-secure-store';
import MessageType from '@/types/MessageType';

// Key prefix for chat storage
const CHAT_STORAGE_PREFIX = 'chat_messages_';
const CHAT_LAST_SYNCED_PREFIX = 'chat_last_synced_';

// Flag to track if a sync operation is in progress for a specific chat
// This helps prevent duplicate API calls
const syncInProgressMap = new Map<string, boolean>();

// Set sync in progress flag
export const setSyncInProgress = (matchId: string, inProgress: boolean) => {
  syncInProgressMap.set(matchId, inProgress);
};

// Check if sync is in progress
export const isSyncInProgress = (matchId: string): boolean => {
  return syncInProgressMap.get(matchId) || false;
};

// Interface for chat storage
interface ChatStorage {
  messages: MessageType[];
  lastSynced: number; // timestamp of last successful sync
}

/**
 * Save chat messages to secure storage
 */
export const saveChatMessages = async (
  matchId: string, 
  messages: MessageType[]
): Promise<void> => {
  try {
    const chatStorage: ChatStorage = {
      messages,
      lastSynced: Date.now()
    };
    
    await SecureStore.setItemAsync(
      `${CHAT_STORAGE_PREFIX}${matchId}`,
      JSON.stringify(chatStorage)
    );
  } catch (error) {
    console.error('Error saving chat messages:', error);
    throw error;
  }
};

/**
 * Get chat messages from secure storage
 */
export const getChatMessages = async (
  matchId: string
): Promise<ChatStorage | null> => {
  try {
    const storedData = await SecureStore.getItemAsync(`${CHAT_STORAGE_PREFIX}${matchId}`);
    
    if (!storedData) {
      return null;
    }
    
    return JSON.parse(storedData) as ChatStorage;
  } catch (error) {
    console.error('Error getting chat messages:', error);
    return null;
  }
};

/**
 * Add a new message to existing chat in secure storage
 */
export const addMessageToStorage = async (
  matchId: string,
  message: MessageType
): Promise<void> => {
  try {
    const existingChat = await getChatMessages(matchId);
    
    if (existingChat) {
      const updatedMessages = [...existingChat.messages, message];
      await saveChatMessages(matchId, updatedMessages);
    } else {
      await saveChatMessages(matchId, [message]);
    }
  } catch (error) {
    console.error('Error adding message to storage:', error);
    throw error;
  }
};

/**
 * Update a message in storage (e.g., when confirming a pending message)
 */
export const updateMessageInStorage = async (
  matchId: string,
  timestamp: number,
  updates: Partial<MessageType>
): Promise<void> => {
  try {
    const existingChat = await getChatMessages(matchId);
    
    if (!existingChat) return;
    
    const updatedMessages = existingChat.messages.map(msg => 
      msg.timestamp === timestamp ? { ...msg, ...updates } : msg
    );
    
    await saveChatMessages(matchId, updatedMessages);
  } catch (error) {
    console.error('Error updating message in storage:', error);
    throw error;
  }
};

/**
 * Clear all chat data for a specific match
 */
export const clearChatStorage = async (matchId: string): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync(`${CHAT_STORAGE_PREFIX}${matchId}`);
  } catch (error) {
    console.error('Error clearing chat storage:', error);
    throw error;
  }
};

/**
 * Get the timestamp of the most recent message
 * This can be used to fetch only newer messages from the backend
 */
export const getLastMessageTimestamp = async (matchId: string): Promise<number | null> => {
  try {
    const chatStorage = await getChatMessages(matchId);
    
    if (!chatStorage || chatStorage.messages.length === 0) {
      return null;
    }
    
    // Sort messages by timestamp (descending) and get the most recent
    const sortedMessages = [...chatStorage.messages].sort((a, b) => b.timestamp - a.timestamp);
    return sortedMessages[0].timestamp;
  } catch (error) {
    console.error('Error getting last message timestamp:', error);
    return null;
  }
};