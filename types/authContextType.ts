import { TokenResponse } from 'expo-auth-session/build/TokenRequest'
import DecodedTokenInfo from './decodedTokenInfo';

export default interface AuthContextType {
  authTokens: TokenResponse | null;
  login: () => Promise<any>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
  getAccessToken: () => Promise<string | null>; // method to get a valid token
  userInfo: DecodedTokenInfo | null;
}