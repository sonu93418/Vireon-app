import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { FlashList } from '@shopify/flash-list';
import { useQuery } from '@tanstack/react-query';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Video, Calendar, Clock, ExternalLink } from 'lucide-react-native';
import { COLORS, SPACING, BORDER_RADIUS, SHADOW, FONT_SIZE } from '@/src/theme/tokens';
import apiClient, { getAccessToken, isLocalFallbackId } from '@/src/services/api';

interface ClassItem {
  _id: string;
  title: string;
  subject: string;
  description?: string;
  scheduledAt: string;
  durationMinutes: number;
  zoomJoinUrl: string;
  status: 'SCHEDULED' | 'LIVE' | 'COMPLETED' | 'CANCELLED';
  teacherId?: { designation?: string; userId?: { fullName: string } };
  courseId?: { title: string; code: string };
}

const TABS = [
  { id: 'today', label: "Today's Live" },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'all', label: 'All Classes' },
];

const getTeacherAvatarSource = (fullName?: string, profileUrl?: string) => {
  const name = (fullName ?? '').toLowerCase();
  const url = (profileUrl ?? '').toLowerCase();

  if (name.includes('gagan') || url.includes('gagan')) {
    return require('../../assets/teacher_gagan.png');
  }
  if (name.includes('prince') || url.includes('prince')) {
    return require('../../assets/teacher_prince.png');
  }
  if (name.includes('raj') || url.includes('raj')) {
    return require('../../assets/teacher_raj.png');
  }

  if (url && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:'))) {
    return { uri: url };
  }

  return null;
};

const DEFAULT_CLASSES: ClassItem[] = [
  {
    _id: 'cls-1',
    title: 'Industrial Safety Management & Hazard Mitigation Control',
    subject: 'Safety Engineering',
    description: 'Live interactive safety workshop on Factory Act compliance, risk matrix, and hazard mitigation.',
    scheduledAt: new Date().toISOString(),
    durationMinutes: 60,
    zoomJoinUrl: 'https://zoom.us/j/8921204921',
    status: 'LIVE',
    teacherId: { designation: 'Director & Chief Safety Officer', userId: { fullName: 'Dr. Gagan Verma (Gagan Sir)' } },
    courseId: { title: 'Diploma in Fire & Industrial Safety', code: 'DFIS-101' },
  },
  {
    _id: 'cls-2',
    title: 'Live Fire Fighting Equipment & Emergency Evacuation Protocol',
    subject: 'Fire Engineering',
    description: 'Live equipment demonstration on fire hydrants, gas detectors, and emergency evacuation drills.',
    scheduledAt: new Date(Date.now() + 86400000).toISOString(),
    durationMinutes: 90,
    zoomJoinUrl: 'https://zoom.us/j/8921204922',
    status: 'SCHEDULED',
    teacherId: { designation: 'Head of Industrial Safety & EHS', userId: { fullName: 'Prince Sir' } },
    courseId: { title: 'Advanced Diploma in Industrial Safety', code: 'ADIS-201' },
  },
  {
    _id: 'cls-3',
    title: 'ISO 45001 EHS Lead Auditing & Workplace Compliance Masterclass',
    subject: 'EHS Audit',
    description: 'Specialized masterclass on ISO 45001 auditing, safety management systems, and legal compliance.',
    scheduledAt: new Date(Date.now() + 172800000).toISOString(),
    durationMinutes: 120,
    zoomJoinUrl: 'https://zoom.us/j/8921204923',
    status: 'SCHEDULED',
    teacherId: { designation: 'Senior Faculty & Fire Lead', userId: { fullName: 'Raj Sir' } },
    courseId: { title: 'PG Diploma in Industrial Safety', code: 'PGDIS-301' },
  },
];

export default function ClassesScreen() {
  const [activeTab, setActiveTab] = useState('today');

  const { data: todayClasses, isLoading: todayLoading } = useQuery({
    queryKey: ['classes', 'today'],
    queryFn: async () => {
      const res = await apiClient.get<{ data: ClassItem[] }>('/classes/today');
      return res.data.data;
    },
    staleTime: 60_000,
    refetchInterval: 30_000,  // show new admin-scheduled classes within 30s
    retry: 1,
  });

  const { data: upcomingClasses, isLoading: upcomingLoading } = useQuery({
    queryKey: ['classes', 'upcoming'],
    queryFn: async () => {
      const res = await apiClient.get<{ data: ClassItem[] }>('/classes/upcoming?limit=20');
      return res.data.data;
    },
    staleTime: 60_000,
    refetchInterval: 30_000,
    retry: 1,
  });

  const { data: allClasses, isLoading: allLoading } = useQuery({
    queryKey: ['classes', 'all'],
    queryFn: async () => {
      const res = await apiClient.get<{ data: ClassItem[] }>('/classes?limit=30');
      return res.data.data;
    },
    staleTime: 60_000,
    refetchInterval: 30_000,
    retry: 1,
  });

  const handleJoinClass = async (classId: string, zoomUrl: string) => {
    const isLocal = isLocalFallbackId(classId);
    const isLoggedIn = !!getAccessToken();

    if (isLocal || !isLoggedIn) {
      if (zoomUrl) {
        const supported = await Linking.canOpenURL(zoomUrl).catch(() => false);
        if (supported) {
          await Linking.openURL(zoomUrl).catch(() => {});
        } else {
          Alert.alert('Join Live Class', `Tap OK to join Zoom session:\n\n${zoomUrl}`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Copy & Join', onPress: () => Linking.openURL(zoomUrl).catch(() => {}) },
          ]);
        }
      }
      return;
    }

    try {
      await apiClient.post(`/classes/${classId}/join`);
      if (zoomUrl) {
        const supported = await Linking.canOpenURL(zoomUrl).catch(() => false);
        if (supported) {
          await Linking.openURL(zoomUrl);
        } else {
          Alert.alert('Join Class', `Zoom URL: ${zoomUrl}`);
        }
      }
    } catch {
      Alert.alert('Join Session', `Connecting to live Zoom session:\n${zoomUrl}`);
    }
  };

  const getActiveData = (): { data: ClassItem[]; loading: boolean } => {
    let list: ClassItem[] = [];
    let loading = false;

    if (activeTab === 'today') {
      list = todayClasses ?? [];
      loading = todayLoading;
    } else if (activeTab === 'upcoming') {
      list = upcomingClasses ?? [];
      loading = upcomingLoading;
    } else {
      list = allClasses ?? [];
      loading = allLoading;
    }

    if (list.length === 0) {
      if (activeTab === 'today') {
        list = DEFAULT_CLASSES.filter((c) => c.status === 'LIVE' || c._id === 'cls-1');
      } else {
        list = DEFAULT_CLASSES;
      }
    }

    return { data: list, loading };
  };

  const { data, loading } = getActiveData();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" translucent animated />
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Live Online Classes</Text>
        <Text style={styles.pageSubtitle}>Interactive Zoom lectures & safety workshops</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              style={[styles.tabChip, isActive && styles.tabChipActive]}
              activeOpacity={0.8}
            >
              {tab.id === 'today' && <View style={styles.liveDot} />}
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* List */}
      {loading && data.length === 0 ? (
        <View style={styles.loadingContainer}>
          {Array.from({ length: 3 }).map((_, i) => (
            <View key={i} style={styles.skeletonCard} />
          ))}
        </View>
      ) : (
        <FlashList
          data={data}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: SPACING.base, paddingBottom: SPACING['4xl'] }}
          ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Video size={40} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>No classes found</Text>
              <Text style={styles.emptySubtitle}>Check back later for scheduled live sessions.</Text>
            </View>
          )}
          renderItem={({ item, index }) => {
            const date = new Date(item.scheduledAt);
            const isLive = item.status === 'LIVE';
            const teacherName = item.teacherId?.userId?.fullName ?? 'Faculty Trainer';
            const teacherImg = getTeacherAvatarSource(teacherName, (item.teacherId as any)?.profileImageUrl);

            return (
              <Animated.View entering={FadeInDown.delay(index * 60).duration(350)}>
                <View style={[styles.classCard, SHADOW.card, isLive && styles.classCardLive]}>
                  <LinearGradient
                    colors={isLive ? ['rgba(34,197,94,0.10)', 'rgba(34,197,94,0.01)'] : ['rgba(255,255,255,0.03)', 'transparent']}
                    style={styles.cardGradient}
                  >
                    {/* Accent Left Bar */}
                    <View style={[styles.accentBar, isLive ? styles.accentBarLive : styles.accentBarScheduled]} />

                    <View style={styles.cardInner}>
                      {/* Status & Duration */}
                      <View style={styles.cardHeader}>
                        <View style={styles.statusBadgeWrap}>
                          {isLive ? (
                            <View style={styles.liveBadge}>
                              <View style={styles.livePulseDot} />
                              <Text style={styles.liveBadgeText}>LIVE NOW</Text>
                            </View>
                          ) : (
                            <View style={styles.scheduledBadge}>
                              <Calendar size={11} color="#64748B" />
                              <Text style={styles.scheduledBadgeText}>UPCOMING SESSION</Text>
                            </View>
                          )}
                        </View>
                        <View style={styles.durationBadge}>
                          <Clock size={11} color={COLORS.textMuted} />
                          <Text style={styles.durationText}>{item.durationMinutes} mins</Text>
                        </View>
                      </View>

                      {/* Course Tag */}
                      {item.courseId?.title && (
                        <View style={styles.courseTag}>
                          <Text style={styles.courseTagText}>{item.courseId.code || 'COURSE'} • {item.courseId.title}</Text>
                        </View>
                      )}

                      {/* Title */}
                      <Text style={styles.classTitle}>{item.title}</Text>

                      {/* Trainer & Time Info */}
                      <View style={styles.trainerRow}>
                        <View style={styles.trainerAvatarSquare}>
                          {teacherImg ? (
                            <Image source={teacherImg} style={styles.trainerAvatarImg} resizeMode="cover" />
                          ) : (
                            <Text style={styles.trainerAvatarInitial}>{teacherName.charAt(0)}</Text>
                          )}
                        </View>
                        <View style={styles.trainerInfo}>
                          <Text style={styles.trainerName} numberOfLines={1}>{teacherName}</Text>
                          <Text style={styles.trainerDesig} numberOfLines={1}>
                            {item.teacherId?.designation ?? 'Industrial Safety Expert'}
                          </Text>
                        </View>
                        <View style={styles.timeBox}>
                          <Text style={styles.timeBoxDay}>{date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</Text>
                          <Text style={styles.timeBoxHour}>{date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</Text>
                        </View>
                      </View>

                      {/* Action Button */}
                      <TouchableOpacity
                        style={[styles.joinBtn, isLive ? styles.joinBtnLive : styles.joinBtnScheduled]}
                        onPress={() => handleJoinClass(item._id, item.zoomJoinUrl)}
                        activeOpacity={0.85}
                      >
                        <Video size={15} color="#fff" />
                        <Text style={styles.joinBtnText}>{isLive ? 'Join Live Class Now' : 'Join Zoom Meeting'}</Text>
                        <ExternalLink size={13} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  </LinearGradient>
                </View>
              </Animated.View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { paddingHorizontal: SPACING.base, paddingTop: SPACING.base, paddingBottom: SPACING.md },
  pageTitle: { fontSize: FONT_SIZE['2xl'], color: COLORS.textPrimary, fontWeight: '800' },
  pageSubtitle: { fontSize: FONT_SIZE.sm, color: COLORS.textMuted, marginTop: 2 },
  tabsRow: { flexDirection: 'row', paddingHorizontal: SPACING.base, gap: 8, paddingBottom: SPACING.md },
  tabChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, borderRadius: BORDER_RADIUS.full, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  tabChipActive: { backgroundColor: 'rgba(22,163,74,0.1)', borderColor: COLORS.borderGreen },
  tabText: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, fontWeight: '600' },
  tabTextActive: { color: COLORS.success },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.success },
  loadingContainer: { padding: SPACING.base, gap: 12 },
  skeletonCard: { height: 170, borderRadius: BORDER_RADIUS.xl, backgroundColor: 'rgba(255,255,255,0.04)' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyTitle: { fontSize: FONT_SIZE.md, color: COLORS.textPrimary, fontWeight: '700', marginTop: 12 },
  emptySubtitle: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, textAlign: 'center', marginTop: 4 },

  classCard: { backgroundColor: COLORS.card, borderRadius: BORDER_RADIUS.xl, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  classCardLive: { borderColor: COLORS.borderGreen },
  cardGradient: { position: 'relative' },
  accentBar: { position: 'absolute', top: 0, left: 0, bottom: 0, width: 4 },
  accentBarLive: { backgroundColor: COLORS.success },
  accentBarScheduled: { backgroundColor: COLORS.accentGreen },
  cardInner: { padding: SPACING.md, paddingLeft: SPACING.md + 6 },

  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  statusBadgeWrap: { flexDirection: 'row', alignItems: 'center' },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(34,197,94,0.12)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: BORDER_RADIUS.full, borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)' },
  livePulseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.success },
  liveBadgeText: { fontSize: 9, color: COLORS.success, fontWeight: '800', letterSpacing: 0.5 },
  scheduledBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: BORDER_RADIUS.full, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: COLORS.border },
  scheduledBadgeText: { fontSize: 9, color: COLORS.textMuted, fontWeight: '700', letterSpacing: 0.5 },
  durationBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  durationText: { fontSize: 11, color: COLORS.textMuted, fontWeight: '500' },

  courseTag: { alignSelf: 'flex-start', backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: COLORS.borderGreen, paddingHorizontal: 8, paddingVertical: 3, borderRadius: BORDER_RADIUS.sm, marginBottom: 6 },
  courseTagText: { fontSize: 10, color: '#047857', fontWeight: '700' },

  classTitle: { fontSize: FONT_SIZE.md, color: COLORS.textPrimary, fontWeight: '800', lineHeight: 22, marginBottom: 12 },

  trainerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: COLORS.border, borderBottomWidth: 1, borderBottomColor: COLORS.border, marginBottom: 12 },
  trainerAvatarSquare: { width: 44, height: 44, borderRadius: BORDER_RADIUS.md, backgroundColor: '#ECFDF5', borderWidth: 1.5, borderColor: COLORS.borderGreen, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  trainerAvatarImg: { width: '100%', height: '100%' },
  trainerAvatarInitial: { fontSize: FONT_SIZE.md, color: COLORS.success, fontWeight: '800' },
  trainerInfo: { flex: 1 },
  trainerName: { fontSize: FONT_SIZE.xs + 1, color: COLORS.textPrimary, fontWeight: '700' },
  trainerDesig: { fontSize: 10, color: COLORS.textMuted, marginTop: 1 },

  timeBox: { alignItems: 'flex-end', backgroundColor: 'rgba(255,255,255,0.04)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: BORDER_RADIUS.sm, borderWidth: 1, borderColor: COLORS.border },
  timeBoxDay: { fontSize: 11, color: COLORS.success, fontWeight: '800' },
  timeBoxHour: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600', marginTop: 1 },

  joinBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 11, borderRadius: BORDER_RADIUS.md },
  joinBtnLive: { backgroundColor: COLORS.accentGreen },
  joinBtnScheduled: { backgroundColor: COLORS.primary, borderWidth: 1, borderColor: COLORS.borderGreen },
  joinBtnText: { fontSize: FONT_SIZE.xs, color: '#fff', fontWeight: '800' },
});
