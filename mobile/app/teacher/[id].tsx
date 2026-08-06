import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Award, Video, Calendar, Star, CheckCircle } from 'lucide-react-native';
import { COLORS, SPACING, BORDER_RADIUS, SHADOW, FONT_SIZE } from '@/src/theme/tokens';
import apiClient from '@/src/services/api';

interface ClassItem {
  _id: string;
  title: string;
  scheduledAt: string;
  durationMinutes: number;
  zoomJoinUrl: string;
  status: string;
}

interface TeacherDetail {
  teacher: {
    _id: string;
    designation: string;
    qualifications: string[];
    specializations: string[];
    certifications: string[];
    experienceYears: number;
    rating: number;
    profileImageUrl?: string;
    userId?: { fullName: string; email?: string; avatarUrl?: string };
  };
  upcomingClasses: ClassItem[];
}

export default function TeacherDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ['teacher', id],
    queryFn: async () => {
      const res = await apiClient.get<{ data: TeacherDetail }>(`/teachers/${id}`);
      return res.data.data;
    },
    enabled: !!id,
  });

  if (isLoading || !data) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingWrap}>
          <Text style={styles.loadingText}>Loading trainer profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const { teacher, upcomingClasses } = data;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Trainer Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={[styles.profileHeader, SHADOW.card]}>
          <View style={styles.avatarWrap}>
            {teacher.profileImageUrl || teacher.userId?.avatarUrl ? (
              <Image source={{ uri: teacher.profileImageUrl ?? teacher.userId?.avatarUrl }} style={styles.avatarImg} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{teacher.userId?.fullName?.charAt(0) ?? 'T'}</Text>
              </View>
            )}
            <View style={styles.checkBadge}>
              <CheckCircle size={14} color={COLORS.success} />
            </View>
          </View>
          <Text style={styles.name}>{teacher.userId?.fullName ?? 'Industrial Expert Trainer'}</Text>
          <Text style={styles.designation}>{teacher.designation}</Text>
          <View style={styles.ratingRow}>
            <Star size={14} color="#F59E0B" fill="#F59E0B" />
            <Text style={styles.ratingText}>{teacher.rating} • {teacher.experienceYears} Years Exp.</Text>
          </View>

          {/* Certifications Badges */}
          <View style={styles.certRow}>
            {teacher.certifications.map((cert) => (
              <View key={cert} style={styles.certChip}>
                <Award size={10} color={COLORS.success} />
                <Text style={styles.certText}>{cert.replace(/_/g, ' ')}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Specializations & Qualifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Qualifications & Specializations</Text>
          <View style={[styles.infoCard, SHADOW.card]}>
            <Text style={styles.infoLabel}>Qualifications:</Text>
            <Text style={styles.infoVal}>{teacher.qualifications.join(' • ')}</Text>
            <View style={styles.divider} />
            <Text style={styles.infoLabel}>Subjects & Specializations:</Text>
            <Text style={styles.infoVal}>{teacher.specializations.join(' • ')}</Text>
          </View>
        </View>

        {/* Conducted / Scheduled Classes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Classes Conducted by Trainer</Text>
          {upcomingClasses.length === 0 ? (
            <View style={[styles.infoCard, styles.emptyClasses]}>
              <Text style={styles.emptyText}>No active scheduled classes for this trainer.</Text>
            </View>
          ) : (
            upcomingClasses.map((cls) => (
              <View key={cls._id} style={[styles.classItem, SHADOW.card]}>
                <View style={styles.classInfo}>
                  <Text style={styles.classTitle}>{cls.title}</Text>
                  <Text style={styles.classMeta}>
                    📅 {new Date(cls.scheduledAt).toLocaleDateString('en-IN')} • {cls.durationMinutes} mins
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.joinBtn}
                  onPress={() => Linking.openURL(cls.zoomJoinUrl)}
                >
                  <Video size={12} color="#fff" />
                  <Text style={styles.joinText}>Join</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  navBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.base, paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backBtn: { padding: 4, marginRight: 12 },
  navTitle: { fontSize: FONT_SIZE.lg, color: COLORS.textPrimary, fontWeight: '700' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: COLORS.textMuted, fontSize: FONT_SIZE.sm },
  content: { padding: SPACING.base, paddingBottom: SPACING['4xl'] },

  profileHeader: { backgroundColor: COLORS.card, borderRadius: BORDER_RADIUS.xl, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.lg, alignItems: 'center', marginBottom: SPACING.lg },
  avatarWrap: { position: 'relative', marginBottom: 12 },
  avatarImg: { width: 80, height: 80, borderRadius: 40, borderWidth: 2, borderColor: COLORS.borderGreen },
  avatarPlaceholder: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(22,163,74,0.1)', borderWidth: 2, borderColor: COLORS.borderGreen, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: FONT_SIZE['3xl'], color: COLORS.success, fontWeight: '800' },
  checkBadge: { position: 'absolute', bottom: 2, right: 2, backgroundColor: COLORS.bg, borderRadius: 8 },
  name: { fontSize: FONT_SIZE.xl, color: COLORS.textPrimary, fontWeight: '800' },
  designation: { fontSize: FONT_SIZE.xs, color: COLORS.success, fontWeight: '600', marginTop: 2 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  ratingText: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted },
  certRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12, justifyContent: 'center' },
  certChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: BORDER_RADIUS.full, backgroundColor: 'rgba(22,163,74,0.08)', borderWidth: 1, borderColor: COLORS.borderGreen },
  certText: { fontSize: 10, color: COLORS.success, fontWeight: '600' },

  section: { marginBottom: SPACING.lg },
  sectionTitle: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, paddingLeft: 4 },
  infoCard: { backgroundColor: COLORS.card, borderRadius: BORDER_RADIUS.xl, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md },
  infoLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, fontWeight: '600' },
  infoVal: { fontSize: FONT_SIZE.sm, color: COLORS.textPrimary, fontWeight: '600', marginTop: 2 },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 10 },
  emptyClasses: { alignItems: 'center', padding: SPACING.lg },
  emptyText: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted },

  classItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.card, borderRadius: BORDER_RADIUS.md, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, marginBottom: 8 },
  classInfo: { flex: 1 },
  classTitle: { fontSize: FONT_SIZE.xs, color: COLORS.textPrimary, fontWeight: '700' },
  classMeta: { fontSize: 10, color: COLORS.textMuted, marginTop: 2 },
  joinBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.accentGreen, paddingHorizontal: 12, paddingVertical: 6, borderRadius: BORDER_RADIUS.sm },
  joinText: { fontSize: 11, color: '#fff', fontWeight: '700' },
});
