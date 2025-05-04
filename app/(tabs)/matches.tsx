import React, { useEffect, useState, useCallback, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  TouchableOpacity, 
  ActivityIndicator, 
  FlatList,
  Text as RNText,
  Image,
  Dimensions,
  Platform,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/components/AuthContext';
import { useLoading } from '@/components/LoadingContext';
import { router } from 'expo-router';
import Match from '@/types/matchType';
import { useAppData } from '@/components/AppDataContext';

// Default avatar image
const DEFAULT_AVATAR = require("@/assets/images/default-avatar.png");

// Match ranks - standardized to uppercase
const RANKS = ["PLATINUM", "GOLD", "SILVER", "BRONZE", "UNRANKED"];

export default function MatchesScreen() {
  const { matches, refreshMatches, isLoading, profileImagesCache, loadProfileImage } = useAppData();
  const { authTokens, userInfo } = useAuth();
  const { showLoading, hideLoading } = useLoading();
  const hasInitiallyLoaded = useRef(false);

  
  // Get screen dimensions
  const [dimensions, setDimensions] = useState({
    window: Dimensions.get('window'),
    screen: Dimensions.get('screen')
  });

  // Update dimensions when orientation changes
  useEffect(() => {
    const subscription = Dimensions.addEventListener(
      'change',
      ({window, screen}) => {
        setDimensions({window, screen});
      },
    );
    return () => subscription.remove();
  }, []);

  // When navigating from matches.tsx or similar:
  const handleMatchPress = (match: Match): void => {
    // Preload image if possible
    if (match.matchedUser?.profileImage && match.matchedUser?.id) {
      loadProfileImage(match.matchedUser.id, match.matchedUser.profileImage);
    }

    router.push({
      pathname: "/profile",
      params: { 
        matchId: match.matchId,
        userId: match.matchedUser?.id,
        name: match.matchedUser?.name,
        // Just pass the raw filename - nothing else
        profileImage: match.matchedUser?.profileImage || '',
      }
    });
  };

  const handleMatchLongPress = (match: Match): void => {
    // Preload image if possible
    if (match.matchedUser?.profileImage && match.matchedUser?.id) {
      loadProfileImage(match.matchedUser.id, match.matchedUser.profileImage);
    }

    router.push({
      pathname: "/messages/chat",
      params: { 
        matchId: match.matchId,
        name: match.matchedUser?.name || "Unknown",
        profileImage: match.matchedUser?.profileImage,
        userId: match.matchedUser?.id 
      }
    });
  };

  // Fetch matches from AppDataContext on component mount if needed
  useEffect(() => {
    if (!hasInitiallyLoaded.current && matches.length === 0 && !isLoading) {
      refreshMatches();
      hasInitiallyLoaded.current = true;
    }
  }, [matches.length, isLoading, refreshMatches]);

  // Helper functions for UI rendering
  const formatMatchCreatedAt = (dateString: string | undefined): string => {
    if (!dateString) return "";

    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch (error) {
      return "";
    }
  };

  const formatMessageTimestamp = (timestamp: number): string => {
    try {
      const now = new Date();
      const messageDate = new Date(timestamp);

      // If it's today, show time only
      if (messageDate.toDateString() === now.toDateString()) {
        return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }

      // If it's within the last week, show day name
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      if (messageDate > oneWeekAgo) {
        return messageDate.toLocaleDateString([], { weekday: 'short' });
      }

      // Otherwise show short date
      return messageDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch (error) {
      return "";
    }
  };

  const getRankDisplayName = (rank: string | undefined): string => {
    if (!rank) return "Unranked";

    const upperRank = rank.toUpperCase();
    switch (upperRank) {
      case "PLATINUM": return "Platinum";
      case "GOLD": return "Gold";
      case "SILVER": return "Silver";
      case "BRONZE": return "Bronze";
      case "UNRANKED": return "Unranked";
      default: return "Unranked";
    }
  };

  const getRankColor = (rank: string | undefined): string => {
    if (!rank) return "#AAAAAA"; // Default gray for undefined

    const upperRank = rank.toUpperCase();
    switch (upperRank) {
      case "PLATINUM": return "#E5E4E2"; // Platinum
      case "GOLD": return "#FFD700"; // Gold
      case "SILVER": return "#C0C0C0"; // Silver
      case "BRONZE": return "#CD7F32"; // Bronze
      case "UNRANKED": return "#AAAAAA"; // Gray for unranked
      default: return "#AAAAAA"; // Default gray
    }
  };

  const truncateMessage = (message: string | undefined, maxLength: number = 24): string => {
    if (!message) return "";
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + "...";
  };

  // Get the appropriate image URL for a match
  const getMatchImage = (match: Match): any => {
    if (!match.matchedUser) return DEFAULT_AVATAR;
    
    const userId = match.matchedUser.id;
    const profileImage = match.matchedUser.profileImage;
    
    if (!profileImage) return DEFAULT_AVATAR;
    
    // Check if it's already in the cache
    const cacheKey = `${userId}-${profileImage}`;
    if (profileImagesCache[cacheKey]) {
      return { uri: profileImagesCache[cacheKey] };
    }
    
    // If not in cache but it's a URL, use it directly
    if (profileImage.startsWith('http')) {
      return { uri: profileImage };
    }
    
    // Otherwise use default while we load it
    // Also trigger loading to get it into cache for next time
    loadProfileImage(userId, profileImage);
    return DEFAULT_AVATAR;
  };

  // Render a single match item
  const renderMatchItem = ({ item }: { item: Match }): JSX.Element => (
    <TouchableOpacity
    key={item.matchId}
    onPress={() => handleMatchPress(item)}
    onLongPress={() => handleMatchLongPress(item)}
    delayLongPress={500} // half second for long press
    style={styles.matchCard}
  >
      <View style={styles.cardRow}>
        {/* Profile Image */}
        <View style={styles.imageContainer}>
          <Image
            source={getMatchImage(item)}
            style={styles.matchImage}
            resizeMode={"cover"}
          />
        </View>

        {/* Match Details */}
        <View style={styles.detailsContainer}>
          <RNText style={styles.matchName}>
            {item.matchedUser?.name || "Unknown"}
          </RNText>

          {/* Match Score */}
          <View style={styles.scoreRow}>
            <RNText style={styles.scoreText}>
              {`${(item.matchScore ? item.matchScore * 100 : 0).toFixed(0)}% Match`}
            </RNText>
          </View>

          {/* Match Rank with color indicator */}
          <View style={styles.rankRow}>
            <View
              style={[styles.rankDot, { backgroundColor: getRankColor(item.matchRank) }]}
            />
            <RNText style={styles.rankText}>
              {getRankDisplayName(item.matchRank)}
            </RNText>
          </View>

          {/* Last Message Preview */}
          {item.lastMessage && (
            <View style={styles.messageRow}>
              <RNText style={styles.messageText} numberOfLines={1}>
                {truncateMessage(item.lastMessage.content)}
              </RNText>
              <RNText style={styles.timeText}>
                {formatMessageTimestamp(item.lastMessage.timestamp)}
              </RNText>
            </View>
          )}

          {/* Match Date */}
          <RNText style={styles.dateText}>
            Matched on {formatMatchCreatedAt(item.createdAt)}
          </RNText>
        </View>
      </View>
    </TouchableOpacity>
  );

  // Show loading indicator while loading
  if (isLoading && matches.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={"#f44d7b"} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Main content - scrollable area with rank categories */}
      <ScrollView style={styles.scrollView}>
        {matches.length === 0 ? (
          <View style={styles.centerContainer}>
            <RNText style={styles.noMatchesText}>No matches found</RNText>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={refreshMatches}
            >
              <RNText style={styles.refreshButtonText}>Refresh</RNText>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.content}>
            {/* Display total matches count */}
            <RNText style={styles.totalCountText}>
              Total Matches: {matches.length}
            </RNText>

            {RANKS.map(rank => {
              // Handle unranked matches specially
              const rankMatches = rank === "UNRANKED"
                ? matches.filter(match =>
                  !match.matchRank ||
                  match.matchRank === "" ||
                  (match.matchRank && match.matchRank.toUpperCase() === "UNRANKED"))
                : matches.filter(match =>
                  match.matchRank && match.matchRank.toUpperCase() === rank);

              if (rankMatches.length === 0) return null;

              return (
                <View key={rank} style={styles.rankSection}>
                  <View style={styles.rankHeaderRow}>
                    <View
                      style={[styles.rankHeaderDot, { backgroundColor: getRankColor(rank) }]}
                    />
                    <RNText style={styles.rankHeaderText}>
                      {getRankDisplayName(rank)} Matches ({rankMatches.length})
                    </RNText>
                  </View>

                  <FlatList
                    data={rankMatches}
                    renderItem={renderMatchItem}
                    keyExtractor={item => item.matchId || item.id}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.matchList}
                    ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
                  />
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "rgba(24, 24, 24, 1)"
  },
  scrollView: {
    flex: 1
  },
  content: {
    padding: 16,
    paddingBottom: 24,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    minHeight: 400,
  },
  profileIcon: {
    width: 32,
    height: 32,
    borderRadius: 16
  },
  matchList: {
    paddingVertical: 8,
    paddingHorizontal: 4
  },
  matchCard: {
    marginRight: 12,
    marginBottom: 8,
    padding: 10,
    borderRadius: 16,
    backgroundColor: 'rgba(40, 40, 40, 0.5)',
    width: 320,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  imageContainer: {
    width: 90,
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
  },
  matchImage: {
    width: 90,
    height: 120,
    borderRadius: 12
  },
  detailsContainer: {
    flex: 1,
    marginLeft: 12,
  },
  matchName: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  scoreText: {
    color: 'white',
    fontSize: 14,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  rankDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  rankText: {
    color: 'white',
    fontSize: 14,
  },
  messageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  messageText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    flex: 1,
  },
  timeText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    marginLeft: 4,
  },
  dateText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    marginTop: 4,
  },
  rankSection: {
    marginTop: 24,
  },
  rankHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  rankHeaderDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  rankHeaderText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  noMatchesText: {
    fontSize: 18,
    color: 'white',
    marginBottom: 16,
  },
  totalCountText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  refreshButton: {
    marginTop: 20,
    padding: 12,
    backgroundColor: 'rgba(244, 77, 123, 1)',
    borderRadius: 8,
  },
  refreshButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: '500',
  },
});