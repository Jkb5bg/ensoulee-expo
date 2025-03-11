import React, { createContext, useContext, useState, useMemo, useEffect, ReactNode } from 'react';
import * as WebBrowser from 'expo-web-browser'; 
import { useAuthRequest, exchangeCodeAsync, revokeAsync, ResponseType } from 'expo-auth-session'
import { TokenResponse } from 'expo-auth-session/build/TokenRequest'
import { Alert } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

// AWS COGNITO configuration environment variables
const clientId = process.env.EXPO_PUBLIC_COGNITO_CLIENT_ID;
const userPoolUri = process.env.EXPO_PUBLIC_USER_POOL_ID;
const redirectUri = process.env.EXPO_PUBLIC_REDIRECT_URI;

// Define the shape of our context
interface AuthContextType {
  authTokens: TokenResponse | null;
  login: () => Promise<any>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
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

  useEffect(() => {
    const exchangeFn = async (exchangeTokenReq: any) => {
      try {
        const exchangeTokenResponse = await exchangeCodeAsync(
          exchangeTokenReq,
          discoveryDocument
        );
        setAuthTokens(exchangeTokenResponse);
      } catch (error) {
        console.error(error);
      }
    };
    
    if (response) {
      if ('error' in response) {
        Alert.alert(
          'Authentication error',
          response.params.error_description || 'something went wrong'
        );
        return;
      }
      if (response.type === 'success') {
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
        client_id: clientId || '',
        logout_uri: redirectUri || '',
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
      console.error('Error during token revocation:', error);
    }
  };

  // The value that will be given to consumers of this context
  const contextValue = {
    authTokens,
    login: promptAsync,
    logout,
    isAuthenticated: !!authTokens
  };

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