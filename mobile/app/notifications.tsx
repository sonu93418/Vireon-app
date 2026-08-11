import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  Bell,
  BellRing,
  BookOpen,
  Video,
  Megaphone,
  AlertTriangle,
  Info,
  Award,
  CheckCheck,
  ChevronRight,
  Sparkles,
  Trash2,
} from 'lucide-react-native';
import { COLORS, SPACING, BORDER_RADIUS, SHADOW, FONT_SIZE } from '@/src/theme/tokens';
import apiClient from '@/src/services/api';

interface NotifItem {
  _id: string;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  actionUrl?: string;
  actionText?: string;
}

const TABS = [
  { id: 'ALL', label: 'All Updates' },
  { id: 'UNREAD', label: 'Unread' },
  { id: 'CLASS', label: 'Live Classes' },
  { id: 'PLACEMENT', label: 'Placement' },
];

const NOTIF_CONFIGS: Record<
  string,
  { icon: typeof Bell; color: string; bg: string; border: string; gradient: [string, string]; label: string }
> = {
  CLASS_STARTED: {
    icon: Video,
    color: '#16A34A',
    bg: '#ECFDF5',
    border: '#A7F3D0',
    gradient: ['rgba(34,197,94,0.12)', 'rgba(34,197,94,0.02)'],
    label: 'LIVE CLASS',
  },
  CLASS_REMINDER: {
    icon: Video,
    color: '#2563EB',
    bg: '#EFF6FF',
    border: '#BFDBFE',
    gradient: ['rgba(37,99,235,0.10)', 'rgba(37,99,235,0.02)'],
    label: 'CLASS SCHEDULED',
  },
  COURSE_UPDATE: {
    icon: BookOpen,
    color: '#7C3AED',
    bg: '#F5F3FF',
    border: '#DDD6FE',
    gradient: ['rgba(124,58,237,0.10)', 'rgba(124,58,237,0.02)'],
    label: 'STUDY MATERIAL',
  },
  ANNOUNCEMENT: {
    icon: Megaphone,
    color: '#D97706',
    bg: '#FFFBEB',
    border: '#FDE68A',
    gradient: ['rgba(217,119,6,0.10)', 'rgba(217,119,6,0.02)'],
    label: 'ANNOUNCEMENT',
  },
  PLACEMENT: {
    icon: Award,
    color: '#059669',
    bg: '#ECFDF5',
    border: '#6EE7B7',
    gradient: ['rgba(16,185,129,0.12)', 'rgba(16,185,129,0.02)'],
    label: 'PLACEMENT DRIVE',
  },
  SYSTEM: {
    icon: AlertTriangle,
    color: '#DC2626',
    bg: '#FEF2F2',
    border: '#FECACA',
    gradient: ['rgba(220,38,38,0.10)', 'rgba(220,38,38,0.02)'],
    label: 'SYSTEM ALERT',
  },
  NEW_BLOG: {
    icon: Info,
    color: '#0891B2',
    bg: '#ECFEFF',
    border: '#A5F3FC',
    gradient: ['rgba(8,145,178,0.10)', 'rgba(8,145,178,0.02)'],
    label: 'SAFETY BLOG',
  },
};

const DEFAULT_NOTIFICATIONS: NotifItem[] = [
  {
    _id: 'n-1',
    title: '🔴 Live Workshop: Industrial Safety Management & Hazard Control',
    body: 'Dr. Gagan Verma (Director & CSO) is live now on Zoom. Tap to join the session immediately.',
    type: 'CLASS_STARTED',
    isRead: false,
    createdAt: new Date().toISOString(),
    actionText: 'Join Live Zoom Session',
  },
  {
    _id: 'n-2',
    title: '🔥 Fire Fighting & Emergency Evacuation Protocol Scheduled',
    body: 'Prince Sir scheduled a live equipment demonstration workshop for tomorrow at 11:00 AM IST.',
    type: 'CLASS_REMINDER',
    isRead: false,
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    actionText: 'View Class Details',
  },
  {
    _id: 'n-3',
    title: '🏆 Campus Placement Drive: Tata Projects & L&T EHS',
    body: 'Campus recruitment drive announced for ADIS and PGDIS students. Over 45+ Safety Officer openings.',
    type: 'PLACEMENT',
    isRead: true,
    createdAt: new Date(Date.now() - 3600000 * 18).toISOString(),
    actionText: 'Explore Placement Drive',
  },
  {
    _id: 'n-4',
    title: '📜 ISO 45001 EHS Lead Auditor Certification Batch Open',
    body: 'Raj Sir announced new weekend ISO 45001 Audit certification registrations. Limited batch size.',
    type: 'ANNOUNCEMENT',
    isRead: true,
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    actionText: 'View Course Details',
  },
  {
    _id: 'n-5',
    title: '📚 PDF Notes: Factory Act 1948 & OSHA Guidelines Uploaded',
    body: 'New PDF study modules and safety audit checklists have been added to the Resources section.',
    type: 'COURSE_UPDATE',
    isRead: true,
    createdAt: new Date(Date.now() - 3600000 * 72).toISOString(),
    actionText: 'Download PDF Notes',
  },
];

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

import { scheduleTestLockScreenNotification } from '@/src/services/notifications';
import { Alert } from 'react-native';

export default function NotificationsScreen() {
  const [activeTab, setActiveTab] = useState('ALL');
  const [refreshing, setRefreshing] = useState(false);
  const [readNotifs, setReadNotifs] = useState<Record<string, boolean>>({});
  const [deletedIds, setDeletedIds] = useState<Record<string, boolean>>({});
  const [testScheduled, setTestScheduled] = useState(false);

  const handleTestLockScreen = async () => {
    setTestScheduled(true);
    const success = await scheduleTestLockScreenNotification(5);
    if (success) {
      Alert.alert(
        '⏰ Test Lock Screen Alert Scheduled!',
        'Lock your phone screen NOW within 5 seconds!\n\nA high-priority notification with PUBLIC lock screen visibility will appear on your lock screen.',
        [{ text: 'OK, Locking Now!' }]
      );
    } else {
      Alert.alert(
        '⚠️ Notification Permission Required',
        'Please allow notification permissions in your phone Settings > Apps > Vireon > Notifications to see lock screen alerts.'
      );
    }
    setTimeout(() => setTestScheduled(false), 6000);
  };

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['notifications', 'mobile'],
    queryFn: async () => {
      try {
        const res = await apiClient.get<{ data: NotifItem[]; meta: { total: number } }>('/notifications/my?limit=50');
        if (res.data?.data && res.data.data.length > 0) {
          return res.data.data;
        }
      } catch {
        // Fallback gracefully
      }
      return DEFAULT_NOTIFICATIONS;
    },
    initialData: DEFAULT_NOTIFICATIONS,
  });

  const rawList = data && data.length > 0 ? data : DEFAULT_NOTIFICATIONS;

  const notifications = useMemo(() => {
    return rawList
      .filter((n) => !deletedIds[n._id])
      .map((n) => ({
        ...n,
        isRead: readNotifs[n._id] ?? n.isRead,
      }));
  }, [rawList, readNotifs, deletedIds]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.isRead).length, [notifications]);

  const filteredNotifications = useMemo(() => {
    if (activeTab === 'UNREAD') return notifications.filter((n) => !n.isRead);
    if (activeTab === 'CLASS') return notifications.filter((n) => n.type.includes('CLASS'));
    if (activeTab === 'PLACEMENT') return notifications.filter((n) => n.type === 'PLACEMENT');
    return notifications;
  }, [notifications, activeTab]);

  const handleMarkAllRead = async () => {
    const updated: Record<string, boolean> = {};
    notifications.forEach((n) => {
      updated[n._id] = true;
    });
    setReadNotifs(updated);
    try {
      await apiClient.patch('/notifications/my/read-all');
    } catch {
      // Ignore API failure
    }
  };

  const handleDeleteItem = (id: string) => {
    Alert.alert(
      'Delete Notification',
      'Are you sure you want to delete this notification message?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletedIds((prev) => ({ ...prev, [id]: true }));
            try {
              await apiClient.delete(`/notifications/${id}`);
            } catch {
              // Ignore API failure
            }
          },
        },
      ]
    );
  };

  const handleClearAll = () => {
    if (notifications.length === 0) return;
    Alert.alert(
      'Clear All Notifications',
      'Are you sure you want to clear all notification messages?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            const allDeleted: Record<string, boolean> = {};
            notifications.forEach((n) => {
              allDeleted[n._id] = true;
            });
            setDeletedIds((prev) => ({ ...prev, ...allDeleted }));
            try {
              await apiClient.delete('/notifications/my/clear-all');
            } catch {
              // Ignore API failure
            }
          },
        },
      ]
    );
  };

  const handleItemPress = (notif: NotifItem) => {
    setReadNotifs((prev) => ({ ...prev, [notif._id]: true }));
    if (notif.type === 'CLASS_STARTED' || notif.type === 'CLASS_REMINDER') {
      router.push('/classes');
    } else if (notif.type === 'COURSE_UPDATE') {
      router.push('/resources');
    } else if (notif.type === 'PLACEMENT') {
      router.push('/courses');
    }
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Navbar Header */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <ArrowLeft size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Notifications</Text>
          <Text style={styles.headerSubTitle}>
            {unreadCount > 0 ? `${unreadCount} unread updates` : 'All notifications read'}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <TouchableOpacity style={styles.markReadBtn} onPress={handleMarkAllRead} activeOpacity={0.85}>
            <CheckCheck size={13} color={COLORS.success} />
            <Text style={styles.markReadText}>Read</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.markReadBtn, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]} onPress={handleClearAll} activeOpacity={0.85}>
            <Trash2 size={13} color="#DC2626" />
            <Text style={[styles.markReadText, { color: '#DC2626' }]}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Lock Screen Test Banner */}
      <TouchableOpacity
        style={{
          marginHorizontal: SPACING.base,
          marginTop: SPACING.sm,
          padding: 10,
          backgroundColor: '#EFF6FF',
          borderRadius: BORDER_RADIUS.lg,
          borderWidth: 1,
          borderColor: '#BFDBFE',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
        onPress={handleTestLockScreen}
        disabled={testScheduled}
        activeOpacity={0.8}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
          <Sparkles size={16} color="#2563EB" />
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#1E40AF' }}>
            {testScheduled ? '⏰ Lock screen NOW within 5s...' : '⚡ Test Lock Screen Alert (5s Delay)'}
          </Text>
        </View>
        <View style={{ backgroundColor: '#2563EB', paddingHorizontal: 10, paddingVertical: 4, borderRadius: BORDER_RADIUS.md }}>
          <Text style={{ fontSize: 10, fontWeight: '800', color: '#FFF' }}>Test Now</Text>
        </View>
      </TouchableOpacity>

      {/* Filter Tabs */}
      <View style={styles.tabsRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: SPACING.base, gap: 8 }}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const count = tab.id === 'UNREAD' ? unreadCount : null;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                style={[styles.tabChip, isActive && styles.tabChipActive]}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{tab.label}</Text>
                {count !== null && count > 0 && (
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>{count}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Notification Stream */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.success} colors={[COLORS.success]} />}
      >
        {isLoading && !notifications ? (
          Array.from({ length: 4 }).map((_, i) => (
            <View key={i} style={[styles.notifCard, styles.skeleton]} />
          ))
        ) : filteredNotifications.length === 0 ? (
          <Animated.View entering={FadeInDown.duration(400)} style={styles.emptyState}>
            <View style={styles.emptyIconBg}>
              <Bell size={36} color={COLORS.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>No Notifications Found</Text>
            <Text style={styles.emptySubtitle}>You're all caught up with your institute updates!</Text>
          </Animated.View>
        ) : (
          filteredNotifications.map((notif, i) => {
            const config = NOTIF_CONFIGS[notif.type] ?? NOTIF_CONFIGS.ANNOUNCEMENT;
            const IconComponent = config.icon;
            const isLive = notif.type === 'CLASS_STARTED';

            return (
              <Animated.View key={notif._id} entering={FadeInDown.delay(i * 60).duration(350)}>
                <TouchableOpacity
                  style={[styles.notifCard, SHADOW.card, !notif.isRead && styles.notifUnread]}
                  onPress={() => handleItemPress(notif)}
                  activeOpacity={0.88}
                >
                  <LinearGradient colors={config.gradient} style={styles.cardGradient}>
                    {/* Unread Glowing Accent Line */}
                    {!notif.isRead && <View style={[styles.unreadBar, { backgroundColor: config.color }]} />}

                    <View style={styles.cardInner}>
                      {/* Top Row: Category Tag + Time */}
                      <View style={styles.cardHeaderRow}>
                        <View style={[styles.categoryBadge, { backgroundColor: config.bg, borderColor: config.border }]}>
                          {isLive && <View style={styles.livePulseDot} />}
                          <Text style={[styles.categoryBadgeText, { color: config.color }]}>{config.label}</Text>
                        </View>
                        <Text style={styles.timeAgoText}>{formatTimeAgo(notif.createdAt)}</Text>
                      </View>

                      {/* Main Body: Icon + Title & Description */}
                      <View style={styles.bodyRow}>
                        <View style={[styles.iconBox, { backgroundColor: config.bg, borderColor: config.border }]}>
                          <IconComponent size={20} color={config.color} />
                        </View>
                        <View style={styles.textWrap}>
                          <Text style={[styles.notifTitle, !notif.isRead && styles.notifTitleUnread]} numberOfLines={2}>
                            {notif.title}
                          </Text>
                          <Text style={styles.notifBodyText} numberOfLines={3}>{notif.body}</Text>
                        </View>
                      </View>

                      {/* Action Footer */}
                      <View style={styles.actionFooter}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                          <Text style={[styles.actionBtnText, { color: config.color }]}>
                            {notif.actionText ?? 'Tap to View Details'}
                          </Text>
                          <ChevronRight size={14} color={config.color} />
                        </View>
                        <TouchableOpacity
                          onPress={(e) => {
                            e.stopPropagation();
                            handleDeleteItem(notif._id);
                          }}
                          style={{ padding: 4, borderRadius: 6, backgroundColor: 'rgba(239, 68, 68, 0.08)' }}
                          activeOpacity={0.7}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <Trash2 size={14} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
            );
          })
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  navBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.base, paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backBtn: { padding: 4, marginRight: 10 },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: FONT_SIZE.lg, color: COLORS.textPrimary, fontWeight: '800' },
  headerSubTitle: { fontSize: 11, color: COLORS.success, fontWeight: '700', marginTop: 1 },
  markReadBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#ECFDF5', borderRadius: BORDER_RADIUS.full, borderWidth: 1, borderColor: COLORS.borderGreen },
  markReadText: { fontSize: 10, color: COLORS.success, fontWeight: '800' },

  tabsRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tabChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 7, borderRadius: BORDER_RADIUS.full, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  tabChipActive: { backgroundColor: 'rgba(22,163,74,0.1)', borderColor: COLORS.borderGreen },
  tabText: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, fontWeight: '600' },
  tabTextActive: { color: COLORS.success, fontWeight: '800' },
  countBadge: { backgroundColor: COLORS.success, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  countBadgeText: { fontSize: 9, color: '#fff', fontWeight: '800' },

  scrollContent: { padding: SPACING.base, paddingBottom: SPACING['4xl'] },

  notifCard: { backgroundColor: COLORS.card, borderRadius: BORDER_RADIUS.xl, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden', marginBottom: 12 },
  notifUnread: { borderColor: COLORS.borderGreen },
  cardGradient: { position: 'relative' },
  unreadBar: { position: 'absolute', top: 0, left: 0, bottom: 0, width: 4 },
  cardInner: { padding: SPACING.md, paddingLeft: SPACING.md + 4 },

  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  categoryBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: BORDER_RADIUS.sm, borderWidth: 1 },
  livePulseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.success },
  categoryBadgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  timeAgoText: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600' },

  bodyRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  iconBox: { width: 42, height: 42, borderRadius: BORDER_RADIUS.lg, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  textWrap: { flex: 1 },
  notifTitle: { fontSize: FONT_SIZE.xs + 1, color: COLORS.textPrimary, fontWeight: '700', lineHeight: 19 },
  notifTitleUnread: { fontWeight: '800' },
  notifBodyText: { fontSize: 11, color: COLORS.textMuted, marginTop: 3, lineHeight: 17 },

  actionFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: COLORS.border },
  actionBtnText: { fontSize: 11, fontWeight: '800' },

  emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyIconBg: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyTitle: { fontSize: FONT_SIZE.md, color: COLORS.textPrimary, fontWeight: '800' },
  emptySubtitle: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, textAlign: 'center', marginTop: 4 },

  skeleton: { height: 110, backgroundColor: 'rgba(255,255,255,0.04)' },
});
