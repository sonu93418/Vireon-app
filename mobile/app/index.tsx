import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAccessToken } from '@/src/services/api';
import { COLORS } from '@/src/theme/tokens';

export default function RootIndex() {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function determineInitialRoute() {
      try {
        const hasSeenOnboarding = await AsyncStorage.getItem('hasSeenOnboarding');
        const token = getAccessToken();

        if (!hasSeenOnboarding) {
          router.replace('/onboarding');
        } else if (!token) {
          router.replace('/(auth)/login');
        } else {
          router.replace('/(tabs)');
        }
      } catch {
        router.replace('/onboarding');
      } finally {
        setChecking(false);
      }
    }

    determineInitialRoute();
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#16A34A" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
