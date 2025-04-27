// components/AppDataContext.tsx
import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { useAuth } from './AuthContext';
import { useLoading } from './LoadingContext';
import { GetPotentialMatches } from '@/api/GetPotentialMatches';
import { GetUserMatches } from '@/api/GetUserMatches';
import AppDataContextType from '@/types/appDataContextType';
import Profile from '@/types/profile';
import Match from '@/types/matchType';

// Create context with default values
const AppDataContext = createContext<AppDataContextType>({
  matches: [],
  potentialMatches: [],
  userProfileImage: null,
  profileImagesCache: {},
  loadProfileImage: async () => null,
  refreshMatches: async () => {},
  refreshPotentialMatches: async () => {},
  refreshAllData: async () => {},
  isLoading: false
});

// Provider component
export const AppDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // State for matches and potential matches
  const [matches, setMatches] = useState<any[]>([]);
  const [potentialMatches, setPotentialMatches] = useState<any[]>([]);
  const [profileImagesCache, setProfileImagesCache] = useState<Record<string, string>>({});
  const [userProfileImage, setUserProfileImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // Prevent duplicate initializations
  const initializedRef = useRef<boolean>(false);
  const isRefreshingRef = useRef<boolean>(false);
  
  // Get auth context
  const { userInfo, authTokens } = useAuth();
  const { showLoading, hideLoading } = useLoading();

  // Process match data to ensure consistent format
  const processMatchData = (matchData: any): Match => {
    const RANKS = ["PLATINUM", "GOLD", "SILVER", "BRONZE", "UNRANKED"];
    
    // If matchedUser info is missing, create placeholder
    if (!matchData.matchedUser) {
      matchData.matchedUser = {
        id: matchData.userName2 || `unknown-${matchData.id}`,
        name: "Unknown User",
        userName: matchData.userName2 || `unknown-${matchData.id}`,
        profileImage: null
      };
    }

    // Handle matchRank
    if (!matchData.matchRank || matchData.matchRank === "") {
      matchData.matchRank = "UNRANKED";
    } else {
      // Convert to uppercase for standardization
      matchData.matchRank = String(matchData.matchRank).toUpperCase();
      
      // Validate against known ranks
      if (!RANKS.includes(matchData.matchRank)) {
        matchData.matchRank = "UNRANKED";
      }
    }

    // Ensure matchScore is a number between 0-1
    if (matchData.matchScore !== undefined && matchData.matchScore !== null) {
      matchData.matchScore = parseFloat(matchData.matchScore);
      
      // Normalize score if greater than 1 (assuming percentage)
      if (matchData.matchScore > 1) {
        matchData.matchScore = matchData.matchScore / 100;
      }
    } else {
      matchData.matchScore = 0;
    }

    return matchData as Match;
  };

  // Load profile image - simplified to just return the provided URL
  const loadProfileImage = useCallback(async (userId: string, imageUrl?: string): Promise<string | null> => {
    if (!imageUrl) return null;
    
    // Just return the URL as-is - the API already provides proper URLs
    return imageUrl;
  }, []);

  // Refresh matches
  const refreshMatches = useCallback(async (): Promise<void> => {
    if (!userInfo || !authTokens?.idToken) {
      console.log('No authentication info available, skipping matches fetch');
      return;
    }

    if (isRefreshingRef.current) {
      console.log('Already refreshing matches, skipping duplicate call');
      return;
    }

    try {
      isRefreshingRef.current = true;
      setIsLoading(true);
      
      const data = await GetUserMatches(userInfo, authTokens.idToken);
      console.log('Matches data received:', data?.length || 0);

      if (data && Array.isArray(data)) {
        // Process the matches data
        const processedMatches = data.map((match: any) => processMatchData(match));
        
        if (processedMatches.length > 0) {
          setMatches(processedMatches);
        } else {
          setMatches([]);
        }
      } else {
        console.log('No data returned from API');
        setMatches([]);
      }
    } catch (error) {
      console.error('Error fetching matches:', error);
    } finally {
      setIsLoading(false);
      isRefreshingRef.current = false;
    }
  }, [userInfo, authTokens]);

  // Refresh potential matches
  const refreshPotentialMatches = useCallback(async (): Promise<void> => {
    if (!userInfo || !authTokens?.idToken) {
      console.log('No authentication info available, skipping potential matches fetch');
      return;
    }
    
    try {
      setIsLoading(true);
      
      const data = await GetPotentialMatches(userInfo, authTokens.idToken);
      console.log('Potential matches received:', data?.length || 0);
      
      if (data && Array.isArray(data)) {
        setPotentialMatches(data);
      } else {
        console.log('No potential matches returned from API');
        setPotentialMatches([]);
      }
    } catch (error) {
      console.error('Error fetching potential matches:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userInfo, authTokens]);

  // Refresh all data
  const refreshAllData = useCallback(async (): Promise<void> => {
    if (!userInfo || !authTokens?.idToken) {
      return;
    }
    
    try {
      showLoading('Loading your data...');
      setIsLoading(true);
      
      // Run both refreshes in parallel for better performance
      await Promise.all([
        refreshMatches(),
        refreshPotentialMatches()
      ]);
    } catch (error) {
      console.error('Error refreshing all data:', error);
      Alert.alert('Error', 'Failed to load your data');
    } finally {
      hideLoading();
      setIsLoading(false);
    }
  }, [userInfo, authTokens, refreshMatches, refreshPotentialMatches, showLoading, hideLoading]);

  // Load initial data when component mounts and auth is available
  useEffect(() => {
    if (userInfo && authTokens?.idToken && !initializedRef.current) {
      // Mark as initialized to prevent duplicate loads
      initializedRef.current = true;
      
      // Set immediate loading state
      setIsLoading(true);

      // Start eager initialization of all data
      console.log('🔄 Initializing app data context...');
      
      // Run data loading in parallel
      Promise.all([
        refreshMatches(),
        refreshPotentialMatches()
      ])
      .then(() => {
        console.log('✅ App data context initialized successfully');
      })
      .catch((error) => {
        console.error('❌ Error initializing app data:', error);
      });
    }
  }, [userInfo, authTokens?.idToken, refreshMatches, refreshPotentialMatches]);

  return (
    <AppDataContext.Provider value={{
      matches,
      potentialMatches,
      userProfileImage,
      profileImagesCache,
      loadProfileImage,
      refreshMatches,
      refreshPotentialMatches,
      refreshAllData,
      isLoading
    }}>
      {children}
    </AppDataContext.Provider>
  );
};

// Custom hook to use the app data context
export const useAppData = () => useContext(AppDataContext);