import { Tabs } from 'expo-router';
import { Platform, View } from 'react-native';
import { Home, BookOpen, Video, FileText, User } from 'lucide-react-native';
import { COLORS } from '@/src/theme/tokens';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useEffect } from 'react';

interface TabBarIconProps {
  icon: React.ElementType;
  focused: boolean;
  color: string;
}

function TabBarIcon({ icon: Icon, focused, color }: TabBarIconProps) {
  const scale = useSharedValue(focused ? 1.1 : 1);

  useEffect(() => {
    scale.value = withSpring(focused ? 1.1 : 1, { damping: 15, stiffness: 300 });
  }, [focused, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[animatedStyle, { alignItems: 'center', justifyContent: 'center' }]}>
      <Icon size={22} color={color} strokeWidth={focused ? 2.5 : 1.8} />
      {focused && (
        <View style={{ position: 'absolute', bottom: -8, width: 4, height: 4, borderRadius: 2, backgroundColor: COLORS.success }} />
      )}
    </Animated.View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.primary,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          paddingTop: 8,
          height: Platform.OS === 'ios' ? 84 : 64,
        },
        tabBarActiveTintColor: COLORS.success,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused, color }) => <TabBarIcon icon={Home} focused={focused} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="courses"
        options={{
          title: 'Courses',
          tabBarIcon: ({ focused, color }) => <TabBarIcon icon={BookOpen} focused={focused} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="classes"
        options={{
          title: 'Classes',
          tabBarIcon: ({ focused, color }) => <TabBarIcon icon={Video} focused={focused} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="blogs"
        options={{
          title: 'Blogs',
          tabBarIcon: ({ focused, color }) => <TabBarIcon icon={FileText} focused={focused} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused, color }) => <TabBarIcon icon={User} focused={focused} color={color as string} />,
        }}
      />
    </Tabs>
  );
}
