import { useEffect, useRef } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Ellipse, Circle } from 'react-native-svg';
import { usePreferences } from '@/src/context/PreferencesContext';

const TEAL = '#5DCAA5';
const SAND = '#F5F1EB';
const BG   = '#0D4F5C';

export default function LaunchScreen() {
  const { preferences } = usePreferences();

  // Ref keeps the navigate callback always pointing at fresh preferences.
  const navigateRef = useRef<() => void>(() => {});
  navigateRef.current = () => {
    router.replace(preferences?.onboardingComplete ? '/(tabs)' : '/onboarding');
  };

  // Hide the native splash screen on the first rendered frame so there is no
  // white gap between the splash and the launch screen content.
  useEffect(() => {
    requestAnimationFrame(() => {
      SplashScreen.hideAsync().catch(() => {});
    });
  }, []);

  // All animation timers stored here so every one can be cleared on unmount.
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // ── Shared values ──────────────────────────────────────────────────────────
  // Drop opacities + Y offset (0 = starting position, 8 = fallen position)
  const smallDropOpacity    = useSharedValue(0);
  const smallDropY          = useSharedValue(0);
  const mediumDropOpacity   = useSharedValue(0);
  const mediumDropY         = useSharedValue(0);
  const largeDropOpacity    = useSharedValue(0);
  const largeDropY          = useSharedValue(0);

  // Ripple opacities + scaleX (start at 0.6 to give a natural expand-from-centre feel)
  const innerRippleOpacity  = useSharedValue(0);
  const innerRippleScale    = useSharedValue(0.6);
  const middleRippleOpacity = useSharedValue(0);
  const middleRippleScale   = useSharedValue(0.6);
  const outerRippleOpacity  = useSharedValue(0);
  const outerRippleScale    = useSharedValue(0.6);

  // Text + attribution
  const textOpacity         = useSharedValue(0);
  const resonearOpacity     = useSharedValue(0);

  // Whole-screen fade-out (starts at 1 — screen is visible from the first frame)
  const screenOpacity       = useSharedValue(1);

  // ── Animated styles ────────────────────────────────────────────────────────
  const smallDropStyle    = useAnimatedStyle(() => ({
    opacity: smallDropOpacity.value,
    transform: [{ translateY: smallDropY.value }],
  }));
  const mediumDropStyle   = useAnimatedStyle(() => ({
    opacity: mediumDropOpacity.value,
    transform: [{ translateY: mediumDropY.value }],
  }));
  const largeDropStyle    = useAnimatedStyle(() => ({
    opacity: largeDropOpacity.value,
    transform: [{ translateY: largeDropY.value }],
  }));
  const innerRippleStyle  = useAnimatedStyle(() => ({
    opacity: innerRippleOpacity.value,
    transform: [{ scaleX: innerRippleScale.value }],
  }));
  const middleRippleStyle = useAnimatedStyle(() => ({
    opacity: middleRippleOpacity.value,
    transform: [{ scaleX: middleRippleScale.value }],
  }));
  const outerRippleStyle  = useAnimatedStyle(() => ({
    opacity: outerRippleOpacity.value,
    transform: [{ scaleX: outerRippleScale.value }],
  }));
  const textStyle         = useAnimatedStyle(() => ({ opacity: textOpacity.value }));
  const resonearStyle     = useAnimatedStyle(() => ({ opacity: resonearOpacity.value }));
  const screenStyle       = useAnimatedStyle(() => ({ opacity: screenOpacity.value }));

  // ── Animation sequence ─────────────────────────────────────────────────────
  useEffect(() => {
    const add = (fn: () => void, delay: number) => {
      const t = setTimeout(fn, delay);
      timersRef.current.push(t);
    };

    // One outer 100ms gate so the very first frame renders before any animation
    // starts. All inner setTimeouts are relative to that gate.
    add(() => {
      const ease = Easing.out(Easing.quad);

      // Step 1 — 0ms: small drop fades in and falls
      smallDropOpacity.value = withTiming(0.5,  { duration: 400 });
      smallDropY.value       = withTiming(8,    { duration: 400, easing: ease });

      // Step 2 — 400ms: medium drop fades in and falls
      add(() => {
        mediumDropOpacity.value = withTiming(0.75, { duration: 400 });
        mediumDropY.value       = withTiming(8,    { duration: 400, easing: ease });
      }, 400);

      // Step 3 — 800ms: large drop fades in and falls
      add(() => {
        largeDropOpacity.value = withTiming(1.0, { duration: 400 });
        largeDropY.value       = withTiming(8,   { duration: 400, easing: ease });
      }, 800);

      // Step 4 — 1200ms: inner ripple appears and expands
      add(() => {
        innerRippleOpacity.value = withTiming(0.9, { duration: 300 });
        innerRippleScale.value   = withTiming(1.0, { duration: 300, easing: ease });
      }, 1200);

      // Step 5 — 1500ms: middle ripple appears and expands
      add(() => {
        middleRippleOpacity.value = withTiming(0.55, { duration: 300 });
        middleRippleScale.value   = withTiming(1.0,  { duration: 300, easing: ease });
      }, 1500);

      // Step 6 — 1800ms: outer ripple appears and expands
      add(() => {
        outerRippleOpacity.value = withTiming(0.3, { duration: 300 });
        outerRippleScale.value   = withTiming(1.0, { duration: 300, easing: ease });
      }, 1800);

      // Step 7 — 2100ms: "hush." and "tinnitus" fade in together
      add(() => {
        textOpacity.value = withTiming(1.0, { duration: 400 });
      }, 2100);

      // Step 8 — 2500ms: RESONEAR attribution fades in
      add(() => {
        resonearOpacity.value = withTiming(1.0, { duration: 400 });
      }, 2500);

      // Step 9 — 3200ms: entire screen fades out
      add(() => {
        screenOpacity.value = withTiming(0, { duration: 500 });
      }, 3200);

      // Step 10 — 3700ms: navigate
      add(() => {
        navigateRef.current();
      }, 3700);

    }, 100);

    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Animated.View style={[styles.screen, screenStyle]}>

      <View style={styles.center}>

        {/* Logo — 6 independently animated layers in a 160×160 container */}
        <View style={styles.logoWrap}>

          {/* Small drop (top, r=2) */}
          <Animated.View style={[styles.layer, smallDropStyle]}>
            <Svg width={160} height={160} viewBox="0 0 48 48" fill="none">
              <Circle cx="24" cy="12" r="2" fill={TEAL} />
            </Svg>
          </Animated.View>

          {/* Medium drop (middle, r=3) */}
          <Animated.View style={[styles.layer, mediumDropStyle]}>
            <Svg width={160} height={160} viewBox="0 0 48 48" fill="none">
              <Circle cx="24" cy="20" r="3" fill={TEAL} />
            </Svg>
          </Animated.View>

          {/* Large drop (lower, r=4) */}
          <Animated.View style={[styles.layer, largeDropStyle]}>
            <Svg width={160} height={160} viewBox="0 0 48 48" fill="none">
              <Circle cx="24" cy="30" r="4" fill={TEAL} />
            </Svg>
          </Animated.View>

          {/* Inner ripple (rx=6) */}
          <Animated.View style={[styles.layer, innerRippleStyle]}>
            <Svg width={160} height={160} viewBox="0 0 48 48" fill="none">
              <Ellipse cx="24" cy="40" rx="6"  ry="2"   stroke={TEAL} strokeWidth="2.5" />
            </Svg>
          </Animated.View>

          {/* Middle ripple (rx=12) */}
          <Animated.View style={[styles.layer, middleRippleStyle]}>
            <Svg width={160} height={160} viewBox="0 0 48 48" fill="none">
              <Ellipse cx="24" cy="40" rx="12" ry="3.5" stroke={TEAL} strokeWidth="2.2" />
            </Svg>
          </Animated.View>

          {/* Outer ripple (rx=18) */}
          <Animated.View style={[styles.layer, outerRippleStyle]}>
            <Svg width={160} height={160} viewBox="0 0 48 48" fill="none">
              <Ellipse cx="24" cy="40" rx="18" ry="5.5" stroke={TEAL} strokeWidth="2" />
            </Svg>
          </Animated.View>

        </View>

        {/* "hush." and "tinnitus" share a single opacity animation */}
        <Animated.View style={textStyle}>
          <View style={styles.hushRow}>
            <Text style={styles.hushWord}>hush</Text>
            <Text style={styles.hushDot}>.</Text>
          </View>
          <Text style={styles.tinnitusText}>tinnitus</Text>
        </Animated.View>

      </View>

      {/* RESONEAR attribution — absolute, 40px from screen bottom */}
      <Animated.View style={[styles.attribution, resonearStyle]}>
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
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Logo container — 160×160; layers stacked absolutely
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

  // RESONEAR attribution — centred, 40px from bottom
  attribution: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
