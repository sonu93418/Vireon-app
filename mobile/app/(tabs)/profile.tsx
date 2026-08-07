import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  User, Shield, BookOpen, Calendar, Bookmark, Award, Bell, Lock,
  HelpCircle, LogOut, ChevronRight, CheckCircle2, LogIn, UserPlus
} from 'lucide-react-native';
import { COLORS, SPACING, BORDER_RADIUS, SHADOW } from '@/src/theme/tokens';
import apiClient, { clearTokens, getAccessToken, getUserProfileStorage, setUserProfileStorage } from '@/src/services/api';

interface UserProfile {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  avatarUrl?: string;
  isEmailVerified: boolean;
  status: string;
}

export default function ProfileScreen() {
  const [token, setToken] = useState<string | undefined>(getAccessToken());
  const queryClient = useQueryClient();

  const { data: user, refetch } = useQuery<UserProfile | null>({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const activeToken = getAccessToken();
      if (!activeToken) return getUserProfileStorage();
      try {
        const res = await apiClient.get<{ data: UserProfile }>('/auth/me');
        if (res.data?.data) {
          setUserProfileStorage(res.data.data);
        }
        return res.data.data;
      } catch {
        return getUserProfileStorage();
      }
    },
    initialData: () => getUserProfileStorage(),
    enabled: !!token,
  });

  // Re-read token and refresh profile whenever tab screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const activeToken = getAccessToken();
      setToken(activeToken);
      if (activeToken) {
        void refetch();
      }
    }, [refetch])
  );

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out of your account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: () => {
          clearTokens();
          setToken(undefined);
          queryClient.clear();
          router.replace('/onboarding');
        },
      },
    ]);
  };

  const MENU_SECTIONS = [
    {
      title: 'Learning & Schedule',
      items: [
        { id: 'enrolled', label: 'My Enrolled Courses', icon: BookOpen, action: () => router.push('/(tabs)/courses') },
        { id: 'schedule', label: 'Class Schedule', icon: Calendar, action: () => router.push('/(tabs)/classes') },
        { id: 'bookmarks', label: 'Bookmarked Articles', icon: Bookmark, action: () => router.push('/(tabs)/blogs') },
        { id: 'certificates', label: 'Certificates & Badges', icon: Award, action: () => Alert.alert('Certificates', 'Official ISO 45001 & Industrial Safety Certificate Module.') },
      ],
    },
    {
      title: 'Preferences & Security',
      items: [
        { id: 'notifications', label: 'Push Notifications', icon: Bell, action: () => Alert.alert('Settings', 'FCM Push Notifications Enabled.') },
        { id: 'security', label: 'Security & Password', icon: Lock, action: () => Alert.alert('Security', 'Account protected by 256-bit SSL.') },
        { id: 'help', label: 'Support & Inquiry', icon: HelpCircle, action: () => Alert.alert('Support', 'Vireon Safety Institute Hotline: +91 9876543210\nEmail: info@vireonsafety.in') },
      ],
    },
  ];

  const activeUser = user ?? getUserProfileStorage();
  const isLoggedIn = !!token && (!!activeUser || (token && token.length > 0));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header Title */}
        <View style={styles.header}>
          <Text style={styles.pageTitle}>Account Profile</Text>
        </View>

        {/* Profile Card / Auth Card */}
        {isLoggedIn ? (
          <LinearGradient
            colors={['#FFFFFF', '#DCFCE7']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={[styles.profileCard, SHADOW.card, { borderColor: 'rgba(22, 163, 74, 0.35)' }]}
          >
            <View style={styles.avatarWrap}>
              {activeUser?.avatarUrl ? (
                <Image source={{ uri: activeUser.avatarUrl }} style={styles.avatarImg} />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarInitial}>
                    {(activeUser?.fullName ?? 'Scholar').charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.verifiedDot}>
                <CheckCircle2 size={20} color="#16A34A" />
              </View>
            </View>

            <Text style={styles.userName}>{activeUser?.fullName ?? 'Registered Scholar'}</Text>
            <Text style={styles.userRole}>{(activeUser?.role ?? 'STUDENT').replace(/_/g, ' ')}</Text>
            <Text style={styles.userEmail}>{activeUser?.email ?? 'scholar@vireonsafety.in'}</Text>

            {activeUser?._id && (
              <View style={styles.userIdBadge}>
                <User size={12} color="#16A34A" />
                <Text style={styles.userIdText}>ID: #{String(activeUser._id)}</Text>
              </View>
            )}

            {/* Badges */}
            <View style={styles.badgeRow}>
              <View style={styles.badgeItem}>
                <Shield size={12} color="#FFFFFF" />
                <Text style={styles.badgeText}>Verified Scholar</Text>
              </View>
              <View style={styles.badgeItem}>
                <Award size={12} color="#FFFFFF" />
                <Text style={styles.badgeText}>ISO 45001</Text>
              </View>
            </View>
          </LinearGradient>
        ) : (
          <View style={[styles.authPromptCard, SHADOW.card]}>
            <View style={styles.authLogoBox}>
              <Shield size={36} color="#16A34A" />
            </View>
            <Text style={styles.authTitle}>Sign In to Your Account</Text>
            <Text style={styles.authSubtitle}>Access courses, live classes, certificates, and student dashboard.</Text>

            <View style={styles.authActionRow}>
              <TouchableOpacity
                style={styles.signInBtn}
                onPress={() => router.push('/(auth)/login')}
                activeOpacity={0.85}
              >
                <LogIn size={18} color="#FFFFFF" />
                <Text style={styles.signInBtnText}>Sign In</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.registerBtn}
                onPress={() => router.push('/(auth)/register')}
                activeOpacity={0.85}
              >
                <UserPlus size={18} color="#16A34A" />
                <Text style={styles.registerBtnText}>Register</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Menu Sections */}
        {MENU_SECTIONS.map((sec) => (
          <View key={sec.title} style={styles.menuSection}>
            <Text style={styles.sectionTitle}>{sec.title}</Text>
            <View style={[styles.menuGroup, SHADOW.card]}>
              {sec.items.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <TouchableOpacity
                    key={item.id}
                    onPress={item.action}
                    style={[styles.menuItem, idx !== sec.items.length - 1 && styles.menuBorder]}
                    activeOpacity={0.7}
                  >
                    <View style={styles.menuIconWrap}>
                      <Icon size={20} color="#16A34A" />
                    </View>
                    <Text style={styles.menuLabel}>{item.label}</Text>
                    <ChevronRight size={18} color={COLORS.textMuted} />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}

        {/* Prominent Logout Button */}
        {isLoggedIn && (
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
            <LogOut size={20} color="#EF4444" />
            <Text style={styles.logoutText}>Log Out Account</Text>
          </TouchableOpacity>
        )}

        <View style={styles.footerVersion}>
          <Text style={styles.versionText}>Vireon Safety Mobile • v1.0.0 (Expo SDK 55)</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scrollContent: { padding: SPACING.base, paddingBottom: SPACING['4xl'] },
  header: { marginBottom: SPACING.md },
  pageTitle: { fontSize: 26, color: COLORS.textPrimary, fontWeight: '900' },

  profileCard: { borderRadius: BORDER_RADIUS.xl, borderWidth: 1.5, padding: 20, alignItems: 'center', marginBottom: SPACING.xl, backgroundColor: '#FFFFFF' },
  avatarWrap: { position: 'relative', marginBottom: 14 },
  avatar: { width: 84, height: 84, borderRadius: 42, backgroundColor: '#16A34A', borderWidth: 3, borderColor: '#15803D', alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 34, color: '#FFFFFF', fontWeight: '900' },
  avatarImg: { width: 84, height: 84, borderRadius: 42 },
  verifiedDot: { position: 'absolute', bottom: -2, right: -2, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 3 },
  userName: { fontSize: 22, color: COLORS.textPrimary, fontWeight: '900' },
  userRole: { fontSize: 13, color: '#16A34A', fontWeight: '900', marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.5 },
  userEmail: { fontSize: 14, color: COLORS.textMuted, marginTop: 3, fontWeight: '700' },
  userIdBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#DCFCE7', paddingHorizontal: 12, paddingVertical: 4, borderRadius: BORDER_RADIUS.full, marginTop: 8, borderWidth: 1, borderColor: '#86EFAC' },
  userIdText: { fontSize: 12, color: '#15803D', fontWeight: '800' },
  badgeRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  badgeItem: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: BORDER_RADIUS.full, backgroundColor: '#16A34A', borderWidth: 1, borderColor: '#15803D' },
  badgeText: { fontSize: 11, color: '#FFFFFF', fontWeight: '800' },

  authPromptCard: { borderRadius: BORDER_RADIUS.xl, borderWidth: 1.5, borderColor: 'rgba(22,163,74,0.3)', padding: 22, alignItems: 'center', marginBottom: SPACING.xl, backgroundColor: '#FFFFFF' },
  authLogoBox: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  authTitle: { fontSize: 20, color: COLORS.textPrimary, fontWeight: '900' },
  authSubtitle: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', marginTop: 4, marginBottom: 18, fontWeight: '600' },
  authActionRow: { flexDirection: 'row', gap: 12, width: '100%' },
  signInBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#16A34A', paddingVertical: 14, borderRadius: BORDER_RADIUS.md },
  signInBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  registerBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#16A34A', paddingVertical: 14, borderRadius: BORDER_RADIUS.md },
  registerBtnText: { color: '#16A34A', fontSize: 15, fontWeight: '900' },

  menuSection: { marginBottom: SPACING.lg },
  sectionTitle: { fontSize: 13, color: COLORS.textMuted, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10, paddingLeft: 4 },
  menuGroup: { backgroundColor: '#FFFFFF', borderRadius: BORDER_RADIUS.xl, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  menuBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  menuIconWrap: { width: 38, height: 38, borderRadius: BORDER_RADIUS.md, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  menuLabel: { flex: 1, fontSize: 16, color: COLORS.textPrimary, fontWeight: '700' },

  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#FEE2E2', borderWidth: 1.5, borderColor: '#EF4444', paddingVertical: 16, borderRadius: BORDER_RADIUS.xl, marginTop: SPACING.md },
  logoutText: { fontSize: 16, color: '#DC2626', fontWeight: '900' },

  footerVersion: { alignItems: 'center', marginTop: 28 },
  versionText: { fontSize: 11, color: COLORS.textMuted, fontWeight: '700' },
});
