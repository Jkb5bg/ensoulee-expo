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
  

// TODO: Fix the time stamp CSS. 
// TODO: Fix so that messages save locally and aren't overwritten by the backend incoming.
// TODO: Fix up the backend so messages get archived.
// TODO: Implement handling for reporting, blocking, and unmatching.

export default function ChatScreen() {
  // Get route params
  const params = useLocalSearchParams();
  const matchId = params.matchId as string;
  const userName = params.userName as string;
  const userId = params.userId as string;
  const profileImage = params.profileImage as string;
  const [profileCacheKey, setProfileCacheKey] = useState<string>('');
  const { profileImagesCache, loadProfileImage } = useAppData();

  // Create a function to get the profile image (cached or fresh)
  const getProfileImageUrl = useCallback(async () => {
    if (!userId || !profileImage) return null;
    
    // Extract filename from URL if needed
    let filename = profileImage;
    if (profileImage.includes('/')) {
      const parts = profileImage.split('/');
      filename = parts[parts.length - 1].split('?')[0]; // Remove query params
    }
    
    // Check if we have it in cache first
    const cacheKey = `${userId}-${filename}`;
    if (profileImagesCache[cacheKey]) {
      return profileImagesCache[cacheKey];
    }
    
    // If not in cache, load it
    return await loadProfileImage(userId, filename);
  }, [userId, profileImage, profileImagesCache, loadProfileImage]);

  const safeProfileUri = React.useMemo(() => {
    if (!profileImage) return null;
    // first encode URI components, then fix the pluses
    return encodeURI(profileImage).replace(/\+/g, '%2B');
  }, [profileImage]);
  
  
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
    // Add these state variables to your component
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<number[]>([]); // indices of matching messages
  const [currentResultIndex, setCurrentResultIndex] = useState(-1);

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
        profileImage: safeProfileUri, 
        // Add other params if available
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

    // In a useEffect, calculate and set the cache key once when component mounts
  useEffect(() => {
    if (userId && profileImage) {
      const filename = profileImage.includes('/') 
        ? profileImage.split('/').pop()?.split('?')[0] 
        : profileImage;
      setProfileCacheKey(`${userId}-${filename}`);
    }
  }, [userId, profileImage]);

  useEffect(() => {
    if (safeProfileUri) {
      Image.prefetch(safeProfileUri)
        .catch(err => console.warn("prefetch failed:", err));
    }
  }, [safeProfileUri]);
  


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
        styles.messageBubble,
        isCurrentUser ? styles.currentUserMessage : styles.otherUserMessage,
        message.pending && styles.pendingMessage
      ]}>
        <Text style={styles.messageText}>
          {message.content}
        </Text>
        <Text style={styles.messageTime}>
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
              
              if (hasUpdates) {
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

  // Render message bubble
  const renderMessageItem = ({ item, index }: { item: MessageType; index: number }) => {
    const isCurrentUser = item.senderId === (user?.userName || userInfo?.userName);
    const isSearchResult = searchResults.includes(index);
    const isCurrentResult = index === searchResults[currentResultIndex];
    
    return (
      <View style={[
        styles.messageBubble,
        isCurrentUser ? styles.currentUserMessage : styles.otherUserMessage,
        item.pending && styles.pendingMessage,
        isSearchResult && styles.searchResultMessage,
        isCurrentResult && styles.currentSearchResult
      ]}>
        <Text style={styles.messageText}>
          {searchQuery && item.content ? (
            // Highlight search term in the message
            highlightSearchTerm(item.content, searchQuery)
          ) : (
            item.content
          )}
        </Text>
        <Text style={styles.messageTime}>
          {formatMessageDate(item.timestamp)}
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
                  <Image
                    source={profileImagesCache[`${userId}-${
                      profileImage && profileImage.includes('/') 
                        ? profileImage.split('/').pop()?.split('?')[0] 
                        : profileImage
                    }`] 
                      ? { uri: profileImagesCache[`${userId}-${
                          profileImage && profileImage.includes('/') 
                            ? profileImage.split('/').pop()?.split('?')[0] 
                            : profileImage
                        }`] } 
                      : (safeProfileUri ? { uri: safeProfileUri } : DEFAULT_AVATAR)}
                    style={styles.chatAvatar}
                    defaultSource={DEFAULT_AVATAR}
                    onError={(e) => console.warn("Image failed to load:", e.nativeEvent.error)}
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
                  onBlock={(data) => handleBlock(userId, data.reason, data.details)}
                  onReport={(data) => handleReport(userId, data.reason, data.details)}
                  onUnmatch={handleUnmatch}
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

  // ← This absolute block now spans the full *inner* header area
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
      : (isSmallDevice ? 25 : 40)
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

  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
  },

  // Loading and empty states
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

  // Message bubbles
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 20,
    marginHorizontal: 16,
    marginVertical: 4,
    position: 'relative',
    paddingBottom: 22, // Extra padding for the timestamp
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
    marginBottom: 4,
  },
  messageTime: {
    fontSize: 11,
    position: 'absolute',
    bottom: 4,
    right: 8,
    color: 'rgba(255, 255, 255, 0.7)',
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

  // Search functionality
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