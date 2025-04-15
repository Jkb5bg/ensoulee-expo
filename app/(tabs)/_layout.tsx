// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { 
  Text, 
  Image, 
  View, 
  TouchableOpacity, 
  StyleSheet, 
  Platform, 
  SafeAreaView,
  Dimensions 
} from 'react-native';
import React, { useEffect, useState } from 'react';
import SearchIcon from '@/components/icons/SearchIcon';
import MessageIcon from '@/components/icons/MessageIcon';
import UsersIcon from '@/components/icons/UsersIcon';
import SettingsIcon from '@/components/icons/SettingsIcon';
import NotificationsIcon from '@/components/icons/NotificationsIcon';
import { useAppContext } from '@/components/TabsContext';
import { AppProvider } from '@/components/TabsContext';
import { router } from 'expo-router';

const DEFAULT_AVATAR = require('@/assets/images/default-avatar.png');

export default function TabsLayout() {
    const { customHeader, activeChat } = useAppContext();
    
    // Get screen dimensions
    const [dimensions, setDimensions] = useState({
      window: Dimensions.get('window'),
      screen: Dimensions.get('screen')
    });

    // Update dimensions when orientation changes
    useEffect(() => {
      const subscription = Dimensions.addEventListener(
        'change',
        ({window, screen}) => {
          setDimensions({window, screen});
        },
      );
      return () => subscription.remove();
    }, []);

    // Calculate responsive values based on screen size
    const { height, width } = dimensions.window;
    const isSmallDevice = height < 700; // For iPhone SE and similar small devices
    const isLargeDevice = height > 800; // For larger devices

    // Calculate dynamic values
    const headerHeight = Platform.OS === 'ios' 
      ? (isSmallDevice ? 120 : (isLargeDevice ? 160 : 140))
      : (isSmallDevice ? 100 : 120);
    
    const headerPaddingTop = Platform.OS === 'ios'
      ? (isSmallDevice ? 30 : (isLargeDevice ? 50 : 40))
      : (isSmallDevice ? 20 : 30);
    
    const contentMarginTop = isSmallDevice ? 15 : (isLargeDevice ? 30 : 20);
    
    const iconSize = isSmallDevice ? 24 : 26;
    const profileIconSize = isSmallDevice ? 36 : 40;
    const titleFontSize = isSmallDevice ? 22 : 24;

  return (
    <Tabs
      screenOptions={({ route }) => ({
        // Tab bar icon configuration
        tabBarIcon: ({ focused }) => {
          const color = focused ? 'rgba(244, 77, 123, 1)' : 'gray';
          
          if (route.name === 'index') {
            return <SearchIcon width={24} height={24} color={color} />;
          } else if (route.name === 'matches') {
            return <UsersIcon width={24} height={24} color={color} />;
          } else if (route.name === 'messages') {
            return <MessageIcon width={24} height={24} color={color} />;
          }
          
          return null;
        },
        // Tab bar styling
        tabBarActiveTintColor: 'rgba(244, 77, 123, 1)',
        tabBarInactiveTintColor: 'gray',
        tabBarLabel: ({ focused, children }) => {
          let label;
          if (route.name === 'index') label = 'Discover';
          else if (route.name === 'matches') label = 'Matches';
          else if (route.name === 'messages') label = 'Messages';
          else label = children;
          
          return (
            <Text style={{ 
              color: focused ? 'rgba(244, 77, 123, 1)' : 'gray', 
              fontSize: 12 
            }}>
              {label}
            </Text>
          );
        },
        tabBarStyle: {
          backgroundColor: 'rgba(31, 34, 35, 1)', 
          paddingBottom: 10,
          paddingTop: 10,
          height: 70,
          borderTopWidth: 0,
          elevation: 10,
        },
        tabBarItemStyle: {
          paddingVertical: 5,
        },
        
        // FIXED: Always hide the header for messages tab
        // This ensures consistent navigation without jumps
        headerShown: route.name !== 'messages',
        header: ({ navigation, route, options }) => {
          let title;
          if (route.name === 'index') title = 'Discover';
          else if (route.name === 'matches') title = 'Matches';
          else if (route.name === 'messages') title = 'Messages';
          
          return (
            <SafeAreaView style={[styles.safeArea]}>
              <View style={[
                styles.headerContainer, 
                { 
                  height: headerHeight,
                  paddingTop: headerPaddingTop
                }
              ]}>
                <View style={[
                  styles.headerContent,
                  { marginTop: contentMarginTop }
                ]}>
                  <View style={styles.headerLeft}>
                    <Image
                      source={DEFAULT_AVATAR}
                      style={[
                        styles.profileIcon,
                        {
                          width: profileIconSize,
                          height: profileIconSize,
                          borderRadius: profileIconSize / 2
                        }
                      ]}
                      resizeMode="cover"
                    />
                  </View>
                  
                  <View style={[
                    styles.headerCenter,
                    { paddingLeft: width * 0.05 } // Dynamic padding based on screen width
                  ]}>
                    <Text style={[
                      styles.headerTitle,
                      { fontSize: titleFontSize }
                    ]}>
                      {title}
                    </Text>
                  </View>
                  
                  <View style={styles.headerRight}>
                    <TouchableOpacity 
                      style={styles.headerIconButton} 
                      onPress={() => { 
                        router.push('/(onboarding)/profile-setup'); 
                        console.log('Settings pressed'); 
                      }}>
                      <SettingsIcon 
                        width={iconSize} 
                        height={iconSize} 
                        color="#F44D7B" 
                      />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.headerIconButton}>
                      <NotificationsIcon 
                        width={iconSize} 
                        height={iconSize} 
                        color="#F44D7B" 
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </SafeAreaView>
          );
        }
      })}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="matches" />
      <Tabs.Screen name="messages" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: 'rgba(31, 34, 35, 1)',
  },
  headerContainer: {
    backgroundColor: 'rgba(31, 34, 35, 1)',
    // Dynamic height and paddingTop set in inline styles
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    // Dynamic marginTop set in inline styles
    height: 70,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontWeight: '600',
    // Dynamic fontSize set in inline styles
  },
  headerLeft: {
    width: '20%',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    // Dynamic paddingLeft set in inline styles
  },
  profileIcon: {
    // Dynamic width, height, and borderRadius set in inline styles
  },
  headerRight: {
    flexDirection: 'row',
    width: '20%',
    justifyContent: 'flex-end',
  },
  headerIconButton: {
    marginLeft: 20,
  },
});