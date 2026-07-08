import { useState, useMemo } from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Spacing, Radius } from '@/src/theme';
import { useTheme } from '@/src/context/ThemeContext';
import ComingSoonBadge from '@/src/components/ComingSoonBadge';
import ComingSoonModal from '@/src/components/ComingSoonModal';
import ScrollWithIndicator from '@/src/components/ScrollWithIndicator';
// ─── Coming soon session catalogue ────────────────────────────────────────────

type PremiumSession = {
  id: string;
  title: string;
  duration: string;
  description: string;
};

const PREMIUM_SESSIONS: PremiumSession[] = [
  {
    id: 'diaphragmatic', title: 'Diaphragmatic Breathing', duration: '5–10 min',
    description:
      'A guided practice teaching slow, deep belly breathing with an animated visual guide — shown to reduce stress and calm the nervous system\'s response to tinnitus.',
  },
  {
    id: 'mindfulness', title: 'Mindfulness Practice', duration: '5–10 min',
    description:
      'A guided mindfulness session specifically designed for tinnitus — learning to acknowledge the sound without judgement, reducing its emotional impact over time.',
  },
  {
    id: 'pmr', title: 'Progressive Muscle Relaxation', duration: '15 min',
    description:
      'A 15-minute guided session that systematically tenses and releases muscle groups from feet to face, deeply releasing physical tension associated with tinnitus distress.',
  },
  {
    id: 'body-scan', title: 'Body Scan Meditation', duration: '10 min',
    description:
      'A 10-minute guided awareness practice that gently moves attention through each part of the body, promoting deep relaxation and reducing tinnitus-related hypervigilance.',
  },
  {
    id: 'guided-imagery', title: 'Guided Imagery', duration: '10 min',
    description:
      'A calming visualisation session that guides you through a peaceful natural scene, giving your mind a restorative break from tinnitus awareness.',
  },
  {
    id: 'sleep-routine', title: 'Sleep Preparation', duration: '~10 min',
    description:
      'A combined three-stage bedtime routine — breathing exercise, body scan, and gentle background sound — designed to ease the transition to sleep for tinnitus sufferers.',
  },
];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function RelaxScreen() {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);
  const [activeSession, setActiveSession] = useState<PremiumSession | null>(null);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollWithIndicator
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Relax</Text>
          <Text style={styles.subtitle}>
            Breathing and relaxation techniques to help calm the nervous system
            and support your daily wellbeing.
          </Text>
        </View>

        {/* Free — 4-7-8 Breathing */}
        <Pressable
          style={({ pressed }) => [styles.freeCard, pressed && styles.freeCardPressed]}
          onPress={() => router.push('/relax/breathing-478' as any)}
          accessibilityRole="button"
          accessibilityLabel="Start 4-7-8 Breathing — free"
        >
          <View style={styles.freeCardContent}>
            <View style={styles.freeCardText}>
              <Text style={styles.freeCardTitle}>4-7-8 Breathing</Text>
              <Text style={styles.freeCardSubtitle}>Guided breathing exercise — free</Text>
              <Text style={styles.freeCardMeta}>3–5 min  ·  Calms the nervous system</Text>
            </View>
            <View style={styles.freePlayBtn}>
              <Text style={styles.freePlayIcon}>▶</Text>
            </View>
          </View>
        </Pressable>

        {/* Free — Box Breathing */}
        <Pressable
          style={({ pressed }) => [styles.freeCard, pressed && styles.freeCardPressed]}
          onPress={() => router.push('/relax/box-breathing' as any)}
          accessibilityRole="button"
          accessibilityLabel="Start Box Breathing — free"
        >
          <View style={styles.freeCardContent}>
            <View style={styles.freeCardText}>
              <Text style={styles.freeCardTitle}>Box Breathing</Text>
              <Text style={styles.freeCardSubtitle}>Guided breathing exercise — free</Text>
              <Text style={styles.freeCardMeta}>3–5 min  ·  Calms the nervous system</Text>
            </View>
            <View style={styles.freePlayBtn}>
              <Text style={styles.freePlayIcon}>▶</Text>
            </View>
          </View>
        </Pressable>

        {/* Coming soon section */}
        <View style={styles.premiumSection}>
          <Text style={styles.sectionLabel}>Coming soon</Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.carousel}
          >
            {PREMIUM_SESSIONS.map((item) => (
              <Pressable
                key={item.id}
                style={({ pressed }) => [styles.premiumCard, pressed && styles.premiumCardPressed]}
                onPress={() => setActiveSession(item)}
                accessibilityRole="button"
                accessibilityLabel={`${item.title} — coming soon. Tap for details.`}
              >
                <ComingSoonBadge />
                <Text style={styles.premiumCardTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.premiumCardDuration}>{item.duration}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={styles.moreCaption}>…and more coming soon</Text>
        </View>
      </ScrollWithIndicator>

      <ComingSoonModal
        visible={activeSession !== null}
        onClose={() => setActiveSession(null)}
        featureName={activeSession?.title ?? ''}
        description={activeSession?.description ?? ''}
        previewRoute={activeSession ? `/relax/${activeSession.id}` : undefined}
      />
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors'], typography: ReturnType<typeof useTheme>['typography']) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    scroll: {
      flexGrow: 1,
      paddingTop: Spacing.xl,
      paddingBottom: Spacing.xl,
      gap: Spacing.xl,
    },

    header: {
      gap: Spacing.sm,
      paddingHorizontal: Spacing.xl,
    },
    title: { ...typography.display, color: colors.textPrimary },
    subtitle: { ...typography.body, color: colors.textSecondary },

    // Free card — 4-7-8
    freeCard: {
      marginHorizontal: Spacing.xl,
      backgroundColor: colors.deepTide,
      borderRadius: Radius.card,
      padding: Spacing.xl,
    },
    freeCardPressed: { opacity: 0.88 },
    freeCardContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.base,
    },
    freeCardText: { flex: 1, gap: Spacing.xs },
    freeCardTitle: { ...typography.heading1, color: colors.white },
    freeCardSubtitle: { ...typography.body, color: colors.calmWave },
    freeCardMeta: { ...typography.caption, color: colors.calmWave + 'AA' },
    freePlayBtn: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.calmWave,
      justifyContent: 'center',
      alignItems: 'center',
    },
    freePlayIcon: { fontSize: 18, color: colors.deepTide, marginLeft: 3 },

    // Premium section
    premiumSection: { gap: Spacing.base },
    sectionLabel: {
      ...typography.micro,
      color: colors.deepTide,
      paddingHorizontal: Spacing.xl,
    },

    // Carousel
    carousel: {
      paddingHorizontal: Spacing.xl,
      gap: Spacing.sm,
    },
    premiumCard: {
      width: 160,
      height: 100,
      backgroundColor: colors.surfaceVariant,
      borderRadius: Radius.card,
      borderWidth: 1,
      borderColor: colors.deepTide + '30',
      padding: Spacing.md,
      justifyContent: 'space-between',
    },
    premiumCardPressed: { opacity: 0.8 },
    premiumCardTitle: { ...typography.heading2, fontWeight: '600' as const, color: colors.textPrimary },
    premiumCardDuration: { ...typography.caption, color: colors.textSecondary },

    moreCaption: {
      ...typography.caption,
      color: colors.textSecondary,
      textAlign: 'center',
      paddingHorizontal: Spacing.xl,
    },
  });
}
