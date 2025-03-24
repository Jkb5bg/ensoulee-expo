// SearchIcon.tsx
import React from 'react';
import Svg, { Path, SvgProps } from 'react-native-svg';

interface SearchIconProps extends SvgProps {
  width?: number;
  height?: number;
  color?: string;
}

export default function SearchIcon({ 
  width = 20, 
  height = 20, 
  color = "#F44D7B", 
  ...props 
}: SearchIconProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 20 20" fill="none" {...props}>
      <Path 
        d="M9.16667 15.8333C12.8486 15.8333 15.8333 12.8486 15.8333 9.16667C15.8333 5.48477 12.8486 2.5 9.16667 2.5C5.48477 2.5 2.5 5.48477 2.5 9.16667C2.5 12.8486 5.48477 15.8333 9.16667 15.8333Z" 
        stroke={color} 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      <Path 
        d="M17.5 17.5L13.875 13.875" 
        stroke={color} 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
    </Svg>
  );
}