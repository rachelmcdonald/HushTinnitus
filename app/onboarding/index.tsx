import { StyleSheet, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Svg, { Path, Circle } from 'react-native-svg';
import { Colors, Typography, Spacing, Radius, Duration } from '@/src/theme';

// Logo mark — Section 4.1
// Settling waveform: sound waves that rise and fall, resolving to calm centre
function LogoMark({ size = 88 }: { size?: number }) {
  return (
    <View
      style={[
        styles.logoMark,
        { width: size, height: size, borderRadius: size * 0.26 },
      ]}
    >
      <Svg
        width={size * 0.84}
        height={size * 0.5}
        viewBox="4 9 30 20"
      >
        {/* Waveform path — stroke #5DCAA5 per spec Section 4.1 */}
        <Path
          d="M8 19 Q11 12 14 19 Q17 26 19 19 Q21 14 23 19 Q25 24 27 19 Q29 15 30 19"
          stroke={Colors.calmWave}
          strokeWidth="1.8"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Centre dot — fill #E1F5EE per spec Section 4.1 */}
        <Circle cx="19" cy="19" r="1.8" fill={Colors.tealLight} />
      </Svg>
    </View>
  );
}

// Wordmark — Section 4.1
// "Hush" regular weight deep tide / "Tinnitus" medium weight calm wave, lowercase
function Wordmark() {
  return (
    <View style={styles.wordmarkRow}>
      <Text style={styles.wordmarkHush}>hush </Text>
      <Text style={styles.wordmarkTinnitus}>tinnitus</Text>
    </View>
  );
}

export default function WelcomeScreen() {
  function handleGetStarted() {
    router.push('/onboarding/red-flag');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>

        {/* Logo + wordmark */}
        <View style={styles.brandBlock}>
          <LogoMark size={88} />
          <Wordmark />
          <Text style={styles.tagline}>Sound therapy & support</Text>
        </View>

        {/* Purpose statement */}
        <View style={styles.purposeBlock}>
          <Text style={styles.purpose}>
            Evidence-based self-management tools to help you cope with tinnitus
            — free, with no account required.
          </Text>
        </View>

        {/* CTA */}
        <View style={styles.ctaBlock}>
          <Pressable
            style={({ pressed }) => [
              styles.ctaButton,
              pressed && styles.ctaButtonPressed,
            ]}
            onPress={handleGetStarted}
            accessibilityRole="button"
            accessibilityLabel="Get started"
          >
            <Text style={styles.ctaLabel}>Get started</Text>
          </Pressable>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.warmSand,
  },
  container: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    justifyContent: 'space-between',
    paddingTop: Spacing.huge * 2,
    paddingBottom: Spacing.xl,
  },

  // Brand block
  brandBlock: {
    alignItems: 'center',
    gap: Spacing.base,
  },
  logoMark: {
    backgroundColor: Colors.deepTide,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wordmarkRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  wordmarkHush: {
    ...Typography.display,
    color: Colors.deepTide,
  },
  wordmarkTinnitus: {
    ...Typography.display,
    fontWeight: '500',
    color: Colors.calmWave,
  },
  tagline: {
    ...Typography.body,
    color: Colors.midGray,
    textAlign: 'center',
  },

  // Purpose block
  purposeBlock: {
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
  },
  purpose: {
    ...Typography.body,
    color: Colors.darkText,
    textAlign: 'center',
    lineHeight: 24,
  },

  // CTA block
  ctaBlock: {
    gap: Spacing.md,
  },
  ctaButton: {
    backgroundColor: Colors.deepTide,
    borderRadius: Radius.chip,
    paddingVertical: Spacing.base,
    alignItems: 'center',
  },
  ctaButtonPressed: {
    opacity: 0.85,
  },
  ctaLabel: {
    ...Typography.heading2,
    color: Colors.white,
  },
});
