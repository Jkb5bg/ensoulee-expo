import React from 'react';
import { StyleSheet, TouchableOpacity, View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Svg, Circle, Path, G, Defs, ClipPath, Rect } from 'react-native-svg';

interface GenderSelectorProps {
  selectedGender: string;
  lookingFor: string;
  onGenderChange: (gender: string) => void;
  onLookingForChange: (gender: string) => void;
  onNext: () => void;
}

const GenderSelector: React.FC<GenderSelectorProps> = ({
  selectedGender,
  lookingFor,
  onGenderChange,
  onLookingForChange,
  onNext,
}) => {
  // Woman icon
  const WomanIcon = () => (
    <Svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <Circle cx="16" cy="16" r="16" fill="#373A3A" />
      <Path
        d="M19.1375 16.575C19.975 15.7375 20.4375 14.6219 20.4375 13.4375C20.4375 12.2516 19.9766 11.1375 19.1375 10.3C18.3 9.4625 17.1844 9 16 9C14.8156 9 13.7 9.46094 12.8625 10.3C12.025 11.1391 11.5625 12.2516 11.5625 13.4375C11.5625 14.4344 11.8891 15.3813 12.4906 16.1547C12.6047 16.3016 12.7281 16.4406 12.8609 16.575C12.9938 16.7078 13.1344 16.8313 13.2797 16.9453C13.8984 17.4266 14.6281 17.7328 15.4062 17.8359V19.5H13.625C13.5562 19.5 13.5 19.5562 13.5 19.625V20.5625C13.5 20.6313 13.5562 20.6875 13.625 20.6875H15.4062V22.875C15.4062 22.9438 15.4625 23 15.5312 23H16.4688C16.5375 23 16.5938 22.9438 16.5938 22.875V20.6875H18.375C18.4437 20.6875 18.5 20.6313 18.5 20.5625V19.625C18.5 19.5562 18.4437 19.5 18.375 19.5H16.5938V17.8359C17.5547 17.7078 18.4406 17.2719 19.1375 16.575ZM16 16.6875C15.1312 16.6875 14.3172 16.35 13.7016 15.7359C13.0875 15.1219 12.75 14.3063 12.75 13.4375C12.75 12.5687 13.0875 11.7547 13.7016 11.1391C14.3156 10.5234 15.1312 10.1875 16 10.1875C16.8688 10.1875 17.6828 10.525 18.2984 11.1391C18.9125 11.7531 19.25 12.5687 19.25 13.4375C19.25 14.3063 18.9125 15.1203 18.2984 15.7359C17.6828 16.35 16.8688 16.6875 16 16.6875Z"
        fill="white"
      />
    </Svg>
  );

  // Man icon
  const ManIcon = () => (
    <Svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <Circle cx="16" cy="16" r="16" fill="#373A3A" />
      <Path
        d="M21.6562 9.875H17.7188C17.6672 9.875 17.625 9.91719 17.625 9.96875V10.8438C17.625 10.8953 17.6672 10.9375 17.7188 10.9375H20.225L17.1109 14.0516C16.3297 13.45 15.3766 13.125 14.375 13.125C13.1734 13.125 12.0422 13.5938 11.1937 14.4437C10.3453 15.2937 9.875 16.4234 9.875 17.625C9.875 18.8266 10.3437 19.9578 11.1937 20.8062C12.0422 21.6562 13.1734 22.125 14.375 22.125C15.5766 22.125 16.7078 21.6562 17.5562 20.8062C18.4062 19.9578 18.875 18.8266 18.875 17.625C18.875 16.6234 18.55 15.6734 17.95 14.8922L21.0625 11.7797V14.2812C21.0625 14.3328 21.1047 14.375 21.1562 14.375H22.0312C22.0828 14.375 22.125 14.3328 22.125 14.2812V10.3438C22.125 10.0859 21.9141 9.875 21.6562 9.875ZM14.375 20.9375C12.5484 20.9375 11.0625 19.4516 11.0625 17.625C11.0625 15.7984 12.5484 14.3125 14.375 14.3125C16.2016 14.3125 17.6875 15.7984 17.6875 17.625C17.6875 19.4516 16.2016 20.9375 14.375 20.9375Z"
        fill="white"
      />
    </Svg>
  );

  // Other icon
  const OtherIcon = () => (
    <Svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <Circle cx="16" cy="16" r="16" fill="#373A3A" />
      <G clipPath="url(#clip0_491_1594)">
        <Path
          d="M16.3571 19.1047C16.9862 18.4666 17.3337 17.6166 17.3337 16.7143C17.3337 15.8107 16.9874 14.9619 16.3571 14.3238C15.728 13.6857 14.89 13.3333 14.0003 13.3333C13.1107 13.3333 12.2726 13.6845 11.6435 14.3238C11.0144 14.9631 10.667 15.8107 10.667 16.7143C10.667 17.4738 10.9123 18.1952 11.3642 18.7845C11.4499 18.8964 11.5426 19.0024 11.6423 19.1047C11.7421 19.2059 11.8477 19.3 11.9569 19.3869C12.4217 19.7536 12.9698 19.9869 13.5543 20.0655V21.3333H12.2163C12.1646 21.3333 12.1224 21.3762 12.1224 21.4286V22.1428C12.1224 22.1952 12.1646 22.2381 12.2163 22.2381H13.5543V23.9047C13.5543 23.9571 13.5966 24 13.6482 24H14.3524C14.4041 24 14.4463 23.9571 14.4463 23.9047V22.2381H15.7844C15.836 22.2381 15.8783 22.1952 15.8783 22.1428V21.4286C15.8783 21.3762 15.836 21.3333 15.7844 21.3333H14.4463V20.0655C15.1682 19.9678 15.8337 19.6357 16.3571 19.1047ZM14.0003 19.1905C13.3477 19.1905 12.7362 18.9333 12.2738 18.4655C11.8125 17.9976 11.559 17.3762 11.559 16.7143C11.559 16.0524 11.8125 15.4321 12.2738 14.9631C12.7351 14.494 13.3477 14.2381 14.0003 14.2381C14.6529 14.2381 15.2644 14.4952 15.7269 14.9631C16.1881 15.4309 16.4416 16.0524 16.4416 16.7143C16.4416 17.3762 16.1881 17.9964 15.7269 18.4655C15.2644 18.9333 14.6529 19.1905 14.0003 19.1905Z"
          fill="white"
        />
      </G>
      <Defs>
        <ClipPath id="clip0_491_1594">
          <Rect width="16" height="16" fill="white" transform="translate(8 8)" />
        </ClipPath>
      </Defs>
    </Svg>
  );

  return (
    <View style={styles.container}>
      {/* Title */}
      <Text style={styles.title}>About you</Text>

      {/* "I am a" Section */}
      <Text style={styles.sectionTitle}>I am a</Text>
      <View style={styles.optionsContainer}>
        <TouchableOpacity onPress={() => onGenderChange('woman')}>
          <View
            style={[
              styles.optionBox,
              { borderColor: selectedGender === 'woman' ? 'rgba(244, 77, 123, 1)' : 'transparent' },
            ]}
          >
            <WomanIcon />
            <Text style={styles.optionText}>Woman</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => onGenderChange('man')}>
          <View
            style={[
              styles.optionBox,
              { borderColor: selectedGender === 'man' ? 'rgba(244, 77, 123, 1)' : 'transparent' },
            ]}
          >
            <ManIcon />
            <Text style={styles.optionText}>Man</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => onGenderChange('other')}>
          <View
            style={[
              styles.optionBox,
              { borderColor: selectedGender === 'other' ? 'rgba(244, 77, 123, 1)' : 'transparent' },
            ]}
          >
            <OtherIcon />
            <Text style={styles.optionText}>Other</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* "Looking for" Section */}
      <Text style={styles.sectionTitle}>Looking for</Text>
      <View style={styles.optionsContainer}>
        <TouchableOpacity onPress={() => onLookingForChange('woman')}>
          <View
            style={[
              styles.optionBox,
              { borderColor: lookingFor === 'woman' ? 'rgba(244, 77, 123, 1)' : 'transparent' },
            ]}
          >
            <WomanIcon />
            <Text style={styles.optionText}>Woman</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => onLookingForChange('man')}>
          <View
            style={[
              styles.optionBox,
              { borderColor: lookingFor === 'man' ? 'rgba(244, 77, 123, 1)' : 'transparent' },
            ]}
          >
            <ManIcon />
            <Text style={styles.optionText}>Man</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => onLookingForChange('other')}>
          <View
            style={[
              styles.optionBox,
              { borderColor: lookingFor === 'other' ? 'rgba(244, 77, 123, 1)' : 'transparent' },
            ]}
          >
            <OtherIcon />
            <Text style={styles.optionText}>Other</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Next Button */}
      <View style={styles.nextButtonContainer}>
        <TouchableOpacity style={styles.button} onPress={onNext}>
          <LinearGradient
            colors={['#FF7B6F', '#F44D7B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradient}
          >
            <Text style={styles.buttonText}>Next</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 32,
    paddingHorizontal: 16,
  },
  title: {
    color: 'rgba(255, 255, 255, 1)',
    fontSize: 28,
    fontWeight: '600',
    marginVertical: 32,
    textAlign: 'center',
  },
  sectionTitle: {
    color: 'rgba(255, 255, 255, 1)',
    fontSize: 22,
    fontWeight: '400',
    marginVertical: 16,
  },
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  optionBox: {
    width: 104,
    height: 104,
    backgroundColor: 'rgba(39, 39, 39, 1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 2,
  },
  optionText: {
    marginTop: 4,
    color: 'rgba(255, 255, 255, 1)',
    fontWeight: '500',
    fontSize: 14,
  },
  nextButtonContainer: {
    paddingTop: 20,
  },
  button: {
    width: '100%',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    borderRadius: 8,
    height: 48,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default GenderSelector;
