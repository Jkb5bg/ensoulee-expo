import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import { AuthProvider } from '@/components/AuthContext';
import { LoadingProvider } from '@/components/LoadingContext';
import { useEffect, useRef, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { StyleSheet, View, Platform } from 'react-native';
import { AppProvider } from '@/components/TabsContext';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

async function sendPushNotification(expoPushToken: string) {
    const message = {
        to: expoPushToken,
        sound: 'default',
        title: 'Test Notification',
        body: 'This is a test notification',
        data: { data: 'goes here' },
    };

    await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Accept-encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
    })
};

function handleRegistrationError(errorMessage: any) {
    alert(errorMessage);
    throw new Error(errorMessage);
}

async function registerForPushNotificationsAsync() {
    if (Platform.OS === 'android') {
        Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
        });
    }

    if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            handleRegistrationError('Failed to get push token for push notification!');
            return;
        }
        const projectId = 
            Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
        if (!projectId) {
            handleRegistrationError('Project ID not found');
            return;
        }
        try {
            const pushTokenString = (
                await Notifications.getExpoPushTokenAsync({
                    projectId,
                })
            ).data;
            console.log(pushTokenString);
            return pushTokenString;
        } catch (e: unknown) {
            handleRegistrationError(`${e}`);
        }
    }  else {
        handleRegistrationError('Must use physical device for Push Notifications');
    }
}

export default function RootLayout() {
    const [expoPushToken, setExpoPushToken] = useState('');
    const [notification, setNotification] = useState<Notifications.Notification | undefined>(undefined);
    const notificationListener = useRef<Notifications.EventSubscription>();
    const responseListener = useRef<Notifications.EventSubscription>();

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

    useEffect(() => {
        registerForPushNotificationsAsync()
            .then(token => setExpoPushToken(token ?? ''))
            .catch((error: any) => setExpoPushToken(`${error}`));

        notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
            setNotification(notification);
        });

        responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
            console.log(response);
        })

        return () => {
            notificationListener.current &&
                Notifications.removeNotificationSubscription(notificationListener.current);
            responseListener.current &&
                Notifications.removeNotificationSubscription(responseListener.current);
        }
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