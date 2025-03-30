import { StatusBar } from 'expo-status-bar';
import { Slot } from 'expo-router';
import { AuthProvider } from '@/components/AuthContext';
import { LoadingProvider } from '@/components/LoadingContext';
import { useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';

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
        <LoadingProvider>
            <AuthProvider>
                <StatusBar hidden={false} translucent style="light" />
                <Slot 
                    screenOptions={{
                        headerShown: false,
                        contentStyle: { backgroundColor: 'black' },
                    }}
                />
            </AuthProvider>
        </LoadingProvider>
    );
}