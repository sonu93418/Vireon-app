import { Tabs } from 'expo-router';
import { Platform, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Home, BookOpen, Video, FileText, User } from 'lucide-react-native';
import { COLORS, BORDER_RADIUS } from '@/src/theme/tokens';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

// ─── Tab Config ───────────────────────────────────────────────────────────────
const TAB_CONFIG = [
  { name: 'index', label: 'Home', Icon: Home },
  { name: 'courses', label: 'Courses', Icon: BookOpen },
  { name: 'classes', label: 'Classes', Icon: Video },
  { name: 'blogs', label: 'Blogs', Icon: FileText },
  { name: 'profile', label: 'Profile', Icon: User },
];

// ─── Single Tab Item ──────────────────────────────────────────────────────────
function TabItem({
  Icon,
  label,
  focused,
  onPress,
  onLongPress,
}: {
  Icon: React.ElementType;
  label: string;
  focused: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const scale = useSharedValue(1);
  const progress = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(focused ? 1 : 1, { damping: 14, stiffness: 350 });
    progress.value = withTiming(focused ? 1 : 0, { duration: 250 });
  }, [focused, scale, progress]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateY: withSpring(focused ? -2 : 0, { damping: 14 }) }],
  }));

  const pillStyle = useAnimatedStyle(() => ({
    opacity: withTiming(focused ? 1 : 0, { duration: 200 }),
    transform: [{ scaleX: withSpring(focused ? 1 : 0.3, { damping: 14, stiffness: 300 }) }],
  }));

  const labelStyle = useAnimatedStyle(() => ({
    opacity: withTiming(focused ? 1 : 0.55, { duration: 200 }),
    transform: [{ translateY: withSpring(focused ? 0 : 1, { damping: 14 }) }],
  }));

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
      style={styles.tabItem}
      accessibilityRole="button"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
    >
      {/* Active background pill */}
      <Animated.View style={[styles.activePill, pillStyle]}>
        <LinearGradient
          colors={['rgba(22, 163, 74, 0.12)', 'rgba(22, 163, 74, 0.06)']}
          style={styles.activePillGradient}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      </Animated.View>

      <Animated.View style={[styles.iconWrap, iconStyle]}>
        <Icon
          size={21}
          color={focused ? COLORS.success : COLORS.textMuted}
          strokeWidth={focused ? 2.5 : 1.8}
        />
        {/* Active dot under icon */}
        {focused && <View style={styles.activeDot} />}
      </Animated.View>

      <Animated.Text
        style={[
          styles.label,
          { color: focused ? COLORS.success : COLORS.textMuted },
          labelStyle,
        ]}
        numberOfLines={1}
      >
        {label}
      </Animated.Text>
    </TouchableOpacity>
  );
}

// ─── Custom Tab Bar ───────────────────────────────────────────────────────────
function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === 'ios' ? Math.max(insets.bottom, 8) : 10;

  return (
    <View style={styles.tabBarWrapper}>
      {/* White fill behind rounded corners to eliminate corner gaps */}
      <View style={[styles.tabBarOuter, { paddingBottom: bottomPadding }]}>
        {/* Top green glow line */}
        <LinearGradient
          colors={['rgba(22, 163, 74, 0.25)', 'rgba(22, 163, 74, 0.05)', 'transparent']}
          style={styles.topGlowLine}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />

        <View style={styles.tabBarInner}>
          {state.routes.map((route, index) => {
            const config = TAB_CONFIG.find((t) => t.name === route.name);
            if (!config) return null;

            const focused = state.index === index;

            const onPress = () => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params);
              }
            };

            const onLongPress = () => {
              navigation.emit({ type: 'tabLongPress', target: route.key });
            };

            return (
              <TabItem
                key={route.key}
                Icon={config.Icon}
                label={config.label}
                focused={focused}
                onPress={onPress}
                onLongPress={onLongPress}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}

// ─── Tab Layout ───────────────────────────────────────────────────────────────
export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="courses" options={{ title: 'Courses' }} />
      <Tabs.Screen name="classes" options={{ title: 'Classes' }} />
      <Tabs.Screen name="blogs" options={{ title: 'Blogs' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  tabBarWrapper: {
    backgroundColor: '#FFFFFF',
  },
  tabBarOuter: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 0,
    // Elevated shadow
    shadowColor: '#0B3D2E',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 20,
  },
  topGlowLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  tabBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 8,
    paddingHorizontal: 4,
  },

  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    position: 'relative',
  },

  activePill: {
    position: 'absolute',
    top: 0,
    left: 8,
    right: 8,
    bottom: 0,
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
  },
  activePillGradient: {
    flex: 1,
    borderRadius: BORDER_RADIUS.xl,
  },

  iconWrap: {
    width: 36,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeDot: {
    position: 'absolute',
    bottom: -2,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: COLORS.success,
  },

  label: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 0.2,
  },
});
