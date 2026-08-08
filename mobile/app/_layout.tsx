import 'react-native-gesture-handler';
import { Buffer } from 'buffer';
if (typeof global.Buffer === 'undefined') {
  global.Buffer = Buffer;
}

import { Slot } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { setupNotificationListeners } from '@/src/services/notifications';
import apiClient from '@/src/services/api';
import '../global.css';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: (failureCount, error) => {
        const status = (error as { response?: { status?: number } })?.response?.status;
        if (status === 401 || status === 403 || status === 404) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
  },
});

export default function RootLayout() {
  const notificationCleanup = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Hide native splash after initial mount
    void SplashScreen.hideAsync().catch(() => {});

    // Set up push notification listeners for foreground/background handling
    notificationCleanup.current = setupNotificationListeners();

    // App state prefetching on foreground focus
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        void queryClient.prefetchQuery({
          queryKey: ['courses', 'popular'],
          queryFn: () => apiClient.get('/courses/popular').then((r) => r.data.data),
        });
        void queryClient.prefetchQuery({
          queryKey: ['classes', 'upcoming'],
          queryFn: () => apiClient.get('/classes/upcoming?limit=5').then((r) => r.data.data),
        });
      }
    });

    return () => {
      subscription.remove();
      if (notificationCleanup.current) {
        notificationCleanup.current();
      }
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#16A34A' }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="dark" translucent animated />
          <Slot />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
