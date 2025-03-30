import * as SplashScreen from 'expo-splash-screen';
import { useAuth } from "@/components/AuthContext";
import OnboardingScreen from './(onboarding)';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { Redirect } from 'expo-router';
import LoadingScreen from '@/components/LoadingScreen';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function IndexScreen() {
    const { isAuthenticated, isLoading } = useAuth();
    const [appReady, setAppReady] = useState(false);

    // Effect to hide splash screen once auth is loaded
    useEffect(() => {
        const prepare = async () => {
            try {
                // Wait for auth to complete initial loading
                if (!isLoading) {
                    console.log("Auth loaded, hiding splash screen");
                    await SplashScreen.hideAsync();
                    setAppReady(true);
                }
            } catch (e) {
                console.warn("Error hiding splash screen:", e);
            }
        };

        prepare();
    }, [isLoading]);

    // Debug logs for state changes
    useEffect(() => {
        console.log("IndexScreen - State changed:", { 
            isAuthenticated, 
            isLoading,
            appReady 
        });
    }, [isAuthenticated, isLoading, appReady]);

    // Show loading during auth operations
    if (isLoading) {
        console.log("IndexScreen - Auth loading in progress");
        return <LoadingScreen />;
    }

    // Show onboarding if not authenticated
    if (!isAuthenticated) {
        console.log("IndexScreen - Not authenticated, showing onboarding");
        return <OnboardingScreen />;
    }

    // If authenticated, redirect to tabs
    console.log("IndexScreen - Authenticated, redirecting to tabs");
    return <Redirect href="/(tabs)" />;
}