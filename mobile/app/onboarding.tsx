import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  FlatList,
  ViewToken,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Shield, BookOpen, Flame, Award, ArrowRight, CheckCircle2 } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

interface Slide {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ElementType;
  accentColor: string;
  features: string[];
}

const SLIDES: Slide[] = [
  {
    id: '1',
    badge: 'SLIDE 1 OF 3 • COURSES',
    title: 'Certified Safety Engineering',
    subtitle: 'Government & Internationally Accredited Diplomas',
    description: 'Master Industrial Safety, Fire Engineering, EHS Management & Environmental Safety with industry-aligned curriculum.',
    icon: BookOpen,
    accentColor: '#16A34A',
    features: [
      'Industrial Safety Management (PG Diploma)',
      'Fire & Safety Engineering Certification',
      'Construction & Environmental Health Programs',
    ],
  },
  {
    id: '2',
    badge: 'SLIDE 2 OF 3 • PRACTICALS',
    title: 'Live Practical Training & Drills',
    subtitle: 'Hands-on Safety Demonstrations & Labs',
    description: 'Experience real-world emergency response drills, fire hydrants, smoke simulators, and hazard control practicals.',
    icon: Flame,
    accentColor: '#22C55E',
    features: [
      'Live Fire Extinguisher & Hydrant Training',
      'Hazmat & Confined Space Entry Drills',
      'First-Aid & Emergency Rescue Workshops',
    ],
  },
  {
    id: '3',
    badge: 'SLIDE 3 OF 3 • CAREER',
    title: '100% Placement & Career Support',
    subtitle: 'Top Industrial Recruiters & Campus Drives',
    description: 'Join thousands of successful graduates placed in oil & gas, construction, manufacturing, and safety consultancies worldwide.',
    icon: Award,
    accentColor: '#4ADE80',
    features: [
      'Dedicated Campus Recruitment Drives',
      'ISO & OSHA Compliant Certification',
      'Lifetime Alumni & Job Placement Assistance',
    ],
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
    <SafeAreaView style={styles.container}>
      {/* Top Header / Skip */}
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View style={styles.logoBadge}>
            <Shield size={20} color="#22C55E" />
          </View>
          <Text style={styles.brandName}>VIREON</Text>
        </View>
        <TouchableOpacity onPress={finishOnboarding} style={styles.skipBtn}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* 3-Slide Carousel */}
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
          const IconComp = item.icon;
          return (
            <View style={styles.slideCard}>
              {/* Character / Badge Container on Solid Dark Green Background */}
              <View style={styles.heroBadgeBox}>
                <View style={[styles.glowCircle, { borderColor: `${item.accentColor}40` }]}>
                  <View style={[styles.innerIconCircle, { backgroundColor: `${item.accentColor}20` }]}>
                    <IconComp size={48} color={item.accentColor} />
                  </View>
                </View>
                <View style={styles.characterTag}>
                  <Text style={styles.characterTagText}>{item.badge}</Text>
                </View>
              </View>

              {/* Text & Content */}
              <View style={styles.contentBox}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={[styles.subtitle, { color: item.accentColor }]}>{item.subtitle}</Text>
                <Text style={styles.description}>{item.description}</Text>

                {/* Feature Bullet List */}
                <View style={styles.featureList}>
                  {item.features.map((feat: string, idx: number) => (
                    <View key={idx} style={styles.featureItem}>
                      <CheckCircle2 size={16} color="#22C55E" />
                      <Text style={styles.featureText}>{feat}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          );
        }}
      />

      {/* Bottom Footer Controls */}
      <View style={styles.footer}>
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

        {/* Action Button */}
        <TouchableOpacity onPress={handleNext} style={styles.nextBtn} activeOpacity={0.85}>
          <Text style={styles.nextBtnText}>
            {currentIndex === SLIDES.length - 1 ? 'Get Started' : 'Continue'}
          </Text>
          <ArrowRight size={18} color="#030712" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#051F11', // Solid dark emerald green background
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    color: '#F1F5F9',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
  },
  skipBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  skipText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  slideCard: {
    width,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroBadgeBox: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  glowCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(11, 40, 24, 0.8)',
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  innerIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  characterTag: {
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  characterTagText: {
    color: '#4ADE80',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  contentBox: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 24,
    padding: 20,
  },
  title: {
    color: '#F1F5F9',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 12,
  },
  description: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 16,
  },
  featureList: {
    gap: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  featureText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  paginationRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  activeDot: {
    width: 28,
    backgroundColor: '#22C55E',
  },
  inactiveDot: {
    width: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#22C55E',
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  nextBtnText: {
    color: '#030712',
    fontSize: 14,
    fontWeight: '800',
  },
});
