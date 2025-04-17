import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { LinearGradient } from 'expo-linear-gradient';
import DatePicker from '@/components/DatePicker';
import { useAuth } from '@/components/AuthContext';
import { useLoading } from '@/components/LoadingContext';
import { LocationsData, OccupationsData } from '@/types/formTypes';
import { UpdateUserProfile } from '@/api/UpdateUserProfile';

// Import location and occupation data
import locationsData from '@/utils/Locations.json';
import occupationsData from '@/utils/Occupations.json';

interface PersonalInfoFormProps {
  onNext: () => void;
  matchSex: string;
}

const PersonalInfoForm: React.FC<PersonalInfoFormProps> = ({ onNext, matchSex }) => {
  // Form state
  const [birthDate, setBirthDate] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [occupation, setOccupation] = useState('');
  const [bio, setBio] = useState('');
  const [cities, setCities] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get auth context and loading state
  const { userInfo, getValidToken } = useAuth();
  const { showLoading, hideLoading } = useLoading();

  // Update cities when state changes
  useEffect(() => {
    if (state) {
      setCities((locationsData as LocationsData)[state] || []);
    } else {
      setCities([]);
      setCity('');
    }
  }, [state]);

  // Handle form submission
  const handleSubmit = async () => {
    if (isSubmitting) return;
    
    try {
      setIsSubmitting(true);
      showLoading('Updating profile...');
      
      const token = await getValidToken();
      if (!token || !userInfo) {
        throw new Error('No valid token or user info found');
      }

      const userData = {
        birthDate,
        state,
        city,
        occupation,
        bio,
        matchSex,
      };

      const success = await UpdateUserProfile(userInfo, token, userData);

      if (success) {
        // Move to the next step
        onNext();
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      // You can add further error handling here (e.g., display an alert)
    } finally {
      setIsSubmitting(false);
      hideLoading();
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Personal Info</Text>
      
      <DatePicker onDateChange={setBirthDate} />

      {/* State Picker */}
      <View style={styles.formControl}>
        <Picker
          selectedValue={state}
          onValueChange={(value) => setState(value)}
          style={styles.picker}
          mode="dropdown"
          itemStyle={styles.pickerItem}
        >
          <Picker.Item label="Your State" value="" />
          {Object.keys(locationsData).map((stateName) => (
            <Picker.Item key={stateName} label={stateName} value={stateName} />
          ))}
        </Picker>
      </View>

      {/* City Picker */}
      <View style={styles.formControl}>
        <Picker
          selectedValue={city}
          onValueChange={(value) => setCity(value)}
          style={styles.picker}
          enabled={!!state}
          mode="dropdown"
          itemStyle={styles.pickerItem}
        >
          <Picker.Item label="Your City" value="" />
          {cities.map((cityName) => (
            <Picker.Item key={cityName} label={cityName} value={cityName} />
          ))}
        </Picker>
      </View>

      {/* Occupation Picker */}
      <View style={styles.formControl}>
        <Picker
          selectedValue={occupation}
          onValueChange={(value) => setOccupation(value)}
          style={styles.picker}
          mode="dropdown"
          itemStyle={styles.pickerItem}
        >
          <Picker.Item label="Your Occupation" value="" />
          {(occupationsData as OccupationsData).occupations.map((occ: string) => (
            <Picker.Item key={occ} label={occ} value={occ} />
          ))}
        </Picker>
      </View>

      {/* Bio TextArea */}
      <View style={styles.formControl}>
        <TextInput
          placeholder="Your Bio"
          value={bio}
          onChangeText={setBio}
          multiline
          placeholderTextColor="rgba(255, 255, 255, 0.4)"
          style={styles.textArea}
        />
      </View>

      {/* Next Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.registerButton} 
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          <LinearGradient
            colors={['#FF7B6F', '#F44D7B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.registerGradient}
          >
            <Text style={styles.registerButtonText}>
              {isSubmitting ? 'Submitting...' : 'Next'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    // Optionally set a background color or additional styles here
  },
  header: {
    color: 'rgba(255,255,255,1)',
    fontSize: 28,
    fontWeight: '600',
    marginVertical: 8,
  },
  formControl: {
    marginBottom: 20, // Increased from 16 to provide more vertical spacing
  },
  picker: {
    backgroundColor: 'rgba(43, 46, 47, 1)',
    color: 'rgba(255, 255, 255, 0.9)', // Increased opacity for better readability
    fontSize: 16, // Slightly larger font
    height: 60, // Increased from 48 to make taller
    borderRadius: 8,
    paddingHorizontal: 10,
    marginVertical: 5, // Added to create some space between elements
  },
  pickerItem: {
    fontSize: 16,
    height: 120, // This will affect the dropdown item height on iOS
    color: 'white',
  },
  textArea: {
    backgroundColor: 'rgba(43, 46, 47, 1)',
    color: 'rgba(255, 255, 255, 0.9)', // Increased opacity for better readability
    fontSize: 16, // Slightly larger font
    fontWeight: '400',
    height: 120, // Increased from 100 for more space
    borderRadius: 8,
    padding: 12,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    paddingTop: 24, // Increased from 20 for more space
  },
  registerButton: {
    width: '100%',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  registerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    borderRadius: 8,
    height: 56, // Increased from 48 for a larger button
  },
  registerButtonText: {
    color: '#FFFFFF',
    fontSize: 18, // Slightly larger
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default PersonalInfoForm;