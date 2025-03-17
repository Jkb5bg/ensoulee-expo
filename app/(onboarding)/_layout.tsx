import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';

export default function OnboardingLayout() {
    return (

        <View style={{ flex: 1, position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
            <StatusBar hidden={false} translucent style="light" />
            <Stack
                screenOptions={{
                headerShown: false, // or true depending on what you want
                contentStyle: { backgroundColor: 'black' }, // Optional
                }}
            >
                <Stack.Screen name="index" />
            </Stack>
        </View>

    )
}