import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import { AuthProvider } from '@/components/AuthContext';
import { LoadingProvider } from '@/components/LoadingContext';
import { useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { StyleSheet, View } from 'react-native';
import { AppProvider } from '@/components/TabsContext';

export default function RootLayout() {
    useEffect(() => {
        const getStoredTokens = async () => {
            try {
                const tokensString = await SecureStore.getItemAsync('auth_tokens');
                if (tokensString) {
                    const tokens = JSON.parse(tokensString);
                    
                    // You can also check if token is expired
                    const expirationTime = tokens.issuedAt + tokens.expiresIn;
                    const isExpired = Date.now() / 1000 > expirationTime;
                    
                    // Calculate time remaining if not expired
                    if (!isExpired) {
                        const secondsRemaining = Math.floor(expirationTime - (Date.now() / 1000));
                    }
                } else {
                    console.log("No auth tokens found in storage");
                }
            } catch (error) {
                console.error("Error retrieving tokens:", error);
            }
        };
        
        getStoredTokens();
    }, []);

    return (
        <View style={styles.container}>
            <LoadingProvider>
                <AuthProvider>
                    <AppProvider>
                        <StatusBar hidden={false} translucent style="light" />
                        {/* Define Stack navigation for the entire app */}
                        <Stack 
                            screenOptions={{
                                headerShown: false,
                                contentStyle: { backgroundColor: 'black' },
                                animation: 'slide_from_right',
                            }}
                        >
                            {/* Regular app flow */}
                            <Stack.Screen name="index" />
                            
                            {/* Grouped routes */}
                            <Stack.Screen 
                                name="(tabs)" 
                                options={{ 
                                    headerShown: false,
                                }}
                            />
                            
                            {/* Auth flow */}
                            <Stack.Screen 
                                name="(auth)" 
                                options={{
                                    headerShown: false,
                                }}
                            />
                            
                            {/* Onboarding flow */}
                            <Stack.Screen 
                                name="(onboarding)" 
                                options={{
                                    headerShown: false,
                                }}
                            />
                            
                            {/* Settings screen - will stack on top of (tabs) */}
                            <Stack.Screen 
                                name="settings" 
                                options={{
                                    headerShown: false,
                                    presentation: 'card',
                                }}
                            />
                        </Stack>
                    </AppProvider>
                </AuthProvider>
            </LoadingProvider>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
    }
});