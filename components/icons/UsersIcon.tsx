// UsersIcon.tsx
import React from 'react';
import Svg, { Path, G, Defs, ClipPath, Rect, SvgProps } from 'react-native-svg';

interface UsersIconProps extends SvgProps {
  width?: number;
  height?: number;
  color?: string;
}

export default function UsersIcon({ 
  width = 20, 
  height = 20, 
  color = "gray", 
  ...props 
}: UsersIconProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 20 20" fill="none" {...props}>
      <G clipPath="url(#clip0_1013_173)">
        <Path 
          d="M14.1663 17.5V15.8333C14.1663 14.9493 13.8152 14.1014 13.19 13.4763C12.5649 12.8512 11.7171 12.5 10.833 12.5H4.16634C3.28229 12.5 2.43444 12.8512 1.80932 13.4763C1.1842 14.1014 0.833008 14.9493 0.833008 15.8333V17.5" 
          stroke={color} 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
        <Path 
          d="M7.50033 9.16667C9.34127 9.16667 10.8337 7.67428 10.8337 5.83333C10.8337 3.99238 9.34127 2.5 7.50033 2.5C5.65938 2.5 4.16699 3.99238 4.16699 5.83333C4.16699 7.67428 5.65938 9.16667 7.50033 9.16667Z" 
          stroke={color} 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
        <Path 
          d="M19.167 17.5001V15.8334C19.1664 15.0948 18.9206 14.3774 18.4681 13.7937C18.0156 13.2099 17.3821 12.793 16.667 12.6084" 
          stroke={color} 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
        <Path 
          d="M13.333 2.6084C14.05 2.79198 14.6855 3.20898 15.1394 3.79366C15.5932 4.37833 15.8395 5.09742 15.8395 5.83757C15.8395 6.57771 15.5932 7.2968 15.1394 7.88147C14.6855 8.46615 14.05 8.88315 13.333 9.06673" 
          stroke={color} 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
      </G>
      <Defs>
        <ClipPath id="clip0_1013_173">
          <Rect width="20" height="20" fill="white"/>
        </ClipPath>
      </Defs>
    </Svg>
  );
}