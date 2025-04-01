import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { GetUserMatches } from '@/api/GetUserMatches';
import { GetPotentialMatches } from '@/api/GetPotentialMatches';
import { GetUserProfileImage } from '@/api/GetUserProfileImage';
import { useAuth } from './AuthContext';
import { useLoading } from './LoadingContext';
import AppDataContextType from '@/types/appDataContextType';

// Create the context
const AppDataContext = createContext<AppDataContextType>({
    matches: [],
    potentialMatches: [],
    userProfileImage: null,
    refreshMatches: async () => {},
    refreshPotentialMatches: async () => {},
    refreshAllData: async () => {},
    isLoading: false
  });
  
  // Provider props type
  interface AppDataProviderProps {
    children: ReactNode;
  }
  
  // Provider component
  export const AppDataProvider = ({ children }: AppDataProviderProps) => {
    const [matches, setMatches] = useState<any[]>([]);
    const [potentialMatches, setPotentialMatches] = useState<any[]>([]);
    const [userProfileImage, setUserProfileImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    
    // Refs to track API calls in progress
    const isFetchingMatches = useRef(false);
    const isFetchingPotentials = useRef(false);
    const isFetchingImage = useRef(false);
    const isInitializing = useRef(false);
  
    const { authTokens, userInfo } = useAuth();
    const { showLoading, hideLoading } = useLoading();
  
    // Load user profile image
    const loadUserProfileImage = async () => {
      if (!userInfo || !authTokens?.idToken) return null;
      
      // Prevent duplicate calls
      if (isFetchingImage.current) return null;
      isFetchingImage.current = true;
  
      try {
        console.log("[AppDataContext] Loading user profile image");
        const imageUrl = await GetUserProfileImage(userInfo, authTokens.idToken);
        if (imageUrl) {
          setUserProfileImage(imageUrl);
        }
        return imageUrl;
      } catch (error) {
        console.error('Error loading profile image:', error);
        return null;
      } finally {
        isFetchingImage.current = false;
      }
    };
  
    // Function to fetch matches
    const fetchMatches = async () => {
      if (!userInfo || !authTokens?.idToken) return;
      
      // Prevent duplicate calls
      if (isFetchingMatches.current) {
        console.log("[AppDataContext] Matches fetch already in progress, skipping");
        return;
      }
      
      isFetchingMatches.current = true;
      console.log("[AppDataContext] Fetching matches");
  
      try {
        setIsLoading(true);
        const data = await GetUserMatches(userInfo, authTokens.idToken);
        if (data && Array.isArray(data)) {
          console.log(`[AppDataContext] Got ${data.length} matches`);
          setMatches(data);
        }
      } catch (error) {
        console.error('Error fetching matches:', error);
      } finally {
        setIsLoading(false);
        isFetchingMatches.current = false;
      }
    };
  
    // Function to fetch potential matches
    const fetchPotentialMatches = async () => {
      if (!userInfo || !authTokens?.idToken) return;
      
      // Prevent duplicate calls
      if (isFetchingPotentials.current) {
        console.log("[AppDataContext] Potential matches fetch already in progress, skipping");
        return;
      }
      
      isFetchingPotentials.current = true;
      console.log("[AppDataContext] Fetching potential matches");
  
      try {
        setIsLoading(true);
        const data = await GetPotentialMatches(userInfo, authTokens.idToken);
        if (data && Array.isArray(data)) {
          console.log(`[AppDataContext] Got ${data.length} potential matches`);
          setPotentialMatches(data);
        }
      } catch (error) {
        console.error('Error fetching potential matches:', error);
      } finally {
        setIsLoading(false);
        isFetchingPotentials.current = false;
      }
    };
  
    // Function to refresh all data at once
    const refreshAllData = async () => {
      if (!userInfo || !authTokens?.idToken) return;
      
      // Prevent duplicate calls
      if (isInitializing.current) {
        console.log("[AppDataContext] Data refresh already in progress, skipping");
        return;
      }
      
      isInitializing.current = true;
      console.log("[AppDataContext] Refreshing all data");
  
      try {
        showLoading('Refreshing data...');
        setIsLoading(true);
        
        // Load all data in parallel for efficiency
        await Promise.all([
          loadUserProfileImage(),
          fetchMatches(),
          fetchPotentialMatches()
        ]);
      } catch (error) {
        console.error('Error refreshing data:', error);
      } finally {
        setIsLoading(false);
        hideLoading();
        isInitializing.current = false;
      }
    };
  
    // Initialize the data on first component mount
    useEffect(() => {
      const initializeData = async () => {
        if (!userInfo || !authTokens?.idToken) {
          setIsInitialized(true);
          return;
        }
  
        if (!isInitialized && !isInitializing.current) {
          isInitializing.current = true;
          console.log("[AppDataContext] Initializing app data");
          
          try {
            showLoading('Loading your profile...');
            
            // Check if we need to load data
            const shouldLoadImage = !userProfileImage;
            const shouldLoadMatches = matches.length === 0;
            const shouldLoadPotentials = potentialMatches.length === 0;
            
            // Only load what we need
            const promises = [];
            if (shouldLoadImage) promises.push(loadUserProfileImage());
            if (shouldLoadMatches) promises.push(fetchMatches());
            if (shouldLoadPotentials) promises.push(fetchPotentialMatches());
            
            if (promises.length > 0) {
              await Promise.all(promises);
            }
          } catch (error) {
            console.error('Error initializing app data:', error);
          } finally {
            setIsInitialized(true);
            hideLoading();
            isInitializing.current = false;
          }
        }
      };
  
      initializeData();
      // Intentionally empty dependency array - we only want to run this once
    }, []);
  
    // Update data when authentication changes
    useEffect(() => {
      if (userInfo && authTokens?.idToken && isInitialized) {
        // Wait a bit to avoid race conditions
        const timer = setTimeout(() => {
          refreshAllData();
        }, 500);
        
        return () => clearTimeout(timer);
      }
    }, [userInfo?.userName, authTokens?.idToken]);
  
    return (
      <AppDataContext.Provider
        value={{
          matches,
          potentialMatches,
          userProfileImage,
          refreshMatches: fetchMatches,
          refreshPotentialMatches: fetchPotentialMatches,
          refreshAllData,
          isLoading
        }}
      >
        {children}
      </AppDataContext.Provider>
    );
  };
  
  // Export the hook to use the context
  export const useAppData = () => {
    const context = useContext(AppDataContext);
    if (context === undefined) {
      throw new Error('useAppData must be used within an AppDataProvider');
    }
    return context;
  };