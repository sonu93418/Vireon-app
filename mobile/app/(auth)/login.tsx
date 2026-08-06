import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Shield, Eye, EyeOff, Lock, Mail } from 'lucide-react-native';
import { COLORS, SPACING, BORDER_RADIUS, SHADOW, FONT_SIZE } from '@/src/theme/tokens';
import apiClient, { setAccessToken, setRefreshToken } from '@/src/services/api';
import { configureGoogleSignIn, signInWithGoogle } from '@/src/services/google-auth';
import { registerForPushNotifications, sendFcmTokenToServer } from '@/src/services/notifications';

export default function MobileLoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    configureGoogleSignIn();
  }, []);

  const onLoginSuccess = async (accessToken: string, refreshToken: string) => {
    setAccessToken(accessToken);
    setRefreshToken(refreshToken);

    // Register FCM token after successful login
    const fcmToken = await registerForPushNotifications();
    if (fcmToken) {
      await sendFcmTokenToServer(fcmToken);
    }

    router.replace('/(tabs)');
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter your email and password');
      return;
    }
    setLoading(true);
    try {
      const res = await apiClient.post('/auth/login/email', { email, password });
      const { accessToken, refreshToken } = res.data.data.tokens;
      await onLoginSuccess(accessToken, refreshToken);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Login failed';
      Alert.alert('Login Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const idToken = await signInWithGoogle();
      if (!idToken) {
        setGoogleLoading(false);
        return; // User cancelled
      }

      const res = await apiClient.post('/auth/login/google', { idToken });
      const { accessToken, refreshToken } = res.data.data.tokens;
      await onLoginSuccess(accessToken, refreshToken);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? (err instanceof Error ? err.message : 'Google Sign-In failed');
      Alert.alert('Google Sign-In Failed', msg);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoWrap}>
          <View style={styles.logoBox}>
            <Shield size={32} color={COLORS.success} />
          </View>
          <Text style={styles.title}>Sign In</Text>
          <Text style={styles.subtitle}>Access Vireon Safety Institute Platform</Text>
        </View>

        <View style={styles.form}>
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
            <Lock size={16} color={COLORS.textMuted} style={styles.inputIcon} />
            <TextInput
              placeholder="Password"
              placeholderTextColor={COLORS.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              style={styles.input}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              {showPassword ? <EyeOff size={16} color={COLORS.textMuted} /> : <Eye size={16} color={COLORS.textMuted} />}
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={[styles.btn, SHADOW.card]} onPress={handleLogin} disabled={loading || googleLoading}>
            <Text style={styles.btnText}>{loading ? 'Signing in...' : 'Sign In'}</Text>
          </TouchableOpacity>

          {/* ─── Divider ─────────────────────────────────── */}
          <View style={styles.dividerWrap}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* ─── Google Sign-In ──────────────────────────── */}
          <TouchableOpacity
            style={[styles.googleBtn, SHADOW.card]}
            onPress={handleGoogleLogin}
            disabled={loading || googleLoading}
          >
            {googleLoading ? (
              <ActivityIndicator size="small" color={COLORS.textPrimary} />
            ) : (
              <>
                <Text style={styles.googleIcon}>G</Text>
                <Text style={styles.googleBtnText}>Sign in with Google</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/(auth)/register')} style={styles.linkWrap}>
            <Text style={styles.linkText}>Don't have an account? <Text style={styles.linkBold}>Register Now</Text></Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { flex: 1, padding: SPACING.xl, justifyContent: 'center' },
  logoWrap: { alignItems: 'center', marginBottom: 32 },
  logoBox: { width: 64, height: 64, borderRadius: BORDER_RADIUS.xl, backgroundColor: 'rgba(22,163,74,0.1)', borderWidth: 1, borderColor: COLORS.borderGreen, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  title: { fontSize: FONT_SIZE['3xl'], color: COLORS.textPrimary, fontWeight: '800' },
  subtitle: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginTop: 4 },
  form: { gap: 14 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: BORDER_RADIUS.md, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 14, height: 48 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: COLORS.textPrimary, fontSize: FONT_SIZE.sm },
  btn: { backgroundColor: COLORS.accentGreen, borderRadius: BORDER_RADIUS.md, height: 48, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontSize: FONT_SIZE.sm, fontWeight: '700' },
  dividerWrap: { flexDirection: 'row', alignItems: 'center', marginVertical: 4 },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { color: COLORS.textMuted, fontSize: FONT_SIZE.xs, marginHorizontal: 12 },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  googleIcon: {
    fontSize: 18,
    fontWeight: '800',
    color: '#4285F4',
  },
  googleBtnText: { color: COLORS.textPrimary, fontSize: FONT_SIZE.sm, fontWeight: '600' },
  linkWrap: { alignItems: 'center', marginTop: 16 },
  linkText: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted },
  linkBold: { color: COLORS.success, fontWeight: '700' },
});
