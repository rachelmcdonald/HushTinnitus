import { useEffect, useRef } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import Svg, { Ellipse, Circle } from 'react-native-svg';
import { usePreferences } from '@/src/context/PreferencesContext';

const TEAL = '#5DCAA5';
const SAND = '#F5F1EB';
const BG   = '#0D4F5C';

export default function LaunchScreen() {
  const { preferences } = usePreferences();

  // Ref ensures the setTimeout callback always reads the latest preferences,
  // not the stale closure captured at mount time.
  const navigateRef = useRef(() => {});
  navigateRef.current = () => {
    router.replace(preferences?.onboardingComplete ? '/(tabs)' : '/onboarding');
  };

  // ── Shared values ──────────────────────────────────────────────────────────
  const screenOpacity    = useSharedValue(1);

  const smallDropOp      = useSharedValue(0);
  const smallDropY       = useSharedValue(-8);
  const medDropOp        = useSharedValue(0);
  const medDropY         = useSharedValue(-8);
  const largeDropOp      = useSharedValue(0);
  const largeDropY       = useSharedValue(-8);

  const innerRippleOp    = useSharedValue(0);
  const innerRippleSX    = useSharedValue(0.8);
  const midRippleOp      = useSharedValue(0);
  const midRippleSX      = useSharedValue(0.8);
  const outerRippleOp    = useSharedValue(0);
  const outerRippleSX    = useSharedValue(0.8);

  const hushOp           = useSharedValue(0);
  const tinnitusOp       = useSharedValue(0);
  const attributionOp    = useSharedValue(0);

  // ── Animated styles ────────────────────────────────────────────────────────
  const screenStyle      = useAnimatedStyle(() => ({ opacity: screenOpacity.value }));

  const smallDropStyle   = useAnimatedStyle(() => ({
    opacity: smallDropOp.value,
    transform: [{ translateY: smallDropY.value }],
  }));
  const medDropStyle     = useAnimatedStyle(() => ({
    opacity: medDropOp.value,
    transform: [{ translateY: medDropY.value }],
  }));
  const largeDropStyle   = useAnimatedStyle(() => ({
    opacity: largeDropOp.value,
    transform: [{ translateY: largeDropY.value }],
  }));
  const innerRippleStyle = useAnimatedStyle(() => ({
    opacity: innerRippleOp.value,
    transform: [{ scaleX: innerRippleSX.value }],
  }));
  const midRippleStyle   = useAnimatedStyle(() => ({
    opacity: midRippleOp.value,
    transform: [{ scaleX: midRippleSX.value }],
  }));
  const outerRippleStyle = useAnimatedStyle(() => ({
    opacity: outerRippleOp.value,
    transform: [{ scaleX: outerRippleSX.value }],
  }));
  const hushStyle        = useAnimatedStyle(() => ({ opacity: hushOp.value }));
  const tinnitusStyle    = useAnimatedStyle(() => ({ opacity: tinnitusOp.value }));
  const attributionStyle = useAnimatedStyle(() => ({ opacity: attributionOp.value }));

  // ── Animation sequence ─────────────────────────────────────────────────────
  useEffect(() => {
    if (__DEV__) {
      // Skip animation during development to avoid slowing down iteration.
      // Remove this block to preview the animation in a dev build.
      const t = setTimeout(() => navigateRef.current(), 200);
      return () => clearTimeout(t);
    }

    const ease = Easing.out(Easing.quad);

    // Step 2 (200ms) — small drop falls in
    smallDropOp.value    = withDelay(200,  withTiming(1, { duration: 400, easing: ease }));
    smallDropY.value     = withDelay(200,  withTiming(0, { duration: 400, easing: ease }));

    // Step 3 (600ms) — medium drop falls in
    medDropOp.value      = withDelay(600,  withTiming(1, { duration: 400, easing: ease }));
    medDropY.value       = withDelay(600,  withTiming(0, { duration: 400, easing: ease }));

    // Step 4 (1000ms) — large drop falls in
    largeDropOp.value    = withDelay(1000, withTiming(1, { duration: 400, easing: ease }));
    largeDropY.value     = withDelay(1000, withTiming(0, { duration: 400, easing: ease }));

    // Step 5 (1400ms) — inner ripple expands
    innerRippleOp.value  = withDelay(1400, withTiming(1, { duration: 300 }));
    innerRippleSX.value  = withDelay(1400, withTiming(1, { duration: 300 }));

    // Step 6 (1600ms) — middle ripple expands
    midRippleOp.value    = withDelay(1600, withTiming(1, { duration: 300 }));
    midRippleSX.value    = withDelay(1600, withTiming(1, { duration: 300 }));

    // Step 7 (1800ms) — outer ripple expands
    outerRippleOp.value  = withDelay(1800, withTiming(1, { duration: 300 }));
    outerRippleSX.value  = withDelay(1800, withTiming(1, { duration: 300 }));

    // Step 8 (2100ms) — "hush." + attribution fade in
    hushOp.value         = withDelay(2100, withTiming(1, { duration: 400 }));
    attributionOp.value  = withDelay(2100, withTiming(1, { duration: 400 }));

    // Step 9 (2600ms) — "tinnitus" fades in
    tinnitusOp.value     = withDelay(2600, withTiming(1, { duration: 400 }));

    // Step 10 (3200ms) — full screen fades out over 500ms
    screenOpacity.value  = withDelay(3200, withTiming(0, { duration: 500 }));

    // Step 11 (3700ms) — navigate to the correct screen
    const t = setTimeout(() => navigateRef.current(), 3700);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Animated.View style={[styles.screen, screenStyle]}>

      {/* ── Logo — 6 independent animated layers ──────────────────────── */}
      <View style={styles.logoWrap}>

        {/* Small drop (top, r=2, opacity 0.5) */}
        <Animated.View style={[styles.layer, smallDropStyle]}>
          <Svg width={160} height={160} viewBox="0 0 48 48" fill="none">
            <Circle cx="24" cy="12" r="2" fill={TEAL} opacity={0.5} />
          </Svg>
        </Animated.View>

        {/* Medium drop (middle, r=3, opacity 0.75) */}
        <Animated.View style={[styles.layer, medDropStyle]}>
          <Svg width={160} height={160} viewBox="0 0 48 48" fill="none">
            <Circle cx="24" cy="20" r="3" fill={TEAL} opacity={0.75} />
          </Svg>
        </Animated.View>

        {/* Large drop (bottom, r=4, opacity 1.0) */}
        <Animated.View style={[styles.layer, largeDropStyle]}>
          <Svg width={160} height={160} viewBox="0 0 48 48" fill="none">
            <Circle cx="24" cy="30" r="4" fill={TEAL} />
          </Svg>
        </Animated.View>

        {/* Inner ripple (rx=6, opacity 0.9) */}
        <Animated.View style={[styles.layer, innerRippleStyle]}>
          <Svg width={160} height={160} viewBox="0 0 48 48" fill="none">
            <Ellipse cx="24" cy="40" rx="6"  ry="2"   stroke={TEAL} strokeWidth="2.5" opacity={0.9} />
          </Svg>
        </Animated.View>

        {/* Middle ripple (rx=12, opacity 0.55) */}
        <Animated.View style={[styles.layer, midRippleStyle]}>
          <Svg width={160} height={160} viewBox="0 0 48 48" fill="none">
            <Ellipse cx="24" cy="40" rx="12" ry="3.5" stroke={TEAL} strokeWidth="2.2" opacity={0.55} />
          </Svg>
        </Animated.View>

        {/* Outer ripple (rx=18, opacity 0.3) */}
        <Animated.View style={[styles.layer, outerRippleStyle]}>
          <Svg width={160} height={160} viewBox="0 0 48 48" fill="none">
            <Ellipse cx="24" cy="40" rx="18" ry="5.5" stroke={TEAL} strokeWidth="2"   opacity={0.3} />
          </Svg>
        </Animated.View>

      </View>

      {/* ── "hush." ────────────────────────────────────────────────────── */}
      <Animated.View style={[styles.hushRow, hushStyle]}>
        <Text style={styles.hushWord}>hush</Text>
        <Text style={styles.hushDot}>.</Text>
      </Animated.View>

      {/* ── "tinnitus" ─────────────────────────────────────────────────── */}
      <Animated.View style={tinnitusStyle}>
        <Text style={styles.tinnitusText}>tinnitus</Text>
      </Animated.View>

      {/* ── Attribution — fixed 40px from bottom ───────────────────────── */}
      <Animated.View style={[styles.attribution, attributionStyle]}>
        <Text style={styles.attributionBy}>by</Text>
        <Image
          source={require('@/assets/images/resonear-logo.png')}
          style={styles.attributionLogo}
          resizeMode="contain"
        />
      </Animated.View>

    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Logo — 160×160 container; each SVG layer stacked absolutely
  logoWrap: {
    width: 160,
    height: 160,
  },
  layer: {
    position: 'absolute',
    top: 0,
    left: 0,
  },

  // "hush."
  hushRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 20,
  },
  hushWord: {
    fontSize: 48,
    fontWeight: '400',
    color: TEAL,
    lineHeight: 56,
  },
  hushDot: {
    fontSize: 48,
    fontWeight: '400',
    color: SAND,
    lineHeight: 56,
  },

  // "tinnitus"
  tinnitusText: {
    fontSize: 18,
    fontWeight: '300',
    color: TEAL,
    letterSpacing: 4,
    marginTop: 4,
    textAlign: 'center',
  },

  // Attribution — absolute, 40px from screen bottom
  attribution: {
    position: 'absolute',
    bottom: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  attributionBy: {
    fontSize: 12,
    color: TEAL,
  },
  attributionLogo: {
    width: 80,
    height: 14,
  },
});
