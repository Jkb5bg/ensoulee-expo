import React, { createContext, useContext, useState, useMemo, useEffect, ReactNode, useRef } from 'react';
import * as WebBrowser from 'expo-web-browser'; 
import { useAuthRequest, exchangeCodeAsync, revokeAsync, ResponseType } from 'expo-auth-session'
import { TokenResponse } from 'expo-auth-session/build/TokenRequest'
import { Alert } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';

WebBrowser.maybeCompleteAuthSession();

// AWS COGNITO configuration environment variables
const clientId: string = process.env.EXPO_PUBLIC_COGNITO_CLIENT_ID!;
const userPoolUri: string = process.env.EXPO_PUBLIC_USER_POOL_ID!;
// const redirectUri: string = process.env.EXPO_PUBLIC_REDIRECT_URI!;
const redirectUri = AuthSession.makeRedirectUri();
const hasCompletedOnboarding: boolean = false;
const AUTH_TOKENS_KEY = 'auth_tokens';

// Define the shape of our context
interface AuthContextType {
  authTokens: TokenResponse | null;
  login: () => Promise<any>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
}

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

    // Load tokens from storage when the app starts
    useEffect(() => {
      const loadTokens = async () => {
        try {
          const tokensString = await SecureStore.getItemAsync(AUTH_TOKENS_KEY);
          if (tokensString) {
            const tokens = JSON.parse(tokensString);
            
            const expirationTime = tokens.issuedAt + tokens.expiresIn;
            const isExpired = Date.now() / 1000 > expirationTime;
            
            if (!isExpired) {
              setAuthTokens({
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                issuedAt: tokens.issuedAt,
                expiresIn: tokens.expiresIn,
              } as TokenResponse);
            } else {
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
    }, []);

  useEffect(() => {

    const exchangeFn = async (exchangeTokenReq: any) => {
      try {        
        const exchangeTokenResponse = await exchangeCodeAsync(
          exchangeTokenReq,
          discoveryDocument
        );
        
        await saveAndSetAuthTokens(exchangeTokenResponse);
        console.log("Auth Tokens: " + authTokens);
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
    if (!authTokens?.refreshToken || !discoveryDocument || !clientId) {
      return;
    }
    try {
      const urlParams = new URLSearchParams({
        client_id: clientId,
        logout_uri: redirectUri,
      });
      
      // Open the logout page in the browser
      const webBaseUrl = userPoolUri; // Use your actual web base URL here
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
        setAuthTokens(null);
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
    isLoading
  };

    // Modify your existing setAuthTokens usage to also save to storage
    const saveAndSetAuthTokens = async (tokens: TokenResponse | null) => {
      try {
        if (tokens) {
          const minimalTokenData = {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            issuedAt: tokens.issuedAt,
            expiresIn: tokens.expiresIn,
          };
          await SecureStore.setItemAsync(AUTH_TOKENS_KEY, JSON.stringify(minimalTokenData));
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