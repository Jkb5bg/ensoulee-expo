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
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '@/components/AuthContext';
import { useLoading } from '@/components/LoadingContext';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import DraggableFlatList, {
  RenderItemParams,
} from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Picker } from '@react-native-picker/picker';
import locations from '@/utils/Locations.json';
import occupationsData from '@/utils/Occupations.json';
import { UpdateUserProfile } from '@/api/UpdateUserProfile';
import { GetUserImages, DeleteUserImage } from '@/api/DeleteUserImage';

const PROFILE_IMAGES_CACHE_KEY = 'profileImagesCache';
const DEFAULT_AVATAR = require('@/assets/images/default-avatar.png');
const SCREEN_WIDTH = Dimensions.get('window').width;

const CHAR_LIMITS = { firstName: 50, bio: 500 };
const MAX_PROFILE_IMAGES = 6;

interface ProfileImage {
  uri: string;
  filename: string;
  isLocal?: boolean;
}

interface ProfileFormData {
  firstName: string;
  bio: string;
  occupation: string;
  city: string;
  state: string;
  sex: string;
  matchSex: string;
}

// Close icon
const CloseIcon = ({
  width = 24,
  height = 24,
  color = '#F63E54',
}: {
  width?: number;
  height?: number;
  color?: string;
}) => (
  <Ionicons name="close-circle" size={width} color={color} />
);

// Create an extended type that includes index
interface ExtendedRenderItemParams<T> extends RenderItemParams<T> {
  index: number;
}

export default function ProfileEditScreen() {
  const { userInfo, user, getValidToken, refreshUserData } = useAuth();
  const { showLoading, hideLoading } = useLoading();

  const [loading, setLoading] = useState(false);
  const [isLoadingImages, setIsLoadingImages] = useState(true);
  const [profileImages, setProfileImages] = useState<ProfileImage[]>([]);
  const imagesWereUpdated = useRef(false);
  const initialDataLoaded = useRef(false);

  const [formData, setFormData] = useState<ProfileFormData>({
    firstName: user?.firstName || '',
    bio: user?.bio || '',
    occupation: user?.occupation || '',
    city: user?.city || '',
    state: user?.state || '',
    sex: user?.sex || 'woman',
    matchSex: user?.matchSex || 'woman',
  });

  const [charCount, setCharCount] = useState({
    firstName: formData.firstName.length,
    bio: formData.bio.length,
  });

  const stateOptions = Object.keys(locations);
  const cityOptions = formData.state
    ? locations[formData.state as keyof typeof locations]
    : [];
  const occupationOptions: string[] = occupationsData.occupations;

  // Prefill form & char counts
  useEffect(() => {
    if (user && !initialDataLoaded.current) {
      setFormData({
        firstName: user.firstName || '',
        bio: user.bio || '',
        occupation: user.occupation || '',
        city: user.city || '',
        state: user.state || '',
        sex: user.sex || 'woman',
        matchSex: user.matchSex || 'woman',
      });
      setCharCount({
        firstName: (user.firstName || '').length,
        bio: (user.bio || '').length,
      });
      initialDataLoaded.current = true;
    }
  }, [user]);

  // Cache helpers
  const cacheImages = async (imgs: ProfileImage[]) => {
    if (!userInfo?.userName) return;
    const key = `${PROFILE_IMAGES_CACHE_KEY}_${userInfo.userName}`;
    await AsyncStorage.setItem(
      key,
      JSON.stringify({ images: imgs, timestamp: Date.now() })
    );
  };
  const checkCachedImages = async (): Promise<boolean> => {
    if (!userInfo?.userName) return false;
    const key = `${PROFILE_IMAGES_CACHE_KEY}_${userInfo.userName}`;
    const val = await AsyncStorage.getItem(key);
    if (!val) return false;
    const { images, timestamp } = JSON.parse(val);
    if (Date.now() - timestamp < 15 * 60 * 1000 && images.length) {
      setProfileImages(images);
      setIsLoadingImages(false);
      return true;
    }
    return false;
  };

  // Load images
  const loadUserProfileImages = useCallback(async () => {
    if (!userInfo?.userName) {
      setIsLoadingImages(false);
      return;
    }
    setIsLoadingImages(true);
    try {
      // Check cache first
      if (await checkCachedImages()) return;
      
      // Fetch from API if cache miss
      const token = await getValidToken();
      if (!token || !user) throw new Error('Auth error');
      const imgs = await GetUserImages(userInfo, token, user);
      const mapped = imgs.map(i => ({ uri: i.url, filename: i.filename }));
      
      // Log images for debugging
      console.log(`Loaded ${mapped.length} profile images:`, 
        mapped.map(img => img.filename).join(', '));
      
      setProfileImages(mapped);
      cacheImages(mapped);
    } catch (e) {
      console.error('Error loading images', e);
      Alert.alert('Error', 'Failed to load your profile images.');
    } finally {
      setIsLoadingImages(false);
    }
  }, [userInfo, getValidToken, user]);

  // Initial data fetch
  useEffect(() => {
    (async () => {
      setLoading(true);
      showLoading('Loading profile...');
      await refreshUserData();
      await loadUserProfileImages();
      setLoading(false);
      hideLoading();
    })();
  }, []);

  // Text change with limits
  const handleTextChange = (field: 'firstName' | 'bio', text: string) => {
    if (text.length <= CHAR_LIMITS[field]) {
      setFormData(prev => ({ ...prev, [field]: text }));
      setCharCount(prev => ({ ...prev, [field]: text.length }));
    }
  };

  // Add image
  const handleAddImages = useCallback(async () => {
    if (profileImages.length >= MAX_PROFILE_IMAGES) {
      Alert.alert(
        'Limit Reached',
        `You can only have ${MAX_PROFILE_IMAGES} profile images.`
      );
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'We need access to your photos to add profile images.'
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (result.canceled) return;

    showLoading('Uploading image...');
    try {
      const token = await getValidToken();
      if (!token || !userInfo) throw new Error('Auth error');
      const asset = result.assets[0];
      const ext = asset.uri.split('.').pop() || 'jpg';
      const name = `image_${Date.now()}.${ext}`;
      const data = new FormData();
      data.append('file', {
        uri: asset.uri,
        name,
        type: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
      } as any);

      const API = (process.env.EXPO_PUBLIC_ENSOULEE_API_URL || '').replace(
        /\/$/,
        ''
      );
      const resp = await fetch(`${API}/api/images/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-api-key': userInfo.apiKey,
        },
        body: data,
      });
      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(`Upload failed ${resp.status}: ${txt}`);
      }
      imagesWereUpdated.current = true;
      
      // Force refresh images from server, bypassing cache
      await AsyncStorage.removeItem(`${PROFILE_IMAGES_CACHE_KEY}_${userInfo.userName}`);
      await loadUserProfileImages();
      
      Alert.alert('Success', 'Image uploaded!');
    } catch (e: any) {
      console.error(e);
      Alert.alert('Upload Failed', e.message || 'Please try again.');
    } finally {
      hideLoading();
    }
  }, [profileImages.length, getValidToken, loadUserProfileImages, userInfo]);

  // Delete image
  const handleDeleteImage = useCallback(
    async (filename: string, idx: number) => {
      Alert.alert(
        idx === 0 ? 'Delete Profile Picture' : 'Delete Image',
        'Are you sure?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              showLoading('Deleting image...');
              try {
                const token = await getValidToken();
                if (!token || !userInfo) throw new Error('Auth error');
                const ok = await DeleteUserImage(userInfo, token, filename);
                if (!ok) throw new Error('Delete failed');
                const updated = [...profileImages];
                updated.splice(idx, 1);
                setProfileImages(updated);
                imagesWereUpdated.current = true;
                cacheImages(updated);
              } catch (err) {
                console.error(err);
                Alert.alert('Error', 'Failed to delete image.');
              } finally {
                hideLoading();
              }
            },
          },
        ]
      );
    },
    [profileImages, getValidToken, userInfo]
  );

  // Save profile
  const handleUpdateProfile = async () => {
    if (!formData.firstName.trim()) {
      Alert.alert('Missing Information', 'Please enter your name.');
      return;
    }
    setLoading(true);
    showLoading('Updating profile...');
    try {
      const token = await getValidToken();
      if (!token || !userInfo) throw new Error('Auth error');

      // Reorder if needed (simply re-uploaded in new order)
      if (imagesWereUpdated.current && profileImages.length) {
        // no-op or implement server reorder if supported
      }

      const ok = await UpdateUserProfile(userInfo, token, formData);
      if (!ok) throw new Error('Profile update failed');
      await refreshUserData();
      Alert.alert('Success', 'Your profile has been updated!');
      router.back();
    } catch (e: any) {
      console.error(e);
      Alert.alert('Error', e.message || 'Please try again.');
    } finally {
      setLoading(false);
      hideLoading();
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <View style={{ width: 24 }} />
        </View>

        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color="#F44D7B" />
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* --- Images --- */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Profile Images</Text>
              <View style={styles.sectionSubtitleWrapper}>
                <Text style={styles.sectionSubtitle}>
                  First image is your main profile picture. Drag to reorder.
                </Text>
              </View>

              <View style={styles.mainImageContainer}>
                {isLoadingImages ? (
                  <ActivityIndicator size="large" color="#F44D7B" />
                ) : profileImages.length > 0 ? (
                  <>
                    <Image
                      source={{ uri: profileImages[0].uri }}
                      style={styles.mainImage}
                    />
                    <View style={styles.profileBadge}>
                      <Ionicons name="star" size={18} color="#FFD700" />
                      <Text style={styles.profileBadgeText}>Profile</Text>
                    </View>
                  </>
                ) : (
                  <>
                    <Image
                      source={DEFAULT_AVATAR}
                      style={styles.mainImage}
                    />
                    <View style={styles.addOverlay}>
                      <Text style={styles.addOverlayText}>
                        Add a profile picture
                      </Text>
                    </View>
                  </>
                )}
              </View>

              <View style={styles.imageCountContainer}>
                <Text style={styles.imageCountText}>
                  {profileImages.length}/{MAX_PROFILE_IMAGES} images
                </Text>
                <TouchableOpacity
                  style={[
                    styles.addButton,
                    profileImages.length >= MAX_PROFILE_IMAGES &&
                      styles.addButtonDisabled,
                  ]}
                  onPress={handleAddImages}
                  disabled={profileImages.length >= MAX_PROFILE_IMAGES}
                >
                  <Text style={styles.addText}>Add Images</Text>
                </TouchableOpacity>
              </View>

              {profileImages.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.thumbnailsContainer}
                >
                  <DraggableFlatList
                    data={profileImages}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={item => item.filename}
                    onDragEnd={({ data }) => {
                      setProfileImages(data);
                      imagesWereUpdated.current = true;
                    }}
                    renderItem={(params: any) => {
                      const { item, drag, isActive } = params;
                      // Safe access to index using type assertion
                      const index = params.index;
                      
                      return (
                        <TouchableOpacity
                          onLongPress={drag}
                          disabled={isActive}
                          style={[
                            styles.thumb,
                            index === 0 && styles.thumbMain,
                            isActive && styles.thumbActive,
                          ]}
                        >
                          <TouchableOpacity
                            style={styles.deleteBadge}
                            onPress={() => handleDeleteImage(item.filename, index)}
                          >
                            <CloseIcon />
                          </TouchableOpacity>
                          <Image
                            source={{ uri: item.uri }}
                            style={styles.thumbImg}
                          />
                          {index === 0 ? (
                            <View style={styles.mainBadge}>
                              <Ionicons name="star" size={16} color="#FFD700" />
                            </View>
                          ) : (
                            <TouchableOpacity
                              style={styles.setMainBadge}
                              onPress={() => {
                                const arr = [...profileImages];
                                const [picked] = arr.splice(index, 1);
                                arr.unshift(picked);
                                setProfileImages(arr);
                                imagesWereUpdated.current = true;
                              }}
                            >
                              <Text style={styles.setMainText}>★</Text>
                            </TouchableOpacity>
                          )}
                        </TouchableOpacity>
                      );
                    }}
                  />
                </ScrollView>
              )}
            </View>

            {/* --- Personal Info --- */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Personal Info</Text>

              <View style={styles.inputContainer}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>Name</Text>
                  <Text style={styles.charCount}>
                    {charCount.firstName}/{CHAR_LIMITS.firstName}
                  </Text>
                </View>
                <TextInput
                  style={styles.input}
                  value={formData.firstName}
                  onChangeText={t => handleTextChange('firstName', t)}
                  placeholder="Your name"
                  placeholderTextColor="#FFF8"
                  maxLength={CHAR_LIMITS.firstName}
                />
              </View>

              <View style={styles.inputContainer}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>Bio</Text>
                  <Text style={styles.charCount}>
                    {charCount.bio}/{CHAR_LIMITS.bio}
                  </Text>
                </View>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.bio}
                  onChangeText={t => handleTextChange('bio', t)}
                  placeholder="Tell others about yourself..."
                  placeholderTextColor="#FFF8"
                  multiline
                  maxLength={CHAR_LIMITS.bio}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Occupation</Text>
                {/* Improved picker container with better visibility */}
                <View style={styles.pickerContainer}>
                  {Platform.OS === 'ios' ? (
                    // iOS-specific picker rendering
                    <Picker
                      selectedValue={formData.occupation}
                      onValueChange={v =>
                        setFormData(prev => ({ ...prev, occupation: v }))
                      }
                      style={styles.pickerIOS}
                      itemStyle={styles.pickerItemIOS}
                    >
                      <Picker.Item label="Select occupation" value="" />
                      {occupationOptions.map(o => (
                        <Picker.Item key={o} label={o} value={o} />
                      ))}
                    </Picker>
                  ) : (
                    // Android-specific picker rendering
                    <Picker
                      selectedValue={formData.occupation}
                      onValueChange={v =>
                        setFormData(prev => ({ ...prev, occupation: v }))
                      }
                      style={styles.pickerAndroid}
                      dropdownIconColor="#FFF"
                    >
                      <Picker.Item label="Select occupation" value="" />
                      {occupationOptions.map(o => (
                        <Picker.Item key={o} label={o} value={o} />
                      ))}
                    </Picker>
                  )}
                </View>
              </View>
            </View>

            {/* --- Location --- */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Location</Text>
              <View style={styles.row}>
                <View style={styles.half}>
                  <Text style={styles.label}>State</Text>
                  {/* Improved state picker for better visibility */}
                  <View style={styles.pickerContainer}>
                    {Platform.OS === 'ios' ? (
                      <Picker
                        selectedValue={formData.state}
                        onValueChange={v =>
                          setFormData(prev => ({ ...prev, state: v, city: '' }))
                        }
                        style={styles.pickerIOS}
                        itemStyle={styles.pickerItemIOS}
                      >
                        <Picker.Item label="Select state" value="" />
                        {stateOptions.map(s => (
                          <Picker.Item key={s} label={s} value={s} />
                        ))}
                      </Picker>
                    ) : (
                      <Picker
                        selectedValue={formData.state}
                        onValueChange={v =>
                          setFormData(prev => ({ ...prev, state: v, city: '' }))
                        }
                        style={styles.pickerAndroid}
                        dropdownIconColor="#FFF"
                      >
                        <Picker.Item label="Select state" value="" />
                        {stateOptions.map(s => (
                          <Picker.Item key={s} label={s} value={s} />
                        ))}
                      </Picker>
                    )}
                  </View>
                </View>
                <View style={styles.half}>
                  <Text style={styles.label}>City</Text>
                  {/* Improved city picker for better visibility */}
                  <View style={styles.pickerContainer}>
                    {Platform.OS === 'ios' ? (
                      <Picker
                        selectedValue={formData.city}
                        enabled={!!formData.state}
                        onValueChange={v =>
                          setFormData(prev => ({ ...prev, city: v }))
                        }
                        style={styles.pickerIOS}
                        itemStyle={styles.pickerItemIOS}
                      >
                        <Picker.Item label="Select city" value="" />
                        {cityOptions.map(c => (
                          <Picker.Item key={c} label={c} value={c} />
                        ))}
                      </Picker>
                    ) : (
                      <Picker
                        selectedValue={formData.city}
                        enabled={!!formData.state}
                        onValueChange={v =>
                          setFormData(prev => ({ ...prev, city: v }))
                        }
                        style={styles.pickerAndroid}
                        dropdownIconColor="#FFF"
                      >
                        <Picker.Item label="Select city" value="" />
                        {cityOptions.map(c => (
                          <Picker.Item key={c} label={c} value={c} />
                        ))}
                      </Picker>
                    )}
                  </View>
                </View>
              </View>
            </View>

            {/* --- Gender Preferences --- */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Gender Preferences</Text>
              <Text style={styles.label}>I am a:</Text>
              <View style={styles.radioGroup}>
                {['woman', 'man'].map(g => (
                  <TouchableOpacity
                    key={g}
                    style={styles.radioOption}
                    onPress={() =>
                      setFormData(prev => ({ ...prev, sex: g }))
                    }
                  >
                    <View
                      style={[
                        styles.radio,
                        formData.sex === g && styles.radioSelected,
                      ]}
                    >
                      {formData.sex === g && (
                        <View style={styles.radioInner} />
                      )}
                    </View>
                    <Text style={styles.radioText}>
                      {g.charAt(0).toUpperCase() + g.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Looking for:</Text>
              <View style={styles.radioGroup}>
                {['woman', 'man'].map(g => (
                  <TouchableOpacity
                    key={g}
                    style={styles.radioOption}
                    onPress={() =>
                      setFormData(prev => ({ ...prev, matchSex: g }))
                    }
                  >
                    <View
                      style={[
                        styles.radio,
                        formData.matchSex === g && styles.radioSelected,
                      ]}
                    >
                      {formData.matchSex === g && (
                        <View style={styles.radioInner} />
                      )}
                    </View>
                    <Text style={styles.radioText}>
                      {g.charAt(0).toUpperCase() + g.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* --- Save --- */}
            <TouchableOpacity
              style={styles.updateBtn}
              onPress={handleUpdateProfile}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <LinearGradient
                  colors={['#FF7B6F', '#F44D7B']}
                  style={styles.updateGradient}
                >
                  <Text style={styles.updateText}>Update Profile</Text>
                </LinearGradient>
              )}
            </TouchableOpacity>
          </ScrollView>
        )}
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#181818' },
  header: {
    height: 60,
    backgroundColor: '#1F2223',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  backButton: { padding: 8 },
  headerTitle: { color: '#FFF', fontSize: 20, fontWeight: '600' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },

  section: { marginBottom: 24 },
  sectionTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  sectionSubtitleWrapper: { marginBottom: 12 },
  sectionSubtitle: { color: '#FFF8', fontSize: 14 },

  mainImageContainer: {
    width: '100%',
    height: 280,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#343738',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  profileBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  profileBadgeText: {
    color: '#FFF',
    marginLeft: 4,
    fontWeight: '600',
    fontSize: 12,
  },
  addOverlay: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addOverlayText: { color: '#FFF', fontSize: 18, fontWeight: '600' },

  imageCountContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  imageCountText: { color: '#FFF8', fontSize: 14 },
  addButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F44D7B',
  },
  addButtonDisabled: { borderColor: '#777', opacity: 0.5 },
  addText: { color: '#F44D7B', fontWeight: '600' },

  thumbnailsContainer: { 
    paddingVertical: 8, 
    minWidth: '100%'  // Ensure it stretches full width
  },
  thumb: {
    width: 80,
    height: 80,
    marginRight: 12,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#343738',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbActive: {
    opacity: 0.7,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  thumbImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  thumbMain: {
    borderWidth: 2,
    borderColor: '#F44D7B',
    width: 90,
    height: 90,
  },
  deleteBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    zIndex: 2,
    width: 28,
    height: 28,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  setMainBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 10,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  setMainText: { color: '#FFD700', fontSize: 16, fontWeight: '600' },

  inputContainer: { marginBottom: 16 },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: { color: '#FFF8', fontSize: 14 },
  charCount: { color: '#FFF8', fontSize: 12 },
  input: {
    backgroundColor: '#343738',
    borderRadius: 8,
    height: 48,
    paddingHorizontal: 16,
    color: '#FFF',
    fontSize: 16,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
    paddingTop: 12,
    paddingBottom: 12,
  },

  // Improved picker styles with platform-specific adjustments
  pickerContainer: {
    backgroundColor: '#343738',
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 4,
    // Platform-specific height adjustments
    height: Platform.OS === 'ios' ? 48 : 52,
  },
  // iOS specific picker styles
  pickerIOS: {
    color: '#FFF',
    height: 150,
    width: '100%',
    marginTop: Platform.OS === 'ios' ? -50 : 0,
  },
  pickerItemIOS: {
    color: '#FFF',
    fontSize: 16,
    height: 100,
  },
  // Android specific picker styles
  pickerAndroid: {
    color: '#FFF',
    height: 52,
    width: '100%',
    // Ensure text is visible by adding padding
    paddingHorizontal: 12,
  },

  row: { flexDirection: 'row', justifyContent: 'space-between' },
  half: { width: '48%' },

  radioGroup: { flexDirection: 'row', marginBottom: 16 },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
    marginBottom: 8,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#777',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  radioSelected: { borderColor: '#F44D7B' },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#F44D7B',
  },
  radioText: { color: '#FFF', fontSize: 16 },

  updateBtn: { marginTop: 32, borderRadius: 8, overflow: 'hidden' },
  updateGradient: { padding: 16, alignItems: 'center' },
  updateText: { color: '#FFF', fontWeight: '600', fontSize: 18 },
});