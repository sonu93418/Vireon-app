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
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import Animated, {
  FadeInDown,
  FadeInRight,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  interpolate,
} from 'react-native-reanimated';
import { Shield, Award, ChevronRight, Video, BookOpen, Bell, Sparkles, FileText, GraduationCap, ShieldCheck, CheckCircle2, X, Phone, MessageCircle, PhoneCall } from 'lucide-react-native';
import { COLORS, SPACING, BORDER_RADIUS, SHADOW, FONT_SIZE } from '@/src/theme/tokens';
import apiClient, { getAccessToken, getUserProfileStorage, setUserProfileStorage } from '@/src/services/api';
import { getCacheData, setCacheData } from '@/src/services/queryCache';
import { RealConfettiCannon } from '@/src/components/RealConfettiCannon';
import {
  OFFICIAL_HELPLINES,
  PRIMARY_PHONE,
  makePhoneCall,
  openWhatsApp,
} from '@/src/constants/contact';

const VSI_LOGO = require('@/assets/vsi_logo.png');

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
interface Course { _id: string; title: string; code?: string; level: string; duration: number; durationType: string; thumbnailUrl?: string; isPlacementGuaranteed: boolean }
interface Teacher { _id: string; designation: string; certifications: string[]; profileImageUrl?: string; localImage?: any; userId: { fullName: string; avatarUrl?: string } }
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
function RegBadge({ label, icon: IconComponent = Shield }: { label: string; icon?: any }) {
  return (
    <View style={[styles.regBadge, { borderColor: COLORS.borderGreen }]}>
      <IconComponent size={10} color={COLORS.success} />
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

const COURSE_POSTERS: Record<string, any> = {
  'DFIS-101': require('../../assets/course_dfis.png'),
  'ADIS-201': require('../../assets/course_adis.png'),
  'PGDIS-301': require('../../assets/course_pgdis.png'),
  'IOSH-MSWS': require('../../assets/course_iosh.png'),
  'OSHA-3040': require('../../assets/course_osha.png'),
  'BTECH-FSE': require('../../assets/course_btech.png'),
  'MBA-SEHS': require('../../assets/course_mba.png'),
};

const getCoursePoster = (item: { code?: string; title?: string; thumbnailUrl?: string }) => {
  if (item.code && COURSE_POSTERS[item.code]) {
    return COURSE_POSTERS[item.code];
  }
  const titleLower = item.title?.toLowerCase() ?? '';
  if (titleLower.includes('fire') || titleLower.includes('diploma in fire')) return require('../../assets/course_dfis.png');
  if (titleLower.includes('advanced diploma')) return require('../../assets/course_adis.png');
  if (titleLower.includes('pg diploma')) return require('../../assets/course_pgdis.png');
  if (titleLower.includes('iosh')) return require('../../assets/course_iosh.png');
  if (titleLower.includes('osha')) return require('../../assets/course_osha.png');
  if (titleLower.includes('b.tech') || titleLower.includes('btech')) return require('../../assets/course_btech.png');
  if (titleLower.includes('mba')) return require('../../assets/course_mba.png');
  if (item.thumbnailUrl) return { uri: item.thumbnailUrl };
  return require('../../assets/course_dfis.png');
};

// ─── Course Card ──────────────────────────────────────────────────────────────
function CourseCard({ item, index }: { item: Course; index: number }) {
  const posterSource = getCoursePoster(item);
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
          <Image source={posterSource} style={styles.courseThumbnail} resizeMode="cover" />
          <View style={styles.courseCardContent}>
            <View style={[styles.levelBadge, { borderColor: COLORS.borderGreen, backgroundColor: COLORS.greenGlow }]}>
              <Text style={styles.levelBadgeText}>{item.level.replace(/_/g, ' ')}</Text>
            </View>
            <Text style={styles.courseTitle} numberOfLines={2}>{item.title}</Text>
            <View style={styles.courseMeta}>
              <Text style={styles.courseMetaText}>{item.duration} {item.durationType.toLowerCase()}</Text>
              <Text style={styles.courseFee}>Govt Certified</Text>
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

const DEFAULT_TEACHERS: Teacher[] = [
  {
    _id: 't-gagan',
    designation: 'Director & Chief Safety Officer',
    certifications: ['Ph.D Safety', 'NEBOSH IGC'],
    localImage: require('../../assets/teacher_gagan.png'),
    userId: { fullName: 'Dr. Gagan Verma (Gagan Sir)' },
  },
  {
    _id: 't-prince',
    designation: 'Head of Industrial Safety & EHS',
    certifications: ['OSHA Authorized', 'ADIS'],
    localImage: require('../../assets/teacher_prince.png'),
    userId: { fullName: 'Prince Sir' },
  },
  {
    _id: 't-raj',
    designation: 'Senior Faculty & Fire Lead',
    certifications: ['ISO 45001 Auditor', 'B.Tech FSE'],
    localImage: require('../../assets/teacher_raj.png'),
    userId: { fullName: 'Raj Sir' },
  },
];

const getTeacherAvatarSource = (item: { localImage?: any; profileImageUrl?: string; userId?: { fullName?: string; avatarUrl?: string } }) => {
  if (item.localImage) return item.localImage;
  const name = (item.userId?.fullName ?? '').toLowerCase();
  const url = (item.profileImageUrl ?? item.userId?.avatarUrl ?? '').toLowerCase();

  if (name.includes('gagan') || url.includes('gagan')) {
    return require('../../assets/teacher_gagan.png');
  }
  if (name.includes('prince') || url.includes('prince')) {
    return require('../../assets/teacher_prince.png');
  }
  if (name.includes('raj') || url.includes('raj')) {
    return require('../../assets/teacher_raj.png');
  }

  const validUrl = item.profileImageUrl || item.userId?.avatarUrl;
  if (validUrl && (validUrl.startsWith('http://') || validUrl.startsWith('https://') || validUrl.startsWith('data:'))) {
    return { uri: validUrl };
  }

  return null;
};

// ─── Teacher Card ─────────────────────────────────────────────────────────────
function TeacherCard({ item, index }: { item: Teacher; index: number }) {
  const imageSource = getTeacherAvatarSource(item);

  return (
    <Animated.View entering={FadeInDown.delay(index * 100).duration(400)}>
      <TouchableOpacity
        onPress={() => router.push({ pathname: '/teacher/[id]', params: { id: item._id } })}
        style={[styles.teacherCard, SHADOW.card]}
        activeOpacity={0.85}
      >
        <View style={styles.teacherAvatarSquare}>
          {imageSource ? (
            <Image source={imageSource} style={styles.teacherAvatarImgSquare} resizeMode="cover" />
          ) : (
            <Text style={styles.teacherAvatarText}>{item.userId?.fullName?.charAt(0) ?? 'T'}</Text>
          )}
        </View>
        <Text style={styles.teacherName} numberOfLines={1}>{item.userId?.fullName ?? 'Faculty'}</Text>
        <Text style={styles.teacherDesignation} numberOfLines={1}>{item.designation}</Text>
        {item.certifications?.slice(0, 1).map((cert) => (
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
  const teacherName = item.teacherId?.userId?.fullName ?? 'Faculty Trainer';
  const teacherImg = getTeacherAvatarSource({ localImage: null, profileImageUrl: (item.teacherId as any)?.profileImageUrl, userId: { fullName: teacherName } });

  return (
    <TouchableOpacity
      style={[styles.classCard, SHADOW.card]}
      onPress={() => router.push('/classes')}
      activeOpacity={0.85}
    >
      <LinearGradient colors={['rgba(34,197,94,0.09)', 'rgba(255,255,255,0.02)']} style={styles.classCardGradient}>
        {/* Left Accent Bar */}
        <View style={styles.classAccentBar} />

        {/* Date Time Badge */}
        <View style={styles.classTimeBox}>
          <Text style={styles.classDayText}>{date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</Text>
          <Text style={styles.classHourText}>{date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</Text>
        </View>

        {/* Info */}
        <View style={styles.classMainContent}>
          <View style={styles.classLivePill}>
            <View style={styles.livePulseDot} />
            <Text style={styles.classLivePillText}>LIVE SESSION</Text>
          </View>
          <Text style={styles.classTitle} numberOfLines={1}>{item.title}</Text>
          <View style={styles.classFacultyRow}>
            <View style={styles.classFacultyAvatar}>
              {teacherImg ? (
                <Image source={teacherImg} style={styles.classFacultyImg} resizeMode="cover" />
              ) : (
                <Text style={styles.classFacultyInitial}>{teacherName.charAt(0)}</Text>
              )}
            </View>
            <Text style={styles.classByTeacher} numberOfLines={1}>{teacherName}</Text>
          </View>
        </View>

        {/* Join Button */}
        <TouchableOpacity style={styles.joinBtnSmall} onPress={() => router.push('/classes')}>
          <Video size={12} color="#fff" />
          <Text style={styles.joinBtnSmallText}>Join</Text>
        </TouchableOpacity>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const DEFAULT_COURSES: Course[] = [
  { _id: '1', code: 'DFIS-101', title: 'Diploma in Fire & Industrial Safety', level: 'DIPLOMA', duration: 12, durationType: 'MONTHS', isPlacementGuaranteed: true },
  { _id: '2', code: 'ADIS-201', title: 'Advanced Diploma in Industrial Safety', level: 'ADVANCED_DIPLOMA', duration: 1, durationType: 'YEARS', isPlacementGuaranteed: true },
  { _id: '3', code: 'PGDIS-301', title: 'PG Diploma in Industrial Safety (PGDIS)', level: 'PG_DIPLOMA', duration: 1, durationType: 'YEARS', isPlacementGuaranteed: true },
  { _id: '4', code: 'IOSH-MSWS', title: 'IOSH (Managing Safely & Working Safely)', level: 'CERTIFICATION', duration: 3, durationType: 'WEEKS', isPlacementGuaranteed: true },
  { _id: '5', code: 'OSHA-3040', title: 'OSHA 30-Hour & 40-Hour General Industry', level: 'CERTIFICATION', duration: 4, durationType: 'WEEKS', isPlacementGuaranteed: true },
  { _id: '6', code: 'BTECH-FSE', title: 'B.Tech in Fire & Safety Engineering', level: 'BTECH', duration: 4, durationType: 'YEARS', isPlacementGuaranteed: true },
  { _id: '7', code: 'MBA-SEHS', title: 'MBA in Safety & EHS Management', level: 'MBA', duration: 2, durationType: 'YEARS', isPlacementGuaranteed: true },
];

// ─── Main Home Screen ─────────────────────────────────────────────────────────
export default function HomeScreen() {
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((e) => { scrollY.value = e.contentOffset.y; });

  const headerAnimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 100], [1, 0.85]),
    transform: [{ translateY: interpolate(scrollY.value, [0, 100], [0, -8]) }],
  }));

  const isLoggedIn = !!getAccessToken();

  const { data: userProfile, refetch: refetchUser } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const token = getAccessToken();
      if (!token) return getUserProfileStorage();
      try {
        const res = await apiClient.get<{ data: any }>('/auth/me');
        if (res.data?.data) setUserProfileStorage(res.data.data);
        return res.data.data;
      } catch {
        return getUserProfileStorage();
      }
    },
    initialData: () => getUserProfileStorage(),
  });

  useFocusEffect(
    useCallback(() => {
      void refetchUser();
    }, [refetchUser])
  );

  const activeUser = userProfile ?? getUserProfileStorage();

  const { data: popularCourses, isLoading: coursesLoading, refetch: refetchCourses } = useQuery<Course[]>({
    queryKey: ['courses', 'popular'],
    queryFn: async () => {
      const res = await apiClient.get<{ data: Course[] }>('/courses/popular');
      setCacheData('courses_popular', res.data.data);
      return res.data.data;
    },
    initialData: () => getCacheData<Course[]>('courses_popular') ?? undefined,
    staleTime: 5 * 60 * 1000,       // 5 min cache
    refetchInterval: 3 * 60 * 1000, // auto-refresh every 3 min
    retry: 1,
  });

  const { data: teachers, isLoading: teachersLoading, refetch: refetchTeachers } = useQuery({
    queryKey: ['teachers', 'active'],
    queryFn: async () => {
      const res = await apiClient.get<{ data: Teacher[] }>('/teachers/active');
      setCacheData('teachers_active', res.data.data);
      return res.data.data;
    },
    initialData: () => getCacheData<Teacher[]>('teachers_active') ?? undefined,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  const { data: upcomingClasses, refetch: refetchClasses } = useQuery({
    queryKey: ['classes', 'upcoming'],
    queryFn: async () => {
      const res = await apiClient.get<{ data: ClassItem[] }>('/classes/upcoming?limit=5');
      setCacheData('classes_upcoming', res.data.data);
      return res.data.data;
    },
    initialData: () => getCacheData<ClassItem[]>('classes_upcoming') ?? undefined,
    staleTime: 2 * 60 * 1000,
    refetchInterval: 60 * 1000,
    retry: 1,
  });

  const { data: unreadCount = 0 } = useQuery<number>({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      if (!getAccessToken()) return 0;
      const res = await apiClient.get<{ data: { count: number } }>('/notifications/my/unread-count');
      return res.data?.data?.count ?? 0;
    },
    enabled: isLoggedIn,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    retry: false,
  });

  const params = useLocalSearchParams<{ celebrate?: string }>();
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    const user = getUserProfileStorage();
    if (params.celebrate === 'true' || user?.justLoggedIn) {
      setShowConfetti(true);

      if (user?.justLoggedIn) {
        setUserProfileStorage({ ...user, justLoggedIn: false });
      }
    }
  }, [params.celebrate]);

  const [refreshing, setRefreshing] = React.useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.allSettled([refetchUser(), refetchCourses(), refetchTeachers(), refetchClasses()]);
    setRefreshing(false);
  }, [refetchUser, refetchCourses, refetchTeachers, refetchClasses]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" translucent animated />

      {/* Real GPU-Accelerated Bottom-to-Top Confetti Burst (Non-blocking, 6s Duration) */}
      <RealConfettiCannon visible={showConfetti} onComplete={() => setShowConfetti(false)} />

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
          {/* Top Profile & Greeting Row */}
          <View style={styles.topProfileBar}>
            <TouchableOpacity
              style={styles.profileBadgeWrap}
              onPress={() => router.push('/(tabs)/profile')}
              activeOpacity={0.85}
            >
              <View style={styles.avatarCircle}>
                {activeUser?.avatarUrl ? (
                  <Image source={{ uri: activeUser.avatarUrl }} style={styles.avatarImgHeader} />
                ) : (
                  <Text style={styles.avatarText}>
                    {(activeUser?.fullName ?? 'V').charAt(0).toUpperCase()}
                  </Text>
                )}
                <View style={styles.onlinePulseDot} />
              </View>
              <View style={styles.userTextWrap}>
                <View style={styles.welcomeRow}>
                  <Text style={styles.welcomeText}>Hello, {activeUser?.fullName?.split(' ')[0] ?? 'Safety Officer'}</Text>
                  <Sparkles size={12} color="#F59E0B" />
                </View>
                <Text style={styles.instituteSubtitle}>Vireon Safety Institute • ISO Certified</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/notifications')}
              style={[styles.notifBtn, SHADOW.card]}
              accessibilityLabel="Notifications"
              activeOpacity={0.85}
            >
              <Bell size={20} color={COLORS.textPrimary} />
              {unreadCount > 0 && (
                <View style={styles.notifBadgeCount}>
                  <Text style={styles.notifBadgeCountText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Quick Interactive Actions Grid — Rich Green Filled Buttons */}
          <View style={styles.quickShortcutsGrid}>
            <TouchableOpacity
              style={[styles.shortcutItemGreen, SHADOW.card]}
              onPress={() => router.push('/(tabs)/classes')}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#16A34A', '#059669']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.shortcutGradient}
              >
                <View style={styles.shortcutIconBgWhite}>
                  <Video size={13} color="#16A34A" />
                  <View style={styles.livePulseDotSmall} />
                </View>
                <Text style={styles.shortcutLabelWhite} numberOfLines={1}>Live Classes</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.shortcutItemGreen, SHADOW.card]}
              onPress={() => router.push('/(tabs)/resources')}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#059669', '#047857']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.shortcutGradient}
              >
                <View style={styles.shortcutIconBgWhite}>
                  <FileText size={13} color="#059669" />
                </View>
                <Text style={styles.shortcutLabelWhite} numberOfLines={1}>PDF Notes</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.shortcutItemGreen, SHADOW.card]}
              onPress={() => router.push('/(tabs)/courses')}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#047857', '#065F46']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.shortcutGradient}
              >
                <View style={styles.shortcutIconBgWhite}>
                  <GraduationCap size={13} color="#047857" />
                </View>
                <Text style={styles.shortcutLabelWhite} numberOfLines={1}>Courses</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.shortcutItemGreen, SHADOW.card]}
              onPress={() => router.push('/(tabs)/courses')}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#065F46', '#064E3B']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.shortcutGradient}
              >
                <View style={styles.shortcutIconBgWhite}>
                  <Award size={13} color="#065F46" />
                </View>
                <Text style={styles.shortcutLabelWhite} numberOfLines={1}>Placement</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Govt Registration Badges Ticker */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.badgesRow} contentContainerStyle={styles.badgesContent}>
            <TouchableOpacity onPress={() => Alert.alert('Govt Verification', 'MCA Registered Institute (Govt of India)')} activeOpacity={0.7}>
              <RegBadge label="MCA Reg." icon={ShieldCheck} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => Alert.alert('Govt Verification', 'MSME Certified Educational Organisation')} activeOpacity={0.7}>
              <RegBadge label="MSME Certified" icon={CheckCircle2} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => Alert.alert('Govt Verification', 'NSDM Skill Development Partner')} activeOpacity={0.7}>
              <RegBadge label="NSDM Approved" icon={Award} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => Alert.alert('ISO Certification', 'ISO 45001:2018 Occupational Health & Safety Certified')} activeOpacity={0.7}>
              <RegBadge label="ISO 45001:2018" icon={Shield} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => Alert.alert('ISO Certification', 'ISO 9001:2015 Quality Management Certified')} activeOpacity={0.7}>
              <RegBadge label="ISO 9001:2015" icon={Shield} />
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>

        {/* ★ Auto-Scrolling Poster Carousel ★ */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)}>
          <PosterCarousel />
        </Animated.View>

        {/* Popular Courses */}
        {(() => {
          const hasPopular = Boolean(popularCourses && popularCourses.length > 0);
          const rawCourses = hasPopular ? (popularCourses as Course[]) : DEFAULT_COURSES;
          const listToRender = Array.from(new Map(rawCourses.map((c: Course) => [c._id || c.code || c.title, c])).values());
          return (
            <View style={styles.section}>
              <SectionHeader title="Popular Courses" subtitle="Govt. certified industrial safety programs" onSeeAll={() => router.push('/(tabs)/courses')} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
                {coursesLoading && !hasPopular
                  ? Array.from({ length: 3 }).map((_, i) => <View key={i} style={[styles.courseCard, styles.skeleton]} />)
                  : listToRender.map((course, i) => (
                      <CourseCard key={course._id} item={course} index={i} />
                    ))
                }
              </ScrollView>
            </View>
          );
        })()}

        {/* Industrial Trainers */}
        {(() => {
          const hasTeachers = Boolean(teachers && teachers.length > 0);
          const rawTeachers = hasTeachers ? (teachers as Teacher[]) : DEFAULT_TEACHERS;
          const teachersList = Array.from(new Map(rawTeachers.map((t: Teacher) => [t._id || t.userId?.fullName, t])).values());
          return (
            <View style={styles.section}>
              <SectionHeader title="Get Trained By" subtitle="Industrial Experts & Certified Trainers" onSeeAll={() => router.push('/(tabs)/courses')} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
                {teachersLoading && !hasTeachers
                  ? Array.from({ length: 3 }).map((_, i) => <View key={i} style={[styles.teacherCard, styles.skeleton]} />)
                  : teachersList.map((teacher, i) => <TeacherCard key={teacher._id} item={teacher} index={i} />)
                }
              </ScrollView>
            </View>
          );
        })()}

        {/* Upcoming Online Classes */}
        {upcomingClasses && upcomingClasses.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Upcoming Classes" subtitle="Live online sessions via Zoom" onSeeAll={() => router.push('/(tabs)/classes')} />
            <View style={styles.classesList}>
              {upcomingClasses.map((cls) => <ClassCard key={cls._id} item={cls} />)}
            </View>
          </View>
        )}

        {/* ── Official Institute Admission Helplines ── */}
        <View style={styles.section}>
          <View style={[styles.helplineSectionCard, SHADOW.card]}>
            <LinearGradient
              colors={['#0D4A2B', '#15803D']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.helplineSectionHeader}
            >
              <Image source={VSI_LOGO} style={styles.helplineSectionLogo} resizeMode="contain" />
              <View style={{ flex: 1 }}>
                <Text style={styles.helplineSectionTitle}>Official Admission Helplines</Text>
                <Text style={styles.helplineSectionSub}>Connect with authorized course counselors</Text>
              </View>
            </LinearGradient>

            <View style={styles.helplineCardBody}>
              {OFFICIAL_HELPLINES.map((h) => (
                <View key={h.id} style={styles.homeHelplineItem}>
                  <View style={styles.homeHelplineInfo}>
                    <Text style={styles.homeHelplineName}>{h.name}</Text>
                    <Text style={styles.homeHelplineNumber}>{h.formattedPhone}</Text>
                    <Text style={styles.homeHelplineRole}>{h.role}</Text>
                  </View>
                  <View style={styles.homeHelplineActions}>
                    <TouchableOpacity
                      style={styles.homeCallBtn}
                      onPress={() => makePhoneCall(h.phone)}
                      activeOpacity={0.8}
                    >
                      <Phone size={13} color="#16A34A" />
                      <Text style={styles.homeCallText}>Call</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.homeWaBtn}
                      onPress={() => openWhatsApp(h.phone, `Hello Vireon Safety Institute, I want to inquire about admissions and course details.`)}
                      activeOpacity={0.8}
                    >
                      <MessageCircle size={13} color="#FFFFFF" />
                      <Text style={styles.homeWaText}>WhatsApp</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Bottom padding */}
        <View style={{ height: 40 }} />
      </AnimatedScrollView>
    </SafeAreaView>
  );
}

// ─── StyleSheet ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, position: 'relative' },
  topWelcomeBannerWrap: { position: 'absolute', top: 10, left: SPACING.base, right: SPACING.base, zIndex: 9999, elevation: 9999, borderRadius: BORDER_RADIUS.xl, overflow: 'hidden' },
  topWelcomeBannerGradient: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  topWelcomeBannerIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  topWelcomeBannerTextWrap: { flex: 1 },
  topWelcomeBannerTitle: { fontSize: 13, color: '#FFF', fontWeight: '900' },
  topWelcomeBannerSub: { fontSize: 10, color: 'rgba(255,255,255,0.9)', marginTop: 1, fontWeight: '600' },
  closeBannerBtn: { padding: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12 },
  glowBg: { ...StyleSheet.absoluteFillObject },
  topGlow: { position: 'absolute', top: 0, left: 0, right: 0, height: 300 },
  scrollContent: { paddingBottom: SPACING['4xl'] },

  // Hero Header
  heroHeader: { paddingHorizontal: SPACING.base, paddingTop: SPACING.sm, paddingBottom: SPACING.sm },
  topProfileBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  profileBadgeWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  avatarCircle: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center', position: 'relative', borderWidth: 2, borderColor: '#A7F3D0', overflow: 'hidden' },
  avatarImgHeader: { width: 38, height: 38, borderRadius: 19 },
  avatarText: { fontSize: 18, color: '#FFF', fontWeight: '800' },
  onlinePulseDot: { position: 'absolute', bottom: 1, right: 1, width: 10, height: 10, borderRadius: 5, backgroundColor: '#22C55E', borderWidth: 2, borderColor: '#FFF' },
  userTextWrap: { flex: 1 },
  welcomeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  welcomeText: { fontSize: 11, color: COLORS.textMuted, fontWeight: '700' },
  instituteSubtitle: { fontSize: FONT_SIZE.xs + 1, color: COLORS.textPrimary, fontWeight: '800', marginTop: 1 },

  notifBtn: { width: 42, height: 42, borderRadius: BORDER_RADIUS.md, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  notifBadgeCount: { position: 'absolute', top: 4, right: 4, backgroundColor: '#EF4444', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 8, minWidth: 16, alignItems: 'center' },
  notifBadgeCountText: { fontSize: 9, color: '#FFF', fontWeight: '800' },

  quickShortcutsGrid: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  shortcutItemGreen: { flex: 1, borderRadius: BORDER_RADIUS.md, overflow: 'hidden', borderWidth: 1, borderColor: '#34D399' },
  shortcutGradient: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 7, paddingVertical: 8 },
  shortcutIconBgWhite: { width: 24, height: 24, borderRadius: BORDER_RADIUS.sm, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  livePulseDotSmall: { position: 'absolute', top: -1, right: -1, width: 6, height: 6, borderRadius: 3, backgroundColor: '#EF4444' },
  shortcutLabelWhite: { fontSize: 10, color: '#FFFFFF', fontWeight: '800' },

  badgesRow: { marginHorizontal: -SPACING.base },
  badgesContent: { paddingHorizontal: SPACING.base, gap: 8, paddingBottom: 8 },
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
  teacherCard: { width: 144, borderRadius: BORDER_RADIUS.xl, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, alignItems: 'center' },
  teacherAvatarSquare: { width: 76, height: 76, borderRadius: BORDER_RADIUS.lg, backgroundColor: '#ECFDF5', borderWidth: 2, borderColor: COLORS.borderGreen, alignItems: 'center', justifyContent: 'center', marginBottom: 10, overflow: 'hidden' },
  teacherAvatarImgSquare: { width: '100%', height: '100%', borderRadius: BORDER_RADIUS.md },
  teacherAvatarText: { fontSize: FONT_SIZE.xl, color: COLORS.success, fontWeight: '800' },
  teacherName: { fontSize: FONT_SIZE.sm, color: COLORS.textPrimary, fontWeight: '700', textAlign: 'center' },
  teacherDesignation: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginTop: 2, textAlign: 'center' },
  certBadge: { marginTop: 6, paddingHorizontal: 6, paddingVertical: 3, borderRadius: BORDER_RADIUS.full, backgroundColor: '#D1FAE5', borderWidth: 1, borderColor: COLORS.borderGreen },
  certText: { fontSize: 9, color: '#047857', fontWeight: '700', textAlign: 'center' },

  // Class Card
  classesList: { paddingHorizontal: SPACING.base, gap: 10 },
  classCard: { borderRadius: BORDER_RADIUS.xl, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.borderGreen, backgroundColor: '#FFFFFF' },
  classCardGradient: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: SPACING.md, position: 'relative' },
  classAccentBar: { position: 'absolute', top: 0, left: 0, bottom: 0, width: 4, backgroundColor: COLORS.success },
  classTimeBox: { alignItems: 'center', backgroundColor: '#ECFDF5', paddingHorizontal: 8, paddingVertical: 6, borderRadius: BORDER_RADIUS.md, borderWidth: 1, borderColor: COLORS.borderGreen, minWidth: 64 },
  classDayText: { fontSize: 10, color: COLORS.success, fontWeight: '800' },
  classHourText: { fontSize: 10, color: COLORS.textMuted, fontWeight: '700', marginTop: 2 },
  classMainContent: { flex: 1 },
  classLivePill: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  livePulseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.success },
  classLivePillText: { fontSize: 8, color: COLORS.success, fontWeight: '800', letterSpacing: 0.5 },
  classTitle: { fontSize: FONT_SIZE.xs + 1, color: COLORS.textPrimary, fontWeight: '800', lineHeight: 18 },
  classFacultyRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  classFacultyAvatar: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: COLORS.borderGreen, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  classFacultyImg: { width: '100%', height: '100%' },
  classFacultyInitial: { fontSize: 10, color: COLORS.success, fontWeight: '800' },
  classByTeacher: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },
  joinBtnSmall: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.accentGreen, paddingHorizontal: 12, paddingVertical: 8, borderRadius: BORDER_RADIUS.md },
  joinBtnSmallText: { fontSize: FONT_SIZE.xs, color: '#fff', fontWeight: '800' },

  // Skeleton
  skeleton: { backgroundColor: 'rgba(16,185,129,0.06)', height: 220 },

  // Official Helplines Card Styles
  helplineSectionCard: {
    marginHorizontal: SPACING.base,
    backgroundColor: '#FFFFFF',
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  helplineSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  helplineSectionLogo: {
    width: 38,
    height: 38,
  },
  helplineSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  helplineSectionSub: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 1,
  },
  helplineCardBody: {
    padding: SPACING.md,
    gap: 8,
  },
  homeHelplineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  homeHelplineInfo: {
    flex: 1,
    paddingRight: SPACING.xs,
  },
  homeHelplineName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  homeHelplineNumber: {
    fontSize: 12,
    fontWeight: '800',
    color: '#16A34A',
    marginTop: 1,
  },
  homeHelplineRole: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  homeHelplineActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  homeCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#16A34A',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.md,
  },
  homeCallText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16A34A',
  },
  homeWaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#25D366',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.md,
  },
  homeWaText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
