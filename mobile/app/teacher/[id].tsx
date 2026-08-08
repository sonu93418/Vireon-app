import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Award, Video, Calendar, Star, CheckCircle } from 'lucide-react-native';
import { COLORS, SPACING, BORDER_RADIUS, SHADOW, FONT_SIZE } from '@/src/theme/tokens';
import apiClient from '@/src/services/api';
import { getCacheData, setCacheData } from '@/src/services/queryCache';

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
    localImage?: any;
    userId?: { fullName: string; email?: string; avatarUrl?: string };
  };
  upcomingClasses: ClassItem[];
}

const FALLBACK_TEACHERS: Record<string, TeacherDetail> = {
  't-gagan': {
    teacher: {
      _id: 't-gagan',
      designation: 'Director & Chief Safety Officer',
      qualifications: ['Ph.D in Industrial Safety', 'M.Tech EHS Management'],
      specializations: ['Process Safety', 'Hazard Identification', 'EHS Governance'],
      certifications: ['Ph.D Safety', 'NEBOSH IGC', 'ISO 45001 Lead Auditor'],
      experienceYears: 18,
      rating: 4.9,
      localImage: require('../../assets/teacher_gagan.png'),
      userId: { fullName: 'Dr. Gagan Verma (Gagan Sir)', email: 'gagan@vireonsafety.in' },
    },
    upcomingClasses: [],
  },
  't-prince': {
    teacher: {
      _id: 't-prince',
      designation: 'Head of Industrial Safety & EHS',
      qualifications: ['ADIS (Advanced Diploma in Industrial Safety)', 'B.Sc Fire & Safety'],
      specializations: ['Fire Engineering', 'Risk Assessment', 'Hazardous Chemical Handling'],
      certifications: ['OSHA Authorized Trainer', 'ADIS Certified'],
      experienceYears: 12,
      rating: 4.8,
      localImage: require('../../assets/teacher_prince.png'),
      userId: { fullName: 'Prince Sir', email: 'prince@vireonsafety.in' },
    },
    upcomingClasses: [],
  },
  't-raj': {
    teacher: {
      _id: 't-raj',
      designation: 'Senior Faculty & Fire Engineering Lead',
      qualifications: ['B.Tech in Fire & Safety Engineering'],
      specializations: ['ISO 45001 System Audit', 'Fire Protection & Suppression Systems'],
      certifications: ['ISO 45001 Lead Auditor', 'B.Tech FSE'],
      experienceYears: 10,
      rating: 4.9,
      localImage: require('../../assets/teacher_raj.png'),
      userId: { fullName: 'Raj Sir', email: 'raj@vireonsafety.in' },
    },
    upcomingClasses: [],
  },
};

const getTeacherAvatarSource = (
  fullName?: string,
  profileImageUrl?: string,
  avatarUrl?: string,
  localImage?: any
) => {
  if (localImage) return localImage;
  const name = (fullName ?? '').toLowerCase();
  const url = (profileImageUrl ?? avatarUrl ?? '').toLowerCase();

  if (name.includes('gagan') || url.includes('gagan')) {
    return require('../../assets/teacher_gagan.png');
  }
  if (name.includes('prince') || url.includes('prince')) {
    return require('../../assets/teacher_prince.png');
  }
  if (name.includes('raj') || url.includes('raj')) {
    return require('../../assets/teacher_raj.png');
  }

  const validUrl = profileImageUrl || avatarUrl;
  if (validUrl && (validUrl.startsWith('http://') || validUrl.startsWith('https://') || validUrl.startsWith('data:'))) {
    return { uri: validUrl };
  }

  return null;
};

export default function TeacherDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const isLocalId = id ? (id.startsWith('t-') || id.startsWith('dflt-')) : false;

  const { data, isLoading } = useQuery({
    queryKey: ['teacher', id],
    queryFn: async () => {
      if (isLocalId && id && FALLBACK_TEACHERS[id]) {
        return FALLBACK_TEACHERS[id];
      }
      try {
        const res = await apiClient.get<{ data: TeacherDetail }>(`/teachers/${id}`);
        if (res.data?.data) {
          setCacheData(`teacher_detail_${id}`, res.data.data);
        }
        return res.data.data;
      } catch {
        return id && FALLBACK_TEACHERS[id] ? FALLBACK_TEACHERS[id] : null;
      }
    },
    initialData: () => getCacheData<TeacherDetail>(`teacher_detail_${id}`) ?? (id && FALLBACK_TEACHERS[id] ? FALLBACK_TEACHERS[id] : undefined),
    staleTime: 5 * 60 * 1000,
    enabled: !!id,
  });

  const detail = data ?? (id && FALLBACK_TEACHERS[id] ? FALLBACK_TEACHERS[id] : null);

  if (isLoading && !detail) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingWrap}>
          <Text style={styles.loadingText}>Loading trainer profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const teacher = detail?.teacher ?? {
    _id: 'default',
    designation: 'Safety Instructor',
    qualifications: ['B.Sc Safety'],
    specializations: ['Industrial Safety'],
    certifications: ['OSHA_CERTIFIED'],
    experienceYears: 10,
    rating: 4.9,
    userId: { fullName: 'Faculty Member' },
  };
  const upcomingClasses = detail?.upcomingClasses ?? [];

  const avatarSrc = getTeacherAvatarSource(
    teacher.userId?.fullName,
    teacher.profileImageUrl,
    teacher.userId?.avatarUrl,
    teacher.localImage
  );

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
            <View style={styles.avatarSquare}>
              {avatarSrc ? (
                <Image source={avatarSrc} style={styles.avatarImgSquare} resizeMode="cover" />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>{teacher.userId?.fullName?.charAt(0) ?? 'T'}</Text>
                </View>
              )}
            </View>
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
            {(teacher.certifications ?? []).map((cert) => (
              <View key={cert} style={styles.certChip}>
                <Award size={10} color={COLORS.success} />
                <Text style={styles.certText}>{cert.replace(/_/g, ' ')}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Specializations & Qualifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Specializations & Expertise</Text>
          <View style={styles.infoCard}>
            {(teacher.specializations ?? []).map((spec, i) => (
              <View key={spec}>
                {i > 0 && <View style={styles.divider} />}
                <Text style={styles.infoLabel}>Domain {i + 1}</Text>
                <Text style={styles.infoVal}>{spec}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Qualifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Academic Qualifications</Text>
          <View style={styles.infoCard}>
            {(teacher.qualifications ?? []).map((q, i) => (
              <View key={i}>
                {i > 0 && <View style={styles.divider} />}
                <Text style={styles.infoVal}>{typeof q === 'string' ? q : (q as any)?.degree ?? 'Degree'}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Upcoming Classes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upcoming Sessions</Text>
          {upcomingClasses.length === 0 ? (
            <View style={styles.infoCard}>
              <View style={styles.emptyClasses}>
                <Calendar size={24} color={COLORS.textMuted} />
                <Text style={[styles.emptyText, { marginTop: 4 }]}>No live sessions scheduled right now.</Text>
              </View>
            </View>
          ) : (
            upcomingClasses.map((cls) => (
              <View key={cls._id} style={styles.classItem}>
                <View style={styles.classInfo}>
                  <Text style={styles.classTitle}>{cls.title}</Text>
                  <Text style={styles.classMeta}>
                    {new Date(cls.scheduledAt).toLocaleString('en-IN', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
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
  avatarSquare: { width: 90, height: 90, borderRadius: BORDER_RADIUS.xl, backgroundColor: '#ECFDF5', borderWidth: 2, borderColor: COLORS.borderGreen, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  avatarImgSquare: { width: '100%', height: '100%', borderRadius: BORDER_RADIUS.lg },
  avatarPlaceholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: FONT_SIZE['3xl'], color: COLORS.success, fontWeight: '800' },
  checkBadge: { position: 'absolute', bottom: -2, right: -2, backgroundColor: COLORS.bg, borderRadius: 10, padding: 2 },
  name: { fontSize: FONT_SIZE.xl, color: COLORS.textPrimary, fontWeight: '800', textAlign: 'center' },
  designation: { fontSize: FONT_SIZE.xs, color: COLORS.success, fontWeight: '600', marginTop: 2, textAlign: 'center' },
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
