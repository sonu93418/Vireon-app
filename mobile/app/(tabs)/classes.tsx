import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useQuery } from '@tanstack/react-query';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Video, Calendar, Clock, User, ExternalLink } from 'lucide-react-native';
import { COLORS, SPACING, BORDER_RADIUS, SHADOW, FONT_SIZE } from '@/src/theme/tokens';
import apiClient from '@/src/services/api';

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

export default function ClassesScreen() {
  const [activeTab, setActiveTab] = useState('today');

  const { data: todayClasses, isLoading: todayLoading } = useQuery({
    queryKey: ['classes', 'today'],
    queryFn: async () => {
      const res = await apiClient.get<{ data: ClassItem[] }>('/classes/today');
      return res.data.data;
    },
  });

  const { data: upcomingClasses, isLoading: upcomingLoading } = useQuery({
    queryKey: ['classes', 'upcoming'],
    queryFn: async () => {
      const res = await apiClient.get<{ data: ClassItem[] }>('/classes/upcoming?limit=20');
      return res.data.data;
    },
  });

  const { data: allClasses, isLoading: allLoading } = useQuery({
    queryKey: ['classes', 'all'],
    queryFn: async () => {
      const res = await apiClient.get<{ data: ClassItem[] }>('/classes?limit=30');
      return res.data.data;
    },
  });

  const handleJoinClass = async (classId: string, zoomUrl: string) => {
    try {
      // Register attendee via API
      await apiClient.post(`/classes/${classId}/join`);
      if (zoomUrl) {
        const supported = await Linking.canOpenURL(zoomUrl);
        if (supported) {
          await Linking.openURL(zoomUrl);
        } else {
          Alert.alert('Join Class', `Zoom URL: ${zoomUrl}`);
        }
      }
    } catch {
      Alert.alert('Error', 'Unable to join session. Please try again.');
    }
  };

  const getActiveData = (): { data: ClassItem[]; loading: boolean } => {
    if (activeTab === 'today') return { data: todayClasses ?? [], loading: todayLoading };
    if (activeTab === 'upcoming') return { data: upcomingClasses ?? [], loading: upcomingLoading };
    return { data: allClasses ?? [], loading: allLoading };
  };

  const { data, loading } = getActiveData();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Online Classes</Text>
        <Text style={styles.pageSubtitle}>Live interactive sessions with expert trainers</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            onPress={() => setActiveTab(tab.id)}
            style={[styles.tabChip, activeTab === tab.id && styles.tabChipActive]}
          >
            {tab.id === 'today' && <View style={styles.liveDot} />}
            <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          {Array.from({ length: 3 }).map((_, i) => (
            <View key={i} style={styles.skeletonCard} />
          ))}
        </View>
      ) : (
        <FlashList
          data={data}
          keyExtractor={(item) => item._id}
          estimatedItemSize={160}
          contentContainerStyle={{ padding: SPACING.base }}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
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
            return (
              <Animated.View entering={FadeInDown.delay(index * 60).duration(350)}>
                <View style={[styles.classCard, SHADOW.card, isLive && styles.classCardLive]}>
                  {/* Status Banner */}
                  <View style={styles.cardHeader}>
                    <View style={styles.statusBadgeWrap}>
                      {isLive ? (
                        <View style={styles.liveBadge}>
                          <View style={styles.livePulseDot} />
                          <Text style={styles.liveBadgeText}>LIVE NOW</Text>
                        </View>
                      ) : (
                        <View style={styles.scheduledBadge}>
                          <Calendar size={10} color={COLORS.textMuted} />
                          <Text style={styles.scheduledBadgeText}>{item.status}</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.durationBadge}>
                      <Clock size={10} color={COLORS.textMuted} />
                      <Text style={styles.durationText}>{item.durationMinutes} mins</Text>
                    </View>
                  </View>

                  {/* Main Content */}
                  <Text style={styles.classTitle}>{item.title}</Text>
                  {item.courseId?.title && (
                    <Text style={styles.courseName}>{item.courseId.title}</Text>
                  )}

                  {/* Teacher & Time */}
                  <View style={styles.metaRow}>
                    <View style={styles.metaCol}>
                      <User size={12} color={COLORS.textMuted} />
                      <Text style={styles.metaVal}>{item.teacherId?.userId?.fullName ?? 'Faculty Trainer'}</Text>
                    </View>
                    <View style={styles.metaCol}>
                      <Calendar size={12} color={COLORS.textMuted} />
                      <Text style={styles.metaVal}>
                        {date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} at{' '}
                        {date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                      </Text>
                    </View>
                  </View>

                  {/* Join Action */}
                  <TouchableOpacity
                    style={[styles.joinBtn, isLive ? styles.joinBtnLive : styles.joinBtnScheduled]}
                    onPress={() => handleJoinClass(item._id, item.zoomJoinUrl)}
                    activeOpacity={0.85}
                  >
                    <Video size={14} color="#fff" />
                    <Text style={styles.joinBtnText}>{isLive ? 'Join Live Class Now' : 'Join Zoom Meeting'}</Text>
                    <ExternalLink size={12} color="#fff" />
                  </TouchableOpacity>
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
  skeletonCard: { height: 160, borderRadius: BORDER_RADIUS.xl, backgroundColor: 'rgba(255,255,255,0.04)' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyTitle: { fontSize: FONT_SIZE.md, color: COLORS.textPrimary, fontWeight: '700', marginTop: 12 },
  emptySubtitle: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, textAlign: 'center', marginTop: 4 },

  classCard: { backgroundColor: COLORS.card, borderRadius: BORDER_RADIUS.xl, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md },
  classCardLive: { borderColor: COLORS.borderGreen, backgroundColor: 'rgba(22,163,74,0.04)' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  statusBadgeWrap: { flexDirection: 'row', alignItems: 'center' },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(34,197,94,0.12)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: BORDER_RADIUS.full, borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)' },
  livePulseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.success },
  liveBadgeText: { fontSize: 9, color: COLORS.success, fontWeight: '800', letterSpacing: 0.5 },
  scheduledBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: BORDER_RADIUS.full, backgroundColor: 'rgba(255,255,255,0.05)' },
  scheduledBadgeText: { fontSize: 9, color: COLORS.textMuted, fontWeight: '700' },
  durationBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  durationText: { fontSize: 10, color: COLORS.textMuted },
  classTitle: { fontSize: FONT_SIZE.md, color: COLORS.textPrimary, fontWeight: '700', lineHeight: 22 },
  courseName: { fontSize: FONT_SIZE.xs, color: COLORS.success, fontWeight: '600', marginTop: 2 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: COLORS.border },
  metaCol: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaVal: { fontSize: 11, color: COLORS.textMuted },
  joinBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: BORDER_RADIUS.md },
  joinBtnLive: { backgroundColor: COLORS.accentGreen },
  joinBtnScheduled: { backgroundColor: COLORS.primary, borderWidth: 1, borderColor: COLORS.borderGreen },
  joinBtnText: { fontSize: FONT_SIZE.xs, color: '#fff', fontWeight: '700' },
});
