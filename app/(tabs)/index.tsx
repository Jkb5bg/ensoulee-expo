
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Image } from 'react-native';
import { useAuth } from "@/components/AuthContext";
import { useLoading } from "@/components/LoadingContext";
import { router } from 'expo-router';
import Profile from '@/types/profile';
import calculateAge from '@/functions/calculateAge';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GetPotentialMatches } from '@/api/GetPotentialMatches';
import { HandleSwipe } from '@/api/HandleSwipe';
import { GetUserProfileImage } from '@/api/GetUserProfileImage';

// Import your SVG icon components
import SettingsIcon from "@/components/icons/SettingsIcon";
import NotificationsIcon from "@/components/icons/NotificationsIcon";
import CloseIcon from "@/components/icons/CloseIcon";
import StarIcon from "@/components/icons/StarIcon";
import LoveIcon from "@/components/icons/LoveIcon";

// Default avatar image
const DEFAULT_AVATAR = require("@/assets/square_favicon.png");

export default function TabsIndexScreen() {
    const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);

    const { user, userInfo, userProfileImage, getValidToken, logout, refreshUserData } = useAuth();
    const { showLoading, hideLoading, isLoading } = useLoading();

    const navigateToSettings = () => {
        logout();
        router.replace("/(onboarding)");
    }

    const logoutAndRedirect = () => {
        logout();
        router.replace("/(onboarding)");
    }

    // Fetch potential matches
    const fetchPotentialMatches = useCallback(async () => {
        // Add a safeguard to prevent multiple concurrent requests
        if (isLoading) return;
        
        try {
          showLoading('Loading profiles...');
          
          const token = await getValidToken();
          if (!token || !userInfo) {
            hideLoading();
            return; // Exit early instead of throwing error
          }
      
          // Use API function to get potential matches
          const data = await GetPotentialMatches(userInfo, token);
          
          // Process data and update state as before
          // ...
        } catch (error) {
          console.error('Error fetching potential matches:', error);
          // Don't show alert here, it's causing more UI interactions
          setCurrentProfile(null);
        } finally {
          hideLoading();
        }
    }, [user, userInfo, getValidToken, showLoading, hideLoading, isLoading]);

    // Add a retry counter to limit retries
    const [retryCount, setRetryCount] = useState(0);

    // Handle swipe action
    const handleSwipe = async (direction: 'left' | 'right') => {
        if (!currentProfile || !user || !user.userName || !userInfo) return;

        try {
            showLoading('Processing...');

            const token = await getValidToken();
            if (!token) {
                throw new Error('Authentication required');
            }

            // Use API function to handle the swipe
            const success = await HandleSwipe(userInfo, token, {
                swiperUserName: user.userName,
                swipedUserName: currentProfile.userName,
                direction: direction
            });

            if (success) {
                // Fetch next profile after successful swipe
                fetchPotentialMatches();
            } else {
                hideLoading();
                Alert.alert('Error', 'Failed to record your choice');
            }
        } catch (error) {
            console.error('Error recording swipe:', error);
            hideLoading();
            Alert.alert('Error', 'Failed to record your choice');
        }
    }

    // Initialize the screen
    useEffect(() => {
        async function prepare() {
          try {
            // Wait for splash screen to hide
            await SplashScreen.hideAsync();
            
            if (user?.userName && retryCount < 3) { // Limit retries to prevent loops
              showLoading('Setting up your discover feed...');
              
              // Increment retry counter
              setRetryCount(prev => prev + 1);
              
              // Refresh user data if needed
              if (!userProfileImage) {
                await refreshUserData();
              }
              
              // Fetch potential matches
              await fetchPotentialMatches();
            }
          } catch (error) {
            console.error("Error preparing app:", error);
            hideLoading();
          }
        }
        
        prepare();
      }, [user, fetchPotentialMatches, showLoading, hideLoading, refreshUserData, userProfileImage, retryCount]);

    // Render profile content
    const renderContent = () => {
        if (isLoading) {
            // Global loading overlay will handle this, just return null.
            return null;
        }

        if (!currentProfile) {
            return (
                <View style={styles.centerContainer}>
                    <Text style={styles.noProfilesText}>No more profiles to show</Text>
                    <TouchableOpacity
                        style={styles.refreshButton}
                        onPress={fetchPotentialMatches}
                        >
                        <Text style={styles.refreshButtonText}>Refresh</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        const hasValidImage = currentProfile.presignedImageUrls && 
            currentProfile.presignedImageUrls.length > 0 &&
            typeof currentProfile.presignedImageUrls[0] === 'string';

        return (
            <>
                <View style={styles.imageContainer}>
                    <Image
                        source={hasValidImage
                            ? { uri: currentProfile.presignedImageUrls[0]}
                            : DEFAULT_AVATAR}
                        style={styles.image}
                        resizeMode={'cover'}
                    />
                    <View style={styles.profileInfo}>
                        <Text style={styles.profileName}>
                            {currentProfile.firstName || 'Unknown'}, {calculateAge(currentProfile.birthDate || '')}
                        </Text>
                        <Text style={styles.profileLocation}>
                            {currentProfile.city || 'Unknown'}, {currentProfile.state || 'Unknown'}
                        </Text>
                        {currentProfile.bio && (
                            <Text style={styles.profileBio} numberOfLines={3}>
                                {currentProfile.bio}
                            </Text>
                        )}
                    </View>
                </View>

                <View style={styles.actionButtons}>
                    <TouchableOpacity onPress={() => handleSwipe('left')} style={styles.actionButton}>
                        <View style={[styles.actionButtonInner, styles.dislikeButton]}>
                            <CloseIcon />
                        </View>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton}>
                        <View style={[styles.actionButtonInner, styles.superlikeButton]}>
                            <StarIcon />
                        </View>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleSwipe('right')} style={styles.actionButton}>
                        <View style={[styles.actionButtonInner, styles.likeButton]}>
                            <LoveIcon />
                        </View>
                    </TouchableOpacity>
                </View>
            </>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            {/* <View style={styles.headerContainer}>
                <View style={styles.headerLeftSection}>
                    <Image
                        source={userProfileImage ? { uri: userProfileImage } : DEFAULT_AVATAR}
                        style={styles.profileIcon}
                    />
                </View>
                <View style={styles.headerCenterSection}>
                    <Text style={styles.headerTitle}>Discover</Text>
                </View>
                <View style={styles.headerRightSection}>
                    <TouchableOpacity onPress={navigateToSettings} style={styles.headerIconButton}>
                        <SettingsIcon />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.headerIconButton}>
                        <NotificationsIcon />
                    </TouchableOpacity>
                </View>
            </View> */}

            {/* Main Content */}
            {renderContent()}
        </SafeAreaView>
    )

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
    profileName: {
        fontFamily: "SF-600",
        fontSize: 22,
        color: "#FFFFFF"
    },
    profileLocation: {
        fontSize: 16,
        color: "#FFFFFF",
        marginTop: 4
    },
    profileBio: {
        fontSize: 14,
        color: "#FFFFFF",
        marginTop: 8
    },
    noProfilesText: {
        fontSize: 18,
        color: "#FFFFFF"
    },
    actionButtons: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 20
    },
    actionButton: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionButtonInner: {
        width: 64,
        height: 64,
        borderWidth: 3,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dislikeButton: {
        borderColor: "rgba(246, 62, 64, 1)"
    },
    superlikeButton: {
        borderColor: "rgba(33, 186, 251, 1)"
    },
    likeButton: {
        borderColor: "rgba(30, 177, 89, 1)"
    },
    refreshButton: {
        marginTop: 20,
        padding: 10,
        backgroundColor: 'rgba(244, 77, 123, 1)',
        borderRadius: 8,
    },
    refreshButtonText: {
        color: "#FFFFFF",
        fontSize: 16
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
});