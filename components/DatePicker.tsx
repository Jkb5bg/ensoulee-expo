import React, { useState, useEffect } from 'react';
import { TouchableOpacity, Platform, TextInput, View, StyleSheet, Modal, Text, ScrollView, SafeAreaView } from 'react-native';
import { Svg, Path } from 'react-native-svg';

interface DatePickerProps {
  onDateChange: (date: string) => void;
  placeholder?: string;
  initialDate?: string;
  accentColor?: string;
}

const DatePicker: React.FC<DatePickerProps> = ({ 
  onDateChange, 
  placeholder = "YYYY-MM-DD",
  initialDate = '',
  accentColor = '#F44D7B'
}) => {
  const [date, setDate] = useState(initialDate);
  const [showModal, setShowModal] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());
  
  // Initialize tempDate with the initialDate if provided
  useEffect(() => {
    if (initialDate) {
      const parsedDate = new Date(initialDate);
      if (!isNaN(parsedDate.getTime())) {
        setTempDate(parsedDate);
      }
    }
  }, [initialDate]);

  // Format date as YYYY-MM-DD
  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Parse text input date
  const handleTextChange = (text: string) => {
    setDate(text);
    onDateChange(text);
  };

  // Handle year selection
  const handleYearSelect = (year: number) => {
    const newDate = new Date(tempDate);
    newDate.setFullYear(year);
    setTempDate(newDate);
  };

  // Handle month selection
  const handleMonthSelect = (monthIndex: number) => {
    const newDate = new Date(tempDate);
    newDate.setMonth(monthIndex);
    
    // Adjust the day if the new month doesn't have that many days
    const daysInNewMonth = new Date(newDate.getFullYear(), monthIndex + 1, 0).getDate();
    if (newDate.getDate() > daysInNewMonth) {
      newDate.setDate(daysInNewMonth);
    }
    
    setTempDate(newDate);
  };

  // Handle day selection
  const handleDaySelect = (day: number) => {
    const newDate = new Date(tempDate);
    newDate.setDate(day);
    setTempDate(newDate);
  };

  // Generate days based on selected month and year
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const renderCustomDatePicker = () => {
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 100 }, (_, i) => currentYear - i);
    
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    const daysInMonth = getDaysInMonth(tempDate.getFullYear(), tempDate.getMonth());
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    return (
      <Modal
        animationType="fade"
        transparent={true}
        visible={showModal}
        onRequestClose={() => setShowModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Date</Text>
            
            <View style={styles.pickerContainer}>
              {/* Year picker */}
              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>Year</Text>
                <ScrollView style={styles.pickerScrollView} showsVerticalScrollIndicator={false}>
                  {years.map(year => (
                    <TouchableOpacity
                      key={`year-${year}`}
                      style={styles.pickerItem}
                      onPress={() => handleYearSelect(year)}
                    >
                      <Text style={[
                        styles.pickerItemText,
                        tempDate.getFullYear() === year && [styles.pickerItemSelected, { color: accentColor }]
                      ]}>
                        {year}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  <View style={styles.pickerPadding} />
                </ScrollView>
              </View>
              
              {/* Month picker */}
              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>Month</Text>
                <ScrollView style={styles.pickerScrollView} showsVerticalScrollIndicator={false}>
                  {monthNames.map((month, index) => (
                    <TouchableOpacity
                      key={`month-${month}`}
                      style={styles.pickerItem}
                      onPress={() => handleMonthSelect(index)}
                    >
                      <Text style={[
                        styles.pickerItemText,
                        tempDate.getMonth() === index && [styles.pickerItemSelected, { color: accentColor }]
                      ]}>
                        {month}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  <View style={styles.pickerPadding} />
                </ScrollView>
              </View>
              
              {/* Day picker */}
              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>Day</Text>
                <ScrollView style={styles.pickerScrollView} showsVerticalScrollIndicator={false}>
                  {days.map(day => (
                    <TouchableOpacity
                      key={`day-${day}`}
                      style={styles.pickerItem}
                      onPress={() => handleDaySelect(day)}
                    >
                      <Text style={[
                        styles.pickerItemText,
                        tempDate.getDate() === day && [styles.pickerItemSelected, { color: accentColor }]
                      ]}>
                        {day}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  <View style={styles.pickerPadding} />
                </ScrollView>
              </View>
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => setShowModal(false)}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmButton, { backgroundColor: accentColor }]} 
                onPress={() => {
                  const formattedDate = formatDate(tempDate);
                  setDate(formattedDate);
                  onDateChange(formattedDate);
                  setShowModal(false);
                }}
              >
                <Text style={styles.buttonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputWrapper}>
        <TextInput
          placeholder={placeholder}
          style={styles.input}
          value={date}
          onChangeText={handleTextChange}
          keyboardType="numeric"
          placeholderTextColor="rgba(255, 255, 255, 0.4)"
        />
        <TouchableOpacity 
          style={styles.iconContainer}
          onPress={() => {
            if (date) {
              const parsedDate = new Date(date);
              if (!isNaN(parsedDate.getTime())) {
                setTempDate(parsedDate);
              } else {
                setTempDate(new Date());
              }
            } else {
              setTempDate(new Date());
            }
            setShowModal(true);
          }}
        >
          <CalendarIcon color={accentColor} />
        </TouchableOpacity>
      </View>

      {renderCustomDatePicker()}
    </View>
  );
};

const CalendarIcon = ({ color = '#F44D7B' }) => (
  <Svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <Path 
      d="M15.8333 3.33331H4.16667C3.24619 3.33331 2.5 4.07951 2.5 4.99998V16.6666C2.5 17.5871 3.24619 18.3333 4.16667 18.3333H15.8333C16.7538 18.3333 17.5 17.5871 17.5 16.6666V4.99998C17.5 4.07951 16.7538 3.33331 15.8333 3.33331Z" 
      stroke={color}
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
    <Path 
      d="M13.333 1.66669V5.00002" 
      stroke={color}
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
    <Path 
      d="M6.66699 1.66669V5.00002" 
      stroke={color}
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
    <Path 
      d="M2.5 8.33331H17.5" 
      stroke={color}
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
  </Svg>
);

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    width: '100%',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(43, 46, 47, 1)',
    height: 48,
    borderRadius: 8,
    position: 'relative',
    paddingHorizontal: 15,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '400',
    height: '100%',
    paddingRight: 40, // Space for the icon
  },
  iconContainer: {
    position: 'absolute',
    right: 15,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#2B2E2F',
    borderRadius: 12,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  pickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  pickerColumn: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  pickerLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 10,
    fontWeight: '500',
  },
  pickerScrollView: {
    height: 200,
    width: '100%',
  },
  pickerItem: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  pickerItemText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
  },
  pickerItemSelected: {
    fontWeight: '600',
  },
  pickerPadding: {
    height: 100, // Add padding at the bottom for better scrolling
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  confirmButton: {
    backgroundColor: '#F44D7B',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default DatePicker;