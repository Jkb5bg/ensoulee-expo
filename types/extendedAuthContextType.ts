import DecodedTokenInfo from "./decodedTokenInfo";
import { TokenResponse } from 'expo-auth-session/build/TokenRequest';
import User from "./user";
import OnboardingTrackingType from "./onboardingTrackingType";


// Define extended auth context type to include user data
export default interface ExtendedAuthContextType {
    authTokens: TokenResponse | null;
    login: () => Promise<any>;
    logout: () => Promise<void>;
    isAuthenticated: boolean;
    isLoading: boolean;
    getAccessToken: () => Promise<string | null>;
    getValidToken: () => Promise<string | null>; // For backward compatibility
    userInfo: DecodedTokenInfo | null;
    user: User | null; // Add full user object
    userProfileImage: string | null; // Add profile image URL
    refreshUserData: () => Promise<void>; // Function to refresh user data
    onboardingTracking: OnboardingTrackingType;
    updateOnboardingStatus: (step: keyof OnboardingTrackingType, value: boolean) => Promise<void>;
  }