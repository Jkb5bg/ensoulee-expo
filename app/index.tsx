import * as SplashScreen from 'expo-splash-screen';
import { useAuth } from "@/components/AuthContext";
import OnboardingScreen from './(onboarding)';
import { useEffect, useState, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { Redirect, router } from 'expo-router';
import LoadingScreen from '@/components/LoadingScreen';
import * as SecureStore from 'expo-secure-store';
import RegisterScreen from './(onboarding)/register';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function IndexScreen() {
    const { isAuthenticated, isLoading, onboardingTracking, user } = useAuth();
    const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean | null>(null);
    const [hasValidTokens, setHasValidTokens] = useState<boolean | null>(null);
    const initialCheckDone = useRef(false);
    const tokenCheckDone = useRef(false);

    // IMPORTANT: Directly check token existence in storage
    // This is the most reliable way to determine if user is authenticated
    useEffect(() => {
        const checkTokensExist = async () => {
            try {
                console.log("IndexScreen - Directly checking token existence in storage");
                const tokensString = await SecureStore.getItemAsync('auth_tokens');
                
                if (tokensString) {
                    try {
                        // Parse tokens to make sure they're valid JSON
                        const tokens = JSON.parse(tokensString);
                        
                        // Check if tokens have required fields
                        if (tokens.idToken && tokens.accessToken) {
                            console.log("IndexScreen - Valid tokens found in storage");
                            setHasValidTokens(true);
                        } else {
                            console.log("IndexScreen - Tokens exist but are missing required fields");
                            setHasValidTokens(false);
                            
                            // Delete invalid tokens
                            await SecureStore.deleteItemAsync('auth_tokens');
                        }
                    } catch (parseError) {
                        console.error("IndexScreen - Error parsing tokens:", parseError);
                        setHasValidTokens(false);
                        
                        // Delete corrupted tokens
                        await SecureStore.deleteItemAsync('auth_tokens');
                    }
                } else {
                    console.log("IndexScreen - No tokens found in storage");
                    setHasValidTokens(false);
                }
            } catch (error) {
                console.error("IndexScreen - Error checking tokens:", error);
                setHasValidTokens(false);
            } finally {
                tokenCheckDone.current = true;
            }
        };

        SplashScreen.hideAsync(); // Hide splash screen after initial checks
        
        if (!tokenCheckDone.current) {
            checkTokensExist();
        }
    }, []);

    // Check onboarding status on mount
    useEffect(() => {
        const checkOnboardingStatus = async () => {
            try {
                // First check if user has completed onboarding via auth context
                if (onboardingTracking && onboardingTracking.overall === true) {
                    console.log("IndexScreen - User has completed onboarding according to context");
                    setHasCompletedOnboarding(true);
                    console.log("Setting place #0");
                    return;
                }

                // Fallback: check secure storage directly for onboarding status
                const value = await SecureStore.getItemAsync('onboardingTracking');
                if (value) {
                    const parsedValue = JSON.parse(value);
                    console.log("IndexScreen - Onboarding status from storage:", parsedValue);
                    setHasCompletedOnboarding(parsedValue.overall === true);
                } else {
                    // If no record exists yet, set to false
                    console.log("IndexScreen - No onboarding record found, assuming not completed");
                    setHasCompletedOnboarding(false);
                }
            } catch (error) {
                console.error('Error checking onboarding status:', error);
                // Default to false if there's an error
                setHasCompletedOnboarding(false);
            } finally {
                initialCheckDone.current = true;
            }
        };

        if (!initialCheckDone.current) {
            checkOnboardingStatus();
        }
    }, [onboardingTracking]);

    // Force redirect to dashboard if needed
    const forceRedirectToDashboard = () => {
        console.log("IndexScreen - Forcing redirect to dashboard");
        router.replace("/(tabs)");
    };

    // CRITICAL FIX: Detect auth state mismatch and correct it
    useEffect(() => {
        if (hasValidTokens !== null && !isLoading) {
            // If auth context says not authenticated but we have valid tokens
            if (!isAuthenticated && hasValidTokens) {
                console.log("IndexScreen - Auth state mismatch: Not authenticated in context but valid tokens exist");
                // This is rare, but could happen if context didn't load tokens properly
                // Force a page reload to reinitialize auth context
                router.replace("/");
            }
            
            // If auth context says authenticated but we don't have valid tokens
            if (isAuthenticated && !hasValidTokens) {
                console.log("IndexScreen - Auth state mismatch: Authenticated in context but no valid tokens");
                // This is the case you're experiencing - need to force to login screen
                router.replace("/");
            }
        }
    }, [isAuthenticated, hasValidTokens, isLoading]);

    // Show loading during auth operations
    if (isLoading || hasCompletedOnboarding === null || hasValidTokens === null) {
        console.log("IndexScreen - Loading in progress or waiting for checks");
        console.log("Setting place #1");
        return <LoadingScreen />;
    }

    // IMPORTANT: Base routing decisions on both context state AND token check
    const isReallyAuthenticated = isAuthenticated && hasValidTokens;

    // If authenticated and completed onboarding, go to tabs
    if (isReallyAuthenticated && hasCompletedOnboarding) {
        console.log("IndexScreen - Redirecting to tabs (authenticated + completed onboarding)");
        console.log("Setting place #2");
        return <Redirect href="/(tabs)" />;
    }
    
    // If authenticated but hasn't completed onboarding, route to tabs as requested
    if (isReallyAuthenticated && !hasCompletedOnboarding) {
        console.log("IndexScreen - Authenticated but would normally need onboarding");
        console.log("Setting place #3 - Routing directly to tabs as requested");
        return <Redirect href="/(tabs)" />;
    }
    
    // Show onboarding/login if not authenticated
    if (!isReallyAuthenticated) {
        console.log("IndexScreen - Not authenticated, showing onboarding/login");
        console.log("Setting place #4");
        return <RegisterScreen/>;
    }

    // Fallback: redirect to onboarding
    console.log("IndexScreen - Fallback: redirecting to onboarding");
    console.log("Setting place #5");
    return <OnboardingScreen onComplete={forceRedirectToDashboard} />;
}