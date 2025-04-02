import * as SplashScreen from 'expo-splash-screen';
import { useAuth } from "@/components/AuthContext";
import OnboardingScreen from './(onboarding)';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { Redirect } from 'expo-router';
import LoadingScreen from '@/components/LoadingScreen';
import { StyleSheet } from 'react-native';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function IndexScreen() {
    const { isAuthenticated, isLoading } = useAuth();
    const [appReady, setAppReady] = useState(false);
    const [redirectReady, setRedirectReady] = useState(false);

    // Add this effect to delay the redirect slightly
    useEffect(() => {
        if (isAuthenticated && !isLoading) {
            // Small delay to ensure the next screen is ready to render
            const timer = setTimeout(() => {
                setRedirectReady(true);
            }, 2000); // 300ms delay helps with smoother transition
            
            return () => clearTimeout(timer);
        }
    }, [isAuthenticated, isLoading]);

    // Show loading during auth operations
    if (isLoading) {
        console.log("IndexScreen - Auth loading in progress");
        return <LoadingScreen />;
    }

    // If authenticated and ready to redirect, go to tabs
    if (isAuthenticated && redirectReady) {
        return (
            <View style={styles.container}>
                <Redirect href="/(tabs)" />
            </View>
        );
    }
    
    // If authenticated but waiting for redirect, show a black screen
    if (isAuthenticated) {
        return <View style={styles.container} />;
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

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black'
    }
})