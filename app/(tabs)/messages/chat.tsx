// app/(tabs)/messages/chat.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  SafeAreaView,
  Dimensions,
  Platform,
  ActivityIndicator,
  Alert
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/components/AuthContext';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '@/components/TabsContext';
import { useSQLiteContext } from 'expo-sqlite';
import { GetMessages } from '@/api/GetMessages';
import { SendMessage } from '@/api/SendMessage';
import { HandleUnmatch } from '@/api/HandleUnmatch';
import MessageType from '@/types/MessageType';
import UserActionMenu from '@/components/UserActionMenu';
import {
  getChatMessages,
  saveChatMessages,
  addMessageToStorage,
  updateMessageInStorage,
  getLastMessageTimestamp,
  setSyncInProgress,
  isSyncInProgress,
  clearChatStorage
} from '@/storage/chatStorageSQLite';
import { CheckForMessageUpdate } from '@/api/CheckForMessageUpdate';

const DEFAULT_AVATAR = require('@/assets/images/default-avatar.png');
const { width, height } = Dimensions.get('window');
const isSmallDevice = height < 700;
const isLargeDevice = height > 800;

const chatHeaderPaddingTop = Platform.OS === 'ios' 
  ? (isSmallDevice ? 30 : (isLargeDevice ? 50 : 40))
  : (isSmallDevice ? 20 : 30);

const chatHeaderHeight = Platform.OS === 'ios' 
  ? (isSmallDevice ? 120 : (isLargeDevice ? 160 : 140))
  : (isSmallDevice ? 100 : 120);

export default function ChatScreen() {
  // Get route params
  const params = useLocalSearchParams();
  const matchId = params.matchId as string;
  const userName = params.userName as string;
  const userId = params.userId as string;
  const profileImage = params.profileImage as string;
  
  // Context and state
  const { user, userInfo, authTokens } = useAuth();
  const { setCustomHeader } = useAppContext();
  const db = useSQLiteContext();
  
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingMessages, setSyncingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const token = authTokens?.idToken || '';
  
  // Set custom header when component mounts
  useEffect(() => {
    setCustomHeader(true);
    // Cleanup function
    return () => setCustomHeader(false);
  }, []);
  
  // Load messages from local storage first
  const loadLocalMessages = useCallback(async () => {
    if (!matchId) return null;
    
    try {
      console.log(`Loading local messages for chat ${matchId}`);
      
      const storedData = await getChatMessages(db, matchId);
      
      if (storedData && storedData.messages.length > 0) {
        console.log(`Found ${storedData.messages.length} messages in local storage`);
        setMessages(storedData.messages);
        
        // Scroll to bottom on initial load
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: false });
        }, 100);
        
        return storedData.lastSynced;
      } else {
        console.log(`No messages found in local storage for chat ${matchId}`);
      }
      
      return null;
    } catch (error) {
      console.error('Error loading local messages:', error);
      return null;
    }
  }, [db, matchId]);
  
  // Fetch messages from backend
  const fetchMessages = useCallback(async (lastSynced?: number) => {
    if (!matchId || !userInfo || !user) {
      setLoading(false);
      return;
    }

    // Check if sync is already in progress
    if (isSyncInProgress(matchId)) {
      console.log(`Sync already in progress for chat ${matchId}, skipping`);
      return;
    }

    // Set sync flag
    setSyncInProgress(matchId, true);
    
    try {
      // If we're just syncing (not initial load), show a subtle syncing indicator
      if (lastSynced) {
        setSyncingMessages(true);
      }

      if (!token) {
        throw new Error('No token available');
      }

      console.log(`Fetching messages from backend for chat ${matchId}`);
      const data = await GetMessages(userInfo, matchId, token);
      
      if (data && data.messages && data.messages.length > 0) {
        console.log(`Received ${data.messages.length} messages from backend`);
        
        // If we loaded from local storage first, we might need to merge messages
        if (lastSynced && messages.length > 0) {
          // Find messages newer than our last sync
          const newMessages = data.messages.filter(
            msg => msg.timestamp > lastSynced
          );
          
          console.log(`Found ${newMessages.length} new messages since last sync`);
          
          if (newMessages.length > 0) {
            // Merge with existing messages, avoiding duplicates
            const existingTimestamps = new Set(
              messages.map(msg => msg.timestamp)
            );
            
            const uniqueNewMessages = newMessages.filter(
              msg => !existingTimestamps.has(msg.timestamp)
            );
            
            console.log(`Found ${uniqueNewMessages.length} unique new messages to add`);
            
            if (uniqueNewMessages.length > 0) {
              // Create a new array once outside of setState to avoid multiple renders
              const updatedMessages = [...messages, ...uniqueNewMessages].sort(
                (a, b) => a.timestamp - b.timestamp
              );
              
              setMessages(updatedMessages);
              
              // Save the updated list to local storage
              await saveChatMessages(db, matchId, updatedMessages);
              
              // Scroll to bottom if new messages
              setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
              }, 100);
            }
          }
        } else {
          // First load, just set messages and save to storage
          console.log('First load or no local messages, saving all to storage');
          setMessages(data.messages);
          await saveChatMessages(db, matchId, data.messages);
          
          // Scroll to bottom
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: false });
          }, 100);
        }
      } else {
        console.log('No messages received from backend');
        if (!lastSynced) {
          // Only save empty state if this is the initial load
          setMessages([]);
          await saveChatMessages(db, matchId, []);
        }
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      
      // Only show alert on initial load, not during background sync
      if (!lastSynced) {
        Alert.alert('Error', 'Failed to load messages');
      }
    } finally {
      setLoading(false);
      setSyncingMessages(false);
      setSyncInProgress(matchId, false);
    }
  // Only include stable dependencies to prevent re-runs
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, matchId, user?.userName, userInfo?.userName, token]);

  // Inside your component where you need to check for updates
const checkForUpdates = async () => {
  if (!matchId || !userInfo || !authTokens?.idToken) return;
  
  try {
    // Get the most recent timestamp from local storage
    const latestTimestamp = await getLastMessageTimestamp(db, matchId);
    
    if (latestTimestamp) {
      // Check if there are newer messages on the server
      const hasUpdates = await CheckForMessageUpdate(
        userInfo, 
        authTokens.idToken, 
        matchId, 
        latestTimestamp
      );

      if (hasUpdates == true) {
        // If there are updates, fetch the new messages
        fetchMessages(latestTimestamp);
      }
    }
  } catch (error) {
    console.error('Error checking for message updates:', error);
  }
};

  // Handle sending a message
  const handleSendMessage = useCallback(async () => {
    if (!newMessage.trim() || !matchId || !user || !userInfo || !db) return;
  
    const messageContent = newMessage.trim();
    const timestamp = Date.now();
    
    // Get the sender ID
    const senderId = user?.userName || userInfo?.userName || "unknown";
  
    try {
      // Clear input immediately for better UX
      setNewMessage('');
  
      // Create temp message
      const tempMessage: MessageType = {
        content: messageContent,
        senderId: senderId, 
        timestamp,
        pending: true
      };
  
      // Update local state
      setMessages(prev => [...prev, tempMessage]);
  
      // Add to local storage immediately
      await addMessageToStorage(db, matchId, tempMessage);
  
      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
  
      if (!token) {
        throw new Error('No token available');
      }
  
      // Send to backend
      await SendMessage(
        userInfo,
        matchId,
        userId,
        senderId,
        timestamp,
        token,
        messageContent
      );
  
      // Update pending status in state
      setMessages(prev => 
        prev.map(msg =>
          msg.timestamp === timestamp ? { ...msg, pending: false } : msg
        )
      );
      
      // Update pending status in storage
      await updateMessageInStorage(db, matchId, timestamp, { pending: false });
      
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
      
      // Remove failed message from state
      setMessages(prev => prev.filter(msg => msg.timestamp !== timestamp));
      
      // Remove failed message from storage
      try {
        // Get current messages
        const storedData = await getChatMessages(db, matchId);
        if (storedData) {
          // Filter out the failed message
          const updatedMessages = storedData.messages.filter(
            msg => msg.timestamp !== timestamp
          );
          // Save the updated list
          await saveChatMessages(db, matchId, updatedMessages);
        }
      } catch (storageError) {
        console.error('Error removing failed message from storage:', storageError);
      }
    }
  }, [newMessage, matchId, user, userInfo, db, token, userId]);

  // Load messages on component mount
  useEffect(() => {
    let isMounted = true;
    
    const loadMessages = async () => {
      if (!matchId || !db || !userInfo || !authTokens?.idToken) return;
      
      try {
        const storedData = await getChatMessages(db, matchId);
        const lastSynced = storedData?.lastSynced;
        
        // Important: check if component is still mounted
        if (!isMounted) return;
        
        // If we have local messages, show them immediately
        if (storedData && storedData.messages.length > 0) {
          setMessages(storedData.messages);
          setLoading(false);
          
          // Find the most recent message timestamp
          let latestTimestamp = null;
          if (storedData.messages.length > 0) {
            // Sort by timestamp descending and get the first one
            const sortedMessages = [...storedData.messages].sort((a, b) => b.timestamp - a.timestamp);
            latestTimestamp = sortedMessages[0].timestamp;
          }
          
          // Check if there are newer messages on the server
          if (latestTimestamp) {
            try {
              console.log(`Checking for updates since timestamp ${latestTimestamp}`);
              const hasUpdates = await CheckForMessageUpdate(
                userInfo,
                authTokens.idToken,
                matchId,
                latestTimestamp
              );
              
              if (hasUpdates == true) {
                console.log('New messages available, fetching updates');
                fetchMessages(latestTimestamp);
              } else {
              }
            } catch (error) {
              console.error('Error checking for message updates:', error);
              
              // Fallback to time-based sync if the check fails
              const now = Date.now();
              const shouldSync = !lastSynced || (now - lastSynced) > 30000; // 30 seconds
              
              if (shouldSync) {
                // Sync in background
                fetchMessages(lastSynced);
              }
            }
          } else {
            // No messages with timestamps, do a time-based sync
            const now = Date.now();
            const shouldSync = !lastSynced || (now - lastSynced) > 30000; // 30 seconds
            
            if (shouldSync) {
              // Sync in background
              fetchMessages(lastSynced);
            } else {
              console.log(`Skipping backend sync - last synced ${Math.round((now - lastSynced)/1000)}s ago`);
            }
          }
        } else {
          // No local messages, do a full fetch
          fetchMessages();
        }
      } catch (error) {
        console.error('Error in loadMessages:', error);
        if (isMounted) {
          setLoading(false);
          Alert.alert('Error', 'Failed to load messages');
        }
      }
    };
    
    loadMessages();
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
      
      // Release sync lock if component unmounts during sync
      if (matchId && isSyncInProgress(matchId)) {
        setSyncInProgress(matchId, false);
      }
    };
  // Only include stable dependencies to prevent re-runs
  // eslint-disable-next-line react-hooks/exhaustive-deps  
  }, [db, matchId, userInfo, authTokens]);

  // Refreshing logic - pull to refresh
  const handleRefresh = useCallback(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Render message bubble
  const renderMessageItem = ({ item }: { item: MessageType }) => {
    const isCurrentUser = item.senderId === (user?.userName || userInfo?.userName);
    
    return (
      <View style={[
        styles.messageBubble,
        isCurrentUser ? styles.currentUserMessage : styles.otherUserMessage,
        item.pending && styles.pendingMessage
      ]}>
        <Text style={[
          styles.messageText,
          !isCurrentUser && { color: '#333' } // Darker text for received messages
        ]}>
          {item.content}
        </Text>
        <Text style={[
          styles.messageTime,
          !isCurrentUser && { color: 'rgba(0, 0, 0, 0.5)' } // Darker time for received messages
        ]}>
          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          {item.pending && ' • Sending...'}
        </Text>
      </View>
    );
  };

  // Render empty chat view
  const renderEmptyChat = () => (
    <View style={styles.emptyChatContainer}>
      <Text style={styles.emptyChatText}>No messages yet</Text>
      <Text style={styles.emptyChatSubtext}>
        Send a message to start the conversation!
      </Text>
    </View>
  );

  // Handle user blocking
  const handleBlock = async (targetUserId: string, reason: string, details?: string) => {
    if (!user || !userInfo) return;

    try {
      if (!token) return;
      
      // You would need to create a HandleBlock API function similar to HandleUnmatch
      // await HandleBlock(userInfo, token, matchId, targetUserId, reason, details);
      
      Alert.alert('Success', 'User has been blocked');
      router.back();
    } catch (error) {
      console.error('Error blocking user:', error);
      Alert.alert('Error', 'Failed to block user');
    }
  };

  // Handle user reporting
  const handleReport = async (targetUserId: string, reason: string, details?: string) => {
    if (!user || !userInfo) return;

    try {
      if (!token) return;
      
      // You would need to create a HandleReport API function
      // await HandleReport(userInfo, token, matchId, targetUserId, reason, details);
      
      Alert.alert('Success', 'User has been reported');
    } catch (error) {
      console.error('Error reporting user:', error);
      Alert.alert('Error', 'Failed to report user');
    }
  };

  // Handle unmatch
  const handleUnmatch = async () => {
    if (!user || !userInfo || !db) return;

    try {
      if (!token) return;
      
      // Use your HandleUnmatch API function
      await HandleUnmatch(userInfo, token, matchId);
      
      // Clear local storage for this chat
      if (db) {
        try {
          await clearChatStorage(db, matchId);
        } catch (storageError) {
          console.error('Error clearing chat storage:', storageError);
        }
      }
      
      Alert.alert('Success', 'Unmatched successfully');
      router.back();
    } catch (error) {
      console.error('Error unmatching:', error);
      Alert.alert('Error', 'Failed to unmatch');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <SafeAreaView style={{ backgroundColor: 'rgba(31, 34, 35, 1)' }}>
        <View style={[
          styles.chatHeader,
          { 
            height: chatHeaderHeight,
            paddingTop: chatHeaderPaddingTop
          }
        ]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>
          
          <Image
            source={profileImage ? { uri: profileImage } : DEFAULT_AVATAR}
            style={styles.chatAvatar}
          />
          
          <Text style={styles.chatName}>{userName}</Text>
          
          {syncingMessages && (
            <ActivityIndicator 
              size="small" 
              color="#f44d7b" 
              style={styles.syncIndicator} 
            />
          )}
          
          <UserActionMenu
            matchId={matchId}
            targetUserId={userId}
            userName={userName}
            onBlock={(data) => handleBlock(userId, data.reason, data.details)}
            onReport={(data) => handleReport(userId, data.reason, data.details)}
            onUnmatch={handleUnmatch}
          />
        </View>
      </SafeAreaView>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f44d7b" />
        </View>
      ) : (
        <>
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item, index) => `${item.timestamp}-${index}`}
            renderItem={renderMessageItem}
            contentContainerStyle={
              messages.length === 0 
                ? { flex: 1 } 
                : { paddingVertical: 16, backgroundColor: '#121212' }
            }
            style={{ backgroundColor: '#121212' }} // Add this line
            ListEmptyComponent={renderEmptyChat}
            onContentSizeChange={() => {
              if (messages.length > 0) {
                flatListRef.current?.scrollToEnd({ animated: false });
              }
            }}
            onRefresh={handleRefresh}
            refreshing={syncingMessages}
          />
          
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={newMessage}
              onChangeText={setNewMessage}
              placeholder="Type a message..."
              placeholderTextColor="#999"
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                !newMessage.trim() && styles.disabledSendButton
              ]}
              onPress={handleSendMessage}
              disabled={!newMessage.trim()}
            >
              <Ionicons name="send" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212', // Changed from white to dark
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(31, 34, 35, 1)',
    paddingHorizontal: 16,
  },
  backButton: {
    marginRight: 16,
  },
  chatAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  chatName: {
    marginLeft: 12,
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    flex: 1,
  },
  syncIndicator: {
    marginRight: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212', // Changed from white to dark
  },
  emptyChatContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#121212', // Changed from white to dark
  },
  emptyChatText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#ffffff', // Changed from dark to light for dark mode
    marginBottom: 10,
  },
  emptyChatSubtext: {
    fontSize: 16,
    color: '#cccccc', // Changed from dark to light for dark mode
    textAlign: 'center',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 20,
    marginHorizontal: 16,
    marginVertical: 4,
  },
  currentUserMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#f44d7b',
    borderBottomRightRadius: 4,
  },
  otherUserMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#333333', // Changed to darker color for dark mode
    borderBottomLeftRadius: 4,
  },
  pendingMessage: {
    opacity: 0.7,
  },
  messageText: {
    fontSize: 16,
    color: '#fff',
  },
  messageTime: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#333333', // Changed from light to dark
    backgroundColor: '#1a1a1a', // Changed from white to dark
  },
  input: {
    flex: 1,
    backgroundColor: '#333333', // Changed from light gray to dark gray
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 10,
    fontSize: 16,
    color: '#ffffff', // Changed text color to white
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f44d7b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledSendButton: {
    backgroundColor: '#444444', // Changed from light gray to dark gray
  },
});