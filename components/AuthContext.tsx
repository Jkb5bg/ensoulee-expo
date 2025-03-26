import React, { createContext, useContext, useState, useMemo, useEffect, ReactNode, useRef } from 'react';
import * as WebBrowser from 'expo-web-browser'; 
import { useAuthRequest, exchangeCodeAsync, revokeAsync, ResponseType, refreshAsync } from 'expo-auth-session'
import { TokenResponse } from 'expo-auth-session/build/TokenRequest'
import { Alert } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';
import * as Linking from 'expo-linking';
import { jwtDecode } from 'jwt-decode';
import { GetUserSelfAPI } from '@/api/GetUserSelfAPI';
import DecodedTokenInfo from '@/types/decodedTokenInfo';
import RawDecodedToken from '@/types/rawDecodedToken';
import AuthContextType from '@/types/authContextType';
import User from '@/types/user';


WebBrowser.maybeCompleteAuthSession();

// AWS COGNITO configuration environment variables
const clientId: string = process.env.EXPO_PUBLIC_COGNITO_CLIENT_ID ?? '';
const userPoolUri: string = process.env.EXPO_PUBLIC_USER_POOL_ID ?? '';
// const redirectUri: string = process.env.EXPO_PUBLIC_REDIRECT_URI!;
const redirectUri = AuthSession.makeRedirectUri();
const hasCompletedOnboarding: boolean = false;
const AUTH_TOKENS_KEY = 'auth_tokens';
const USER_INFO_KEY = 'user_info';

// Define refresh buffer time (refresh token 5 minutes before expiration)
const REFRESH_BUFFER_TIME = 5 * 60; // 5 minutes in seconds

// Create the context with a default value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
  const DecodedTokenInfo: DecodedTokenInfo | null = null;


  const discoveryDocument = useMemo(() => ({
    authorizationEndpoint: userPoolUri + '/oauth2/authorize',
    tokenEndpoint: userPoolUri + '/oauth2/token',
    revocationEndpoint: userPoolUri + '/oauth2/revoke',
  }), []);

  const [request, response, promptAsync] = useAuthRequest(
    {
      clientId,
      responseType: ResponseType.Code,
      redirectUri,
      usePKCE: true,
    },
    discoveryDocument
  );

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

  // Load tokens from storage when the app starts
  useEffect(() => {
    const loadTokens = async () => {
      try {
        const tokensString = await SecureStore.getItemAsync(AUTH_TOKENS_KEY);
        const userInfoString = await SecureStore.getItemAsync(USER_INFO_KEY);

              // Load user info if available
        if (userInfoString) {
          try {
            const parsedUserInfo = JSON.parse(userInfoString);
            setUserInfo(parsedUserInfo);
          } catch (error) {
            console.error('Error parsing user info:', error);
          }
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
          } else {
            // Token is completely expired, clear it
            await SecureStore.deleteItemAsync(AUTH_TOKENS_KEY);
          }
        }
      } catch (error) {
        console.error('Error loading auth tokens:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadTokens();
    
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
      
      // Check if we're dealing with an ID token or access token
      const apiKey = decoded['custom:apiKey'] || '';
      const givenName = decoded['given_name'] || decoded.username || decoded.sub?.substring(0, 8) || 'User';
      
      // Map the raw keys to your internal type
      return {
        email: decoded.email || '',
        apiKey: apiKey,
        givenName: givenName,
        gender: decoded.gender,
        birthdate: decoded.birthdate,
        cognito_username: decoded['cognito:username'] || decoded.username,
        exp: decoded.exp,
      };
    } catch (error) {
      console.error('Failed to decode token', error);
      return null;
    }
  };

  useEffect(() => {
    const exchangeFn = async (exchangeTokenReq: any) => {
      try {        
        const exchangeTokenResponse = await exchangeCodeAsync(
          exchangeTokenReq,
          discoveryDocument
        );
        
        await saveAndSetAuthTokens(exchangeTokenResponse);
        if (userInfo != null && authTokens?.idToken != null) {
          try {
            const user = await GetUserSelfAPI(userInfo, authTokens.idToken);
          } catch (error) {
            console.error("Error fetching user data:", error);
          }
        }
        // Schedule token refresh for the new tokens
        scheduleTokenRefresh(exchangeTokenResponse);
      } catch (error) {
        console.error("Token exchange failed:", error);
      }
    };
    
    if (response) {
      if ('error' in response && response.error !== null) {
        Alert.alert('Authentication Error', 
          typeof response.error === 'string' 
            ? response.error 
            : JSON.stringify(response.error) || 'Unknown error occurred'
        );
        return;
      }
      if (response && response.type === 'success') {
        exchangeFn({
          clientId,
          code: response.params.code,
          redirectUri,
          extraParams: {
            code_verifier: request?.codeVerifier
          },
        });
      }
    }

  }, [discoveryDocument, request, response]);

  const logout = async () => {
    // Clear any scheduled refresh
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }
    
    if (!authTokens?.refreshToken || !discoveryDocument || !clientId) {
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
    }
  };

  // The value that will be given to consumers of this context
  const contextValue = {
    authTokens,
    login: promptAsync,
    logout,
    isAuthenticated: !!authTokens,
    isLoading,
    getAccessToken,
    userInfo
  };

  // Modify your existing setAuthTokens usage to also save to storage
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

        // Use decoded info for API call
        try {
          if (decodedInfo) {
            const user = await GetUserSelfAPI(decodedInfo, tokens.idToken);
          } else {
            console.error("Decoded token info is null");
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
                
      }

      } else {
        await SecureStore.deleteItemAsync(AUTH_TOKENS_KEY);
      }
      setAuthTokens(tokens);
    } catch (error) {
      console.error('Error saving auth tokens:', error);
    }
  };
    
  if (isLoading) { return null; }

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