import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, BackHandler, ScrollView, KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { Eye, EyeOff, Lock, Mail, ArrowLeft } from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';
import apiClient, { setAccessToken, setRefreshToken, setUserProfileStorage } from '@/src/services/api';
import { configureGoogleSignIn, signInWithGoogle } from '@/src/services/google-auth';
import { registerForPushNotifications, sendFcmTokenToServer } from '@/src/services/notifications';

const APP_LOGO = require('@/assets/favicon.png');

export default function MobileLoginScreen() {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    configureGoogleSignIn();

    const backAction = () => {
      router.replace('/onboarding');
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, []);

  const onLoginSuccess = async (accessToken: string, refreshToken: string, userData?: any) => {
    setAccessToken(accessToken);
    setRefreshToken(refreshToken);
    if (userData) {
      setUserProfileStorage({ ...userData, justLoggedIn: true });
      queryClient.setQueryData(['auth', 'me'], userData);
    }
    void registerForPushNotifications().then((fcmToken) => {
      if (fcmToken) void sendFcmTokenToServer(fcmToken);
    });
    router.replace({ pathname: '/(tabs)', params: { celebrate: 'true' } } as any);
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter your email and password');
      return;
    }
    setLoading(true);
    try {
      const res = await apiClient.post('/auth/login/email', { email: email.trim(), password });
      const { tokens, user } = res.data.data;
      setLoading(false);
      await onLoginSuccess(tokens.accessToken, tokens.refreshToken, user);
    } catch (err: unknown) {
      setLoading(false);
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? (err instanceof Error ? err.message : 'Unable to connect to server. Please check network.');
      Alert.alert('Login Failed', msg);
    }
  };

  const handleGoogleLogin = async () => {
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
      setGoogleLoading(false);
      await onLoginSuccess(tokens.accessToken, tokens.refreshToken, user);
    } catch (err: unknown) {
      setGoogleLoading(false);
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? (err instanceof Error ? err.message : 'Google Sign-In failed');
      Alert.alert('Google Sign-In', msg);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" translucent animated />
      {/* ── Green Solid Header ── */}
      <SafeAreaView style={styles.greenHeader} edges={['top']}>
        {/* Back Button */}
        <TouchableOpacity onPress={() => router.replace('/onboarding')} style={styles.backBtn} activeOpacity={0.7}>
          <ArrowLeft size={20} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <Image source={APP_LOGO} style={styles.logoImage} resizeMode="contain" />
          <Text style={styles.welcomeLabel}>Welcome Back</Text>
          <Text style={styles.welcomeTitle}>Sign In to Vireon</Text>
          <Text style={styles.welcomeSub}>Access your safety training dashboard</Text>
        </View>
      </SafeAreaView>

      {/* ── White Form Card ── */}
      <KeyboardAvoidingView
        style={styles.whiteCard}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView contentContainerStyle={styles.formScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Email */}
          <View style={styles.inputWrap}>
            <Mail size={18} color="#94A3B8" style={styles.inputIcon} />
            <TextInput
              placeholder="Email address"
              placeholderTextColor="#94A3B8"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
            />
          </View>

          {/* Password */}
          <View style={styles.inputWrap}>
            <Lock size={18} color="#94A3B8" style={styles.inputIcon} />
            <TextInput
              placeholder="Password"
              placeholderTextColor="#94A3B8"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              style={styles.input}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              {showPassword ? <EyeOff size={18} color="#94A3B8" /> : <Eye size={18} color="#94A3B8" />}
            </TouchableOpacity>
          </View>

          {/* Sign In Button */}
          <TouchableOpacity style={styles.primaryBtn} onPress={handleLogin} disabled={loading || googleLoading} activeOpacity={0.85}>
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryBtnText}>Sign In</Text>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google */}
          <TouchableOpacity style={styles.googleBtn} onPress={handleGoogleLogin} disabled={loading || googleLoading} activeOpacity={0.85}>
            {googleLoading ? (
              <ActivityIndicator size="small" color="#334155" />
            ) : (
              <>
                <Text style={styles.googleIcon}>G</Text>
                <Text style={styles.googleBtnText}>Sign in with Google</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Register Link */}
          <TouchableOpacity onPress={() => router.push('/(auth)/register')} style={styles.linkWrap}>
            <Text style={styles.linkText}>
              Don't have an account? <Text style={styles.linkBold}>Register Now</Text>
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
    paddingBottom: 32,
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
    marginBottom: 16,
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
    marginBottom: 14,
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
    paddingTop: 28,
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
    marginBottom: 14,
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
    marginBottom: 18,
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
    marginBottom: 18,
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
    marginBottom: 20,
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
