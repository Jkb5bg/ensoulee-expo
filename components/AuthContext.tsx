import React, { createContext, useContext, useState, useMemo, useEffect, ReactNode, useRef } from 'react';
import * as WebBrowser from 'expo-web-browser'; 
import { useAuthRequest, exchangeCodeAsync, revokeAsync, ResponseType, refreshAsync } from 'expo-auth-session'
import { TokenResponse } from 'expo-auth-session/build/TokenRequest'
import { Alert } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';
import { jwtDecode } from 'jwt-decode';
import { GetUserSelfAPI } from '@/api/GetUserSelfAPI';
import { GetUserProfileImage } from '@/api/GetUserProfileImage';
import DecodedTokenInfo from '@/types/decodedTokenInfo';
import RawDecodedToken from '@/types/rawDecodedToken';
import User from '@/types/user';
import {router} from "expo-router";
import * as SplashScreen from 'expo-splash-screen';
import { useLoading } from './LoadingContext';
import ExtendedAuthContextType from '@/types/extendedAuthContextType';

WebBrowser.maybeCompleteAuthSession();

// AWS COGNITO configuration environment variables
const clientId: string = process.env.EXPO_PUBLIC_COGNITO_CLIENT_ID ?? '';
const userPoolUri: string = process.env.EXPO_PUBLIC_USER_POOL_ID ?? '';
const redirectUri = AuthSession.makeRedirectUri();
const AUTH_TOKENS_KEY = 'auth_tokens';
const USER_INFO_KEY = 'user_info';
const USER_DATA_KEY = 'user_data';
const AUTH_STATE_KEY = 'auth_state';
const USER_PROFILE_IMAGE_KEY = 'user_profile_image'; 


// Define refresh buffer time (refresh token 5 minutes before expiration)
const REFRESH_BUFFER_TIME = 5 * 60; // 5 minutes in seconds

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
  const { showLoading, hideLoading } = useLoading();
  const [user, setUser] = useState<User | null>(null); 
  const [userProfileImage, setUserProfileImage] = useState<string | null>(null);
  
  // Add this ref to track if auth is in progress
  const authInProgressRef = useRef<boolean>(false);

  // Ref to track if user data is properly fetched
  const fetchingUserDataRef = useRef<boolean>(false);


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

  // Check if token is expired or will expire soon
  const isTokenExpiredOrExpiringSoon = (tokens: TokenResponse): boolean => {
    if (!tokens?.issuedAt || !tokens?.expiresIn) return true;
    
    const expirationTime = tokens.issuedAt + tokens.expiresIn;
    const currentTime = Date.now() / 1000;
    
    // Return true if token is expired or will expire within buffer time
    return currentTime > expirationTime - REFRESH_BUFFER_TIME;
  };

  // Function to refresh the token
  const refreshToken = async (): Promise<boolean> => {
    if (!authTokens?.refreshToken) return false;

    try {
      const refreshedTokens = await refreshAsync(
        {
          clientId,
          refreshToken: authTokens.refreshToken,
        },
        discoveryDocument
      );

      await saveAndSetAuthTokens(refreshedTokens);
      return true;
    } catch (error) {
      console.error('Failed to refresh token:', error);
      // If refresh fails, clear tokens and force re-login
      await saveAndSetAuthTokens(null);
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
    
    // Calculate time until refresh (5 minutes before expiration)
    const timeUntilRefresh = Math.max(
      0,
      (expirationTime - REFRESH_BUFFER_TIME - currentTime) * 1000
    );

    console.log(`Token refresh scheduled in ${timeUntilRefresh / 1000} seconds`);

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
            // Token is completely expired, clear it
            await SecureStore.deleteItemAsync(AUTH_TOKENS_KEY);
          }
        }
      } catch (error) {
        console.error('Error loading auth tokens:', error);
      } finally {
        console.log("Initial loading completed");
        setIsLoading(false);
      }
    };
    
    loadTokensAndState();
    
    // Cleanup function to clear the timeout when component unmounts
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  const decodeJWT = (token: string): DecodedTokenInfo | null => {
    try {
      // Decode the token using the RawDecodedToken interface
      const decoded = jwtDecode<RawDecodedToken>(token);
      
      // Map the raw keys to your internal type
      const apiKey = decoded['custom:apiKey'] || '';
      const givenName = decoded['given_name'] || decoded.username || decoded.sub?.substring(0, 8) || 'User';
      const userName = decoded['cognito:username'] || decoded.username || '';
      
      return {
        email: decoded.email || '',
        apiKey: apiKey,
        givenName: givenName,
        gender: decoded.gender,
        birthdate: decoded.birthdate,
        cognito_username: decoded['cognito:username'] || decoded.username,
        userName: userName, // Make sure userName is included
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

  const logout = async () => {
    // Show loading during logout
    showLoading("Signing out...");
    
    // Clear any scheduled refresh
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }
    
    if (!authTokens?.refreshToken || !discoveryDocument || !clientId) {
      hideLoading();
      return;
    }
    
    try {
      const urlParams = new URLSearchParams({
        client_id: clientId,
        logout_uri: redirectUri,
      });
      
      // Open the logout page in the browser
      const webBaseUrl = userPoolUri;
      await WebBrowser.openAuthSessionAsync(`${webBaseUrl}/logout?${urlParams.toString()}`);
      
      // Revoke the refresh token
      const revokeResponse = await revokeAsync(
        {
          clientId: clientId,
          token: authTokens.refreshToken,
        },
        discoveryDocument
      );
      
      if (revokeResponse) {
        await saveAndSetAuthTokens(null);
      }
    } catch (error) {
      await saveAndSetAuthTokens(null);
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
    refreshUserData
  };

  // Save tokens and set state
  const saveAndSetAuthTokens = async (tokens: TokenResponse | null) => {
    try {
      if (tokens) {
        const minimalTokenData = {
          accessToken: tokens.accessToken,
          idToken: tokens.idToken,
          refreshToken: tokens.refreshToken,
          issuedAt: tokens.issuedAt,
          expiresIn: tokens.expiresIn,
        };
        await SecureStore.setItemAsync(AUTH_TOKENS_KEY, JSON.stringify(minimalTokenData));

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
        console.log("Tokens saved, navigating to tabs");
        router.replace("/(tabs)");
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

// Usage example:
// function MyApp() {
//   return (
//     <AuthProvider>
//       <Navigation />
//     </AuthProvider>
//   );
// }
//
// function MyScreen() {
//   const { authTokens, login, logout, isAuthenticated } = useAuth();
//   
//   return (
//     <View>
//       {isAuthenticated ? (
//         <Button title="Logout" onPress={logout} />
//       ) : (
//         <Button title="Login" onPress={login} />
//       )}
//     </View>
//   );
// }