import * as SplashScreen from 'expo-splash-screen';
import { useAuth } from "@/components/AuthContext";
import OnboardingScreen from './(onboarding)';
import { useEffect } from 'react';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function IndexScreen() {

    const { isAuthenticated } = useAuth();

    useEffect(() => {
        console.log("Index just triggered");
	console.log("Authentication status: " + isAuthenticated);
    })

    return ( 
        <>
            <OnboardingScreen />
        </>
    )
}
