import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { getAccessToken } from '@/src/services/api';

const APP_LOGO = require('@/assets/icon.png');

export default function RootIndex() {
  useEffect(() => {
    let mounted = true;

    async function determineInitialRoute() {
      // Hide native splash screen cleanly as custom splash screen is mounted
      try {
        await SplashScreen.hideAsync();
      } catch {
        // Ignore if already hidden
      }

      // Add minimum splash display time (1.2s) for smooth visual experience
      const startTime = Date.now();

      let targetRoute: '/onboarding' | '/(auth)/login' | '/(tabs)' = '/onboarding';
      try {
        const token = getAccessToken();

        if (!token) {
          targetRoute = '/onboarding';
        } else {
          targetRoute = '/(tabs)';
        }
      } catch {
        targetRoute = '/onboarding';
      }

      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 1200 - elapsed);

      setTimeout(() => {
        if (mounted) {
          router.replace(targetRoute);
        }
      }, remaining);
    }

    determineInitialRoute();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor="#16A34A" />

      {/* Main Branded Content */}
      <View style={styles.content}>
        <View style={styles.logoBadgeContainer}>
          <Image source={APP_LOGO} style={styles.logo} resizeMode="contain" />
        </View>

        <Text style={styles.title}>VIREON</Text>
        <Text style={styles.subtitle}>SAFETY INSTITUTE</Text>

        <View style={styles.taglineBadge}>
          <Text style={styles.taglineText}>Govt & ISO 45001 Accredited</Text>
        </View>
      </View>

      {/* Bottom Loading Indicator */}
      <View style={styles.footer}>
        <ActivityIndicator size="small" color="#FFFFFF" />
        <Text style={styles.loadingText}>Initializing Safety Portal...</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBadgeContainer: {
    width: 110,
    height: 110,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 18,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#DCFCE7',
    letterSpacing: 3,
    marginTop: 2,
    marginBottom: 20,
    textAlign: 'center',
  },
  taglineBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  taglineText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  footer: {
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    color: '#DCFCE7',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});

