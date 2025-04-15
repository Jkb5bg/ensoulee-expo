import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Circle, Path, G, Defs, ClipPath, Rect } from 'react-native-svg';

const SuccessIcon = () => {
  return (
    <Svg width="142" height="142" viewBox="0 0 142 142" fill="none">
      <Circle cx="71" cy="71" r="71" fill="#373A3A" />
      <Circle cx="71" cy="71" r="60" stroke="#F44D7B" strokeWidth="3" />
      <Path
        d="M51 71L65.5 85.5L93.5 57.5"
        stroke="#F44D7B"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

export default SuccessIcon;