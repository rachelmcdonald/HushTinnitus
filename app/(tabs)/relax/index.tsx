import { useMemo } from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Spacing, Radius } from '@/src/theme';
import { useTheme } from '@/src/context/ThemeContext';
// ─── Premium session catalogue ────────────────────────────────────────────────

type PremiumSession = {
  id: string;
  title: string;
  duration: string;
};

const PREMIUM_SESSIONS: PremiumSession[] = [
  { id: 'diaphragmatic', title: 'Diaphragmatic Breathing',        duration: '5–10 min' },
  { id: 'mindfulness',   title: 'Mindfulness Practice',           duration: '5–10 min' },
  { id: 'pmr',           title: 'Progressive Muscle Relaxation',  duration: '15 min' },
  { id: 'body-scan',     title: 'Body Scan Meditation',           duration: '10 min' },
  { id: 'guided-imagery',title: 'Guided Imagery',                 duration: '10 min' },
  { id: 'sleep-routine', title: 'Sleep Preparation',              duration: '~10 min' },
];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function RelaxScreen() {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
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

        {/* Premium section */}
        <View style={styles.premiumSection}>
          <Text style={styles.sectionLabel}>Unlock with Premium</Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.carousel}
          >
            {PREMIUM_SESSIONS.map((item) => (
              <Pressable
                key={item.id}
                style={({ pressed }) => [styles.premiumCard, pressed && styles.premiumCardPressed]}
                onPress={() => router.push('/premium' as any)}
                accessibilityRole="button"
                accessibilityLabel={`${item.title} — Premium`}
              >
                <Text style={styles.lockIcon}>🔒</Text>
                <Text style={styles.premiumCardTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.premiumCardDuration}>{item.duration}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={styles.moreCaption}>…and more with Premium</Text>

          <Pressable
            style={({ pressed }) => [styles.getPremiumBtn, pressed && styles.getPremiumBtnPressed]}
            onPress={() => router.push('/premium' as any)}
            accessibilityRole="button"
            accessibilityLabel="Get Premium"
          >
            <Text style={styles.getPremiumLabel}>Get Premium</Text>
          </Pressable>
        </View>
      </ScrollView>

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
      backgroundColor: colors.goldLight,
      borderRadius: Radius.card,
      borderWidth: 1,
      borderColor: colors.softGold + '60',
      padding: Spacing.md,
      justifyContent: 'space-between',
    },
    premiumCardPressed: { opacity: 0.8 },
    lockIcon: { fontSize: 16 },
    premiumCardTitle: { ...typography.heading2, color: colors.darkText },
    premiumCardDuration: { ...typography.caption, color: colors.textSecondary },

    moreCaption: {
      ...typography.caption,
      color: colors.textSecondary,
      textAlign: 'center',
      paddingHorizontal: Spacing.xl,
    },

    getPremiumBtn: {
      marginHorizontal: Spacing.xl,
      backgroundColor: colors.softGold,
      borderRadius: Radius.chip,
      paddingVertical: Spacing.base,
      alignItems: 'center',
    },
    getPremiumBtnPressed: { opacity: 0.85 },
    getPremiumLabel: { ...typography.heading2, color: colors.white },
  });
}
