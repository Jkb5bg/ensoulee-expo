import React, { createContext, useContext, useState, useMemo, useEffect, ReactNode, useRef } from 'react';
import * as WebBrowser from 'expo-web-browser'; 
import { useAuthRequest, exchangeCodeAsync, revokeAsync, ResponseType, refreshAsync } from 'expo-auth-session'
import { TokenResponse } from 'expo-auth-session/build/TokenRequest'
import { Alert, AppState, AppStateStatus } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';
import { jwtDecode } from 'jwt-decode';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { GetUserSelfAPI } from '@/api/GetUserSelfAPI';
import { GetUserProfileImage } from '@/api/GetUserProfileImage';
import DecodedTokenInfo from '@/types/decodedTokenInfo';
import RawDecodedToken from '@/types/rawDecodedToken';
import User from '@/types/user';
import { useLoading } from './LoadingContext';
import ExtendedAuthContextType from '@/types/extendedAuthContextType';
import OnboardingTrackingType from '@/types/onboardingTrackingType';

WebBrowser.maybeCompleteAuthSession();

// Define constants
const clientId: string = process.env.EXPO_PUBLIC_COGNITO_CLIENT_ID ?? '';
const userPoolUri: string = process.env.EXPO_PUBLIC_USER_POOL_ID ?? '';
const redirectUri = "ensoulee://"
const AUTH_TOKENS_KEY: string = 'auth_tokens';
const USER_INFO_KEY: string = 'user_info';
const USER_DATA_KEY: string = 'user_data';
const AUTH_STATE_KEY: string = 'auth_state';
const USER_PROFILE_IMAGE_KEY = 'user_profile_image'; 
const TOKEN_REFRESH_TIME_KEY = 'token_refresh_time';
const BACKGROUND_REFRESH_TASK = 'background-token-refresh';
const ONBOARDING: OnboardingTrackingType = {
  demographics: false,
  profileSetup: false,
  quiz: false,
  register: false,
  index: false,
  overall: false
};

// Define refresh buffer time (refresh token 10 minutes before expiration)
// const REFRESH_BUFFER_TIME = 10 * 60; // 10 minutes in seconds
const REFRESH_BUFFER_TIME = 86400 - (60 * 60 * 12); // 12 hours


// Register background task
TaskManager.defineTask(BACKGROUND_REFRESH_TASK, async () => {
  try {
    console.log('[BackgroundFetch] Running token refresh task');
    const tokensString = await SecureStore.getItemAsync(AUTH_TOKENS_KEY);
    
    if (!tokensString) {
      console.log('[BackgroundFetch] No tokens found');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }
    
    const tokens = JSON.parse(tokensString);
    const parsedTokens = {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      idToken: tokens.idToken,
      issuedAt: tokens.issuedAt,
      expiresIn: tokens.expiresIn,
    } as TokenResponse;
    
    // Check if token is expired or expiring soon
    const expirationTime = tokens.issuedAt + tokens.expiresIn;
    const currentTime = Date.now() / 1000;
    const shouldRefresh = currentTime > expirationTime - REFRESH_BUFFER_TIME;
    
    if (shouldRefresh && tokens.refreshToken) {
      console.log('[BackgroundFetch] Refreshing token');
      const discoveryDocument = {
        authorizationEndpoint: userPoolUri + '/oauth2/authorize',
        tokenEndpoint: userPoolUri + '/oauth2/token',
        revocationEndpoint: userPoolUri + '/oauth2/revoke',
      };
      
      const refreshedTokens = await refreshAsync(
        {
          clientId,
          refreshToken: tokens.refreshToken,
        },
        discoveryDocument
      );

      const expiresIn = refreshedTokens.expiresIn ?? tokens.expiresIn;

      
      // Save refreshed tokens
      const minimalTokenData = {
        accessToken: refreshedTokens.accessToken,
        idToken: refreshedTokens.idToken,
        refreshToken: refreshedTokens.refreshToken,
        issuedAt: refreshedTokens.issuedAt,
        expiresIn: refreshedTokens.expiresIn,
      };
      
      await SecureStore.setItemAsync(AUTH_TOKENS_KEY, JSON.stringify(minimalTokenData));
      
      // Update next refresh time
      const nextRefreshTime = (refreshedTokens.issuedAt + expiresIn - REFRESH_BUFFER_TIME) * 1000;
      await SecureStore.setItemAsync(TOKEN_REFRESH_TIME_KEY, nextRefreshTime.toString());
      
      console.log('[BackgroundFetch] Token refreshed successfully');
      return BackgroundFetch.BackgroundFetchResult.NewData;
    }
    
    console.log('[BackgroundFetch] Token doesn\'t need refreshing yet');
    return BackgroundFetch.BackgroundFetchResult.NoData;
  } catch (error) {
    console.error('[BackgroundFetch] Error refreshing token:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// Create the context with a default value
const AuthContext = createContext<ExtendedAuthContextType | undefined>(undefined);

// Provider props type
interface AuthProviderProps {
  children: ReactNode;
}

// Provider component
export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [authTokens, setAuthTokens] = useState<TokenResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [userInfo, setUserInfo] = useState<DecodedTokenInfo | null>(null);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const { showLoading, hideLoading } = useLoading();
  const [user, setUser] = useState<User | null>(null); 
  const [userProfileImage, setUserProfileImage] = useState<string | null>(null);
  const [onboardingTracking, setOnboardingTracking] = useState<OnboardingTrackingType>(ONBOARDING);
  
  // Add this ref to track if auth is in progress
  const authInProgressRef = useRef<boolean>(false);

  // Ref to track if user data is properly fetched
  const fetchingUserDataRef = useRef<boolean>(false);

  // Discovery document
  const discoveryDocument = useMemo(() => ({
    authorizationEndpoint: userPoolUri + '/oauth2/authorize',
    tokenEndpoint: userPoolUri + '/oauth2/token',
    revocationEndpoint: userPoolUri + '/oauth2/revoke',
  }), []);

  const [request, response, promptAsyncOriginal] = useAuthRequest(
    {
      clientId,
      responseType: ResponseType.Code,
      redirectUri,
      usePKCE: true,
    },
    discoveryDocument
  );

  // Register background fetch task
  const registerBackgroundFetch = async () => {
    try {
      await BackgroundFetch.registerTaskAsync(BACKGROUND_REFRESH_TASK, {
        minimumInterval: 15 * 60, // 15 minutes
        stopOnTerminate: false,
        startOnBoot: true,
      });
      console.log('Background fetch task registered');
    } catch (error) {
      console.error('Error registering background fetch:', error);
    }
  };

  // Unregister background fetch task
  const unregisterBackgroundFetch = async () => {
    try {
      await BackgroundFetch.unregisterTaskAsync(BACKGROUND_REFRESH_TASK);
      console.log('Background fetch task unregistered');
    } catch (error) {
      console.error('Error unregistering background fetch:', error);
    }
  };

  // Function to check if token is expired or will expire soon
  const isTokenExpiredOrExpiringSoon = (tokens: TokenResponse): boolean => {
    if (!tokens?.issuedAt || !tokens?.expiresIn) return true;
    
    const expirationTime = tokens.issuedAt + tokens.expiresIn;
    const currentTime = Date.now() / 1000;
    
    // Return true if token is expired or will expire within buffer time
    return currentTime > expirationTime - REFRESH_BUFFER_TIME;
  };
  
  // Function to fetch and update user data from API
  const fetchUserData = async (tokenInfo: DecodedTokenInfo, accessToken: string): Promise<void> => {
    // Prevent concurrent calls
    if (fetchingUserDataRef.current) {
      console.log("Skipping duplicate fetchUserData call - already in progress");
      return;
    }
    
    fetchingUserDataRef.current = true;
    try {
      // Fetch user data
      const userData = await GetUserSelfAPI(tokenInfo, accessToken);
      
      if (userData) {
        // Save user data to state and storage
        setUser(userData);
        await SecureStore.setItemAsync(USER_DATA_KEY, JSON.stringify(userData));
        
        // Get profile image if user has image filenames
        if (userData.imageFilenames && userData.imageFilenames.length > 0) {
          const imageUrl = await GetUserProfileImage(tokenInfo, accessToken, userData);
          if (imageUrl) {
            setUserProfileImage(imageUrl);
            await SecureStore.setItemAsync(USER_PROFILE_IMAGE_KEY, imageUrl);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      fetchingUserDataRef.current = false;
    }
  };

  // Function to refresh user data (can be called from components)
  const refreshUserData = async (): Promise<void> => {
    if (!userInfo || !authTokens?.accessToken) return;
    
    showLoading("Refreshing your data...");
    try {
      if (authTokens.idToken) {
        await fetchUserData(userInfo, authTokens.idToken);
      }
    } finally {
      hideLoading();
    }
  };

  // Modified login function
  const login = async () => {
    console.log("Login function called");
    
    try {
      // Set auth in progress flag
      authInProgressRef.current = true;
      
      // Save auth state to storage for persistence across app restarts
      await SecureStore.setItemAsync(AUTH_STATE_KEY, JSON.stringify({ 
        inProgress: true,
        timestamp: Date.now()
      }));
      
      // Show the global loading overlay
      showLoading("Signing in...");
      
      // Launch the auth flow
      return await promptAsyncOriginal();
    } catch (error) {
      console.error("Error in login:", error);
      
      // Clear the auth in progress state
      authInProgressRef.current = false;
      await SecureStore.deleteItemAsync(AUTH_STATE_KEY);
      
      // Hide the loading overlay
      hideLoading();
      throw error;
    }
  };

  // Function to refresh the token
  const refreshToken = async (): Promise<boolean> => {
    // Try to get refresh token from state first
    let refreshTokenToUse = authTokens?.refreshToken;
    
    // If no refresh token in memory, try to get it from SecureStore
    if (!refreshTokenToUse) {
      console.log('No refresh token in memory, checking SecureStore');
      try {
        const tokensString = await SecureStore.getItemAsync(AUTH_TOKENS_KEY);
        if (tokensString) {
          const storedTokens = JSON.parse(tokensString);
          if (storedTokens.refreshToken) {
            console.log('Found refresh token in SecureStore');
            refreshTokenToUse = storedTokens.refreshToken;
          }
        }
      } catch (error) {
        console.error('Error reading tokens from SecureStore:', error);
      }
    }
    
    // If still no refresh token, we can't refresh
    if (!refreshTokenToUse) {
      console.log('Cannot refresh: No refresh token available in memory or storage');
      return false;
    }

    console.log('Refreshing token...', {
      tokenIdShort: authTokens?.idToken ? authTokens.idToken.substring(0, 10) + '...' : 'none',
      tokenIssuedAt: authTokens?.issuedAt,
      tokenExpiresIn: authTokens?.expiresIn,
      refreshTokenShort: refreshTokenToUse.substring(0, 10) + '...'
    });
    
    try {
      const refreshedTokens = await refreshAsync(
        {
          clientId,
          refreshToken: refreshTokenToUse,
        },
        discoveryDocument
      );

      console.log('Token refresh response:', {
        success: !!refreshedTokens.accessToken,
        newTokenIdShort: refreshedTokens.idToken ? refreshedTokens.idToken.substring(0, 10) + '...' : 'none',
        newTokenIssuedAt: refreshedTokens.issuedAt,
        newTokenExpiresIn: refreshedTokens.expiresIn
      });
      
      // Make sure to preserve the refresh token if it's not returned in the response
      if (!refreshedTokens.refreshToken && refreshTokenToUse) {
        console.log('Preserving existing refresh token as it was not returned in the response');
        refreshedTokens.refreshToken = refreshTokenToUse;
      }
      
      await saveAndSetAuthTokens(refreshedTokens);
      
      // Update the next refresh time in SecureStore
      const nextRefreshTime = ((refreshedTokens.issuedAt ?? 0) + ((refreshedTokens.expiresIn ?? authTokens?.expiresIn) ?? 0) - REFRESH_BUFFER_TIME) * 1000;
      await SecureStore.setItemAsync(TOKEN_REFRESH_TIME_KEY, nextRefreshTime.toString());
      
      return true;
    } catch (error: unknown) {
      console.error('Failed to refresh token:', error);
      console.log('Error details:', error instanceof Error ? JSON.stringify(error) : String(error));
      
      // We don't want to clear tokens on every error - only on specific auth errors
      // This keeps the user logged in during temporary network issues
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes('invalid_grant') || 
          errorMessage.includes('unauthorized') ||
          errorMessage.includes('expired')) {
        console.log('Auth error detected, clearing tokens and forcing re-login');
        await saveAndSetAuthTokens(null);
      } else {
        console.log('Non-auth error detected, keeping tokens for retry');
      }
      
      return false;
    }
  };

  // Schedule the next token refresh
  const scheduleTokenRefresh = (tokens: TokenResponse) => {
    // Clear any existing timeout
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    if (!tokens?.issuedAt || !tokens?.expiresIn) return;

    const expirationTime = tokens.issuedAt + tokens.expiresIn;
    const currentTime = Date.now() / 1000;
    
    // Calculate time until refresh (buffer time before expiration)

    const timeUntilRefresh = Math.max(
      0,
      (expirationTime - REFRESH_BUFFER_TIME - currentTime) * 1000
    );

    console.log(`Token refresh scheduled in ${timeUntilRefresh / 1000} seconds`);

    // Schedule next refresh time in SecureStore for background fetch
    const nextRefreshTime = (tokens.issuedAt + (tokens.expiresIn ?? 0) - REFRESH_BUFFER_TIME) * 1000;
    SecureStore.setItemAsync(TOKEN_REFRESH_TIME_KEY, nextRefreshTime.toString());

    // Schedule refresh
    refreshTimeoutRef.current = setTimeout(() => {
      refreshToken().then(success => {
        if (success) {
          // If refresh was successful, schedule the next one
          if (authTokens) {
            scheduleTokenRefresh(authTokens);
          }
        }
      });
    }, timeUntilRefresh);
  };

  // Method to get a valid access token (refreshing if needed)
  const getAccessToken = async (): Promise<string | null> => {
    if (!authTokens) return null;

    // Check if token needs refreshing
    if (isTokenExpiredOrExpiringSoon(authTokens)) {
      const success = await refreshToken();
      if (!success) return null;
    }

    return authTokens?.accessToken || null;
  };

  // Method to get a valid ID token
  const getIdToken = async (): Promise<string | null> => {
    if (!authTokens) return null;

    // Check if token needs refreshing
    if (isTokenExpiredOrExpiringSoon(authTokens)) {
      const success = await refreshToken();
      if (!success) return null;
    }

    return authTokens?.idToken || null;
  };

  // Alias for getIdToken for backward compatibility
  const getValidToken = getIdToken;

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      // Check if app is coming to foreground
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log('App has come to the foreground!');
        
        // Check if we need to refresh the token
        if (authTokens && isTokenExpiredOrExpiringSoon(authTokens)) {
          console.log('Token needs refreshing after app return to foreground');
          await refreshToken();
        }
      }
      
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [authTokens]);

  // Register or unregister background fetch based on auth state
  useEffect(() => {
    if (authTokens) {
      registerBackgroundFetch();
    } else {
      unregisterBackgroundFetch();
    }
    
    return () => {
      // Clean up on unmount
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [authTokens]);

  // Load tokens and check auth state
  useEffect(() => {
    const loadTokensAndState = async () => {
      try {
        // Check if there's an auth flow in progress
        const authStateString = await SecureStore.getItemAsync(AUTH_STATE_KEY);
        if (authStateString) {
          const authState = JSON.parse(authStateString);
          
          // If auth flow is in progress
          if (authState.inProgress) {
            console.log("Auth flow was in progress, showing loading overlay");
            authInProgressRef.current = true;
            showLoading("Signing in...");
            
            // Check if auth state is stale (older than 5 minutes)
            const isStale = Date.now() - authState.timestamp > 5 * 60 * 1000;
            if (isStale) {
              console.log("Auth state is stale, clearing");
              await SecureStore.deleteItemAsync(AUTH_STATE_KEY);
              authInProgressRef.current = false;
              hideLoading();
            }
          }
        }
        
        // Load tokens
        const tokensString = await SecureStore.getItemAsync(AUTH_TOKENS_KEY);
        const userInfoString = await SecureStore.getItemAsync(USER_INFO_KEY);
        const userDataString = await SecureStore.getItemAsync(USER_DATA_KEY);
        const profileImageUrl = await SecureStore.getItemAsync(USER_PROFILE_IMAGE_KEY);

        // Load user info if available
        if (userInfoString) {
          try {
            const parsedUserInfo = JSON.parse(userInfoString);
            setUserInfo(parsedUserInfo);
          } catch (error) {
            console.error('Error parsing user info:', error);
          }
        }

        // Load user data if available
        if (userDataString) {
          try {
            const parsedUserData = JSON.parse(userDataString);
            console.log(parsedUserData);
            setUser(parsedUserData);
          } catch (error) {
            console.error('Error parsing user data:', error);
          }
        }

        // Set profile image if available
        if (profileImageUrl) {
          setUserProfileImage(profileImageUrl);
        }

        if (tokensString) {
          const tokens = JSON.parse(tokensString);
          
          const parsedTokens = {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            idToken: tokens.idToken,
            issuedAt: tokens.issuedAt,
            expiresIn: tokens.expiresIn,
          } as TokenResponse;
          
          // Check if token is completely expired (not just expiring soon)
          const isCompletelyExpired = 
            (tokens.issuedAt + tokens.expiresIn) < (Date.now() / 1000);
          
          if (!isCompletelyExpired) {
            setAuthTokens(parsedTokens);
            
            // If token is expiring soon but not completely expired, refresh it immediately
            if (isTokenExpiredOrExpiringSoon(parsedTokens)) {
              console.log('Token is expiring soon, refreshing immediately');
              refreshToken();
            } else {
              // Otherwise schedule a future refresh
              scheduleTokenRefresh(parsedTokens);
            }
            
            // Auth is successful, clear auth in progress state
            if (authInProgressRef.current) {
              console.log("Auth successful, clearing auth in progress state");
              await SecureStore.deleteItemAsync(AUTH_STATE_KEY);
              authInProgressRef.current = false;
              hideLoading();
            }
          } else {
            // Token is completely expired, attempt to refresh once
            console.log('Token is completely expired, attempting refresh');
            if (tokens.refreshToken) {
              try {
                const refreshedTokens = await refreshAsync(
                  {
                    clientId,
                    refreshToken: tokens.refreshToken,
                  },
                  discoveryDocument
                );
                
                await saveAndSetAuthTokens(refreshedTokens);
              } catch (error) {
                console.error('Failed to refresh expired token:', error);
                // Clear token if refresh fails
                await SecureStore.deleteItemAsync(AUTH_TOKENS_KEY);
              }
            } else {
              // No refresh token available, clear tokens
              await SecureStore.deleteItemAsync(AUTH_TOKENS_KEY);
            }
          }
        }
      } catch (error) {
        console.error('Error loading auth tokens:', error);
      } finally {
        console.log("Initial loading completed");
        setIsLoading(false);
      }
    };

    const loadOnboardingTracking = async () => {
      try {
        const value = await SecureStore.getItemAsync('onboardingTracking');
        if (value) {
          const parsedValue = JSON.parse(value);
          setOnboardingTracking(parsedValue);
        } else {
          await SecureStore.setItemAsync('onboardingTracking', JSON.stringify(ONBOARDING));
        }
      } catch (error) {
        console.error('Error loading onboarding tracking:', error);
      }
    };
    
    loadTokensAndState();
    loadOnboardingTracking();
  }, []);

  // Suggested fix for your JWT decode function
  const decodeJWT = (token: string): DecodedTokenInfo | null => {
    try {
      // Decode the token using the RawDecodedToken interface
      const decoded = jwtDecode<RawDecodedToken>(token);
      
      // Extract the custom:userName claim which contains the UUID username
      const customUserName = decoded['custom:userName'] || '';
      
      // Map the raw keys to your internal type
      const apiKey = decoded['custom:apiKey'] || '';
      const givenName = decoded['given_name'] || decoded.username || decoded.sub?.substring(0, 8) || 'User';
      
      return {
        email: decoded.email || '',
        apiKey: apiKey,
        givenName: givenName,
        gender: decoded.gender,
        birthdate: decoded.birthdate,
        cognito_username: decoded['cognito:username'] || decoded.username,
        // Use custom:userName as the primary userName value
        userName: customUserName,
        exp: decoded.exp,
      };
    } catch (error) {
      console.error('Failed to decode token', error);
      return null;
    }
  };

  // Handle the authentication response
  useEffect(() => {
    const exchangeFn = async (exchangeTokenReq: any) => {
      try {        
        console.log("Starting token exchange");
        const exchangeTokenResponse = await exchangeCodeAsync(
          exchangeTokenReq,
          discoveryDocument
        );
        
        // Save tokens and navigate
        await saveAndSetAuthTokens(exchangeTokenResponse);
        
        // Get user info if needed
        if (exchangeTokenResponse.idToken) {
          try {
            const decodedInfo = decodeJWT(exchangeTokenResponse.idToken);
            if (decodedInfo) {
              await fetchUserData(decodedInfo, exchangeTokenResponse.idToken);
            }
          } catch (error) {
            console.error("Error fetching user data:", error);
          }
        }
        
        // Schedule token refresh
        scheduleTokenRefresh(exchangeTokenResponse);
        
        // Register background fetch
        registerBackgroundFetch();
      } catch (error) {
        console.error("Token exchange failed:", error);
        // Clear auth in progress state on error
        await SecureStore.deleteItemAsync(AUTH_STATE_KEY);
        authInProgressRef.current = false;
        hideLoading();
      }
    };
    
    if (response) {
      if ('error' in response && response.error !== null) {
        // Handle error response
        console.error("Auth response error:", response.error);
        SecureStore.deleteItemAsync(AUTH_STATE_KEY);
        authInProgressRef.current = false;
        hideLoading();
        
        Alert.alert('Authentication Error', 
          typeof response.error === 'string' 
            ? response.error 
            : JSON.stringify(response.error) || 'Unknown error occurred'
        );
        return;
      }
      
      if (response && response.type === 'success') {
        console.log("Authentication successful, proceeding with token exchange");
        exchangeFn({
          clientId,
          code: response.params.code,
          redirectUri,
          extraParams: {
            code_verifier: request?.codeVerifier
          },
        });
      } else {
        console.log("Authentication response not successful:", response.type);
        SecureStore.deleteItemAsync(AUTH_STATE_KEY);
        authInProgressRef.current = false;
        hideLoading();
      }
    }
  }, [discoveryDocument, request, response]);

  // Update onboarding status
  const updateOnboardingStatus = async (step: keyof OnboardingTrackingType, value: boolean): Promise<void> => {
    try {
      // Create new state with updated value
      const updatedOnboarding = {
        ...onboardingTracking,
        [step]: value
      };
      
      // If all steps except 'overall' are completed, set overall to true
      if (
        step !== 'overall' && 
        updatedOnboarding.demographics && 
        updatedOnboarding.profileSetup && 
        updatedOnboarding.quiz && 
        updatedOnboarding.register &&
        updatedOnboarding.index
      ) {
        updatedOnboarding.overall = true;
      }
      
      // Update state
      setOnboardingTracking(updatedOnboarding);
      
      // Save to secure storage
      await SecureStore.setItemAsync('onboardingTracking', JSON.stringify(updatedOnboarding));
      
      return Promise.resolve();
    } catch (error) {
      console.error('Error updating onboarding status:', error);
      return Promise.reject(error);
    }
  };

  // Improved logout function with proper navigation
  const logout = async () => {
    // Show loading during logout
    showLoading("Signing out...");
    
    // Clear any scheduled refresh
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }
    
    // Unregister background fetch
    await unregisterBackgroundFetch();
    
    try {
      // CRITICAL IMPROVEMENT: Update state FIRST before async operations
      // This ensures UI updates immediately
      setAuthTokens(null);
      setUserInfo(null);
      setUser(null);
      setUserProfileImage(null);
      
      // Clear all storage immediately in a separate try block
      try {
        await SecureStore.deleteItemAsync(AUTH_TOKENS_KEY);
        await SecureStore.deleteItemAsync(USER_INFO_KEY);
        await SecureStore.deleteItemAsync(USER_DATA_KEY);
        await SecureStore.deleteItemAsync(USER_PROFILE_IMAGE_KEY);
        await SecureStore.deleteItemAsync(TOKEN_REFRESH_TIME_KEY);
        await SecureStore.deleteItemAsync(AUTH_STATE_KEY);
      } catch (storageError) {
        console.error('Error clearing secure storage during logout:', storageError);
        // Continue with logout even if storage clearing fails
      }
      
      // Only attempt cognito logout if needed
      if (authTokens?.refreshToken && discoveryDocument && clientId) {
        try {
          const urlParams = new URLSearchParams({
            client_id: clientId,
            logout_uri: redirectUri,
          });
          
          // Open the logout page in the browser
          const webBaseUrl = userPoolUri;
          await WebBrowser.openAuthSessionAsync(`${webBaseUrl}/logout?${urlParams.toString()}`);
          
          // Revoke the refresh token - but don't wait on success
          revokeAsync(
            {
              clientId: clientId,
              token: authTokens.refreshToken,
            },
            discoveryDocument
          ).catch(error => {
            console.error('Error revoking token:', error);
            // Ignore revoke errors - user is already logged out locally
          });
        } catch (webError) {
          // Ignore web browser errors - user is already logged out locally
          console.error('Error in Cognito web logout:', webError);
        }
      }
      
      // Clear auth in progress state
      authInProgressRef.current = false;
      
    } catch (error) {
      console.error('Error in logout:', error);
      
      // Even on error, make sure state is cleared
      setAuthTokens(null);
      setUserInfo(null);
      setUser(null);
      setUserProfileImage(null);
      
      // Try to clear storage again as a failsafe
      try {
        await SecureStore.deleteItemAsync(AUTH_TOKENS_KEY);
      } catch (e) {
        // Ignore error
      }
    } finally {
      hideLoading();
    }
  };

  // Context value
  const contextValue: ExtendedAuthContextType = {
    authTokens,
    login,
    logout,
    isAuthenticated: !!authTokens,
    isLoading,
    getAccessToken,
    getValidToken, // Alias for backward compatibility
    userInfo,
    user,
    userProfileImage,
    refreshUserData,
    onboardingTracking,
    updateOnboardingStatus
  };

  // Save tokens and set state
  const saveAndSetAuthTokens = async (tokens: TokenResponse | null) => {
    try {
      console.log('Saving auth tokens:', tokens ? 'has tokens' : 'null tokens');
      
      if (tokens) {
        const minimalTokenData = {
          accessToken: tokens.accessToken,
          idToken: tokens.idToken,
          refreshToken: tokens.refreshToken,
          issuedAt: tokens.issuedAt,
          expiresIn: tokens.expiresIn,
        };
        
        console.log('Token data to save:', {
          issuedAt: tokens.issuedAt,
          expiresIn: tokens.expiresIn,
          hasAccessToken: !!tokens.accessToken,
          hasIdToken: !!tokens.idToken,
          hasRefreshToken: !!tokens.refreshToken
        });
        
        await SecureStore.setItemAsync(AUTH_TOKENS_KEY, JSON.stringify(minimalTokenData));
  
        // Update the next refresh time in SecureStore
        const nextRefreshTime = (tokens.issuedAt + (tokens.expiresIn ?? 0) - REFRESH_BUFFER_TIME) * 1000;
        await SecureStore.setItemAsync(TOKEN_REFRESH_TIME_KEY, nextRefreshTime.toString());
        console.log('Next token refresh scheduled at:', new Date(nextRefreshTime).toLocaleString());
  
        // Decode the JWT and store user info
        if (tokens.idToken) {
          const decodedInfo = decodeJWT(tokens.idToken);
          setUserInfo(decodedInfo);
  
          // Save user info to SecureStore
          if (decodedInfo) {
            await SecureStore.setItemAsync(USER_INFO_KEY, JSON.stringify(decodedInfo));
          }
        }
      } else {
        await SecureStore.deleteItemAsync(AUTH_TOKENS_KEY);
        await SecureStore.deleteItemAsync(USER_INFO_KEY);
        await SecureStore.deleteItemAsync(USER_DATA_KEY);
        await SecureStore.deleteItemAsync(USER_PROFILE_IMAGE_KEY);
        await SecureStore.deleteItemAsync(TOKEN_REFRESH_TIME_KEY);
        setUserInfo(null);
        setUser(null);
        setUserProfileImage(null);
      }
      
      setAuthTokens(tokens);
      
      // Clear auth in progress state
      await SecureStore.deleteItemAsync(AUTH_STATE_KEY);
      authInProgressRef.current = false;
      hideLoading();
      
      // Navigate if tokens are available
      if (tokens) {
        console.log("Tokens saved successfully");
      }
    } catch (error) {
      console.error('Error saving auth tokens:', error);
      hideLoading();
    }
  };
    
  // Only render children once initial loading is complete
  if (isLoading) { 
    console.log("Auth provider still in initial loading");
    return null; 
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};