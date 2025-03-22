import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

export default function TabsIndexScreen() {

    useEffect(() => {
        async function prepare() {
            try {
                // Wait for a second before proceeding
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Hide the splash screen
                await SplashScreen.hideAsync();
                
            } catch (error) {
                console.error("Error preparing app:", error);
            }
        }
        
        prepare();
    }, []);

    return (
        <></>
    )
}