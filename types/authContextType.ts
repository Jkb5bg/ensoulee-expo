import { TokenResponse } from 'expo-auth-session';
import DecodedTokenInfo from './decodedTokenInfo';

type AuthContextType = {
  authTokens: TokenResponse | null;
  login: () => Promise<any>;  // Updated to reflect the new login function return type
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
  getAccessToken: () => Promise<string | null>;
  userInfo: DecodedTokenInfo | null;
};

export default AuthContextType;