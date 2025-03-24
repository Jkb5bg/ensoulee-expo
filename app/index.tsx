import * as SplashScreen from 'expo-splash-screen';
import { useAuth } from "@/components/AuthContext";
import OnboardingScreen from './(onboarding)';
import { useEffect, useState } from 'react';
import { router } from "expo-router";
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function IndexScreen() {
    const { isAuthenticated } = useAuth();
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        // Mark component as ready after a slight delay
        // to ensure layout is fully mounted
        const timer = setTimeout(() => {
            setIsReady(true);
        }, 100);
        
        return () => clearTimeout(timer);
    }, []);

    // Wait until component is ready before attempting navigation
    if (isReady && isAuthenticated) {
        // Use Redirect component instead of router.replace
        return <Redirect href="/(tabs)" />;
    }

    if (!isAuthenticated) {
        return <OnboardingScreen />;
    }

    // Loading state while waiting for ready state
    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
            <ActivityIndicator size="large" color="#fff" />
        </View>
    );
}