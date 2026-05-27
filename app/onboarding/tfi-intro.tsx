import { useMemo } from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Spacing, Radius, Border } from '@/src/theme';
import { useTheme } from '@/src/context/ThemeContext';

type InfoRowProps = { emoji: string; heading: string; body: string };

function InfoRow({ emoji, heading, body }: InfoRowProps) {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);

  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoEmoji}>{emoji}</Text>
      <View style={styles.infoText}>
        <Text style={styles.infoHeading}>{heading}</Text>
        <Text style={styles.infoBody}>{body}</Text>
      </View>
    </View>
  );
}

export default function TFIIntroScreen() {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);

  function handleStart() {
    router.push('/onboarding/tfi-questionnaire');
  }

  // Skip: lastTFIDate stays null — Home screen uses this as the nudge flag
  function handleSkip() {
    router.push('/onboarding/notifications');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>4 minutes</Text>
          </View>
          <Text style={styles.title}>Understand your tinnitus</Text>
          <Text style={styles.subtitle}>
            The Tinnitus Functional Index (TFI) is a validated questionnaire
            that measures how tinnitus is affecting different areas of your life.
          </Text>
        </View>

        <View style={styles.infoCard}>
          <InfoRow
            emoji="📊"
            heading="Track what matters"
            body="Your score shows which areas — sleep, concentration, mood — are most affected, so the app can focus on what helps you most."
          />
          <View style={styles.divider} />
          <InfoRow
            emoji="📈"
            heading="Measure change over time"
            body="You'll be prompted to retake it at 4 and 8 weeks. A drop of 13 or more points is considered a meaningful improvement."
          />
          <View style={styles.divider} />
          <InfoRow
            emoji="🩺"
            heading="Share with your audiologist"
            body="Your TFI history can be exported as a one-page PDF to bring to appointments."
          />
        </View>

        <View style={styles.footer}>
          <Pressable
            style={({ pressed }) => [
              styles.startButton,
              pressed && styles.startButtonPressed,
            ]}
            onPress={handleStart}
            accessibilityRole="button"
            accessibilityLabel="Start the TFI assessment"
          >
            <Text style={styles.startLabel}>Start assessment</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.skipButton,
              pressed && styles.skipButtonPressed,
            ]}
            onPress={handleSkip}
            accessibilityRole="button"
            accessibilityLabel="Skip for now"
          >
            <Text style={styles.skipLabel}>Skip for now</Text>
          </Pressable>
        </View>
      </ScrollView>
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
    scroll: {
      flexGrow: 1,
      paddingHorizontal: Spacing.xl,
      paddingTop: Spacing.huge,
      paddingBottom: Spacing.xl,
      gap: Spacing.xl,
    },

    // Header
    header: {
      gap: Spacing.md,
    },
    badge: {
      alignSelf: 'flex-start',
      backgroundColor: colors.surfaceVariant,
      borderRadius: Radius.chip,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs,
    },
    badgeText: {
      ...typography.micro,
      color: colors.deepTide,
    },
    title: {
      ...typography.display,
      color: colors.textPrimary,
    },
    subtitle: {
      ...typography.body,
      color: colors.textSecondary,
    },

    // Info card
    infoCard: {
      backgroundColor: colors.surface,
      borderRadius: Radius.card,
      padding: Spacing.base,
      gap: Spacing.md,
    },
    infoRow: {
      flexDirection: 'row',
      gap: Spacing.md,
      alignItems: 'flex-start',
    },
    infoEmoji: {
      fontSize: 20,
      lineHeight: 28,
      width: 28,
      textAlign: 'center',
    },
    infoText: {
      flex: 1,
      gap: 2,
    },
    infoHeading: {
      ...typography.heading2,
      color: colors.textPrimary,
    },
    infoBody: {
      ...typography.body,
      color: colors.textSecondary,
    },
    divider: {
      height: Border.width,
      backgroundColor: colors.textSecondary + '30',
    },

    // Footer
    footer: {
      gap: Spacing.sm,
    },
    startButton: {
      backgroundColor: colors.deepTide,
      borderRadius: Radius.chip,
      paddingVertical: Spacing.base,
      alignItems: 'center',
    },
    startButtonPressed: {
      opacity: 0.85,
    },
    startLabel: {
      ...typography.heading2,
      color: colors.white,
    },
    skipButton: {
      paddingVertical: Spacing.sm,
      alignItems: 'center',
    },
    skipButtonPressed: {
      opacity: 0.6,
    },
    skipLabel: {
      ...typography.body,
      color: colors.textSecondary,
    },
  });
}
