import { useEffect, useRef } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import Svg, { Ellipse, Circle } from 'react-native-svg';
import { usePreferences } from '@/src/context/PreferencesContext';

const TEAL = '#5DCAA5';
const SAND = '#F5F1EB';
const BG   = '#0D4F5C';

// ── Timing constants (ms) ──────────────────────────────────────────────────────
const DELAY_START  = 100;   // brief pause so the first frame always renders
const FADE_IN      = 800;   // opacity 0 → 1
const HOLD         = 2000;  // fully visible
const FADE_OUT     = 500;   // opacity 1 → 0
const FADE_OUT_AT  = DELAY_START + FADE_IN + HOLD;  // 2900 ms
const NAVIGATE_AT  = FADE_OUT_AT + FADE_OUT;         // 3400 ms

export default function LaunchScreen() {
  const { preferences } = usePreferences();

  // Ref keeps the navigate callback always pointing at fresh preferences,
  // regardless of what the useEffect closure captured at mount time.
  const navigateRef = useRef<() => void>(() => {});
  navigateRef.current = () => {
    router.replace(preferences?.onboardingComplete ? '/(tabs)' : '/onboarding');
  };

  // Single shared value drives the entire screen — no per-element sequencing.
  const opacity = useSharedValue(0);

  const screenStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  useEffect(() => {
    console.log('[LaunchScreen] mounted — animation starting');

    // Fade in after DELAY_START
    opacity.value = withDelay(DELAY_START, withTiming(1, { duration: FADE_IN }));

    // Fade out once HOLD period is over
    const fadeTimer = setTimeout(() => {
      opacity.value = withTiming(0, { duration: FADE_OUT });
    }, FADE_OUT_AT);

    // Navigate once fade-out is complete
    const navTimer = setTimeout(() => {
      console.log('[LaunchScreen] navigating');
      navigateRef.current();
    }, NAVIGATE_AT);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(navTimer);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Render ─────────────────────────────────────────────────────────────────
  // All content is static inside one Animated.View. The single opacity drives
  // the whole screen — no invisible children.
  return (
    <Animated.View style={[styles.screen, screenStyle]}>

      {/* Centred logo + wordmark */}
      <View style={styles.center}>

        {/* Drops and ripple icon — identical SVG paths to streak counter */}
        <Svg width={160} height={160} viewBox="0 0 48 48" fill="none">
          {/* Ripples (back to front) */}
          <Ellipse cx="24" cy="40" rx="18" ry="5.5" stroke={TEAL} strokeWidth="2"   opacity={0.3} />
          <Ellipse cx="24" cy="40" rx="12" ry="3.5" stroke={TEAL} strokeWidth="2.2" opacity={0.55} />
          <Ellipse cx="24" cy="40" rx="6"  ry="2"   stroke={TEAL} strokeWidth="2.5" opacity={0.9} />
          {/* Drops (large to small) */}
          <Circle cx="24" cy="30" r="4" fill={TEAL} />
          <Circle cx="24" cy="20" r="3" fill={TEAL} opacity={0.75} />
          <Circle cx="24" cy="12" r="2" fill={TEAL} opacity={0.5} />
        </Svg>

        {/* "hush." — "hush" teal, "." warm sand */}
        <View style={styles.hushRow}>
          <Text style={styles.hushWord}>hush</Text>
          <Text style={styles.hushDot}>.</Text>
        </View>

        {/* "tinnitus" */}
        <Text style={styles.tinnitusText}>tinnitus</Text>

      </View>

      {/* Attribution — absolute, 40px from screen bottom */}
      <View style={styles.attribution}>
        <Text style={styles.attributionBy}>by</Text>
        <Image
          source={require('@/assets/images/resonear-logo.png')}
          style={styles.attributionLogo}
          resizeMode="contain"
        />
      </View>

    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Outer Animated.View — full screen, deep-tide background
  screen: {
    flex: 1,
    backgroundColor: BG,
  },

  // Fills remaining space and centres logo + wordmark
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
