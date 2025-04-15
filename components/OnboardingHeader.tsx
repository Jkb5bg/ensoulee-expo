// components/OnboardingHeader.tsx
import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

interface OnboardingHeaderProps {
  title?: string;
}

export default function OnboardingHeader({ title = "Ensoulee" }: OnboardingHeaderProps) {
  return (
    <View style={styles.header}>
      {/* Left side - Logo */}
      <View style={styles.logoContainer}>
        <Image
          source={require('@/assets/images/logo.png')} // Make sure to update this path to your actual logo
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      {/* Center - Title */}
      <View style={styles.titleContainer}>
        <Text style={styles.headerTitle}>{title}</Text>
      </View>

      {/* Right side - Empty space for balance */}
      <View style={styles.placeholder} />
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
    marginBottom: 15, // Add spacing below header
  },
  logoContainer: {
    width: 40,
  },
  logo: {
    height: 30,
    width: 30,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },
  placeholder: {
    width: 40, // Matches the logo container width for balance
  }
});