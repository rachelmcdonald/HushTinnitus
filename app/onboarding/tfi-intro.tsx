import { StyleSheet, Text, View, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors, Typography, Spacing, Radius, Border } from '@/src/theme';

type InfoRowProps = { emoji: string; heading: string; body: string };

function InfoRow({ emoji, heading, body }: InfoRowProps) {
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

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.warmSand,
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
    backgroundColor: Colors.tealLight,
    borderRadius: Radius.chip,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  badgeText: {
    ...Typography.micro,
    color: Colors.deepTide,
  },
  title: {
    ...Typography.display,
    color: Colors.darkText,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.midGray,
  },

  // Info card
  infoCard: {
    backgroundColor: Colors.white,
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
    ...Typography.heading2,
    color: Colors.darkText,
  },
  infoBody: {
    ...Typography.body,
    color: Colors.midGray,
  },
  divider: {
    height: Border.width,
    backgroundColor: Colors.midGray + '30',
  },

  // Footer
  footer: {
    gap: Spacing.sm,
  },
  startButton: {
    backgroundColor: Colors.deepTide,
    borderRadius: Radius.chip,
    paddingVertical: Spacing.base,
    alignItems: 'center',
  },
  startButtonPressed: {
    opacity: 0.85,
  },
  startLabel: {
    ...Typography.heading2,
    color: Colors.white,
  },
  skipButton: {
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  skipButtonPressed: {
    opacity: 0.6,
  },
  skipLabel: {
    ...Typography.body,
    color: Colors.midGray,
  },
});
