import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
  RefreshControl,
  Alert,
  Dimensions
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/components/AuthContext';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import Header from '@/components/Header';
import UserActionMenu from '@/components/UserActionMenu';
import MessageType from '@/types/MessageType';
import MatchType from '@/types/matchType';
// Import your API functions
import { GetUserMatches } from '@/api/GetUserMatches';
import { GetMessages } from '@/api/GetMessages';
import { SendMessage } from '@/api/SendMessage';
import { HandleUnmatch } from '@/api/HandleUnmatch';
import { GetUserProfileImage } from '@/api/GetUserProfileImage';

const DEFAULT_AVATAR = require('@/assets/images/default-avatar.png');

export default function Messages() {
  const { user, userInfo, authTokens } = useAuth();
  const [matches, setMatches] = useState<MatchType[]>([]);
  const [activeMatch, setActiveMatch] = useState<MatchType | null>(null);
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const messageCache = useRef(new Map<string, MessageType[]>());
  const flatListRef = useRef<FlatList>(null);
  const token = authTokens?.idToken || 'string';

  // Fetch matches using your API function
  const fetchMatches = useCallback(async () => {
    if (!user || !userInfo) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      if (!token) {
        throw new Error('No token available');
      }

      // Use your API function
      const matchesData = await GetUserMatches(userInfo, token);
      
      if (matchesData) {
        setMatches(matchesData as unknown as MatchType[]);

        // Load images after setting matches
        if (Array.isArray(matchesData) && matchesData.length > 0) {
          matchesData.forEach((match: any) => {
            if (match.matchedUser?.profileImage) {
              loadImageUrl(match.matchedUser.id, match.matchedUser.profileImage);
            }
          });
        }
      } else {
        // Handle the case when the API returns undefined
        setMatches([]);
      }
    } catch (error) {
      console.error('Error fetching matches:', error);
      Alert.alert('Error', 'Failed to load your matches');
      setMatches([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, userInfo]);

  // Fetch messages function
  const fetchMessages = useCallback(async () => {
    if (!activeMatch?.matchId || !userInfo || !user) return;

    const matchId = activeMatch.matchId;
    const cachedData = messageCache.current.get(matchId);

    // Use cache if available
    if (cachedData) {
      console.log('Using cached messages for match:', matchId);
      setMessages(cachedData);
      return;
    }

    // Only fetch from API if no cache exists
    try {
      
      if (!token) {
        throw new Error('No token available');
      }

      const data = await GetMessages(userInfo, matchId, token);
      
      if (data && data.messages) {
        // Update cache
        messageCache.current.set(matchId, data.messages);
        setMessages(data.messages);

        // Scroll to bottom if messages exist
        if (data.messages.length > 0) {
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
      } else {
        setMessages([]);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      Alert.alert('Error', 'Failed to load messages');
      setMessages([]);
    }
  }, [activeMatch?.matchId, user, userInfo]);

  // Load image URL function
  const loadImageUrl = useCallback(async (userId: string, filename: string) => {
    if (!filename || !userInfo || !user) return DEFAULT_AVATAR;

    try {
      if (!token) return DEFAULT_AVATAR;

      // Create minimal user object with necessary properties for the API function
      const userDataForImage = {
        id: userId,
        imageFilenames: [filename]
      };

      // Use your existing GetUserProfileImage function
      const imageUrl = await GetUserProfileImage(userInfo, token, userDataForImage as any);
      
      if (imageUrl) {
        // Extract the actual filename if it's a full URL
        const extractedFilename = filename.split('/').pop()?.split('?')[0] || filename;
        
        // Store the image URL in our local state
        setImageUrls(prev => ({
          ...prev,
          [`${userId}-${extractedFilename}`]: imageUrl
        }));
        
        return imageUrl;
      }
      
      return DEFAULT_AVATAR;
    } catch (error) {
      console.error('Error loading image URL:', error);
      return DEFAULT_AVATAR;
    }
  }, [user, userInfo]);

  // Helper function to get image URL from local state
  const getImageUrl = useCallback((userId: string, imageFilename?: string) => {
    if (!imageFilename) return DEFAULT_AVATAR;

    // Extract the actual filename if it's a full URL
    const cleanFilename = imageFilename.split('/').pop()?.split('?')[0] || imageFilename;

    // Check if we have the URL cached in our local state
    return imageUrls[`${userId}-${cleanFilename}`] || DEFAULT_AVATAR;
  }, [imageUrls]);

// Handle send message
const handleSendMessage = useCallback(async () => {
    if (!newMessage.trim() || !activeMatch || !user || !userInfo) return;
  
    const messageContent = newMessage.trim();
    const timestamp = Date.now();
    const matchId = activeMatch.matchId;
    
    // Get the sender ID - use a default if both are undefined
    const senderId = user?.userName || userInfo?.userName || "unknown";
  
    try {
      // Clear input immediately for better UX
      setNewMessage('');
  
      // Create tempMessage outside of any conditional blocks
      const tempMessage: MessageType = {
        content: messageContent,
        senderId: senderId, 
        timestamp,
        pending: true
      };
  
      // Update local state and cache optimistically
      setMessages(prev => {
        const updatedMessages = [...prev, tempMessage];
        messageCache.current.set(matchId, updatedMessages);
        return updatedMessages;
      });
  
      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
  
      if (!token) {
        throw new Error('No token available');
      }
  
      // Use your SendMessage API function
      await SendMessage(
        userInfo,
        matchId,
        activeMatch.matchedUser.id,
        senderId, // Use the same senderId here
        timestamp,
        token,
        messageContent
      );
  
      // Update pending status
      setMessages(prev => {
        const updatedMessages = prev.map(msg =>
          msg.timestamp === timestamp ? { ...msg, pending: false } : msg
        );
        messageCache.current.set(matchId, updatedMessages);
        return updatedMessages;
      });
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
      
      // Remove failed message from state and cache
      setMessages(prev => {
        const updatedMessages = prev.filter(msg => msg.timestamp !== timestamp);
        messageCache.current.set(matchId, updatedMessages);
        return updatedMessages;
      });
    }
  }, [newMessage, activeMatch, user, userInfo]);

  // Handle user blocking
  const handleBlock = async (targetUserId: string, reason: string, details?: string) => {
    if (!user || !userInfo) return;

    try {
      if (!token) return;
      
      const matchId = activeMatch?.matchId || '';

      // You would need to create a HandleBlock API function similar to HandleUnmatch
      // await HandleBlock(userInfo, token, matchId, targetUserId, reason, details);

      // Remove match from list and reset active match
      setMatches(matches.filter(m => m.matchedUser.id !== targetUserId));
      if (activeMatch?.matchedUser.id === targetUserId) {
        setActiveMatch(null);
      }
      
      Alert.alert('Success', 'User has been blocked');
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
      // await HandleReport(userInfo, token, activeMatch?.matchId || '', targetUserId, reason, details);
      
      Alert.alert('Success', 'User has been reported');
    } catch (error) {
      console.error('Error reporting user:', error);
      Alert.alert('Error', 'Failed to report user');
    }
  };

  // Handle unmatch
  const handleUnmatch = async (matchId: string) => {
    if (!user || !userInfo) return;

    try {
      if (!token) return;
      
      // Use your HandleUnmatch API function
      await HandleUnmatch(userInfo, token, matchId);
      
      // Remove match from list and reset active match
      setMatches(matches.filter(m => m.matchId !== matchId));
      if (activeMatch?.matchId === matchId) {
        setActiveMatch(null);
      }
      
      Alert.alert('Success', 'Unmatched successfully');
    } catch (error) {
      console.error('Error unmatching:', error);
      Alert.alert('Error', 'Failed to unmatch');
    }
  };

  // Fetch matches on component mount
  useEffect(() => {
    if (user && userInfo) {
      fetchMatches();
    }
  }, [user, userInfo, fetchMatches]);

  // Fetch messages when activeMatch changes
  useEffect(() => {
    if (activeMatch?.matchId && user && userInfo) {
      fetchMessages();
    } else {
      setMessages([]);
    }
  }, [activeMatch?.matchId, user, userInfo, fetchMessages]);

  // Load images for matches
  useEffect(() => {
    matches.forEach(match => {
      if (match.matchedUser?.profileImage) {
        loadImageUrl(match.matchedUser.id, match.matchedUser.profileImage);
      }
    });
  }, [matches, loadImageUrl]);


    // Render match list item
    const renderMatchItem = ({ item }: { item: MatchType }) => {
        // Create a default image URL regardless of whether there's a profile image
        const imageUrl = item.matchedUser.profileImage ? 
        getImageUrl(item.matchedUser.id, item.matchedUser.profileImage) : 
        DEFAULT_AVATAR;
        
        return (
        <TouchableOpacity
            style={[
            styles.matchItem,
            activeMatch?.matchId === item.matchId && styles.activeMatchItem
            ]}
            onPress={() => setActiveMatch(item)}
        >
            <View style={styles.matchItemContent}>
            <Image
                source={typeof imageUrl === 'string' ? { uri: imageUrl } : imageUrl}
                style={styles.avatar}
                defaultSource={DEFAULT_AVATAR}
            />
            <View style={styles.matchDetails}>
                <Text style={styles.matchName}>{item.matchedUser.name}</Text>
                {item.lastMessage && (
                <Text style={styles.lastMessage} numberOfLines={1}>
                    {item.lastMessage.content}
                </Text>
                )}
            </View>
            </View>
            <UserActionMenu
            matchId={item.matchId}
            targetUserId={item.matchedUser.id}
            userName={item.matchedUser.name}
            onBlock={(data) => handleBlock(item.matchedUser.id, data.reason, data.details)}
            onReport={(data) => handleReport(item.matchedUser.id, data.reason, data.details)}
            onUnmatch={() => handleUnmatch(item.matchId)}
            />
        </TouchableOpacity>
        );
    };

  // Render message bubble
  const renderMessageItem = ({ item }: { item: MessageType }) => {
    const isCurrentUser = item.senderId === user?.userName;
    
    return (
      <View style={[
        styles.messageBubble,
        isCurrentUser ? styles.currentUserMessage : styles.otherUserMessage,
        item.pending && styles.pendingMessage
      ]}>
        <Text style={styles.messageText}>{item.content}</Text>
        <Text style={styles.messageTime}>
          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          {item.pending && ' • Sending...'}
        </Text>
      </View>
    );
  };

  // Render chat header
// Render chat header
    const renderChatHeader = () => {
        if (!activeMatch) return null;
        
        const imageUrl = activeMatch.matchedUser.profileImage ? 
        getImageUrl(activeMatch.matchedUser.id, activeMatch.matchedUser.profileImage) : 
        DEFAULT_AVATAR;
        
        return (
        <View style={styles.chatHeader}>
            <TouchableOpacity onPress={() => setActiveMatch(null)} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="white" />
            </TouchableOpacity>
            
            <Image
            source={typeof imageUrl === 'string' ? { uri: imageUrl } : imageUrl}
            style={styles.chatAvatar}
            defaultSource={DEFAULT_AVATAR}
            />
            
            <Text style={styles.chatName}>{activeMatch.matchedUser.name}</Text>
            
            <UserActionMenu
            matchId={activeMatch.matchId}
            targetUserId={activeMatch.matchedUser.id}
            userName={activeMatch.matchedUser.name}
            onBlock={(data) => handleBlock(activeMatch.matchedUser.id, data.reason, data.details)}
            onReport={(data) => handleReport(activeMatch.matchedUser.id, data.reason, data.details)}
            onUnmatch={() => handleUnmatch(activeMatch.matchId)}
            />
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

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {!activeMatch ? (
        <>
          
          {loading && matches.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#f44d7b" />
            </View>
          ) : (
            <FlatList
              data={matches}
              keyExtractor={(item) => item.matchId}
              renderItem={renderMatchItem}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => {
                    setRefreshing(true);
                    fetchMatches();
                  }}
                  tintColor="#f44d7b"
                />
              }
              ListEmptyComponent={
                <View style={styles.noMatchesContainer}>
                  <Text style={styles.noMatchesText}>No matches yet</Text>
                  <Text style={styles.noMatchesSubtext}>
                    Start swiping to find matches!
                  </Text>
                  <TouchableOpacity
                    style={styles.discoverButton}
                    onPress={() => router.push('/')}
                  >
                    <Text style={styles.discoverButtonText}>Go to Discover</Text>
                  </TouchableOpacity>
                </View>
              }
            />
          )}
        </>
      ) : (
        <View style={styles.chatContainer}>
          {renderChatHeader()}
          
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item, index) => `${item.timestamp}-${index}`}
            renderItem={renderMessageItem}
            contentContainerStyle={messages.length === 0 ? { flex: 1 } : { paddingVertical: 16 }}
            ListEmptyComponent={renderEmptyChat}
            onContentSizeChange={() => {
              if (messages.length > 0) {
                flatListRef.current?.scrollToEnd({ animated: true });
              }
            }}
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
        </View>
      )}
    </View>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  matchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  matchItemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeMatchItem: {
    backgroundColor: '#2a2a2a',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  matchDetails: {
    flex: 1,
  },
  matchName: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  lastMessage: {
    color: '#bbb',
    fontSize: 14,
  },
  chatContainer: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#1e1e1e',
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
    height: 60,
    paddingTop: 20, // Add for safe area
  },
  backButton: {
    padding: 8,
  },
  chatAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  chatName: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  emptyChatContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyChatText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyChatSubtext: {
    color: '#bbb',
    textAlign: 'center',
    fontSize: 14,
  },
  messageBubble: {
    maxWidth: width * 0.7,
    borderRadius: 18,
    padding: 12,
    marginVertical: 4,
    marginHorizontal: 12,
  },
  currentUserMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#f44d7b',
  },
  otherUserMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#3a3a3a',
  },
  pendingMessage: {
    opacity: 0.7,
  },
  messageText: {
    color: 'white',
    fontSize: 16,
  },
  messageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
    backgroundColor: '#1e1e1e',
  },
  input: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: 'white',
    marginRight: 8,
  },
  sendButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f44d7b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledSendButton: {
    backgroundColor: '#5a5a5a',
  },
  noMatchesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    marginTop: 50,
  },
  noMatchesText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  noMatchesSubtext: {
    color: '#bbb',
    textAlign: 'center',
    fontSize: 14,
    marginBottom: 24,
  },
  discoverButton: {
    backgroundColor: '#f44d7b',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  discoverButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});