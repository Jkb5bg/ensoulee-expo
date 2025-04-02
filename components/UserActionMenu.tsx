// components/UserActionMenu.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  TextInput,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface UserActionMenuProps {
  matchId: string;
  targetUserId: string;
  userName: string;
  onBlock: (data: { reason: string; details?: string }) => void;
  onReport: (data: { reason: string; details?: string }) => void;
  onUnmatch: () => void;
}

type ActionType = 'report' | 'block' | 'unmatch' | null;

export default function UserActionMenu({
  matchId,
  targetUserId,
  userName,
  onBlock,
  onReport,
  onUnmatch
}: UserActionMenuProps) {
  const [menuVisible, setMenuVisible] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [actionType, setActionType] = useState<ActionType>(null);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');

  const openMenu = () => {
    setMenuVisible(true);
  };

  const closeMenu = () => {
    setMenuVisible(false);
  };

  const handleAction = (action: ActionType) => {
    closeMenu();
    
    if (action === 'unmatch') {
      Alert.alert(
        'Unmatch',
        `Are you sure you want to unmatch with ${userName}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Unmatch', 
            style: 'destructive',
            onPress: onUnmatch 
          }
        ]
      );
      return;
    }
    
    setActionType(action);
    setModalVisible(true);
  };

  const handleSubmit = () => {
    if (!reason) {
      Alert.alert('Error', 'Please select a reason');
      return;
    }

    setModalVisible(false);
    
    if (actionType === 'report') {
      onReport({ reason, details });
    } else if (actionType === 'block') {
      onBlock({ reason, details });
    }
    
    // Reset form
    setReason('');
    setDetails('');
    setActionType(null);
  };

  const renderReasonOptions = () => {
    const options = actionType === 'report' 
      ? ['Inappropriate behavior', 'Fake profile', 'Offensive content', 'Harassment', 'Other']
      : ['Not interested', 'Inappropriate behavior', 'Personal reasons', 'Other'];

    return options.map((option) => (
      <TouchableOpacity
        key={option}
        style={[
          styles.reasonOption,
          reason === option && styles.selectedReason
        ]}
        onPress={() => setReason(option)}
      >
        <Text style={[
          styles.reasonText,
          reason === option && styles.selectedReasonText
        ]}>
          {option}
        </Text>
      </TouchableOpacity>
    ));
  };

  return (
    <View>
      <TouchableOpacity onPress={openMenu} style={styles.menuButton}>
        <Ionicons name="ellipsis-vertical" size={24} color="white" />
      </TouchableOpacity>

      <Modal
        visible={menuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeMenu}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={closeMenu}
        >
          <View style={styles.menuContainer}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleAction('report')}
            >
              <Ionicons name="flag-outline" size={20} color="white" />
              <Text style={styles.menuItemText}>Report</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleAction('block')}
            >
              <Ionicons name="ban-outline" size={20} color="white" />
              <Text style={styles.menuItemText}>Block</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleAction('unmatch')}
            >
              <Ionicons name="close-circle-outline" size={20} color="white" />
              <Text style={styles.menuItemText}>Unmatch</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.formContainer}>
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>
                {actionType === 'report' ? 'Report' : 'Block'} {userName}
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>

            <Text style={styles.formLabel}>Reason:</Text>
            <View style={styles.reasonsContainer}>
              {renderReasonOptions()}
            </View>

            <Text style={styles.formLabel}>Additional details (optional):</Text>
            <TextInput
              style={styles.textInput}
              multiline
              numberOfLines={4}
              value={details}
              onChangeText={setDetails}
              placeholder="Tell us more..."
              placeholderTextColor="#999"
            />

            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmit}
            >
              <Text style={styles.submitButtonText}>
                {actionType === 'report' ? 'Report' : 'Block'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  menuButton: {
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    position: 'absolute',
    top: 80,
    right: 20,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a3a',
  },
  menuItemText: {
    color: 'white',
    marginLeft: 12,
    fontSize: 16,
  },
  formContainer: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: '#1e1e1e',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  formTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  formLabel: {
    color: 'white',
    fontSize: 16,
    marginBottom: 10,
    fontWeight: '500',
  },
  reasonsContainer: {
    marginBottom: 20,
  },
  reasonOption: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#2a2a2a',
  },
  selectedReason: {
    backgroundColor: '#f44d7b',
  },
  reasonText: {
    color: 'white',
    fontSize: 16,
  },
  selectedReasonText: {
    fontWeight: 'bold',
  },
  textInput: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    color: 'white',
    fontSize: 16,
    height: 100,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  submitButton: {
    backgroundColor: '#f44d7b',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});