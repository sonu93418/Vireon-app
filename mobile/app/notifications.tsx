import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  Trash2,
  Sparkles,
  ShieldCheck,
} from 'lucide-react-native';
import { COLORS, SPACING, BORDER_RADIUS, SHADOW, FONT_SIZE } from '@/src/theme/tokens';
import apiClient, { getAccessToken } from '@/src/services/api';

const ASYNC_STORAGE_DELETED_KEY = '@vireon_deleted_notifications_v2';
const ASYNC_STORAGE_READ_KEY = '@vireon_read_notifications_v2';
const VSI_LOGO = require('@/assets/vsi_logo.png');

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

function formatTimeAgo(dateStr: string): string {
  if (!dateStr) return 'Recently';
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

export default function NotificationsScreen() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('ALL');
  const [refreshing, setRefreshing] = useState(false);
  const [deletedIds, setDeletedIds] = useState<Record<string, boolean>>({});
  const [readNotifs, setReadNotifs] = useState<Record<string, boolean>>({});
  const [storageLoaded, setStorageLoaded] = useState(false);

  // Load persistent deleted & read IDs on mount
  useEffect(() => {
    const loadSavedState = async () => {
      try {
        const [savedDeleted, savedRead] = await Promise.all([
          AsyncStorage.getItem(ASYNC_STORAGE_DELETED_KEY),
          AsyncStorage.getItem(ASYNC_STORAGE_READ_KEY),
        ]);
        if (savedDeleted) {
          setDeletedIds(JSON.parse(savedDeleted));
        }
        if (savedRead) {
          setReadNotifs(JSON.parse(savedRead));
        }
      } catch (err) {
        console.warn('⚠️ Could not load saved notifications state:', err);
      } finally {
        setStorageLoaded(true);
      }
    };
    loadSavedState();
  }, []);

  // Fetch notifications from server
  const { data: serverNotifications, isLoading, refetch } = useQuery<NotifItem[]>({
    queryKey: ['notifications', 'mobile'],
    queryFn: async () => {
      try {
        const res = await apiClient.get<{ data: NotifItem[]; meta: { total: number } }>(
          '/notifications/my?limit=100'
        );
        if (res.data?.data && Array.isArray(res.data.data)) {
          return res.data.data;
        }
      } catch (err) {
        console.warn('⚠️ /notifications/my API error:', err);
      }
      return [];
    },
    initialData: () => queryClient.getQueryData<NotifItem[]>(['notifications', 'mobile']) ?? [],
    staleTime: 10 * 1000,
    refetchInterval: 30 * 1000,
  });

  const rawList = serverNotifications || [];

  // Filter out deleted notifications and apply read states
  const notifications = useMemo(() => {
    return rawList
      .filter((n) => !deletedIds[n._id])
      .map((n) => ({
        ...n,
        isRead: readNotifs[n._id] !== undefined ? readNotifs[n._id] : Boolean(n.isRead),
      }));
  }, [rawList, deletedIds, readNotifs]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  const filteredNotifications = useMemo(() => {
    if (activeTab === 'UNREAD') return notifications.filter((n) => !n.isRead);
    if (activeTab === 'CLASS') return notifications.filter((n) => n.type.includes('CLASS'));
    if (activeTab === 'PLACEMENT') return notifications.filter((n) => n.type === 'PLACEMENT');
    return notifications;
  }, [notifications, activeTab]);

  // Pull-to-refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    setRefreshing(false);
  }, [refetch, queryClient]);

  // Mark all notifications as read
  const handleMarkAllRead = async () => {
    const updated: Record<string, boolean> = { ...readNotifs };
    notifications.forEach((n) => {
      updated[n._id] = true;
    });
    setReadNotifs(updated);
    void AsyncStorage.setItem(ASYNC_STORAGE_READ_KEY, JSON.stringify(updated));

    // Update unread count badge immediately
    queryClient.setQueryData(['notifications', 'unread-count'], 0);

    try {
      await apiClient.patch('/notifications/my/read-all');
    } catch {
      // Backend error ignored
    }
  };

  // Single Notification Delete
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
            // Persist deleted ID locally so it never reappears
            const newDeleted = { ...deletedIds, [id]: true };
            setDeletedIds(newDeleted);
            void AsyncStorage.setItem(ASYNC_STORAGE_DELETED_KEY, JSON.stringify(newDeleted));

            // Optimistically update React Query cache
            const updated = (serverNotifications || []).filter((n) => n._id !== id);
            queryClient.setQueryData(['notifications', 'mobile'], updated);

            // Update badge unread count
            const remainingUnread = updated.filter((n) => !n.isRead && !newDeleted[n._id]).length;
            queryClient.setQueryData(['notifications', 'unread-count'], remainingUnread);

            try {
              await apiClient.delete(`/notifications/${id}`);
            } catch {
              // Ignore API network errors
            }
          },
        },
      ]
    );
  };

  // Clear All Notifications
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
            const allDeleted: Record<string, boolean> = { ...deletedIds };
            notifications.forEach((n) => {
              allDeleted[n._id] = true;
            });

            // Save to AsyncStorage
            setDeletedIds(allDeleted);
            void AsyncStorage.setItem(ASYNC_STORAGE_DELETED_KEY, JSON.stringify(allDeleted));

            // Clear cache
            queryClient.setQueryData(['notifications', 'mobile'], []);
            queryClient.setQueryData(['notifications', 'unread-count'], 0);

            try {
              await apiClient.delete('/notifications/my/clear-all');
            } catch {
              // Ignore network errors
            }
          },
        },
      ]
    );
  };

  // Action Click on Notification
  const handleNotificationAction = (item: NotifItem) => {
    // Mark this item as read
    if (!item.isRead) {
      const updatedRead = { ...readNotifs, [item._id]: true };
      setReadNotifs(updatedRead);
      void AsyncStorage.setItem(ASYNC_STORAGE_READ_KEY, JSON.stringify(updatedRead));
      void apiClient.patch(`/notifications/${item._id}/read`).catch(() => {});
    }

    // Navigate to respective feature
    const t = (item.type || '').toUpperCase();
    if (t.includes('CLASS')) {
      router.push('/(tabs)/classes');
    } else if (t.includes('COURSE') || t.includes('MATERIAL')) {
      router.push('/(tabs)/resources');
    } else if (t.includes('PLACEMENT')) {
      router.push('/(tabs)/courses');
    } else if (item.actionUrl) {
      router.push(item.actionUrl as any);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" translucent animated />

      {/* ── Top Header Navigation Bar ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <ArrowLeft size={20} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Image source={VSI_LOGO} style={styles.headerLogo} resizeMode="contain" />
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>

        <View style={styles.headerActions}>
          {unreadCount > 0 && (
            <TouchableOpacity style={styles.headerActionBtn} onPress={handleMarkAllRead} activeOpacity={0.8}>
              <CheckCheck size={18} color="#A7F3D0" />
            </TouchableOpacity>
          )}
          {notifications.length > 0 && (
            <TouchableOpacity style={styles.headerActionBtn} onPress={handleClearAll} activeOpacity={0.8}>
              <Trash2 size={18} color="#FECACA" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Filter Tabs ── */}
      <View style={styles.tabsRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContent}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tabChip, isActive && styles.tabChipActive]}
                onPress={() => setActiveTab(tab.id)}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabChipText, isActive && styles.tabChipTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Notifications Stream ── */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#16A34A"
            colors={['#16A34A']}
          />
        }
      >
        {isLoading && !storageLoaded ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#16A34A" />
            <Text style={styles.loadingText}>Syncing updates...</Text>
          </View>
        ) : filteredNotifications.length === 0 ? (
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIconCircle}>
              <BellRing size={36} color="#16A34A" />
            </View>
            <Text style={styles.emptyTitle}>No Notifications</Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === 'UNREAD'
                ? "You've read all your updates! Pull down to refresh anytime."
                : "You're all caught up! New live classes, placement alerts, and notes will appear here."}
            </Text>
            <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh} activeOpacity={0.8}>
              <Text style={styles.refreshBtnText}>Check for Updates</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.notifList}>
            {filteredNotifications.map((item, index) => {
              const cfg = NOTIF_CONFIGS[item.type] || NOTIF_CONFIGS.SYSTEM;
              const IconComp = cfg.icon;

              return (
                <Animated.View key={item._id} entering={FadeInDown.delay(index * 40).duration(300)}>
                  <TouchableOpacity
                    style={[
                      styles.notifCard,
                      SHADOW.card,
                      !item.isRead && styles.notifCardUnread,
                    ]}
                    onPress={() => handleNotificationAction(item)}
                    activeOpacity={0.9}
                  >
                    <LinearGradient
                      colors={cfg.gradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.cardGradient}
                    >
                      <View style={styles.cardHeaderRow}>
                        {/* Type Icon */}
                        <View style={[styles.iconWrap, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
                          <IconComp size={18} color={cfg.color} strokeWidth={2} />
                        </View>

                        {/* Tag & Time */}
                        <View style={styles.cardMetaWrap}>
                          <View style={[styles.typeBadge, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
                            <Text style={[styles.typeBadgeText, { color: cfg.color }]}>
                              {cfg.label}
                            </Text>
                          </View>
                          <Text style={styles.timeText}>{formatTimeAgo(item.createdAt)}</Text>
                        </View>

                        {/* Individual Delete Button */}
                        <TouchableOpacity
                          style={styles.deleteSingleBtn}
                          onPress={() => handleDeleteItem(item._id)}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          activeOpacity={0.7}
                        >
                          <Trash2 size={15} color="#94A3B8" />
                        </TouchableOpacity>
                      </View>

                      {/* Title & Body */}
                      <Text style={[styles.notifTitle, !item.isRead && styles.notifTitleUnread]}>
                        {item.title}
                      </Text>
                      <Text style={styles.notifBody}>{item.body}</Text>

                      {/* Action Link Footer */}
                      <View style={styles.cardFooter}>
                        <Text style={[styles.actionLinkText, { color: cfg.color }]}>
                          {item.actionText || 'View Details'}
                        </Text>
                        <ChevronRight size={14} color={cfg.color} />
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D4A2B',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: '#0D4A2B',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerLogo: {
    width: 26,
    height: 26,
  },
  headerTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  unreadBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  unreadBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsRow: {
    backgroundColor: '#0D4A2B',
    paddingBottom: SPACING.sm,
  },
  tabsContent: {
    paddingHorizontal: SPACING.md,
    gap: 8,
  },
  tabChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  tabChipActive: {
    backgroundColor: '#FFFFFF',
  },
  tabChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.85)',
  },
  tabChipTextActive: {
    color: '#0D4A2B',
    fontWeight: '800',
  },
  scrollContent: {
    backgroundColor: '#F8FAFC',
    flexGrow: 1,
    padding: SPACING.md,
    paddingBottom: SPACING['4xl'],
  },
  loadingWrap: {
    paddingTop: 80,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  emptyWrap: {
    paddingTop: 80,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    gap: 8,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 10,
  },
  refreshBtn: {
    backgroundColor: '#16A34A',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: BORDER_RADIUS.md,
  },
  refreshBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  notifList: {
    gap: 12,
  },
  notifCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  notifCardUnread: {
    borderColor: '#86EFAC',
    borderLeftWidth: 4,
    borderLeftColor: '#16A34A',
  },
  cardGradient: {
    padding: 14,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardMetaWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  timeText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  deleteSingleBtn: {
    padding: 4,
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    lineHeight: 20,
    marginBottom: 4,
  },
  notifTitleUnread: {
    fontWeight: '800',
    color: '#0F172A',
  },
  notifBody: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  actionLinkText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
