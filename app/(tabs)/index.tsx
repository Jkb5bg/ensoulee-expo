import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from "@/components/AuthContext";
import { router } from 'expo-router';

export default function TabsIndexScreen() {
    const [loading, setLoading] = useState<Boolean>(true);
    const {logout} = useAuth();

    const logoutAndRedirect = () => {
        logout();
        router.replace("/(onboarding)")
    }

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
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Welcome to the Discover Screen!</Text>
        <TouchableOpacity onPress={logout}>
            <Text>Press here to logout</Text>
        </TouchableOpacity>
      </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "rgba(24, 24, 24, 1)"
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    imageContainer: {
        flex: 1,
        justifyContent: 'flex-start',
        alignItems: 'center',
        paddingHorizontal: 10,
    },
    image: {
        width: '100%',
        height: '85%',
        borderRadius: 16,
    },
    imageFallback: {
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    profileInfo: {
        position: 'absolute',
        bottom: '20%',
        left: 20,
        right: 20,
        padding: 10,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        borderRadius: 8,
    },
    actionButtons: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 20,
    },
    refreshButton: {
        marginTop: 20,
        padding: 10,
        backgroundColor: 'rgba(244, 77, 123, 1)',
        borderRadius: 8,
    },
    headerContainer: {
        height: 70,
        backgroundColor: "rgba(31, 34, 35, 1)",
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20
    },
    headerLeftSection: {
        width: 32,
    },
    headerCenterSection: {
        position: 'absolute',
        left: 0,
        right: 0,
        alignItems: 'center',
        justifyContent: 'center'
    },
    headerRightSection: {
        flexDirection: 'row',
    },
    headerTitle: {
        fontFamily: "SF-600",
        fontSize: 20,
        color: "#FFFFFF"
    },
    profileIcon: {
        width: 32,
        height: 32,
        borderRadius: 16
    },
    headerIconButton: {
        marginLeft: 15
    }
})