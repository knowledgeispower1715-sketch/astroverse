/**
 * AstroVerse Mobile OS - Authentication & Login Modal
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';

interface AuthModalProps {
  visible: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ visible, onClose }) => {
  const { login, sendOtp, verifyOtp, register, isLoading } = useAuth();

  const [mode, setMode] = useState<'LOGIN_PASS' | 'OTP' | 'REGISTER'>('OTP');
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [otp, setOtp] = useState<string>('');
  const [otpSent, setOtpSent] = useState<boolean>(false);

  const handleSendOtp = async () => {
    if (!phone || phone.length < 10) {
      Alert.alert('Invalid Phone', 'Please enter a valid 10-digit mobile number.');
      return;
    }
    const res = await sendOtp(phone);
    if (res.success) {
      setOtpSent(true);
      Alert.alert('OTP Sent', `Verification code sent to ${phone}. (Mock: 123456)`);
    } else {
      Alert.alert('Error', res.error || 'Failed to send OTP.');
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length < 4) {
      Alert.alert('Invalid OTP', 'Please enter the verification code.');
      return;
    }
    const res = await verifyOtp(phone, otp);
    if (res.success) {
      Alert.alert('Welcome', 'Authentication successful.');
      onClose();
    } else {
      Alert.alert('Error', res.error || 'Verification failed.');
    }
  };

  const handleLoginPass = async () => {
    if (!phone && !email) {
      Alert.alert('Required', 'Please enter your phone or email.');
      return;
    }
    const res = await login(phone || email, password);
    if (res.success) {
      Alert.alert('Welcome Back', 'Logged in successfully.');
      onClose();
    } else {
      Alert.alert('Error', res.error || 'Invalid credentials.');
    }
  };

  const handleRegister = async () => {
    if (!phone && !email) {
      Alert.alert('Required', 'Please enter your mobile or email to register.');
      return;
    }
    const res = await register(phone, email, password);
    if (res.success) {
      Alert.alert('Welcome to AstroVerse', 'Your account has been created.');
      onClose();
    } else {
      Alert.alert('Error', res.error || 'Registration failed.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>AstroVerse Account</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Mode Tabs */}
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, mode === 'OTP' && styles.tabActive]}
              onPress={() => { setMode('OTP'); setOtpSent(false); }}
            >
              <Text style={[styles.tabLabel, mode === 'OTP' && styles.tabLabelActive]}>
                Phone OTP
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, mode === 'LOGIN_PASS' && styles.tabActive]}
              onPress={() => setMode('LOGIN_PASS')}
            >
              <Text style={[styles.tabLabel, mode === 'LOGIN_PASS' && styles.tabLabelActive]}>
                Password
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, mode === 'REGISTER' && styles.tabActive]}
              onPress={() => setMode('REGISTER')}
            >
              <Text style={[styles.tabLabel, mode === 'REGISTER' && styles.tabLabelActive]}>
                Register
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form Fields */}
          <View style={styles.form}>
            {mode === 'OTP' && (
              <>
                <Text style={styles.fieldLabel}>Mobile Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter 10-digit number"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                />

                {otpSent && (
                  <>
                    <Text style={styles.fieldLabel}>Enter Verification Code</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="6-digit OTP (e.g. 123456)"
                      placeholderTextColor={Colors.textMuted}
                      keyboardType="number-pad"
                      value={otp}
                      onChangeText={setOtp}
                    />
                  </>
                )}

                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={otpSent ? handleVerifyOtp : handleSendOtp}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color={Colors.textInverse} />
                  ) : (
                    <Text style={styles.submitBtnText}>
                      {otpSent ? 'Verify OTP & Continue' : 'Send One-Time Password'}
                    </Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            {mode === 'LOGIN_PASS' && (
              <>
                <Text style={styles.fieldLabel}>Phone or Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter registered mobile or email"
                  placeholderTextColor={Colors.textMuted}
                  value={phone}
                  onChangeText={setPhone}
                  autoCapitalize="none"
                />

                <Text style={styles.fieldLabel}>Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter password"
                  placeholderTextColor={Colors.textMuted}
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />

                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={handleLoginPass}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color={Colors.textInverse} />
                  ) : (
                    <Text style={styles.submitBtnText}>Sign In</Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            {mode === 'REGISTER' && (
              <>
                <Text style={styles.fieldLabel}>Mobile Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="10-digit mobile"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                />

                <Text style={styles.fieldLabel}>Email Address (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="name@example.com"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                />

                <Text style={styles.fieldLabel}>Create Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="At least 6 characters"
                  placeholderTextColor={Colors.textMuted}
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />

                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={handleRegister}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color={Colors.textInverse} />
                  ) : (
                    <Text style={styles.submitBtnText}>Create Account</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
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
    padding: 20
  },
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 20
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
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
  tabs: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 8,
    padding: 3,
    marginBottom: 18
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6
  },
  tabActive: {
    backgroundColor: Colors.gold
  },
  tabLabel: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600'
  },
  tabLabelActive: {
    color: Colors.textInverse,
    fontWeight: 'bold'
  },
  form: {
    gap: 10
  },
  fieldLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600'
  },
  input: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: Colors.textPrimary,
    fontSize: 14,
    borderWidth: 1,
    borderColor: Colors.border
  },
  submitBtn: {
    backgroundColor: Colors.gold,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8
  },
  submitBtnText: {
    color: Colors.textInverse,
    fontSize: 14,
    fontWeight: 'bold'
  }
});
