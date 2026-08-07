import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  StyleSheet,
  Image,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import Animated, {
  FadeInDown,
  FadeInRight,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  interpolate,
} from 'react-native-reanimated';
import { Shield, Award, ChevronRight, Video, BookOpen, Bell } from 'lucide-react-native';
import { COLORS, SPACING, BORDER_RADIUS, SHADOW, FONT_SIZE } from '@/src/theme/tokens';
import apiClient from '@/src/services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.72;
const POSTER_WIDTH = SCREEN_WIDTH - SPACING.base * 2;
const POSTER_HEIGHT = POSTER_WIDTH * 0.48;
const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

// ─── Poster Data ──────────────────────────────────────────────────────────────
const POSTERS = [
  { id: '1', image: require('../../assets/poster_placement.png') },
  { id: '2', image: require('../../assets/poster_courses.png') },
  { id: '3', image: require('../../assets/poster_drive.png') },
];

// ─── Types ────────────────────────────────────────────────────────────────────
interface Course { _id: string; title: string; level: string; duration: number; durationType: string; feeAmount: number; thumbnailUrl?: string; isPlacementGuaranteed: boolean }
interface Teacher { _id: string; designation: string; certifications: string[]; profileImageUrl?: string; userId: { fullName: string; avatarUrl?: string } }
interface ClassItem { _id: string; title: string; subject: string; scheduledAt: string; zoomJoinUrl: string; teacherId: { userId: { fullName: string } } }

// ─── Auto-Scrolling Poster Carousel ───────────────────────────────────────────
function PosterCarousel() {
  const flatListRef = useRef<FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const autoScrollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const startAutoScroll = useCallback(() => {
    if (autoScrollTimer.current) clearInterval(autoScrollTimer.current);
    autoScrollTimer.current = setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % POSTERS.length;
        flatListRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, 3500);
  }, []);

  useEffect(() => {
    startAutoScroll();
    return () => { if (autoScrollTimer.current) clearInterval(autoScrollTimer.current); };
  }, [startAutoScroll]);

  const onScrollEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / POSTER_WIDTH);
    setActiveIndex(idx);
    // Reset auto-scroll timer on manual swipe
    startAutoScroll();
  }, [startAutoScroll]);

  return (
    <View style={styles.posterContainer}>
      <FlatList
        ref={flatListRef}
        data={POSTERS}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        snapToInterval={POSTER_WIDTH}
        decelerationRate="fast"
        contentContainerStyle={{ gap: 0 }}
        keyExtractor={(item) => item.id}
        getItemLayout={(_data, index) => ({ length: POSTER_WIDTH, offset: POSTER_WIDTH * index, index })}
        renderItem={({ item }) => (
          <View style={styles.posterSlide}>
            <Image source={item.image} style={styles.posterImage} resizeMode="cover" />
          </View>
        )}
      />
      {/* Dot Indicators */}
      <View style={styles.dotsRow}>
        {POSTERS.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === activeIndex ? styles.dotActive : styles.dotInactive,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

// ─── Registration Badge Component ─────────────────────────────────────────────
function RegBadge({ label }: { label: string }) {
  return (
    <View style={[styles.regBadge, { borderColor: COLORS.borderGreen }]}>
      <Shield size={10} color={COLORS.success} />
      <Text style={styles.regBadgeText}>{label}</Text>
    </View>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ title, subtitle, onSeeAll }: { title: string; subtitle?: string; onSeeAll?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <View>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
      </View>
      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll} style={styles.seeAllBtn}>
          <Text style={styles.seeAllText}>See All</Text>
          <ChevronRight size={14} color={COLORS.success} />
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Course Card ──────────────────────────────────────────────────────────────
function CourseCard({ item, index }: { item: Course; index: number }) {
  return (
    <Animated.View entering={FadeInRight.delay(index * 80).duration(400)}>
      <TouchableOpacity
        onPress={() => router.push({ pathname: '/course/[id]', params: { id: item._id } } as any)}
        style={[styles.courseCard, SHADOW.card]}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={['#FFFFFF', '#ECFDF5']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.courseCardGradient}
        >
          {item.thumbnailUrl ? (
            <Image source={{ uri: item.thumbnailUrl }} style={styles.courseThumbnail} resizeMode="cover" />
          ) : (
            <View style={styles.courseIconBg}>
              <BookOpen size={28} color={COLORS.success} />
            </View>
          )}
          <View style={styles.courseCardContent}>
            <View style={[styles.levelBadge, { borderColor: COLORS.borderGreen, backgroundColor: COLORS.greenGlow }]}>
              <Text style={styles.levelBadgeText}>{item.level.replace(/_/g, ' ')}</Text>
            </View>
            <Text style={styles.courseTitle} numberOfLines={2}>{item.title}</Text>
            <View style={styles.courseMeta}>
              <Text style={styles.courseMetaText}>{item.duration} {item.durationType.toLowerCase()}</Text>
              <Text style={styles.courseFee}>₹{item.feeAmount.toLocaleString('en-IN')}</Text>
            </View>
            {item.isPlacementGuaranteed && (
              <View style={styles.placementBadge}>
                <Award size={10} color={COLORS.success} />
                <Text style={styles.placementText}>100% Job Placement</Text>
              </View>
            )}
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Teacher Card ─────────────────────────────────────────────────────────────
function TeacherCard({ item, index }: { item: Teacher; index: number }) {
  return (
    <Animated.View entering={FadeInDown.delay(index * 100).duration(400)}>
      <TouchableOpacity
        onPress={() => router.push({ pathname: '/teacher/[id]', params: { id: item._id } })}
        style={[styles.teacherCard, SHADOW.card]}
        activeOpacity={0.85}
      >
        <View style={styles.teacherAvatar}>
          {item.profileImageUrl || item.userId?.avatarUrl ? (
            <Image source={{ uri: item.profileImageUrl ?? item.userId.avatarUrl }} style={styles.teacherAvatarImg} />
          ) : (
            <Text style={styles.teacherAvatarText}>{item.userId?.fullName?.charAt(0) ?? 'T'}</Text>
          )}
        </View>
        <Text style={styles.teacherName} numberOfLines={1}>{item.userId?.fullName ?? 'Trainer'}</Text>
        <Text style={styles.teacherDesignation} numberOfLines={1}>{item.designation}</Text>
        {item.certifications.slice(0, 1).map((cert) => (
          <View key={cert} style={styles.certBadge}>
            <Text style={styles.certText}>{cert.replace(/_/g, ' ')}</Text>
          </View>
        ))}
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Class Card ───────────────────────────────────────────────────────────────
function ClassCard({ item }: { item: ClassItem }) {
  const date = new Date(item.scheduledAt);
  return (
    <TouchableOpacity style={[styles.classCard, SHADOW.card]} activeOpacity={0.85}>
      <LinearGradient colors={['rgba(22,163,74,0.08)', 'transparent']} style={styles.classCardGradient}>
        <View style={styles.classTime}>
          <Text style={styles.classDay}>{date.toLocaleDateString('en-IN', { weekday: 'short' })}</Text>
          <Text style={styles.classHour}>{date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</Text>
        </View>
        <View style={styles.classInfo}>
          <Text style={styles.classTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.classByTeacher}>by {item.teacherId?.userId?.fullName ?? 'Faculty'}</Text>
        </View>
        <TouchableOpacity style={styles.joinBtn}>
          <Video size={12} color="#fff" />
          <Text style={styles.joinBtnText}>Join</Text>
        </TouchableOpacity>
      </LinearGradient>
    </TouchableOpacity>
  );
}

// ─── Main Home Screen ─────────────────────────────────────────────────────────
export default function HomeScreen() {
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((e) => { scrollY.value = e.contentOffset.y; });

  const headerAnimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 100], [1, 0.85]),
    transform: [{ translateY: interpolate(scrollY.value, [0, 100], [0, -8]) }],
  }));

  const { data: popularCourses, isLoading: coursesLoading, refetch: refetchCourses } = useQuery({
    queryKey: ['courses', 'popular'],
    queryFn: async () => { const res = await apiClient.get<{ data: Course[] }>('/courses/popular'); return res.data.data; },
  });

  const { data: teachers, isLoading: teachersLoading } = useQuery({
    queryKey: ['teachers', 'active'],
    queryFn: async () => { const res = await apiClient.get<{ data: Teacher[] }>('/teachers/active'); return res.data.data; },
  });

  const { data: upcomingClasses } = useQuery({
    queryKey: ['classes', 'upcoming'],
    queryFn: async () => { const res = await apiClient.get<{ data: ClassItem[] }>('/classes/upcoming?limit=5'); return res.data.data; },
  });

  const [refreshing, setRefreshing] = React.useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetchCourses();
    setRefreshing(false);
  }, [refetchCourses]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Ambient Glow Background */}
      <View style={styles.glowBg} pointerEvents="none">
        <LinearGradient
          colors={['rgba(22,163,74,0.06)', 'transparent']}
          style={styles.topGlow}
          start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
        />
      </View>

      <AnimatedScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.success} colors={[COLORS.success]} />}
      >
        {/* Hero Header */}
        <Animated.View style={[styles.heroHeader, headerAnimStyle]}>
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.welcomeText}>Welcome to</Text>
              <Text style={styles.instituteName}>Vireon Safety{'\n'}Institute</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/notifications')} style={[styles.notifBtn, SHADOW.card]} accessibilityLabel="Notifications">
              <Bell size={20} color={COLORS.textSecondary} />
              <View style={styles.notifDot} />
            </TouchableOpacity>
          </View>

          {/* Govt Registration Badges */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.badgesRow} contentContainerStyle={styles.badgesContent}>
            <RegBadge label="MCA Reg." />
            <RegBadge label="MSME Reg." />
            <RegBadge label="NSDM Reg." />
            <RegBadge label="ISO 45001" />
            <RegBadge label="ISO 9001" />
            <RegBadge label="ISO 14001" />
          </ScrollView>
        </Animated.View>

        {/* ★ Auto-Scrolling Poster Carousel ★ */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)}>
          <PosterCarousel />
        </Animated.View>

        {/* Popular Courses */}
        <View style={styles.section}>
          <SectionHeader title="Popular Courses" subtitle="Govt. certified industrial safety programs" onSeeAll={() => router.push('/(tabs)/courses')} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
            {coursesLoading
              ? Array.from({ length: 3 }).map((_, i) => <View key={i} style={[styles.courseCard, styles.skeleton]} />)
              : (popularCourses ?? []).map((course, i) => <CourseCard key={course._id} item={course} index={i} />)
            }
          </ScrollView>
        </View>

        {/* Industrial Trainers */}
        <View style={styles.section}>
          <SectionHeader title="Get Trained By" subtitle="Industrial Experts & Certified Trainers" onSeeAll={() => router.push('/(tabs)/courses')} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
            {teachersLoading
              ? Array.from({ length: 3 }).map((_, i) => <View key={i} style={[styles.teacherCard, styles.skeleton]} />)
              : (teachers ?? []).map((teacher, i) => <TeacherCard key={teacher._id} item={teacher} index={i} />)
            }
          </ScrollView>
        </View>

        {/* Upcoming Online Classes */}
        {upcomingClasses && upcomingClasses.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Upcoming Classes" subtitle="Live online sessions via Zoom" onSeeAll={() => router.push('/(tabs)/classes')} />
            <View style={styles.classesList}>
              {upcomingClasses.map((cls) => <ClassCard key={cls._id} item={cls} />)}
            </View>
          </View>
        )}

        {/* Bottom padding */}
        <View style={{ height: 32 }} />
      </AnimatedScrollView>
    </SafeAreaView>
  );
}

// ─── StyleSheet ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  glowBg: { ...StyleSheet.absoluteFillObject },
  topGlow: { position: 'absolute', top: 0, left: 0, right: 0, height: 300 },
  scrollContent: { paddingBottom: SPACING['4xl'] },

  // Hero
  heroHeader: { paddingHorizontal: SPACING.base, paddingTop: SPACING.base, paddingBottom: SPACING.md },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.lg },
  welcomeText: { fontSize: FONT_SIZE.sm, color: COLORS.textMuted, fontWeight: '600', letterSpacing: 0.5 },
  instituteName: { fontSize: FONT_SIZE['3xl'], color: COLORS.textPrimary, fontWeight: '800', lineHeight: 40, letterSpacing: -0.5, marginTop: 2 },

  notifBtn: { width: 44, height: 44, borderRadius: BORDER_RADIUS.md, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  notifDot: { position: 'absolute', top: 10, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.success },

  badgesRow: { marginHorizontal: -SPACING.base },
  badgesContent: { paddingHorizontal: SPACING.base, gap: 8, paddingBottom: SPACING.md },
  regBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: BORDER_RADIUS.full, borderWidth: 1, backgroundColor: '#D1FAE5' },
  regBadgeText: { fontSize: 10, color: '#047857', fontWeight: '700' },

  // ★ Poster Carousel
  posterContainer: { marginHorizontal: SPACING.base, marginBottom: SPACING.xl },
  posterSlide: {
    width: POSTER_WIDTH,
    height: POSTER_HEIGHT,
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
  },
  posterImage: {
    width: '100%',
    height: '100%',
    borderRadius: BORDER_RADIUS.xl,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.sm,
    gap: 6,
  },
  dot: {
    borderRadius: 10,
  },
  dotActive: {
    width: 20,
    height: 6,
    backgroundColor: COLORS.success,
    borderRadius: 3,
  },
  dotInactive: {
    width: 6,
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
  },

  // Sections
  section: { marginBottom: SPACING['2xl'] },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: SPACING.base, marginBottom: SPACING.md },
  sectionTitle: { fontSize: FONT_SIZE.lg, color: COLORS.textPrimary, fontWeight: '800' },
  sectionSubtitle: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginTop: 2, fontWeight: '500' },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seeAllText: { fontSize: FONT_SIZE.sm, color: COLORS.success, fontWeight: '700' },
  horizontalList: { paddingHorizontal: SPACING.base, gap: 12 },

  // Course Card
  courseCard: { width: CARD_WIDTH, borderRadius: BORDER_RADIUS.xl, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border, backgroundColor: '#FFFFFF' },
  courseCardGradient: { padding: 0 },
  courseThumbnail: { width: '100%', height: 140 },
  courseIconBg: { width: '100%', height: 120, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ECFDF5' },
  courseCardContent: { padding: SPACING.md },
  levelBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: BORDER_RADIUS.full, borderWidth: 1, marginBottom: 8, backgroundColor: '#D1FAE5' },
  levelBadgeText: { fontSize: 9, color: '#047857', fontWeight: '700', letterSpacing: 0.5 },
  courseTitle: { fontSize: FONT_SIZE.md, color: COLORS.textPrimary, fontWeight: '700', lineHeight: 22 },
  courseMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  courseMetaText: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, fontWeight: '500' },
  courseFee: { fontSize: FONT_SIZE.sm, color: COLORS.success, fontWeight: '800' },
  placementBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: COLORS.border },
  placementText: { fontSize: 10, color: COLORS.success, fontWeight: '700' },

  // Teacher Card
  teacherCard: { width: 140, borderRadius: BORDER_RADIUS.xl, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, alignItems: 'center' },
  teacherAvatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#ECFDF5', borderWidth: 2, borderColor: COLORS.borderGreen, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  teacherAvatarImg: { width: 60, height: 60, borderRadius: 30 },
  teacherAvatarText: { fontSize: FONT_SIZE.xl, color: COLORS.success, fontWeight: '800' },
  teacherName: { fontSize: FONT_SIZE.sm, color: COLORS.textPrimary, fontWeight: '700', textAlign: 'center' },
  teacherDesignation: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginTop: 2, textAlign: 'center' },
  certBadge: { marginTop: 6, paddingHorizontal: 6, paddingVertical: 3, borderRadius: BORDER_RADIUS.full, backgroundColor: '#D1FAE5', borderWidth: 1, borderColor: COLORS.borderGreen },
  certText: { fontSize: 9, color: '#047857', fontWeight: '700', textAlign: 'center' },

  // Class Card
  classesList: { paddingHorizontal: SPACING.base, gap: 10 },
  classCard: { borderRadius: BORDER_RADIUS.xl, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border, backgroundColor: '#FFFFFF' },
  classCardGradient: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: SPACING.md },
  classTime: { alignItems: 'center', minWidth: 48 },
  classDay: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600', textTransform: 'uppercase' },
  classHour: { fontSize: FONT_SIZE.sm, color: COLORS.textPrimary, fontWeight: '700', marginTop: 2 },
  classInfo: { flex: 1 },
  classTitle: { fontSize: FONT_SIZE.sm, color: COLORS.textPrimary, fontWeight: '700', lineHeight: 18 },
  classByTeacher: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginTop: 2 },
  joinBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.accentGreen, paddingHorizontal: 10, paddingVertical: 6, borderRadius: BORDER_RADIUS.sm },
  joinBtnText: { fontSize: FONT_SIZE.xs, color: '#fff', fontWeight: '700' },

  // Skeleton
  skeleton: { backgroundColor: 'rgba(16,185,129,0.06)', height: 220 },
});
