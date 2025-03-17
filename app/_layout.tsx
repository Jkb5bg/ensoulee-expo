import { StatusBar } from 'expo-status-bar';
import { Slot } from 'expo-router';
import { AuthProvider } from '@/components/AuthContext';

export default function RootLayout() {

    return (
        <AuthProvider>
            <StatusBar hidden={false} translucent style="light" />
            <Slot 
                screenOptions={{
                headerShown: false, // or true depending on what you want
                contentStyle: { backgroundColor: 'black' }, // Optional
            }}
            />
        </AuthProvider>
    )

}