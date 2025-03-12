import { Stack } from "expo-router";
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, View } from 'react-native';


export default function RootLayout() {

  const hasCompletedOnboarding = true;

  if (hasCompletedOnboarding) {
    return (
      <View style={{ flex: 1, position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        <StatusBar hidden={false} translucent style="light" />
        <Stack
          screenOptions={{
            headerShown: true, // or true depending on what you want
            contentStyle: { backgroundColor: 'black' }, // Optional
          }}
        >
          <Stack.Screen name="(onboarding)" />
          <Stack.Screen name="+not-found" />
        </Stack>
      </View>
    );
  }
  else {
    return (
      <View style={{ flex: 1, position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        <StatusBar hidden={false} translucent style="light" />
        <Stack
          screenOptions={{
            headerShown: true, // or true depending on what you want
            contentStyle: { backgroundColor: 'black' }, // Optional
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="+not-found" />
        </Stack>
      </View>
    );
  }
}