import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Rect, Path, G, Defs, ClipPath, Rect as SvgRect } from 'react-native-svg';

const ProfileImagePlaceholder: React.FC = () => {
  return (
    <View style={styles.container}>
      <Svg width="120" height="120" viewBox="0 0 120 120" fill="none">
        <Rect 
          x="0.5" 
          y="0.5" 
          width="119" 
          height="119" 
          rx="59.5" 
          stroke="#F44D7B" 
        />
        <Path 
          d="M66 66L60 60L54 66" 
          stroke="#F44D7B" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />
        <Path 
          d="M60 60V73.5" 
          stroke="#F44D7B" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />
        <Path 
          d="M72.5852 69.585C74.0482 68.7874 75.2039 67.5253 75.87 65.9979C76.5361 64.4705 76.6745 62.7648 76.2635 61.15C75.8525 59.5352 74.9154 58.1032 73.6002 57.0801C72.285 56.057 70.6665 55.5011 69.0002 55.5H67.1102C66.6562 53.7438 65.8099 52.1135 64.6351 50.7315C63.4603 49.3495 61.9875 48.2518 60.3273 47.5209C58.6672 46.79 56.863 46.445 55.0504 46.5118C53.2377 46.5786 51.4638 47.0554 49.862 47.9065C48.2601 48.7575 46.8721 49.9606 45.8021 51.4253C44.7322 52.8901 44.0082 54.5783 43.6847 56.3631C43.3611 58.1479 43.4463 59.9828 43.934 61.7299C44.4217 63.477 45.299 65.0908 46.5002 66.45" 
          stroke="#F44D7B" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />
        <Path 
          d="M66 66L60 60L54 66" 
          stroke="#F44D7B" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ProfileImagePlaceholder;
