import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform, BackHandler, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { User, Mail, Phone, Lock, ArrowLeft } from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';
import apiClient, { setAccessToken, setRefreshToken, setUserProfileStorage } from '@/src/services/api';
import { configureGoogleSignIn, signInWithGoogle } from '@/src/services/google-auth';
import { registerForPushNotifications, sendFcmTokenToServer } from '@/src/services/notifications';

const APP_LOGO = require('@/assets/favicon.png');

export default function MobileRegisterScreen() {
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    configureGoogleSignIn();

    const backAction = () => {
      router.replace('/(auth)/login');
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, []);

  const handleRegister = async () => {
    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.replace(/\D/g, '');
    const cleanPassword = password.trim();

    if (!cleanName || !cleanEmail || !cleanPhone || !cleanPassword) {
      Alert.alert('Missing Fields', 'Please enter your Full Name, Email, 10-digit Phone Number, and Password.');
      return;
    }

    if (cleanPhone.length !== 10) {
      Alert.alert('Invalid Phone Number', 'Please enter a valid 10-digit mobile number.');
      return;
    }

    if (cleanPassword.length < 6) {
      Alert.alert('Short Password', 'Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/auth/register', {
        fullName: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        password: cleanPassword,
        role: 'STUDENT',
      });

      // Auto-login after registration
      const loginRes = await apiClient.post('/auth/login/email', {
        email: cleanEmail,
        password: cleanPassword,
      });

      const { tokens, user } = loginRes.data.data;
      setAccessToken(tokens.accessToken);
      setRefreshToken(tokens.refreshToken);
      if (user) {
        setUserProfileStorage(user);
        queryClient.setQueryData(['auth', 'me'], user);
      }

      void registerForPushNotifications().then((fcmToken) => {
        if (fcmToken) void sendFcmTokenToServer(fcmToken);
      });

      Alert.alert('Welcome to Vireon!', 'Your account has been created successfully.', [
        { text: 'Explore Platform', onPress: () => router.replace('/(tabs)') },
      ]);
    } catch (err: unknown) {
      const errData = (err as any)?.response?.data;
      const firstFieldError = errData?.errors?.[0]?.message;
      const msg = firstFieldError ?? errData?.message ?? (err instanceof Error ? err.message : 'Registration failed');
      Alert.alert('Registration Status', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setGoogleLoading(true);
    try {
      const gResult = await signInWithGoogle();
      if (!gResult) {
        setGoogleLoading(false);
        return;
      }

      const res = await apiClient.post('/auth/login/google', {
        idToken: gResult.idToken,
        email: gResult.email,
        fullName: gResult.fullName,
        avatarUrl: gResult.avatarUrl,
      });
      const { tokens, user } = res.data.data;
      setAccessToken(tokens.accessToken);
      setRefreshToken(tokens.refreshToken);
      if (user) {
        setUserProfileStorage(user);
        queryClient.setQueryData(['auth', 'me'], user);
      }

      void registerForPushNotifications().then((fcmToken) => {
        if (fcmToken) void sendFcmTokenToServer(fcmToken);
      });

      router.replace('/(tabs)');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? (err instanceof Error ? err.message : 'Google Sign-Up failed');
      Alert.alert('Google Sign-Up', msg);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      {/* ── Green Solid Header ── */}
      <SafeAreaView style={styles.greenHeader} edges={['top']}>
        {/* Back Button */}
        <TouchableOpacity onPress={() => router.replace('/(auth)/login')} style={styles.backBtn} activeOpacity={0.7}>
          <ArrowLeft size={20} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <Image source={APP_LOGO} style={styles.logoImage} resizeMode="contain" />
          <Text style={styles.welcomeLabel}>Get Started</Text>
          <Text style={styles.welcomeTitle}>Create Account</Text>
          <Text style={styles.welcomeSub}>Join Vireon Safety Institute today</Text>
        </View>
      </SafeAreaView>

      {/* ── White Form Card ── */}
      <KeyboardAvoidingView
        style={styles.whiteCard}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView contentContainerStyle={styles.formScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Google Sign-Up */}
          <TouchableOpacity style={styles.googleBtn} onPress={handleGoogleSignUp} disabled={loading || googleLoading} activeOpacity={0.85}>
            {googleLoading ? (
              <ActivityIndicator size="small" color="#334155" />
            ) : (
              <>
                <Text style={styles.googleIcon}>G</Text>
                <Text style={styles.googleBtnText}>Sign up with Google</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or register with email</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Full Name */}
          <View style={styles.inputWrap}>
            <User size={18} color="#94A3B8" style={styles.inputIcon} />
            <TextInput
              placeholder="Full Name"
              placeholderTextColor="#94A3B8"
              value={fullName}
              onChangeText={setFullName}
              style={styles.input}
            />
          </View>

          {/* Email */}
          <View style={styles.inputWrap}>
            <Mail size={18} color="#94A3B8" style={styles.inputIcon} />
            <TextInput
              placeholder="Email Address"
              placeholderTextColor="#94A3B8"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
            />
          </View>

          {/* Phone */}
          <View style={styles.inputWrap}>
            <Phone size={18} color="#94A3B8" style={styles.inputIcon} />
            <TextInput
              placeholder="Mobile Phone Number"
              placeholderTextColor="#94A3B8"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              style={styles.input}
            />
          </View>

          {/* Password */}
          <View style={styles.inputWrap}>
            <Lock size={18} color="#94A3B8" style={styles.inputIcon} />
            <TextInput
              placeholder="Password (min 6 characters)"
              placeholderTextColor="#94A3B8"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              style={styles.input}
            />
          </View>

          {/* Create Account Button */}
          <TouchableOpacity style={styles.primaryBtn} onPress={handleRegister} disabled={loading || googleLoading} activeOpacity={0.85}>
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryBtnText}>Create Account</Text>
            )}
          </TouchableOpacity>

          {/* Login Link */}
          <TouchableOpacity onPress={() => router.replace('/(auth)/login')} style={styles.linkWrap}>
            <Text style={styles.linkText}>
              Already registered? <Text style={styles.linkBold}>Sign In</Text>
            </Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#16A34A',
  },
  // ── Green Header ──
  greenHeader: {
    backgroundColor: '#16A34A',
    paddingBottom: 28,
    paddingHorizontal: 24,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  headerContent: {
    alignItems: 'center',
  },
  logoImage: {
    width: 72,
    height: 72,
    borderRadius: 18,
    marginBottom: 12,
  },
  welcomeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.75)',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  welcomeTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  welcomeSub: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  // ── White Card ──
  whiteCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -4,
    overflow: 'hidden',
  },
  formScroll: {
    padding: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    height: 52,
    marginBottom: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '600',
  },
  primaryBtn: {
    height: 52,
    borderRadius: 14,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: 16,
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    marginHorizontal: 12,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    gap: 10,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  googleIcon: {
    fontSize: 18,
    fontWeight: '800',
    color: '#4285F4',
  },
  googleBtnText: {
    color: '#334155',
    fontSize: 15,
    fontWeight: '700',
  },
  linkWrap: {
    alignItems: 'center',
    marginTop: 4,
  },
  linkText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  linkBold: {
    color: '#16A34A',
    fontWeight: '800',
  },
});
