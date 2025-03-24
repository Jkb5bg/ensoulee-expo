// AppHeader.tsx
import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import SettingsIcon from './icons/SettingsIcon';
import NotificationsIcon from './icons/NotificationsIcon';

interface AppHeaderProps {
  title: string;
  userProfileImage?: string;
  showSettingsIcon?: boolean;
  showNotificationsIcon?: boolean;
  onSettingsPress?: () => void;
  onNotificationsPress?: () => void;
}

const DEFAULT_AVATAR = require('../assets/images/default-avatar.png'); // Update path as needed

export default function AppHeader({
  title,
  userProfileImage,
  showSettingsIcon = true,
  showNotificationsIcon = true,
  onSettingsPress,
  onNotificationsPress
}: AppHeaderProps) {
  const navigation = useNavigation();

  const handleSettingsPress = () => {
    if (onSettingsPress) {
      onSettingsPress();
    } else {
      // Default navigation if no custom handler provided
      navigation.navigate('settings' as never);
    }
  };

  return (
    <View style={styles.header}>
      {/* Left side - Profile image */}
      <View>
        <Image
          source={userProfileImage ? { uri: userProfileImage } : DEFAULT_AVATAR}
          style={styles.profileIcon}
          resizeMode="cover"
        />
      </View>

      {/* Center - Title */}
      <View>
        <Text style={styles.headerTitle}>{title}</Text>
      </View>

      {/* Right side - Icons */}
      <View style={styles.iconsContainer}>
        {showSettingsIcon && (
          <TouchableOpacity onPress={handleSettingsPress} style={styles.headerIconButton}>
            <SettingsIcon width={24} height={24} color="#F44D7B" />
          </TouchableOpacity>
        )}
        
        {showNotificationsIcon && (
          <TouchableOpacity 
            onPress={onNotificationsPress} 
            style={styles.headerIconButton}
          >
            <NotificationsIcon width={24} height={24} color="#F44D7B" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 70,
    backgroundColor: 'rgba(31, 34, 35, 1)',
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600', // Approximation of SF-600
  },
  profileIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  iconsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconButton: {
    marginLeft: 15,
  }
});