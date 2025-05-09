import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAuth } from '@/components/AuthContext';
import { useLoading } from '@/components/LoadingContext';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';
import { GetUserImages } from '@/api/DeleteUserImage';



// Create a BackButton component with Ionicons
const BackButton = ({ onPress }: { onPress: () => void }) => {
  return (
    <TouchableOpacity onPress={onPress} style={styles.backButton}>
      <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
    </TouchableOpacity>
  );
};

const DEFAULT_AVATAR = require("@/assets/images/default-avatar.png");

// Interface for image data returned from API
interface ImageData {
  filename: string;
  url: string;
}

export default function SettingsScreen() {
  const [activeTab, setActiveTab] = useState('profile');
  const { authTokens, userInfo, user, logout, getValidToken, refreshUserData, userProfileImage } = useAuth();
  const { showLoading, hideLoading } = useLoading();
  const [loading, setLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [error, setError] = useState('');
  const isFetchingData = useRef(false);
  const isFocused = useIsFocused();
  const hasRefreshed = useRef(false);

  const [profileData, setProfileData] = useState({
    firstName: '',
    email: '',
    plan: 'FREE',
    bio: '',
    city: '',
    state: '',
    birthDate: '',
    occupation: '',
    sex: '',
    matchSex: '',
    tier: 'FREE',
    apiKey: '',
    userName: '',
    privateProfile: false,
    imageFilenames: [] as string[]
  });

  // Notification settings
  const [newsletterEnabled, setNewsletterEnabled] = useState(true);
  const [friendRequestNotifications, setFriendRequestNotifications] = useState('yes');
  const [messagesNotifications, setMessagesNotifications] = useState<'yes'|'no'>('yes');
  const [matchesNotifications, setMatchesNotifications] = useState<'yes'|'no'>('yes');

  // Privacy settings
  const [profileViewability, setProfileViewability] = useState('everyone');

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  useEffect(() => {
    if (isFocused && !hasRefreshed.current) {
      console.log('🔄 SettingsScreen focused, refreshing user data');
      refreshUserData().catch(e => console.error('Error refreshing:', e));
      hasRefreshed.current = true;
    }
    if (!isFocused) {
      // Reset so next time you enter the screen it’ll refresh again
      hasRefreshed.current = false;
    }
  }, [isFocused, refreshUserData]);

  // Load user profile images using all images endpoint
  const loadUserImages = useCallback(async () => {
    if (!user?.userName || !userInfo?.apiKey) {
      console.warn('⚠️ loadUserImages: missing userInfo');
      return;
    }
  
    console.log('🔄 loadUserImages()', { userName: user.userName });
    setImageLoading(true);
    try {
      const token = await getValidToken();
      console.log('🔑 loadUserImages got token:', token?.slice(0, 10) + '…');
  
      // Call your shared helper
      const images: ImageData[] = await GetUserImages(userInfo, token!, user);
      console.log('📦 GetUserImages returned:', images);
  
      if (images.length > 0) {
        // Use the very first signed URL
        setProfileImage(images[0].url);
        console.log('✅ setProfileImage to', images[0].url);
      } else {
        console.warn('⚠️ No images returned for', userInfo.userName);
        setProfileImage(null);
      }
    } catch (err) {
      console.error('❌ loadUserImages error:', err);
      setProfileImage(null);
    } finally {
      setImageLoading(false);
    }
  }, [userInfo, getValidToken]);
  

  // Fallback method to load just the profile image
  const loadSingleProfileImage = useCallback(async () => {
    if (!userInfo?.userName || !userInfo?.apiKey || !user?.imageFilenames?.length) {
      return null;
    }

    try {
      const token = await getValidToken();
      if (!token) return null;

      const imageFilename = user.imageFilenames[0];
      const imageResponse = await fetch(
        `${process.env.EXPO_PUBLIC_ENSOULEE_API_URL}api/images/${userInfo.userName}/${imageFilename}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'x-api-key': userInfo.apiKey
          }
        }
      );

      if (imageResponse.ok) {
        const imageUrl = await imageResponse.text();
        setProfileImage(imageUrl);
        return imageUrl;
      }
    } catch (error) {
      console.error('Error loading single profile image:', error);
    }

    return null;
  }, [userInfo, user, getValidToken]);

  const handleSignOut = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Sign Out",
          onPress: async () => {
            try {
              showLoading("Signing out...");
              
              // Clear image cache
              if (userInfo?.userName) {
                await AsyncStorage.removeItem(`userImages_${userInfo.userName}`);
              }
              
              // Delete tokens from storage
              await SecureStore.deleteItemAsync('auth_tokens');
              
              // Call the logout function
              await logout();
              
              // Force navigation to root after a short delay
              setTimeout(() => {
                router.replace("/");
              }, 300);
            } catch (error) {
              console.error("Error signing out:", error);
              
              // Even if there's an error, make sure tokens are deleted
              await SecureStore.deleteItemAsync('auth_tokens');
              
              // Force navigation anyway
              setTimeout(() => {
                router.replace("/");
              }, 300);
            } finally {
              hideLoading();
            }
          },
          style: "destructive"
        }
      ]
    );
  };

  const navigateToProfileSetup = () => {
    router.push('/profile-edit-screen');
  }

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to delete your account? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          onPress: () => {
            // Implement account deletion logic
            Alert.alert("Account deletion requested");
          },
          style: "destructive"
        }
      ]
    );
  };

  // Fetch user data only once
  const fetchUserData = useCallback(async () => {
    // Prevent duplicate calls with a ref
    if (isFetchingData.current) {
      console.log("Already fetching user data, skipping duplicate call");
      return;
    }
    
    try {
      isFetchingData.current = true;
      setLoading(true);
      showLoading("Loading profile data...");
      
      await refreshUserData();

      if (user) {
        // Extract imageFilenames from userData
        const imageFilenames = user.imageFilenames || [];

        setProfileData({
          firstName: user.firstName || '',
          email: user.email || '',
          bio: user.bio || '',
          city: user.city || '',
          state: user.state || '',
          birthDate: user.birthDate || '',
          occupation: user.occupation || '',
          sex: user.sex || '',
          matchSex: user.matchSex || '',
          tier: user.tier || 'FREE',
          plan: user.tier || 'FREE',
          apiKey: user.apiKey || '',
          userName: user.userName || '',
          privateProfile: user.privateProfile || false,
          imageFilenames: imageFilenames
        });

        // Set privacy settings based on user data
        setProfileViewability(user.privateProfile ? 'onlyMe' : 'everyone');

        // Load profile images if user has images
        await loadUserImages();

      } else {
        setError('Failed to load user data');
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      setError('An error occurred while loading your profile');
    } finally {
      setLoading(false);
      hideLoading();
      // Allow future fetches
      setTimeout(() => {
        isFetchingData.current = false;
      }, 1000); // Add a small delay to prevent rapid refetching
    }
  }, [user, refreshUserData, loadUserImages, showLoading, hideLoading]);

  // Only fetch user data on initial mount
  useEffect(() => {
    if (userInfo && !isFetchingData.current) {
      fetchUserData();
    }
    
    // Cleanup function that runs when component unmounts
    return () => {
      isFetchingData.current = false;
    };
  }, [userInfo]);

  // Try to reload profile image if it's missing
  useEffect(() => {
    if ((user?.imageFilenames?.length ?? 0) > 0 && !profileImage && !imageLoading && !loading) {
      console.log("Attempting to reload profile image");
      loadUserImages();
    }
  }, [user, profileImage, imageLoading, loading, loadUserImages]);

  const updatePrivacySettings = async () => {
    try {
      setLoading(true);
      showLoading("Updating privacy settings...");
      
      const token = await getValidToken();
      if (!token || !userInfo?.apiKey) {
        throw new Error('Authentication required');
      }

      const updatedData = {
        privateProfile: profileViewability === 'onlyMe'
      };

      const response = await fetch(`${process.env.EXPO_PUBLIC_ENSOULEE_API_URL}user/self`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-api-key': userInfo.apiKey
        },
        body: JSON.stringify(updatedData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      // Update local state
      setProfileData(prev => ({
        ...prev,
        privateProfile: updatedData.privateProfile
      }));

      Alert.alert('Success', 'Your privacy settings have been updated');
    } catch (error) {
      console.error('Error updating privacy settings:', error);
      Alert.alert('Error', 'Failed to update your privacy settings. Please try again.');
    } finally {
      setLoading(false);
      hideLoading();
    }
  };

  // Modified to display profile as static information
  const renderProfileContent = () => {
    return (
      <View style={styles.tabContent}>
        <View style={styles.profileImageContainer}>
          {imageLoading ? (
            <View style={styles.profileImageLoader}>
              <ActivityIndicator size="large" color="#F44D7B" />
            </View>
          ) : (
            <Image
              source={profileImage ? { uri: profileImage } : DEFAULT_AVATAR}
              style={styles.profileAvatar}
              onError={(e) => console.error('❌ Settings avatar failed to load:', e.nativeEvent)}
            />
          )}
          <TouchableOpacity style={styles.changeProfileButton} onPress={navigateToProfileSetup}>
            <Text style={styles.changeProfileButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Personal Info</Text>
        
        {/* Static info display instead of input fields */}
        <View style={styles.infoContainer}>
          <Text style={styles.infoLabel}>Name</Text>
          <Text style={styles.infoValue}>{profileData.firstName || 'Not provided'}</Text>
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.infoLabel}>Bio</Text>
          <Text style={styles.infoValue}>{profileData.bio || 'No bio provided'}</Text>
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.infoLabel}>Occupation</Text>
          <Text style={styles.infoValue}>{profileData.occupation || 'Not provided'}</Text>
        </View>

        <Text style={styles.sectionTitle}>Location</Text>
        <View style={styles.rowContainer}>
          <View style={styles.halfColumn}>
            <Text style={styles.infoLabel}>State</Text>
            <Text style={styles.infoValue}>{profileData.state || 'Not provided'}</Text>
          </View>
          <View style={styles.halfColumn}>
            <Text style={styles.infoLabel}>City</Text>
            <Text style={styles.infoValue}>{profileData.city || 'Not provided'}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Gender Preferences</Text>
        <View style={styles.infoContainer}>
          <Text style={styles.infoLabel}>I am a</Text>
          <Text style={styles.infoValue}>{profileData.sex ? profileData.sex.charAt(0).toUpperCase() + profileData.sex.slice(1) : 'Not specified'}</Text>
        </View>
        
        <View style={styles.infoContainer}>
          <Text style={styles.infoLabel}>Looking for</Text>
          <Text style={styles.infoValue}>
            {profileData.matchSex === 'both' 
              ? 'Men and Women' 
              : profileData.matchSex 
                ? profileData.matchSex.charAt(0).toUpperCase() + profileData.matchSex.slice(1) + 's'
                : 'Not specified'}
          </Text>
        </View>
              {/* New Onboarding Section */}
      <Text style={styles.sectionTitle}>Onboarding</Text>
      <TouchableOpacity
        style={styles.onboardingButton}
        onPress={() => router.push('/quiz')}
      >
        <Text style={styles.onboardingButtonText}>Take Onboarding Quiz</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.onboardingButton}
        onPress={() => router.push('/demographics')}
      >
        <Text style={styles.onboardingButtonText}>Update Demographics</Text>
      </TouchableOpacity>
      </View>
    );
  };

  const renderNotificationsContent = () => {
    return (
      <View style={styles.tabContent}>
    
        {/* Messages */}
        <Text style={styles.sectionTitle}>Messages</Text>
        <View style={styles.radioGroup}>
          <TouchableOpacity 
            style={styles.radioOption} 
            onPress={() => setMessagesNotifications('yes')}
          >
            <View style={[
              styles.radioButton, 
              messagesNotifications === 'yes' && styles.radioButtonSelected
            ]}>
              {messagesNotifications === 'yes' && <View style={styles.radioButtonInner} />}
            </View>
            <Text style={[
              styles.radioText,
              messagesNotifications === 'yes' && styles.radioTextSelected
            ]}>
              Enabled
            </Text>
          </TouchableOpacity>
    
          <TouchableOpacity 
            style={styles.radioOption} 
            onPress={() => setMessagesNotifications('no')}
          >
            <View style={[
              styles.radioButton, 
              messagesNotifications === 'no' && styles.radioButtonSelected
            ]}>
              {messagesNotifications === 'no' && <View style={styles.radioButtonInner} />}
            </View>
            <Text style={[
              styles.radioText,
              messagesNotifications === 'no' && styles.radioTextSelected
            ]}>
              Disabled
            </Text>
          </TouchableOpacity>
        </View>
    
        <View style={styles.divider} />
    
        {/* Matches */}
        <Text style={styles.sectionTitle}>Matches</Text>
        <View style={styles.radioGroup}>
          <TouchableOpacity 
            style={styles.radioOption} 
            onPress={() => setMatchesNotifications('yes')}
          >
            <View style={[
              styles.radioButton, 
              matchesNotifications === 'yes' && styles.radioButtonSelected
            ]}>
              {matchesNotifications === 'yes' && <View style={styles.radioButtonInner} />}
            </View>
            <Text style={[
              styles.radioText,
              matchesNotifications === 'yes' && styles.radioTextSelected
            ]}>
              Enabled
            </Text>
          </TouchableOpacity>
    
          <TouchableOpacity 
            style={styles.radioOption} 
            onPress={() => setMatchesNotifications('no')}
          >
            <View style={[
              styles.radioButton, 
              matchesNotifications === 'no' && styles.radioButtonSelected
            ]}>
              {matchesNotifications === 'no' && <View style={styles.radioButtonInner} />}
            </View>
            <Text style={[
              styles.radioText,
              matchesNotifications === 'no' && styles.radioTextSelected
            ]}>
              Disabled
            </Text>
          </TouchableOpacity>
        </View>
    
        <TouchableOpacity style={styles.updateButton} disabled={loading}>
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.updateButtonText}>Update</Text>
          )}
        </TouchableOpacity>
    
      </View>
    );
  }

  const renderPrivacyContent = () => {
    return (
      <View style={styles.tabContent}>
        <Text style={styles.sectionTitle}>Profile</Text>
        <Text style={styles.subSectionTitle}>Who can view your profile?</Text>

        <View style={styles.radioGroupVertical}>
          <TouchableOpacity 
            style={styles.radioOption} 
            onPress={() => setProfileViewability('everyone')}
          >
            <View style={[
              styles.radioButton, 
              profileViewability === 'everyone' && styles.radioButtonSelected
            ]}>
              {profileViewability === 'everyone' && <View style={styles.radioButtonInner} />}
            </View>
            <Text style={styles.radioText}>Everyone (including people who are not Ensoulee members).</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.radioOption} 
            onPress={() => setProfileViewability('members')}
          >
            <View style={[
              styles.radioButton, 
              profileViewability === 'members' && styles.radioButtonSelected
            ]}>
              {profileViewability === 'members' && <View style={styles.radioButtonInner} />}
            </View>
            <Text style={styles.radioText}>Only Ensoulee members who are logged in.</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.radioOption} 
            onPress={() => setProfileViewability('onlyMe')}
          >
            <View style={[
              styles.radioButton, 
              profileViewability === 'onlyMe' && styles.radioButtonSelected
            ]}>
              {profileViewability === 'onlyMe' && <View style={styles.radioButtonInner} />}
            </View>
            <Text style={styles.radioText}>Only me.</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.updateButton}
          onPress={updatePrivacySettings}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.updateButtonText}>Update</Text>
          )}
        </TouchableOpacity>

        <View style={styles.deleteAccountContainer}>
          <TouchableOpacity
            style={styles.deleteAccountButton}
            onPress={handleDeleteAccount}
            disabled={loading}
          >
            <Text style={styles.deleteAccountButtonText}>Delete Account</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderMembershipContent = () => {
    return (
      <View style={styles.tabContent}>
        <View style={styles.profileImageContainer}>
          {imageLoading ? (
            <View style={styles.profileImageLoader}>
              <ActivityIndicator size="large" color="#F44D7B" />
            </View>
          ) : (
            <Image
              source={profileImage ? { uri: profileImage } : DEFAULT_AVATAR}
              style={styles.profileAvatar}
              onError={(e) => console.error('❌ Settings avatar failed to load:', e.nativeEvent)}
            />
          )}
          <Text style={styles.userName}>{profileData.firstName}</Text>
          <Text style={styles.userEmail}>{profileData.email}</Text>

          <View style={styles.planBadge}>
            <Text style={styles.planText}>{profileData.tier || 'FREE'}</Text>
          </View>

          {profileData.tier !== 'PREMIUM' && (
            <TouchableOpacity style={styles.upgradePlanButton} onPress={() => router.push('/subscription')}>
              <LinearGradient
                colors={['#FF7B6F', '#F44D7B']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.upgradePlanGradient}
              >
                <Text style={styles.upgradePlanButtonText}>
                  {profileData.tier === 'FREE' ? 'Upgrade plan' : 'View other plans'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.signOutButton}
            onPress={handleSignOut}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#F44D7B" />
            ) : (
              <Text style={styles.signOutButtonText}>Sign out</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return renderProfileContent();
      case 'notifications':
        return renderNotificationsContent();
      case 'privacy':
        return renderPrivacyContent();
      case 'membership':
        return renderMembershipContent();
      default:
        return renderProfileContent();
    }
  };

  if (loading && !profileData.firstName) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.header}>
          <BackButton onPress={() => router.back()} />
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={{ width: 32 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F44D7B" />
          <Text style={styles.loadingText}>Loading your profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <BackButton onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 32 }} />
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setError('');
              fetchUserData();
            }}
          >
            <Text style={styles.updateButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.tabsWrapper}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabsContainer}
            >
              <TouchableOpacity
                style={[styles.tab, activeTab === 'profile' && styles.activeTab]}
                onPress={() => handleTabChange('profile')}
              >
                <Text style={[styles.tabText, activeTab === 'profile' && styles.activeTabText]}>Profile</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'notifications' && styles.activeTab]}
                onPress={() => handleTabChange('notifications')}
              >
                <Text style={[styles.tabText, activeTab === 'notifications' && styles.activeTabText]}>Notifications</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'privacy' && styles.activeTab]}
                onPress={() => handleTabChange('privacy')}
              >
                <Text style={[styles.tabText, activeTab === 'privacy' && styles.activeTabText]}>Privacy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'membership' && styles.activeTab]}
                onPress={() => handleTabChange('membership')}
              >
                <Text style={[styles.tabText, activeTab === 'membership' && styles.activeTabText]}>Membership</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          <ScrollView style={styles.scrollContainer}>
            {renderTabContent()}
          </ScrollView>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#181818"
  },
  header: {
    height: 70,
    backgroundColor: "rgba(31, 34, 35, 1)",
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: "#FFFFFF",
    textAlign: "center"
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 12,
    fontSize: 16,
    fontWeight: '400'
  },
  errorContainer: {
    backgroundColor: 'rgba(244, 77, 123, 0.1)',
    padding: 16,
    margin: 16,
    borderRadius: 8,
    alignItems: 'center'
  },
  errorText: {
    color: "#F44D7B",
    fontSize: 14,
    fontWeight: '400',
    marginBottom: 10
  },
  retryButton: {
    backgroundColor: "#F44D7B",
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    width: '100%'
  },
  tabsWrapper: {
    height: 60,
    backgroundColor: "rgba(31, 34, 35, 0.8)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(52, 55, 56, 1)"
  },
  tabsContainer: {
    alignItems: 'center',
    paddingHorizontal: 10
  },
  tab: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginHorizontal: 5
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: "#F44D7B"
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: "rgba(255, 255, 255, 0.6)"
  },
  activeTabText: {
    color: "#FFFFFF"
  },
  scrollContainer: {
    flex: 1
  },
  tabContent: {
    padding: 16
  },
  profileImageContainer: {
    alignItems: 'center',
    paddingVertical: 24
  },
  profileImageLoader: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(52, 55, 56, 1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 10
  },
  changeProfileButton: {
    marginTop: 10
  },
  changeProfileButtonText: {
    color: "#F44D7B",
    fontWeight: '600',
    fontSize: 16
  },
  sectionTitle: {
    fontWeight: '600',
    fontSize: 20,
    color: "#FFFFFF",
    marginBottom: 10,
    marginTop: 10
  },
  subSectionTitle: {
    fontWeight: '400',
    fontSize: 16,
    color: "#FFFFFF",
    marginBottom: 15
  },
  // New static info display styles
  infoContainer: {
    marginBottom: 16,
    backgroundColor: "rgba(52, 55, 56, 0.5)",
    borderRadius: 8,
    padding: 12
  },
  infoLabel: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.5)",
    marginBottom: 5,
    fontWeight: '400'
  },
  infoValue: {
    color: "#FFFFFF",
    fontWeight: '400',
    fontSize: 16,
    marginTop: 3
  },
  inputContainer: {
    marginBottom: 16
  },
  inputLabel: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.5)",
    marginBottom: 5,
    fontWeight: '400'
  },
  input: {
    height: 45,
    backgroundColor: "rgba(52, 55, 56, 1)",
    borderRadius: 4,
    paddingHorizontal: 15,
    color: "#FFFFFF",
    fontWeight: '400',
    fontSize: 16
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 10
  },
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  halfColumn: {
    width: '48%'
  },
  selectText: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 16,
    lineHeight: 45,
    fontWeight: '400'
  },
  updateButton: {
    backgroundColor: "#F44D7B",
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginVertical: 16
  },
  updateButtonText: {
    color: "#FFFFFF",
    fontWeight: '600',
    fontSize: 16
  },
  radioGroup: {
    flexDirection: 'row',
    marginVertical: 10
  },
  radioGroupVertical: {
    marginVertical: 10
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
    marginBottom: 10
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#777',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8
  },
  radioButtonSelected: {
    borderColor: '#F44D7B'
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#F44D7B'
  },
  notificationDescription: {
    color: "#B4862C",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400'
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(52, 55, 56, 1)',
    marginVertical: 15
  },
  deleteAccountContainer: {
    alignItems: 'center',
    marginTop: 20
  },
  deleteAccountButton: {
    borderWidth: 1,
    borderColor: "#F44D7B",
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    width: '60%'
  },
  deleteAccountButtonText: {
    color: "#F44D7B",
    fontWeight: '600',
    fontSize: 16
  },
  userName: {
    color: "#FFFFFF",
    fontWeight: '600',
    fontSize: 24,
    marginTop: 10
  },
  userEmail: {
    color: "rgba(255, 255, 255, 0.5)",
    fontWeight: '400',
    fontSize: 16,
    marginTop: 5
  },
  planBadge: {
    backgroundColor: "rgba(43, 46, 47, 1)",
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderRadius: 50,
    marginTop: 16
  },
  planText: {
    color: "#FFFFFF",
    fontWeight: '500',
    fontSize: 16
  },
  upgradePlanButton: {
    width: '60%',
    marginVertical: 15,
    borderRadius: 8
  },
  upgradePlanGradient: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  upgradePlanButtonText: {
    color: "#FFFFFF",
    fontWeight: '600',
    fontSize: 16
  },
  signOutButton: {
    marginTop: 10
  },
  signOutButtonText: {
    color: "#F44D7B",
    fontWeight: '600',
    fontSize: 16
  },
  radioText: {
    fontSize: 16,
    color: '#fff',
    marginLeft: 8,
  },
  radioTextSelected: {
    color: '#F44D7B',
    fontWeight: '600',
  },
  profileAvatar: {
    width: 100,            // or whatever size you need
    height: 100,
    borderRadius: 50,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#F44D7B',
  },
  onboardingButton: {
    backgroundColor: 'rgba(244,77,123,1)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  onboardingButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  }
});