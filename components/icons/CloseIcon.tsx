import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface CloseIconProps {
  width?: number;
  height?: number;
  color?: string;
}

const CloseIcon = ({ 
  width = 32, 
  height = 32, 
  color = "#F63E54" 
}: CloseIconProps) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 32 32" fill="none">
      <Path 
        d="M24 8L8 24" 
        stroke={color} 
        strokeWidth="4" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      <Path 
        d="M8 8L24 24" 
        stroke={color} 
        strokeWidth="4" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
    </Svg>
  );
};

export default CloseIcon;