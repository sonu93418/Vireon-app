import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ArrowLeft, Bell, BellRing, BookOpen, Video, Megaphone, AlertTriangle, Info, Award } from 'lucide-react-native';
import { COLORS, SPACING, BORDER_RADIUS, SHADOW, FONT_SIZE } from '@/src/theme/tokens';
import apiClient from '@/src/services/api';

interface NotifItem {
  _id: string;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

const NOTIF_ICONS: Record<string, { icon: typeof Bell; color: string; bg: string }> = {
  CLASS_REMINDER: { icon: Video, color: '#3B82F6', bg: '#EFF6FF' },
  CLASS_STARTED: { icon: Video, color: '#16A34A', bg: '#F0FDF4' },
  COURSE_UPDATE: { icon: BookOpen, color: '#8B5CF6', bg: '#F5F3FF' },
  NEW_BLOG: { icon: Info, color: '#06B6D4', bg: '#ECFEFF' },
  ANNOUNCEMENT: { icon: Megaphone, color: '#F59E0B', bg: '#FFFBEB' },
  SYSTEM: { icon: AlertTriangle, color: '#EF4444', bg: '#FEF2F2' },
  PLACEMENT: { icon: Award, color: '#16A34A', bg: '#F0FDF4' },
};

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

export default function NotificationsScreen() {
  const [refreshing, setRefreshing] = React.useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['notifications', 'mobile'],
    queryFn: async () => {
      const res = await apiClient.get<{ data: NotifItem[]; meta: { total: number } }>('/notifications?limit=50');
      return res.data;
    },
  });

  const notifications = data?.data ?? [];
  const total = data?.meta?.total ?? 0;

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <ArrowLeft size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {total > 0 && <Text style={styles.headerCount}>{total} total</Text>}
        </View>
        <View style={styles.headerRight}>
          <BellRing size={20} color={COLORS.success} />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.success} colors={[COLORS.success]} />}
      >
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <View key={i} style={[styles.notifCard, styles.skeleton]} />
          ))
        ) : notifications.length === 0 ? (
          <Animated.View entering={FadeInDown.duration(500)} style={styles.emptyState}>
            <View style={styles.emptyIconBg}>
              <Bell size={40} color={COLORS.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>No Notifications Yet</Text>
            <Text style={styles.emptySubtitle}>
              You'll receive updates about classes, courses,{'\n'}and placement drives here.
            </Text>
          </Animated.View>
        ) : (
          notifications.map((notif, i) => {
            const config = NOTIF_ICONS[notif.type] ?? NOTIF_ICONS.ANNOUNCEMENT;
            const IconComponent = config.icon;
            return (
              <Animated.View key={notif._id} entering={FadeInDown.delay(i * 50).duration(350)}>
                <View style={[styles.notifCard, SHADOW.card, !notif.isRead && styles.notifUnread]}>
                  <View style={[styles.notifIconBg, { backgroundColor: config.bg }]}>  
                    <IconComponent size={18} color={config.color} />
                  </View>
                  <View style={styles.notifContent}>
                    <View style={styles.notifTopRow}>
                      <Text style={[styles.notifTitle, !notif.isRead && styles.notifTitleUnread]} numberOfLines={1}>
                        {notif.title}
                      </Text>
                      <Text style={styles.notifTime}>{formatTimeAgo(notif.createdAt)}</Text>
                    </View>
                    <Text style={styles.notifBody} numberOfLines={2}>{notif.body}</Text>
                    <View style={[styles.typeBadge, { backgroundColor: config.bg }]}>
                      <Text style={[styles.typeBadgeText, { color: config.color }]}>
                        {notif.type.replace(/_/g, ' ')}
                      </Text>
                    </View>
                  </View>
                  {!notif.isRead && <View style={styles.unreadDot} />}
                </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1, marginLeft: SPACING.sm },
  headerTitle: { fontSize: FONT_SIZE.lg, fontWeight: '800', color: COLORS.textPrimary },
  headerCount: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, fontWeight: '500', marginTop: 1 },
  headerRight: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: COLORS.borderGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scrollContent: { padding: SPACING.base },

  // Notification Card
  notifCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  notifUnread: {
    backgroundColor: '#F0FDF4',
    borderColor: COLORS.borderGreen,
  },
  notifIconBg: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  notifContent: { flex: 1 },
  notifTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  notifTitle: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.textPrimary, flex: 1, marginRight: 8 },
  notifTitleUnread: { fontWeight: '800' },
  notifTime: { fontSize: 10, color: COLORS.textMuted, fontWeight: '500' },
  notifBody: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, lineHeight: 18 },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.full,
    marginTop: 6,
  },
  typeBadgeText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.3 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.success,
    marginLeft: 4,
    marginTop: 4,
  },

  // Empty State
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 100 },
  emptyIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0FDF4',
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  emptyTitle: { fontSize: FONT_SIZE.lg, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 6 },
  emptySubtitle: { fontSize: FONT_SIZE.sm, color: COLORS.textMuted, textAlign: 'center', lineHeight: 20 },

  // Skeleton
  skeleton: { height: 80, backgroundColor: 'rgba(16,185,129,0.06)', borderColor: 'transparent' },
});
