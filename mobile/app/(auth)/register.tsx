import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Shield, User, Mail, Phone, Lock } from 'lucide-react-native';
import { COLORS, SPACING, BORDER_RADIUS, SHADOW, FONT_SIZE } from '@/src/theme/tokens';
import apiClient from '@/src/services/api';

export default function MobileRegisterScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!fullName || !email || !phone || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      await apiClient.post('/auth/register', {
        fullName,
        email,
        phone,
        password,
        role: 'STUDENT',
      });
      Alert.alert('Success', 'Account registered successfully! Please log in.', [
        { text: 'OK', onPress: () => router.replace('/(auth)/login') },
      ]);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Registration failed';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.logoWrap}>
          <View style={styles.logoBox}>
            <Shield size={32} color={COLORS.success} />
          </View>
          <Text style={styles.title}>Register Account</Text>
          <Text style={styles.subtitle}>Join Vireon Safety Institute Platform</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputWrap}>
            <User size={16} color={COLORS.textMuted} style={styles.inputIcon} />
            <TextInput
              placeholder="Full Name"
              placeholderTextColor={COLORS.textMuted}
              value={fullName}
              onChangeText={setFullName}
              style={styles.input}
            />
          </View>

          <View style={styles.inputWrap}>
            <Mail size={16} color={COLORS.textMuted} style={styles.inputIcon} />
            <TextInput
              placeholder="Email address"
              placeholderTextColor={COLORS.textMuted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
            />
          </View>

          <View style={styles.inputWrap}>
            <Phone size={16} color={COLORS.textMuted} style={styles.inputIcon} />
            <TextInput
              placeholder="Mobile Phone Number"
              placeholderTextColor={COLORS.textMuted}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              style={styles.input}
            />
          </View>

          <View style={styles.inputWrap}>
            <Lock size={16} color={COLORS.textMuted} style={styles.inputIcon} />
            <TextInput
              placeholder="Password (min 8 characters)"
              placeholderTextColor={COLORS.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              style={styles.input}
            />
          </View>

          <TouchableOpacity style={[styles.btn, SHADOW.card]} onPress={handleRegister} disabled={loading}>
            <Text style={styles.btnText}>{loading ? 'Registering...' : 'Create Account'}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.replace('/(auth)/login')} style={styles.linkWrap}>
            <Text style={styles.linkText}>Already registered? <Text style={styles.linkBold}>Sign In</Text></Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: SPACING.xl, justifyContent: 'center' },
  logoWrap: { alignItems: 'center', marginBottom: 24 },
  logoBox: { width: 64, height: 64, borderRadius: BORDER_RADIUS.xl, backgroundColor: 'rgba(22,163,74,0.1)', borderWidth: 1, borderColor: COLORS.borderGreen, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  title: { fontSize: FONT_SIZE['2xl'], color: COLORS.textPrimary, fontWeight: '800' },
  subtitle: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginTop: 4 },
  form: { gap: 12 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: BORDER_RADIUS.md, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 14, height: 48 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: COLORS.textPrimary, fontSize: FONT_SIZE.sm },
  btn: { backgroundColor: COLORS.accentGreen, borderRadius: BORDER_RADIUS.md, height: 48, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontSize: FONT_SIZE.sm, fontWeight: '700' },
  linkWrap: { alignItems: 'center', marginTop: 16 },
  linkText: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted },
  linkBold: { color: COLORS.success, fontWeight: '700' },
});
