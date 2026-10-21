/**
 * AstroVerse Mobile OS - Birth Profile Entry & Editor Modal
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert
} from 'react-native';
import { Colors } from '../theme/colors';
import { BirthProfile } from '../types';
import { useChart } from '../context/ChartContext';

interface BirthProfileModalProps {
  visible: boolean;
  onClose: () => void;
}

export const BirthProfileModal: React.FC<BirthProfileModalProps> = ({ visible, onClose }) => {
  const { activeProfile, setActiveProfile } = useChart();

  const [name, setName] = useState<string>(activeProfile?.name || '');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>(activeProfile?.gender || 'Male');
  const [dateOfBirth, setDateOfBirth] = useState<string>(activeProfile?.dateOfBirth || '2005-08-20');
  const [timeOfBirth, setTimeOfBirth] = useState<string>(activeProfile?.timeOfBirth || '14:05');
  const [birthPlace, setBirthPlace] = useState<string>(activeProfile?.birthPlace || 'Jabalpur, Madhya Pradesh');
  const [latitude, setLatitude] = useState<string>(String(activeProfile?.latitude || 23.1815));
  const [longitude, setLongitude] = useState<string>(String(activeProfile?.longitude || 79.9864));

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Required Field', 'Please enter native name.');
      return;
    }
    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lon)) {
      Alert.alert('Invalid Coordinates', 'Please enter valid numerical latitude and longitude.');
      return;
    }

    const updatedProfile: BirthProfile = {
      id: activeProfile?.id || `profile-${Date.now()}`,
      name: name.trim(),
      gender,
      dateOfBirth,
      timeOfBirth,
      birthPlace: birthPlace.trim(),
      latitude: lat,
      longitude: lon,
      timezone: 'Asia/Kolkata',
      isDefault: true
    };

    await setActiveProfile(updatedProfile);
    Alert.alert('Profile Updated', 'Kundli and Vedic transits recalculated.');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Edit Birth Details</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.form}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Rahul Sharma"
              placeholderTextColor={Colors.textMuted}
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.label}>Gender</Text>
            <View style={styles.genderRow}>
              {(['Male', 'Female', 'Other'] as const).map(g => (
                <TouchableOpacity
                  key={g}
                  style={[styles.genderBtn, gender === g && styles.genderBtnActive]}
                  onPress={() => setGender(g)}
                >
                  <Text style={[styles.genderText, gender === g && styles.genderTextActive]}>
                    {g}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.row}>
              <View style={styles.flex1}>
                <Text style={styles.label}>Date of Birth (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={Colors.textMuted}
                  value={dateOfBirth}
                  onChangeText={setDateOfBirth}
                />
              </View>
              <View style={styles.flex1}>
                <Text style={styles.label}>Time of Birth (24h)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="HH:mm"
                  placeholderTextColor={Colors.textMuted}
                  value={timeOfBirth}
                  onChangeText={setTimeOfBirth}
                />
              </View>
            </View>

            <Text style={styles.label}>Birth City / Place</Text>
            <TextInput
              style={styles.input}
              placeholder="City, State, Country"
              placeholderTextColor={Colors.textMuted}
              value={birthPlace}
              onChangeText={setBirthPlace}
            />

            <View style={styles.row}>
              <View style={styles.flex1}>
                <Text style={styles.label}>Latitude</Text>
                <TextInput
                  style={styles.input}
                  placeholder="23.1815"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="numeric"
                  value={latitude}
                  onChangeText={setLatitude}
                />
              </View>
              <View style={styles.flex1}>
                <Text style={styles.label}>Longitude</Text>
                <TextInput
                  style={styles.input}
                  placeholder="79.9864"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="numeric"
                  value={longitude}
                  onChangeText={setLongitude}
                />
              </View>
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.8}>
              <Text style={styles.saveBtnText}>Recalculate Vedic Chart</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 16
  },
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 18,
    maxHeight: '90%'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: 'bold'
  },
  closeBtn: {
    padding: 6
  },
  closeText: {
    color: Colors.textMuted,
    fontSize: 18
  },
  form: {
    gap: 10
  },
  label: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600'
  },
  input: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.textPrimary,
    fontSize: 14,
    borderWidth: 1,
    borderColor: Colors.border
  },
  genderRow: {
    flexDirection: 'row',
    gap: 8
  },
  genderBtn: {
    flex: 1,
    backgroundColor: Colors.surfaceElevated,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border
  },
  genderBtnActive: {
    backgroundColor: Colors.goldMuted,
    borderColor: Colors.gold
  },
  genderText: {
    color: Colors.textSecondary,
    fontSize: 13
  },
  genderTextActive: {
    color: Colors.gold,
    fontWeight: 'bold'
  },
  row: {
    flexDirection: 'row',
    gap: 10
  },
  flex1: {
    flex: 1
  },
  saveBtn: {
    backgroundColor: Colors.gold,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12
  },
  saveBtnText: {
    color: Colors.textInverse,
    fontSize: 14,
    fontWeight: 'bold'
  }
});
