import { TokenResponse } from 'expo-auth-session/build/TokenRequest';
import DecodedTokenInfo from './decodedTokenInfo';
import User from './user';

interface AuthContextType {
  authTokens: TokenResponse | null;
  login: () => Promise<any>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
  getAccessToken: () => Promise<string | null>;
  getValidToken: () => Promise<string | null>; // Alias for backward compatibility
  userInfo: DecodedTokenInfo | null;
  user: User | null; // The full user object
  userProfileImage: string | null; // URL for the user's profile image
  refreshUserData: () => Promise<void>; // Function to refresh user data
}

export default AuthContextType;