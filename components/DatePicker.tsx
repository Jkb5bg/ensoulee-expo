import React, { useState } from 'react';
import { TouchableOpacity, Platform, TextInput, View, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Svg, Path } from 'react-native-svg';

interface DatePickerProps {
  onDateChange: (date: string) => void;
  placeholder?: string;
  initialDate?: string;
}

const DatePicker: React.FC<DatePickerProps> = ({ 
  onDateChange, 
  placeholder = "YYYY-MM-DD",
  initialDate = '' 
}) => {
  const [date, setDate] = useState(initialDate);
  const [show, setShow] = useState(false);

  const onChange = (event: any, selectedDate: any) => {
    const currentDate = selectedDate || new Date();
    // For iOS, keep the picker open
    setShow(Platform.OS === 'ios');
    
    const formattedDate = currentDate.toISOString().split('T')[0];
    setDate(formattedDate);
    onDateChange(formattedDate);
  };

  const showDatepicker = () => {
    setShow(true);
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputWrapper}>
        <TextInput
          placeholder={placeholder}
          style={styles.input}
          value={date}
          onChangeText={(text) => {
            setDate(text);
            onDateChange(text);
          }}
          keyboardType="numeric"
          placeholderTextColor="rgba(255, 255, 255, 0.4)"
        />
        <View style={styles.iconContainer}>
          <TouchableOpacity onPress={showDatepicker}>
            <CalendarIcon />
          </TouchableOpacity>
        </View>
      </View>

      {show && (
        <DateTimePicker
          testID="dateTimePicker"
          value={date ? new Date(date) : new Date()}
          mode="date"
          display="default"
          onChange={onChange}
        />
      )}
    </View>
  );
};

const CalendarIcon = () => (
  <Svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <Path 
      d="M15.8333 3.33331H4.16667C3.24619 3.33331 2.5 4.07951 2.5 4.99998V16.6666C2.5 17.5871 3.24619 18.3333 4.16667 18.3333H15.8333C16.7538 18.3333 17.5 17.5871 17.5 16.6666V4.99998C17.5 4.07951 16.7538 3.33331 15.8333 3.33331Z" 
      stroke="#F44D7B" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
    <Path 
      d="M13.333 1.66669V5.00002" 
      stroke="#F44D7B" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
    <Path 
      d="M6.66699 1.66669V5.00002" 
      stroke="#F44D7B" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
    <Path 
      d="M2.5 8.33331H17.5" 
      stroke="#F44D7B" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
  </Svg>
);

const styles = StyleSheet.create({
  container: {
    marginVertical: 20, // Approximates my="5" in Native Base
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(43, 46, 47, 1)',
    height: 48,
    borderRadius: 8,
    position: 'relative',
    paddingHorizontal: 15, // Similar to pl="15px"
  },
  input: {
    flex: 1,
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 15,
    fontWeight: '400',
  },
  iconContainer: {
    position: 'absolute',
    right: 15,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default DatePicker;
