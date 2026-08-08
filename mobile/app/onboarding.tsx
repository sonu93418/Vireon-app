import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  FlatList,
  ViewToken,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Shield, BookOpen, Flame, Award, ArrowRight, CheckCircle2 } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

interface Slide {
  id: string;
  topTitle: string;
  topSubtitle: string;
  sheetTitle: string;
  sheetDescription: string;
  image: any;
}

const SLIDES: Slide[] = [
  {
    id: '1',
    topTitle: 'SAFETY FIRST',
    topSubtitle: 'Govt & ISO 45001 Accredited',
    sheetTitle: 'Certified Industrial Safety',
    sheetDescription: 'Master EHS Management, Industrial Hazard Mitigation, and Environmental Health Engineering with India\'s premier safety institute.',
    image: require('@/assets/splash_engineer.png'),
  },
  {
    id: '2',
    topTitle: 'PRACTICAL LABS',
    topSubtitle: 'Hands-on Emergency Drills',
    sheetTitle: 'Live Equipment Training',
    sheetDescription: 'Experience real-world emergency response drills, fire hydrants, gas detectors, CPR, and hazard control practical workshops.',
    image: require('@/assets/splash_fire.png'),
  },
  {
    id: '3',
    topTitle: 'CAREER DIRECT',
    topSubtitle: '100% Guaranteed Placement',
    sheetTitle: 'Campus Recruitment Drives',
    sheetDescription: 'Vireon guarantees 100% placement support in oil & gas, construction, manufacturing, and MNC EHS consultancies nationwide.',
    image: require('@/assets/splash_placement.png'),
  },
];

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index !== null) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const handleNext = async () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      await finishOnboarding();
    }
  };

  const finishOnboarding = async () => {
    try {
      await AsyncStorage.setItem('hasSeenOnboarding', 'true');
    } catch {
      // Ignore storage errors
    }
    router.replace('/(auth)/login');
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" translucent backgroundColor="transparent" />

      {/* Top Floating Logo + Skip Row */}
      <View style={styles.topRow}>
        <Image source={require('@/assets/icon.png')} style={styles.floatingLogo} resizeMode="contain" />
        <TouchableOpacity onPress={finishOnboarding} style={styles.skipBtn} activeOpacity={0.8}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* 3-Slide Full Background Hero Carousel */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewConfig}
        renderItem={({ item }) => {
          return (
            <View style={styles.slideCard}>
              {/* Top Hero Full-Bleed Poster — No Text Overlay */}
              <View style={styles.heroSection}>
                <Image source={item.image} style={styles.characterImage} resizeMode="cover" />
              </View>

              {/* Bottom White Rounded Sheet with Multi-Color Text */}
              <View style={styles.bottomSheet}>
                {/* Pagination Dots */}
                <View style={styles.paginationRow}>
                  {SLIDES.map((_, idx) => (
                    <View
                      key={idx}
                      style={[
                        styles.dot,
                        currentIndex === idx ? styles.activeDot : styles.inactiveDot,
                      ]}
                    />
                  ))}
                </View>

                {/* Category Badge */}
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryBadgeText}>{item.topSubtitle}</Text>
                </View>

                {/* Multi-Color Title */}
                <View style={styles.contentGroup}>
                  <Text style={styles.sheetTitle}>
                    <Text style={styles.titleHighlight}>{item.topTitle.split(' ')[0]} </Text>
                    <Text style={styles.titleDark}>{item.topTitle.split(' ').slice(1).join(' ')}</Text>
                  </Text>
                  <Text style={styles.sheetSubtitle}>{item.sheetTitle}</Text>
                  <Text style={styles.sheetDescription}>{item.sheetDescription}</Text>
                </View>

                {/* Full-Width Action Button */}
                <TouchableOpacity onPress={handleNext} style={styles.fullWidthBtn} activeOpacity={0.85}>
                  <ArrowRight size={20} color="#FFFFFF" />
                  <Text style={styles.fullWidthBtnText}>
                    {currentIndex === SLIDES.length - 1 ? 'Get Started' : 'Next'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0EA349',
  },
  topRow: {
    position: 'absolute',
    top: 48,
    left: 20,
    right: 20,
    zIndex: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  floatingLogo: {
    width: 44,
    height: 44,
    borderRadius: 12,
  },
  skipBtn: {
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  skipText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  slideCard: {
    width,
    height,
    backgroundColor: '#0EA349',
    justifyContent: 'space-between',
  },
  heroSection: {
    width: width,
    height: height * 0.66,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#0EA349',
  },
  characterImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: width,
    height: height * 0.66,
  },
  bottomSheet: {
    width,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    marginTop: -32,
    paddingHorizontal: 24,
    paddingTop: 22,
    paddingBottom: 36,
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: height * 0.38,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -12 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
    zIndex: 20,
  },
  paginationRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  activeDot: {
    width: 28,
    backgroundColor: '#16A34A',
  },
  inactiveDot: {
    width: 8,
    backgroundColor: '#E2E8F0',
  },
  categoryBadge: {
    backgroundColor: '#ECFDF5',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16A34A',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  contentGroup: {
    alignItems: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 26,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 6,
    lineHeight: 32,
  },
  titleHighlight: {
    color: '#16A34A',
    fontWeight: '900',
    fontStyle: 'italic',
  },
  titleDark: {
    color: '#0F172A',
    fontWeight: '800',
  },
  sheetSubtitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'center',
    marginBottom: 6,
    fontStyle: 'italic',
  },
  sheetDescription: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '500',
    color: '#64748B',
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  fullWidthBtn: {
    width: '100%',
    height: 52,
    borderRadius: 26,
    backgroundColor: '#16A34A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  fullWidthBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
});
