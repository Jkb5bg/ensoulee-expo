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
  Alert,
  StatusBar as RNStatusBar
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
import { useAppData } from '@/components/AppDataContext';
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
import ChatHeaderAvatar from '@/components/ChatHeaderAvatar';
import { HandleBlock } from '@/api/HandleBlock';
import { HandleReport } from '@/api/HandleReport';
import DecodedTokenInfo from '@/types/decodedTokenInfo';


const DEFAULT_AVATAR = require('@/assets/images/default-avatar.png');
const { width, height } = Dimensions.get('window');
const isSmallDevice = height < 700;
const isLargeDevice = height > 800;

const chatHeaderPaddingTop = Platform.OS === 'ios'
  ? (isSmallDevice ? 40 : (isLargeDevice ? 60 : 50))
  : (isSmallDevice ? 30 : 40);

const chatHeaderHeight = Platform.OS === 'ios'
  ? (isSmallDevice ? 90 : (isLargeDevice ? 130 : 110))
  : (isSmallDevice ? 80 : 100);

export default function ChatScreen() {
  // Get route params
  const params = useLocalSearchParams();
  const matchId = params.matchId as string;
  const userName = params.userName as string;
  const userId = params.userId as string;
  const profileImage = params.profileImage as string;
  const messageCheckTimestampRef = useRef<number | null>(null);
  const { loadProfileImage, profileImagesCache } = useAppData();
  const [loadingFailed, setLoadingFailed] = useState(false);
  const [actionInProgress, setActionInProgress] = useState(false);



  
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
  
  // For search functionality
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<number[]>([]); // indices of matching messages
  const [currentResultIndex, setCurrentResultIndex] = useState(-1);
  
  // Image loading state
  const [processedImageUrl, setProcessedImageUrl] = useState<string | null>(null);
  const [imageLoadError, setImageLoadError] = useState(false);

  useEffect(() => {
    console.log("[ChatScreen] Processing profile image");
    
    try {
      // Check if we have an encoded profile image
      if (profileImage) {
        // Decode the URL
        const decodedImage = decodeURIComponent(profileImage);
        setProcessedImageUrl(decodedImage);
      } else {
        setProcessedImageUrl(null);
      }
    } catch (error) {
      console.error("[ChatScreen] Error decoding image URL:", error);
      setProcessedImageUrl(null);
      setImageLoadError(true);
    }
  }, [profileImage]);
  

  // Add a search function
  const searchMessages = (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setCurrentResultIndex(-1);
      return;
    }
    
    const lowerQuery = query.toLowerCase();
    const results: number[] = [];
    
    // Find all messages that match the query
    messages.forEach((message, index) => {
      if (message.content && message.content.toLowerCase().includes(lowerQuery)) {
        results.push(index);
      }
    });
    
    setSearchResults(results);
    setCurrentResultIndex(results.length > 0 ? 0 : -1);
    
    // Scroll to the first result if there are any
    if (results.length > 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          index: results[0],
          animated: true,
          viewPosition: 0.5 // Center the item
        });
      }, 100);
    }
  };

  const navigateToProfile = () => {
    router.push({
      pathname: "/profile",
      params: { 
        matchId,
        userId,
        name: userName,
        profileImage: profileImage || '', 
      }
    });
  };

  // Add navigation through search results
  const goToNextResult = () => {
    if (searchResults.length === 0) return;
    
    const nextIndex = (currentResultIndex + 1) % searchResults.length;
    setCurrentResultIndex(nextIndex);
    
    flatListRef.current?.scrollToIndex({
      index: searchResults[nextIndex],
      animated: true,
      viewPosition: 0.5
    });
  };

  const goToPreviousResult = () => {
    if (searchResults.length === 0) return;
    
    const prevIndex = currentResultIndex <= 0 
      ? searchResults.length - 1 
      : currentResultIndex - 1;
    setCurrentResultIndex(prevIndex);
    
    flatListRef.current?.scrollToIndex({
      index: searchResults[prevIndex],
      animated: true,
      viewPosition: 0.5
    });
  };
  
  // Set custom header when component mounts
  useEffect(() => {
    setCustomHeader(true);
    // Cleanup function
    return () => setCustomHeader(false);
  }, []);

  const renderItem = ({ item }: { item: MessageType | { isDateSeparator: true; date: string; timestamp: number } }) => {
    // Check if this is a date separator
    if ('isDateSeparator' in item && item.isDateSeparator) {
      return (
        <View style={styles.dateSeparator}>
          <Text style={styles.dateSeparatorText}>{item.date}</Text>
        </View>
      );
    }
    
    // Otherwise render a normal message
    const message = item as MessageType;
    const isCurrentUser = message.senderId === (user?.userName || userInfo?.userName);
    
    return (
      <View style={[
          styles.messageContainer,
          isCurrentUser ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start' }
        ]}>
    
        <View style={[
          styles.messageBubble,
          isCurrentUser ? styles.currentUserMessage : styles.otherUserMessage,
          message.pending && styles.pendingMessage
        ]}>
          <Text style={styles.messageText}>
            {message.content}
          </Text>
        </View>
    
        <Text style={[
          styles.messageTimestamp,
          isCurrentUser ? { textAlign: 'right' } : { textAlign: 'left' }
        ]}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          {message.pending && ' • Sending...'}
        </Text>
      </View>
    );
  };
  
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

  const formatMessageDate = (timestamp: number): string => {
    const now = new Date();
    const messageDate = new Date(timestamp);
    
    // Calculate the difference in days
    const diffTime = now.getTime() - messageDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      // Today - just show time
      return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      // Yesterday
      return 'Yesterday';
    } else if (diffDays < 7) {
      // Within the last week - show day name
      return messageDate.toLocaleDateString([], { weekday: 'long' });
    } else {
      // Older than a week - show month and day
      return messageDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };
  
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
  
      // First, always get local messages regardless of backend availability
      const storedData = await getChatMessages(db, matchId);
      let localMessages = storedData?.messages || [];
      
      // If we have local messages, set them immediately for better UX
      if (localMessages.length > 0) {
        console.log(`Found ${localMessages.length} local messages, displaying immediately`);
        setMessages(localMessages);
      }
      
      // Now try to fetch from backend if we have token
      if (token) {
        try {
          console.log(`Fetching messages from backend for chat ${matchId}`);
          const data = await GetMessages(userInfo, matchId, token);
          
          if (data && data.messages && data.messages.length > 0) {
            console.log(`Received ${data.messages.length} messages from backend`);
            
            // Create maps for efficient lookup
            const localMessageMap = new Map();
            localMessages.forEach(msg => {
              localMessageMap.set(msg.timestamp, msg);
            });
            
            const backendMessageMap = new Map();
            data.messages.forEach(msg => {
              backendMessageMap.set(msg.timestamp, msg);
            });
            
            // Prepare merged array
            const mergedMessages: MessageType[] = [];
            
            // Add all backend messages
            data.messages.forEach(backendMsg => {
              mergedMessages.push(backendMsg);
            });
            
            // Add local pending messages that aren't in backend response
            localMessages.forEach(localMsg => {
              // If this is a pending message that doesn't exist in the backend response
              if (localMsg.pending && !backendMessageMap.has(localMsg.timestamp)) {
                console.log(`Preserving local pending message at timestamp ${localMsg.timestamp}`);
                mergedMessages.push(localMsg);
              }
            });
            
            // Sort by timestamp
            const sortedMessages = mergedMessages.sort((a, b) => a.timestamp - b.timestamp);
            
            // Update state and storage
            setMessages(sortedMessages);
            await saveChatMessages(db, matchId, sortedMessages);
          } else {
            console.log('No messages received from backend');
            // Important: If no messages from backend, but we have local messages
            // keep using the local messages we already set above
            if (localMessages.length === 0) {
              // Only set empty state if this is initial load and we have no local messages
              setMessages([]);
              // Note we're NOT saving an empty array to storage here, as that would
              // overwrite pending local messages if they exist but weren't returned
              // from the backend for some reason
            }
          }
        } catch (backendError) {
          console.error('Error fetching from backend:', backendError);
          // Just keep using local messages that were set earlier
        }
      } else {
        console.log('No token available, using only local messages');
        // Already set localMessages above, no need to do it again
      }
    } catch (error) {
      console.error('Error in fetchMessages flow:', error);
      
      // Try to recover by just loading local messages
      try {
        const fallbackData = await getChatMessages(db, matchId);
        if (fallbackData && fallbackData.messages.length > 0) {
          setMessages(fallbackData.messages);
        }
      } catch (fallbackError) {
        console.error('Even fallback failed:', fallbackError);
      }
      
      // Only show alert on initial load, not during background sync
      if (!lastSynced) {
        Alert.alert('Error', 'Failed to load messages');
      }
    } finally {
      setLoading(false);
      setSyncingMessages(false);
      setSyncInProgress(matchId, false);
    }
  }, [db, matchId, user?.userName, userInfo?.userName, token]);

  // Inside your component where you need to check for updates
  // Modified checkForUpdates function
  const checkForUpdates = useCallback(async () => {
    if (!matchId || !userInfo || !authTokens?.idToken) return;
    
    // Check if sync is already in progress
    if (isSyncInProgress(matchId)) {
      console.log(`Sync already in progress for chat ${matchId}, skipping update check`);
      return;
    }
    
    try {
      // Add a debounce mechanism
      const now = Date.now();
      const lastCheck = messageCheckTimestampRef.current || 0;
      
      // Only check for updates every 30 seconds
      if (now - lastCheck < 30000) {
        console.log(`Skipping update check, last check was ${Math.round((now - lastCheck)/1000)}s ago`);
        return;
      }
      
      messageCheckTimestampRef.current = now;
      
      // Get the most recent timestamp from local storage
      const latestTimestamp = await getLastMessageTimestamp(db, matchId);
      
      if (latestTimestamp) {
        console.log(`Checking for updates since timestamp ${latestTimestamp}`);
        
        // Set sync flag early to prevent concurrent checks
        setSyncInProgress(matchId, true);
        
        try {
          // Check if there are newer messages on the server
          const hasUpdates = await CheckForMessageUpdate(
            userInfo, 
            authTokens.idToken, 
            matchId, 
            latestTimestamp
          );

          if (hasUpdates) {
            console.log('New messages available, fetching updates');
            fetchMessages(latestTimestamp);
          } else {
            // Important: release sync lock if no updates
            setSyncInProgress(matchId, false);
            console.log('No new messages available');
          }
        } catch (error) {
          // Important: release sync lock on error
          setSyncInProgress(matchId, false);
          
          // Handle rate limiting specifically
          if (error instanceof Error && (error.message.includes('429') || error.message.includes('Rate limit'))) {
            console.log('Rate limit exceeded, will try again later');
            // Reset timestamp to allow retry after delay
            messageCheckTimestampRef.current = now - 25000; // retry in 5 seconds
          } else {
            console.error('Error checking for message updates:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error in checkForUpdates:', error);
      // Always release sync lock on error
      setSyncInProgress(matchId, false);
    }
  }, [db, matchId, userInfo, authTokens, fetchMessages]);

  // Group messages by date and add date separators
  const groupMessagesByDate = (messageList: MessageType[]) => {
    if (!messageList || messageList.length === 0) return [];
    
    type DateSeparator = { isDateSeparator: true; date: string; timestamp: number };
    const grouped: (MessageType | DateSeparator)[] = [];
    let currentDate: string | null = null;
    
    // Sort messages by timestamp
    const sortedMessages = [...messageList].sort((a, b) => a.timestamp - b.timestamp);
    
    // Process each message
    sortedMessages.forEach(message => {
      const messageDate = new Date(message.timestamp);
      const dateString = messageDate.toDateString(); // e.g. "Mon Apr 15 2025"
      
      // If this is a message from a new date, add a date separator
      if (dateString !== currentDate) {
        currentDate = dateString;
        
        // Format the date for display
        let displayDate: string;
        const today = new Date().toDateString();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayString = yesterday.toDateString();
        
        if (dateString === today) {
          displayDate = "Today";
        } else if (dateString === yesterdayString) {
          displayDate = "Yesterday";
        } else {
          // Format as "Monday, April 15" or similar
          displayDate = messageDate.toLocaleDateString(undefined, {
            weekday: 'long', 
            month: 'long', 
            day: 'numeric'
          });
        }
        
        // Add the date separator
        grouped.push({
          isDateSeparator: true,
          date: displayDate,
          timestamp: message.timestamp // Keep timestamp for sorting
        });
      }
      
      // Add the message
      grouped.push(message);
    });
    
    return grouped;
  };

  const groupedMessages = groupMessagesByDate(messages);

  // Handle sending a message
  const handleSendMessage = useCallback(async () => {
    // Log for debugging
    console.log("Send button pressed, message:", newMessage);
    
    if (!newMessage.trim() || !matchId || !db) {
      console.log("Basic send conditions not met:", {
        hasMessage: !!newMessage.trim(),
        hasMatchId: !!matchId,
        hasDb: !!db
      });
      return;
    }
  
    // IMPORTANT FIX: Get senderId from userInfo if user is not available
    // This is the key fix - we're making sure we have a valid sender ID even if user object is null
    const senderId = userInfo?.userName || "unknown";
    if (!senderId || senderId === "unknown") {
      console.log("Cannot determine sender ID:", { userInfo });
      Alert.alert('Error', 'Could not determine your user ID. Please try again.');
      return;
    }
  
    const messageContent = newMessage.trim();
    const timestamp = Date.now();
  
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
  
      // Add to local state
      setMessages(prev => [...prev, tempMessage]);
  
      // Add to local storage
      try {
        await addMessageToStorage(db, matchId, tempMessage);
      } catch (storageError) {
        console.error('Failed to save message to local storage:', storageError);
        // Continue anyway - the message is at least in memory
      }
  
      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
  
      // Send to backend if token available
      if (token) {
        try {
          await SendMessage(
            userInfo as DecodedTokenInfo, // Ensure userInfo is of the correct type
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
          try {
            await updateMessageInStorage(db, matchId, timestamp, { pending: false });
          } catch (updateError) {
            console.error('Failed to update message status in storage:', updateError);
          }
        } catch (sendError) {
          console.error('Error sending message to backend:', sendError);
          // Message remains in pending state in both memory and storage
        }
      } else {
        console.log('No token available, message saved locally only');
      }
    } catch (error) {
      console.error('Error in message sending flow:', error);
      Alert.alert('Error', 'Failed to send message');
      
      // Try to recover by removing the failed message from state
      setMessages(prev => prev.filter(msg => msg.timestamp !== timestamp));
    }
  }, [newMessage, matchId, userInfo, db, token, userId]);

  // Load messages on component mount
  useEffect(() => {
    let isMounted = true;
  
    const initializeChat = async () => {
      if (!matchId || !db || !userInfo || !authTokens?.idToken) return;
    
      try {
        // 1) Load from local SQLite
        const storedData = await getChatMessages(db, matchId);
    
        if (storedData && storedData.messages && storedData.messages.length > 0) {
          console.log(`Found ${storedData.messages.length} local messages`);
          setMessages(storedData.messages);
          
          // Compute latest timestamp safely
          const latest = storedData.lastSynced || 
            Math.max(...storedData.messages.map(msg => msg.timestamp), 0);
    
          // 2) Try backend check - handle errors gracefully
          try {
            const hasUpdates = await CheckForMessageUpdate(
              userInfo,
              authTokens.idToken,
              matchId,
              latest
            );
    
            if (hasUpdates) {
              await fetchMessages(latest);
            }
          } catch (updateError) {
            console.warn('Update check failed, continuing with local data:', updateError);
          }
        } else {
          console.log(`No local messages found for chat ${matchId}, fetching from backend`);
          try {
            // If no local messages, try fetching from backend directly
            await fetchMessages();
          } catch (fetchError) {
            console.warn('Initial backend fetch failed:', fetchError);
            // Show empty state - we have no local or backend messages
            setMessages([]);
          }
        }
      } catch (error) {
        console.warn('Initial load failed completely:', error);
        // Set empty state as fallback
        setMessages([]);
      } finally {
        // 3) Prevent the interval from firing immediately
        messageCheckTimestampRef.current = Date.now();
        // 4) Clear loading state regardless of success/failure
        if (isMounted) {
          setLoading(false);
        }
      }
    };
  
    initializeChat();
  
    return () => {
      isMounted = false;
      if (matchId && isSyncInProgress(matchId)) {
        setSyncInProgress(matchId, false);
      }
    };
  }, [db, matchId, userInfo, authTokens?.idToken]);
  

  // Set up a controlled interval for checking updates
  useEffect(() => {
    let isMounted = true;
    let checkInterval: NodeJS.Timeout;
    
    // Set up a reasonable interval (every 30 seconds)
    const setupInterval = () => {
      checkInterval = setInterval(() => {
        if (isMounted) {
          checkForUpdates();
        }
      }, 30000); // 30 seconds
    };
    
    setupInterval();
    
    return () => {
      isMounted = false;
      clearInterval(checkInterval);
    };
  }, [checkForUpdates, matchId]);
  // Refreshing logic - pull to refresh
  const handleRefresh = useCallback(() => {
    fetchMessages();
  }, [fetchMessages]);

  const highlightSearchTerm = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return (
      <>
        {parts.map((part, i) => 
          part.toLowerCase() === query.toLowerCase() ? (
            <Text key={i} style={styles.highlightedText}>{part}</Text>
          ) : (
            part
          )
        )}
      </>
    );
  };

  // Render empty chat view
  const renderEmptyChat = () => (
    <View style={styles.emptyChatContainer}>
      <Text style={styles.emptyChatText}>No messages yet</Text>
      <Text style={styles.emptyChatSubtext}>
        Send a message to start the conversation!
      </Text>
      
      {/* Optional retry button for when loading failed */}
      {loadingFailed && (
        <TouchableOpacity 
          style={additionalStyles.reloadButton}
          onPress={handleRefresh}
        >
          <Text style={additionalStyles.reloadButtonText}>Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const handleBlock = async (reason: string, details?: string) => {
    if (!user || !userInfo || !db) {
      Alert.alert('Error', 'User info not available');
      return;
    }
  
    if (!token) {
      Alert.alert('Error', 'Authentication token not available');
      return;
    }
  
    // Set action in progress to prevent multiple calls
    setActionInProgress(true);
  
    try {
      // Call API to block the user
      const success = await HandleBlock(
        userInfo,
        token,
        matchId,
        userId,
        reason,
        details
      );
  
      if (success) {
        // Clear local storage for this chat since it's now blocked
        if (db) {
          try {
            await clearChatStorage(db, matchId);
          } catch (storageError) {
            console.error('Error clearing chat storage after block:', storageError);
          }
        }
  
        Alert.alert('Success', 'User has been blocked');
        
        // Navigate back to the messages list
        router.back();
      } else {
        Alert.alert('Error', 'Failed to block user');
      }
    } catch (error) {
      console.error('Error blocking user:', error);
      Alert.alert('Error', 'Failed to block user');
    } finally {
      setActionInProgress(false);
    }
  };

  // Handle user reporting
  const handleReport = async (reason: string, details?: string) => {
    if (!user || !userInfo) {
      Alert.alert('Error', 'User info not available');
      return;
    }
  
    if (!token) {
      Alert.alert('Error', 'Authentication token not available');
      return;
    }
  
    // Set action in progress to prevent multiple calls
    setActionInProgress(true);
  
    try {
      // Call API to report the user
      const success = await HandleReport(
        userInfo,
        token,
        matchId,
        userId,
        reason,
        details
      );
  
      if (success) {
        Alert.alert('Success', 'User has been reported');
      } else {
        Alert.alert('Error', 'Failed to report user');
      }
    } catch (error) {
      console.error('Error reporting user:', error);
      Alert.alert('Error', 'Failed to report user');
    } finally {
      setActionInProgress(false);
    }
  };
  const handleUnmatch = async () => {
    if (!user || !userInfo || !db) {
      Alert.alert('Error', 'User info not available');
      return;
    }
  
    if (!token) {
      Alert.alert('Error', 'Authentication token not available');
      return;
    }
  
    // Set action in progress to prevent multiple calls
    setActionInProgress(true);
  
    try {
      // Call API to unmatch
      const success = await HandleUnmatch(userInfo, token, matchId);
  
      if (success) {
        // Clear local storage for this chat since it's now unmatched
        if (db) {
          try {
            await clearChatStorage(db, matchId);
          } catch (storageError) {
            console.error('Error clearing chat storage after unmatch:', storageError);
          }
        }
  
        Alert.alert('Success', 'Unmatched successfully');
        
        // Navigate back to the messages list
        router.back();
      } else {
        Alert.alert('Error', 'Failed to unmatch');
      }
    } catch (error) {
      console.error('Error unmatching:', error);
      Alert.alert('Error', 'Failed to unmatch');
    } finally {
      setActionInProgress(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <SafeAreaView style={{ backgroundColor: 'rgba(31, 34, 35, 1)' }}>
        <View style={styles.chatHeader}>
          {isSearching ? (
            // Search mode header
            <>
              <TouchableOpacity onPress={() => {
                setIsSearching(false);
                setSearchQuery('');
                setSearchResults([]);
              }} style={styles.backButton}>
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
              
              <View style={styles.searchContainer}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search messages..."
                  placeholderTextColor="#999"
                  value={searchQuery}
                  onChangeText={(text) => {
                    setSearchQuery(text);
                    searchMessages(text);
                  }}
                  autoFocus
                />
              </View>
              
              {searchResults.length > 0 && (
                <View style={styles.searchNavigation}>
                  <Text style={styles.searchResultText}>
                    {currentResultIndex + 1} of {searchResults.length}
                  </Text>
                  <TouchableOpacity onPress={goToPreviousResult} style={styles.searchNavButton}>
                    <Ionicons name="chevron-up" size={20} color="#F44D7B" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={goToNextResult} style={styles.searchNavButton}>
                    <Ionicons name="chevron-down" size={20} color="#F44D7B" />
                  </TouchableOpacity>
                </View>
              )}
            </>
          ) : (
            // Normal header
            <>
              <View style={styles.headerLeft}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                  <Ionicons name="chevron-back" size={24} color="white" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.headerCenter}>
                <TouchableOpacity 
                  style={styles.userInfoContainer}
                  onPress={navigateToProfile}
                  activeOpacity={0.7}
                  >
                  <ChatHeaderAvatar
                    imageUrl={profileImage}
                    userName={userName}
                    userId={userId} 
                    size={40}
                  />

                  <Text style={styles.chatName}>{userName}</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.headerRight}>
                {syncingMessages && (
                  <ActivityIndicator 
                    size="small" 
                    color="#f44d7b" 
                    style={styles.syncIndicator} 
                  />
                )}
                
                <TouchableOpacity 
                  onPress={() => setIsSearching(true)} 
                  style={styles.headerIconButton}
                >
                  <Ionicons name="search" size={22} color="#F44D7B" />
                </TouchableOpacity>
                
                <UserActionMenu
                  matchId={matchId}
                  targetUserId={userId}
                  userName={userName}
                  onBlock={({ reason = '', details = '' }) => handleBlock(reason, details)}
                  onReport={({ reason = '', details = '' }) => handleReport(reason, details)}
                  onUnmatch={handleUnmatch}
                  disabled={actionInProgress}
                />
              </View>
            </>
          )}
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
            data={groupedMessages}
            keyExtractor={(item, index) => {
              if ('isDateSeparator' in item && item.isDateSeparator) {
                return `date-${item.timestamp}`;
              }
              return `msg-${(item as MessageType).timestamp}-${index}`;
            }}
            renderItem={renderItem}
            contentContainerStyle={
              messages.length === 0 
                ? { flex: 1 } 
                : { paddingVertical: 16, backgroundColor: '#121212' }
            }
            style={{ backgroundColor: '#121212' }}
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
              onSubmitEditing={handleSendMessage}
              returnKeyType="send"
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                !newMessage.trim() && styles.disabledSendButton
              ]}
              onPress={() => {
                if (newMessage.trim()) {
                  handleSendMessage();
                }
              }}
              activeOpacity={newMessage.trim() ? 0.7 : 1}
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
    backgroundColor: '#121212',
  },

  // Header styles
  chatHeader: {
    height: chatHeaderHeight,
    width: '100%',
    backgroundColor: 'rgba(31, 34, 35, 1)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android'
      ? RNStatusBar.currentHeight
      : chatHeaderPaddingTop,
  },
  headerLeft: {
    width: 32,
    alignItems: 'flex-start',
  },
  backButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Platform.OS === 'ios'
      ? (isSmallDevice ? 30 : (isLargeDevice ? 50 : 40))
      : (isSmallDevice ? 25 : 40),
  },
  chatName: {
    fontFamily: 'SF-600',
    fontSize: 20,
    color: '#FFFFFF',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  headerIconButton: {
    marginLeft: 15,
    padding: 8,
  },
  syncIndicator: {
    marginRight: 6,
  },

  // User‐info tappable area in header
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Message wrapper (bubble + timestamp)
  messageContainer: {
    maxWidth: '80%',
    marginHorizontal: 16,
    marginVertical: 4,
  },

  // Message bubbles
  messageBubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  currentUserMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#f44d7b',
    borderBottomRightRadius: 4,
  },
  otherUserMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#333333',
    borderBottomLeftRadius: 4,
  },
  pendingMessage: {
    opacity: 0.7,
  },
  messageText: {
    fontSize: 16,
    color: '#fff',
  },
  messageTimestamp: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 4,
    fontStyle: 'italic',
  },

  // Date separators
  dateSeparator: {
    alignItems: 'center',
    marginVertical: 12,
    paddingHorizontal: 16,
  },
  dateSeparatorText: {
    fontSize: 12,
    color: '#999',
    backgroundColor: 'rgba(40, 40, 40, 0.7)',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },

  // Loading & empty states
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
  emptyChatContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#121212',
  },
  emptyChatText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 10,
  },
  emptyChatSubtext: {
    fontSize: 16,
    color: '#cccccc',
    textAlign: 'center',
  },

  // Input area
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#333333',
    backgroundColor: '#1a1a1a',
  },
  input: {
    flex: 1,
    backgroundColor: '#333333',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 10,
    fontSize: 16,
    color: '#ffffff',
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
    backgroundColor: '#444444',
  },

  // Search bar
  searchContainer: {
    flex: 1,
    backgroundColor: '#333',
    borderRadius: 16,
    marginHorizontal: 10,
    paddingHorizontal: 12,
    height: 36,
  },
  searchInput: {
    color: 'white',
    height: 36,
    fontSize: 16,
  },
  searchButton: {
    padding: 8,
    marginHorizontal: 4,
  },
  searchNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  searchNavButton: {
    padding: 4,
    marginHorizontal: 2,
  },
  searchResultText: {
    color: 'white',
    fontSize: 12,
    marginRight: 4,
  },
  searchResultMessage: {
    borderWidth: 1,
    borderColor: 'rgba(244, 77, 123, 0.3)',
  },
  currentSearchResult: {
    borderWidth: 2,
    borderColor: 'rgba(244, 77, 123, 0.8)',
  },
  highlightedText: {
    backgroundColor: 'rgba(244, 77, 123, 0.3)',
    color: '#fff',
    fontWeight: '700',
  },
});

// Define reload button styles so additionalStyles references resolve
const additionalStyles = StyleSheet.create({
  reloadButton: {
    backgroundColor: '#f44d7b',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginTop: 16,
  },
  reloadButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});
