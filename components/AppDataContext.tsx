// components/AppDataContext.tsx
import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { useAuth } from './AuthContext';
import { useLoading } from './LoadingContext';
import { GetPotentialMatches } from '@/api/GetPotentialMatches';
import { GetUserMatches } from '@/api/GetUserMatches';
import { GetUserProfileImages } from '@/api/GetUserProfileImages';
import AppDataContextType from '@/types/appDataContextType';
import Profile from '@/types/profile';
import Match from '@/types/matchType';
import User from '@/types/user';

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

  // Clean up image URL for consistent caching
  const cleanImageUrl = (url: string): string => {
    // If it's already a URL, remove any query parameters for better caching
    if (url.startsWith('http') && url.includes('?')) {
      return url.split('?')[0];
    }
    return url;
  };

  // Load profile image
  const loadProfileImage = useCallback(async (userId: string, imageFilename?: string): Promise<string | null> => {
    if (!imageFilename) return null;
    if (!userInfo || !authTokens?.idToken) return null;
    
    // Clean up the filename for consistent caching
    const cleanFilename = imageFilename.startsWith('http') 
      ? cleanImageUrl(imageFilename)
      : imageFilename;
    
    // Create cache key
    const cacheKey = `${userId}-${cleanFilename}`;
    
    // Check if already in cache
    if (profileImagesCache[cacheKey]) {
      console.log(`Using cached image for ${userId}: ${cleanFilename}`);
      return profileImagesCache[cacheKey];
    }
    
    // If it's already a URL, just cache and return it
    if (imageFilename.startsWith('http')) {
      const cleanedUrl = cleanImageUrl(imageFilename);
      setProfileImagesCache(prev => ({
        ...prev,
        [cacheKey]: cleanedUrl
      }));
      return cleanedUrl;
    }
    
    try {
      // Create user object for API call
      const userObj = {
        userName: userId,
        imageFilenames: [imageFilename]
      } as unknown as User;
      
      // Get image URLs
      console.log(`Fetching image URL for ${userId}: ${imageFilename}`);
      const urls = await GetUserProfileImages(userInfo, authTokens.idToken, userObj);
      
      // If we got URLs back, cache and return the first one
      if (Array.isArray(urls) && urls.length > 0) {
        const cleanedUrl = cleanImageUrl(urls[0]);
        setProfileImagesCache(prev => ({
          ...prev,
          [cacheKey]: cleanedUrl
        }));
        
        // Also store the URL under the original filename for easier lookup
        if (cleanedUrl !== cleanFilename) {
          setProfileImagesCache(prev => ({
            ...prev,
            [`${userId}-${imageFilename}`]: cleanedUrl
          }));
        }
        
        return cleanedUrl;
      }
    } catch (error) {
      console.error('Error loading profile image:', error);
    }
    
    // Fallback to direct S3 URL construction
    const fallbackUrl = `https://ensoulee-user-images.s3.amazonaws.com/${userId}/${imageFilename}`;
    setProfileImagesCache(prev => ({
      ...prev,
      [cacheKey]: fallbackUrl
    }));
    return fallbackUrl;
  }, [userInfo, authTokens, profileImagesCache]);

  // Refresh matches
  const refreshMatches = useCallback(async (): Promise<void> => {
    if (!userInfo || !authTokens?.idToken) {
      console.log('No authentication info available, skipping matches fetch');
      return;
    }

    try {
      setIsLoading(true);
      
      const data = await GetUserMatches(userInfo, authTokens.idToken);
      console.log('Matches data received:', data?.length || 0);

      if (data && Array.isArray(data)) {
        // Process the matches data
        const processedMatches = data.map((match: any) => processMatchData(match));
        
        if (processedMatches.length > 0) {
          setMatches(processedMatches);
          
          // Preload profile images for faster rendering
          const preloadPromises = processedMatches.map(match => {
            if (match.matchedUser?.profileImage) {
              return loadProfileImage(match.matchedUser.id, match.matchedUser.profileImage)
                .catch(() => null); // Silently continue if image fetch fails
            }
            return Promise.resolve(null);
          });
          
          // Wait for all image preloading to finish
          await Promise.all(preloadPromises);
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
    }
  }, [userInfo, authTokens, loadProfileImage]);

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
        
        // Cache any presigned image URLs
        data.forEach((profile: any) => {
          if (profile.presignedImageUrls && Array.isArray(profile.presignedImageUrls) && profile.presignedImageUrls.length > 0) {
            // These URLs are already presigned, so just cache them
            profile.presignedImageUrls.forEach((url: string, index: number) => {
              if (url) {
                if (url.startsWith('http')) {
                  const cleanedUrl = cleanImageUrl(url);
                  const cacheKey = `${profile.userName}-image-${index}`;
                  setProfileImagesCache(prev => ({
                    ...prev,
                    [cacheKey]: cleanedUrl
                  }));
                }
              }
            });
          }
        });
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