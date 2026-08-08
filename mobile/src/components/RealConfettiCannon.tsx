import React, { useEffect, useState, useMemo } from 'react';
import { View, StyleSheet, Dimensions, AccessibilityInfo } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import Svg, { Rect, Circle, Polygon } from 'react-native-svg';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const CONFETTI_COLORS = [
  '#10B981', // Emerald Green
  '#059669', // Dark Emerald
  '#3B82F6', // Royal Blue
  '#F59E0B', // Amber Gold
  '#EF4444', // Crimson Red
  '#8B5CF6', // Vivid Violet
  '#EC4899', // Hot Pink
  '#FACC15', // Bright Yellow
  '#14B8A6', // Teal
  '#F97316', // Orange
];

interface ParticleData {
  id: number;
  startX: number;
  startY: number;
  apexX: number;
  apexY: number;
  endX: number;
  endY: number;
  color: string;
  width: number;
  height: number;
  shape: 'rect' | 'circle' | 'diamond' | 'strip';
  delay: number;
  duration: number;
  rotXSpeed: number;
  rotYSpeed: number;
  rotZSpeed: number;
  swayFreq: number;
  swayAmp: number;
}

const PARTICLE_COUNT = 70;

function generateParticles(): ParticleData[] {
  return Array.from({ length: PARTICLE_COUNT }).map((_, i) => {
    // Launch from bottom center-spread (X: 10% to 90% of screen)
    const startX = SCREEN_WIDTH * 0.08 + Math.random() * (SCREEN_WIDTH * 0.84);
    const startY = SCREEN_HEIGHT + 20;

    // Upward launch apex (Y: 10% to 40% of screen height)
    const apexY = SCREEN_HEIGHT * 0.10 + Math.random() * (SCREEN_HEIGHT * 0.32);
    const apexX = startX + (Math.random() * 180 - 90);

    // Final fall landing position off bottom or sides
    const endX = apexX + (Math.random() * 220 - 110);
    const endY = SCREEN_HEIGHT + 60;

    const shapes: ('rect' | 'circle' | 'diamond' | 'strip')[] = ['rect', 'circle', 'diamond', 'strip'];
    const shape = shapes[i % shapes.length];

    return {
      id: i,
      startX,
      startY,
      apexX,
      apexY,
      endX,
      endY,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      width: shape === 'strip' ? 5 : shape === 'circle' ? 11 : 11,
      height: shape === 'strip' ? 24 : shape === 'rect' ? 14 : 11,
      shape,
      delay: Math.floor(Math.random() * 600), // Staggered launch delay up to 600ms
      duration: Math.floor(Math.random() * 1200) + 4800, // 4.8s - 6.0s total fall duration
      rotXSpeed: (Math.random() * 4 + 2) * (Math.random() > 0.5 ? 360 : -360),
      rotYSpeed: (Math.random() * 5 + 3) * (Math.random() > 0.5 ? 360 : -360),
      rotZSpeed: (Math.random() * 3 + 1) * (Math.random() > 0.5 ? 360 : -360),
      swayFreq: Math.random() * 3 + 2,
      swayAmp: Math.random() * 40 + 15,
    };
  });
}

const ParticleItem = React.memo(({ item, onFinish }: { item: ParticleData; onFinish?: () => void }) => {
  const progress = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    progress.value = withDelay(
      item.delay,
      withTiming(
        1,
        { duration: item.duration, easing: Easing.bezier(0.22, 1, 0.36, 1) },
        (finished) => {
          if (finished && onFinish) {
            runOnJS(onFinish)();
          }
        }
      )
    );

    opacity.value = withDelay(
      item.delay + item.duration * 0.75,
      withTiming(0, { duration: item.duration * 0.25 })
    );
  }, []);

  const animStyle = useAnimatedStyle(() => {
    const p = progress.value;

    let currentX = 0;
    let currentY = 0;

    if (p < 0.40) {
      const launchP = p / 0.40;
      currentX = item.startX + (item.apexX - item.startX) * launchP;
      currentY = item.startY - (item.startY - item.apexY) * Math.sin(launchP * (Math.PI / 2));
    } else {
      const fallP = (p - 0.40) / 0.60;
      currentX = item.apexX + (item.endX - item.apexX) * fallP + Math.sin(fallP * Math.PI * item.swayFreq) * item.swayAmp;
      currentY = item.apexY + (item.endY - item.apexY) * (fallP * fallP); // Accelerating gravity fall
    }

    const rotX = p * item.rotXSpeed;
    const rotY = p * item.rotYSpeed;
    const rotZ = p * item.rotZSpeed;

    return {
      position: 'absolute',
      left: currentX,
      top: currentY,
      opacity: opacity.value,
      transform: [
        { rotateX: `${rotX}deg` },
        { rotateY: `${rotY}deg` },
        { rotateZ: `${rotZ}deg` },
      ],
    };
  });

  return (
    <Animated.View style={animStyle} pointerEvents="none">
      <Svg width={item.width * 2} height={item.height * 2} viewBox={`0 0 ${item.width * 2} ${item.height * 2}`}>
        {item.shape === 'circle' && (
          <Circle cx={item.width} cy={item.height} r={item.width / 1.2} fill={item.color} />
        )}
        {item.shape === 'rect' && (
          <Rect x={item.width / 2} y={item.height / 2} width={item.width} height={item.height} rx={2} fill={item.color} />
        )}
        {item.shape === 'strip' && (
          <Rect x={item.width / 2} y={2} width={item.width} height={item.height} rx={1.5} fill={item.color} />
        )}
        {item.shape === 'diamond' && (
          <Polygon
            points={`${item.width},2 ${item.width * 2 - 2},${item.height} ${item.width},${item.height * 2 - 2} 2,${item.height}`}
            fill={item.color}
          />
        )}
      </Svg>
    </Animated.View>
  );
});

interface RealConfettiCannonProps {
  visible: boolean;
  onComplete?: () => void;
}

export const RealConfettiCannon = React.memo(({ visible, onComplete }: RealConfettiCannonProps) => {
  const [reduceMotion, setReduceMotion] = useState(false);
  const particles = useMemo(() => generateParticles(), [visible]);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      setReduceMotion(enabled);
    });

    if (visible) {
      // 6 SECONDS CELEBRATION TIMER
      const timer = setTimeout(() => {
        if (onComplete) onComplete();
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [visible, onComplete]);

  if (!visible || reduceMotion) return null;

  return (
    <View style={styles.fullscreenContainer} pointerEvents="none">
      {particles.map((p) => (
        <ParticleItem key={p.id} item={p} />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  fullscreenContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99999,
    elevation: 99999,
  },
});
