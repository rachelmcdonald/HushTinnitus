import { useMemo } from 'react';
import { StyleSheet, Text, View, Pressable, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Svg, { Path, Circle } from 'react-native-svg';
import { Spacing, Radius } from '@/src/theme';
import { useTheme } from '@/src/context/ThemeContext';

// Logo mark — Section 4.1
// Settling waveform: sound waves that rise and fall, resolving to calm centre
function LogoMark({ size = 88 }: { size?: number }) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        { backgroundColor: colors.deepTide, justifyContent: 'center', alignItems: 'center' },
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
          stroke={colors.calmWave}
          strokeWidth="1.8"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Centre dot — fill #E1F5EE per spec Section 4.1 */}
        <Circle cx="19" cy="19" r="1.8" fill={colors.tealLight} />
      </Svg>
    </View>
  );
}

// Wordmark — Section 4.1
// "Hush" regular weight deep tide / "Tinnitus" medium weight calm wave, lowercase
function Wordmark() {
  const { colors, typography } = useTheme();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
      <Text style={{ ...typography.display, color: colors.deepTide }}>hush </Text>
      <Text style={{ ...typography.display, fontWeight: '500', color: colors.calmWave }}>tinnitus</Text>
    </View>
  );
}

export default function WelcomeScreen() {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);

  function handleGetStarted() {
    router.push('/onboarding/red-flag');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>

        {/* Logo + wordmark */}
        <View style={styles.brandBlock}>
          <Image
            source={require('@/assets/icon.png')}
            style={styles.appIcon}
          />
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

          <View style={styles.attribution}>
            <Text style={styles.attributionBy}>by</Text>
            <Image
              source={require('@/assets/images/resonear-logo.png')}
              style={styles.attributionLogo}
              resizeMode="contain"
            />
          </View>
        </View>

      </View>
    </SafeAreaView>
  );
}

function makeStyles(
  colors: ReturnType<typeof useTheme>['colors'],
  typography: ReturnType<typeof useTheme>['typography'],
) {
  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      flex: 1,
      paddingHorizontal: Spacing.xl,
      justifyContent: 'space-between',
      paddingTop: Spacing.huge * 2,
      paddingBottom: Spacing.xl,
    },

    // App icon
    appIcon: {
      width: 120,
      height: 120,
      borderRadius: 24,
    },

    // Brand block
    brandBlock: {
      alignItems: 'center',
      gap: Spacing.base,
    },

    // Purpose block
    purposeBlock: {
      alignItems: 'center',
      paddingHorizontal: Spacing.sm,
    },
    tagline: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    purpose: {
      ...typography.body,
      color: colors.textPrimary,
      textAlign: 'center',
      lineHeight: 24,
    },

    // CTA block
    ctaBlock: {
      gap: Spacing.md,
    },
    attribution: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      marginTop: Spacing.xl,
    },
    attributionBy: {
      fontSize: 12,
      color: colors.calmWave,
    },
    attributionLogo: {
      width: 100,
      height: 17,
    },
    ctaButton: {
      backgroundColor: colors.deepTide,
      borderRadius: Radius.chip,
      paddingVertical: Spacing.base,
      alignItems: 'center',
    },
    ctaButtonPressed: {
      opacity: 0.85,
    },
    ctaLabel: {
      ...typography.heading2,
      color: colors.white,
    },
  });
}
