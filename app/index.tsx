import * as SplashScreen from 'expo-splash-screen';
import { useAuth } from "@/components/AuthContext";
import OnboardingScreen from './(onboarding)';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function IndexScreen() {

    const { isAuthenticated } = useAuth();

    return ( 
        <>
            <OnboardingScreen />
        </>
    )
}