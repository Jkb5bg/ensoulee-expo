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
import { GetMessages } from '@/api/GetMessages';
import { SendMessage } from '@/api/SendMessage';
import { HandleUnmatch } from '@/api/HandleUnmatch';
import MessageType from '@/types/MessageType';
import UserActionMenu from '@/components/UserActionMenu';

const DEFAULT_AVATAR = require('@/assets/images/default-avatar.png');
const { width, height } = Dimensions.get('window');
const isSmallDevice = height < 700;
const isLargeDevice = height > 800;

// For larger devices like Pixel Pro 8, increase the top padding
const chatHeaderPaddingTop = Platform.OS === 'ios' 
  ? (isSmallDevice ? 45 : (isLargeDevice ? 65 : 55))
  : (isSmallDevice ? 25 : (isLargeDevice ? 55 : 40)); // Increased Android padding

const chatHeaderHeight = Platform.OS === 'ios'
  ? (isSmallDevice ? 100 : (isLargeDevice ? 120 : 110))
  : (isSmallDevice ? 80 : (isLargeDevice ? 110 : 90)); // Increased Android height

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
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const token = authTokens?.idToken || '';
  
  // Set custom header when component mounts
  useEffect(() => {
    setCustomHeader(true);
    // Cleanup function - important to prevent issues when navigating back
    return () => setCustomHeader(false);
  }, []);
  
  // Fetch messages
  const fetchMessages = useCallback(async () => {
    if (!matchId || !userInfo || !user) {
      setLoading(false);
      return;
    }

    try {
      if (!token) {
        throw new Error('No token available');
      }

      const data = await GetMessages(userInfo, matchId, token);
      
      if (data && data.messages) {
        setMessages(data.messages);

        // Scroll to bottom if messages exist
        if (data.messages.length > 0) {
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: false });
          }, 100);
        }
      } else {
        setMessages([]);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      Alert.alert('Error', 'Failed to load messages');
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [matchId, user, userInfo]);

  // Handle sending a message
  const handleSendMessage = useCallback(async () => {
    if (!newMessage.trim() || !matchId || !user || !userInfo) return;
  
    const messageContent = newMessage.trim();
    const timestamp = Date.now();
    
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
  
      // Update local state optimistically
      setMessages(prev => [...prev, tempMessage]);
  
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
        userId,
        senderId,
        timestamp,
        token,
        messageContent
      );
  
      // Update pending status
      setMessages(prev => 
        prev.map(msg =>
          msg.timestamp === timestamp ? { ...msg, pending: false } : msg
        )
      );
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
      
      // Remove failed message from state
      setMessages(prev => prev.filter(msg => msg.timestamp !== timestamp));
    }
  }, [newMessage, matchId, user, userInfo]);

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
    if (!user || !userInfo) return;

    try {
      if (!token) return;
      
      // Use your HandleUnmatch API function
      await HandleUnmatch(userInfo, token, matchId);
      
      Alert.alert('Success', 'Unmatched successfully');
      router.back();
    } catch (error) {
      console.error('Error unmatching:', error);
      Alert.alert('Error', 'Failed to unmatch');
    }
  };

  // Fetch messages on component mount
  useEffect(() => {
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
        <Text style={styles.messageText}>{item.content}</Text>
        <Text style={styles.messageTime}>
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

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Fixed header - not using SafeAreaView here */}
      <View style={styles.chatHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="white" />
        </TouchableOpacity>
        
        <Image
          source={profileImage ? { uri: profileImage } : DEFAULT_AVATAR}
          style={styles.chatAvatar}
        />
        
        <Text style={styles.chatName}>{userName}</Text>
        
        <UserActionMenu
          matchId={matchId}
          targetUserId={userId}
          userName={userName}
          onBlock={(data) => handleBlock(userId, data.reason, data.details)}
          onReport={(data) => handleReport(userId, data.reason, data.details)}
          onUnmatch={handleUnmatch}
        />
      </View>
      
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
            contentContainerStyle={messages.length === 0 ? { flex: 1 } : { paddingVertical: 16 }}
            ListEmptyComponent={renderEmptyChat}
            onContentSizeChange={() => {
              if (messages.length > 0) {
                flatListRef.current?.scrollToEnd({ animated: false });
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#1e1e1e',
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
    paddingTop: chatHeaderPaddingTop, // Dynamic padding based on device size
    height: chatHeaderHeight,         // Dynamic height based on device size
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
});