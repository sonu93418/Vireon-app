import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  User, Shield, BookOpen, Calendar, Bookmark, Award, Bell, Lock,
  HelpCircle, LogOut, ChevronRight, CheckCircle2
} from 'lucide-react-native';
import { COLORS, SPACING, BORDER_RADIUS, SHADOW, FONT_SIZE } from '@/src/theme/tokens';
import { clearTokens, getAccessToken } from '@/src/services/api';

export default function ProfileScreen() {
  const token = getAccessToken();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => {
          clearTokens();
          router.replace('/(tabs)');
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
        { id: 'certificates', label: 'Certificates & Badges', icon: Award, action: () => Alert.alert('Certificates', 'No active certificates issue found.') },
      ],
    },
    {
      title: 'Preferences & Security',
      items: [
        { id: 'notifications', label: 'Push Notifications', icon: Bell, action: () => Alert.alert('Settings', 'Notifications enabled.') },
        { id: 'security', label: 'Security & Password', icon: Lock, action: () => Alert.alert('Security', 'Password settings.') },
        { id: 'help', label: 'Support & Inquiry', icon: HelpCircle, action: () => Alert.alert('Support', 'Email: info@vireonsafety.in') },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header Title */}
        <View style={styles.header}>
          <Text style={styles.pageTitle}>Account Profile</Text>
        </View>

        {/* Profile Card */}
        <LinearGradient
          colors={[COLORS.primary, COLORS.secondary]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[styles.profileCard, SHADOW.card, { borderColor: COLORS.borderGreen }]}
        >
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <User size={36} color={COLORS.success} />
            </View>
            <View style={styles.verifiedDot}>
              <CheckCircle2 size={14} color={COLORS.success} />
            </View>
          </View>

          <Text style={styles.userName}>Student User</Text>
          <Text style={styles.userRole}>Industrial Safety Scholar</Text>
          <Text style={styles.userEmail}>student@vireonsafety.in</Text>

          {/* Badges */}
          <View style={styles.badgeRow}>
            <View style={styles.badgeItem}>
              <Shield size={10} color={COLORS.success} />
              <Text style={styles.badgeText}>Verified Account</Text>
            </View>
            <View style={styles.badgeItem}>
              <Award size={10} color={COLORS.success} />
              <Text style={styles.badgeText}>Govt. Registered</Text>
            </View>
          </View>
        </LinearGradient>

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
                      <Icon size={18} color={COLORS.success} />
                    </View>
                    <Text style={styles.menuLabel}>{item.label}</Text>
                    <ChevronRight size={16} color={COLORS.textMuted} />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}

        {/* Logout Button */}
        {token && (
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
            <LogOut size={18} color={COLORS.danger} />
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
  pageTitle: { fontSize: FONT_SIZE['2xl'], color: COLORS.textPrimary, fontWeight: '800' },

  profileCard: { borderRadius: BORDER_RADIUS.xl, borderWidth: 1, padding: SPACING.lg, alignItems: 'center', marginBottom: SPACING.xl },
  avatarWrap: { position: 'relative', marginBottom: 12 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(22,163,74,0.1)', borderWidth: 2, borderColor: COLORS.borderGreen, alignItems: 'center', justifyContent: 'center' },
  verifiedDot: { position: 'absolute', bottom: 0, right: 0, backgroundColor: COLORS.bg, borderRadius: 8 },
  userName: { fontSize: FONT_SIZE.lg, color: COLORS.textPrimary, fontWeight: '800' },
  userRole: { fontSize: FONT_SIZE.xs, color: COLORS.success, fontWeight: '600', marginTop: 2 },
  userEmail: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginTop: 2 },
  badgeRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  badgeItem: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: BORDER_RADIUS.full, backgroundColor: 'rgba(22,163,74,0.08)', borderWidth: 1, borderColor: COLORS.borderGreen },
  badgeText: { fontSize: 9, color: COLORS.success, fontWeight: '600' },

  menuSection: { marginBottom: SPACING.lg },
  sectionTitle: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, paddingLeft: 4 },
  menuGroup: { backgroundColor: COLORS.card, borderRadius: BORDER_RADIUS.xl, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md },
  menuBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  menuIconWrap: { width: 34, height: 34, borderRadius: BORDER_RADIUS.md, backgroundColor: 'rgba(22,163,74,0.08)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  menuLabel: { flex: 1, fontSize: FONT_SIZE.sm, color: COLORS.textPrimary, fontWeight: '600' },

  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(239,68,68,0.08)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)', paddingVertical: 14, borderRadius: BORDER_RADIUS.xl, marginTop: SPACING.md },
  logoutText: { fontSize: FONT_SIZE.sm, color: COLORS.danger, fontWeight: '700' },

  footerVersion: { alignItems: 'center', marginTop: 24 },
  versionText: { fontSize: 10, color: COLORS.textMuted },
});
