import { StyleSheet, Text, View, Pressable, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius, Border } from '@/src/theme';

type Technique = {
  id: string;
  title: string;
  description: string;
  meta: string;
  tier: 'Free' | 'Premium';
  route?: string;
  available: boolean;
};

const TECHNIQUES: Technique[] = [
  {
    id: 'breathing-478',
    title: '4-7-8 Breathing',
    description:
      'A calming breathing cycle that helps settle the nervous system — inhale 4 seconds, hold 7, exhale 8.',
    meta: '3–5 min  ·  Free',
    tier: 'Free',
    route: '/relax/breathing-478',
    available: true,
  },
  {
    id: 'breathing-box',
    title: 'Box Breathing',
    description:
      'Four equal phases of breath for focus and calm. Used widely in stress management and relaxation practice.',
    meta: '3–5 min  ·  Free',
    tier: 'Free',
    route: '/relax/box-breathing',
    available: true,
  },
  {
    id: 'breathing-diaphragmatic',
    title: 'Diaphragmatic Breathing',
    description:
      'A guided introduction to belly breathing — the foundation of relaxed, efficient breathing in daily life.',
    meta: '5–10 min  ·  Free',
    tier: 'Free',
    route: '/relax/diaphragmatic',
    available: true,
  },
  {
    id: 'mindfulness',
    title: 'Mindfulness Practice',
    description:
      'A short guided mindfulness session to build calm awareness and reduce reactivity to tinnitus.',
    meta: '5 min  ·  Free',
    tier: 'Free',
    available: false,
  },
  {
    id: 'pmr',
    title: 'Progressive Muscle Relaxation',
    description:
      'A 15-minute guided session that systematically relaxes each muscle group from head to toe.',
    meta: '15 min  ·  Premium',
    tier: 'Premium',
    available: false,
  },
  {
    id: 'body-scan',
    title: 'Body Scan Meditation',
    description:
      'A 10-minute guided body scan for deep relaxation — a useful companion at any time of day.',
    meta: '10 min  ·  Premium',
    tier: 'Premium',
    available: false,
  },
  {
    id: 'sleep-routine',
    title: 'Sleep Preparation Routine',
    description:
      'A combined breathing, body scan, and sound enrichment session designed for bedtime.',
    meta: '15–20 min  ·  Premium',
    tier: 'Premium',
    available: false,
  },
];

function TechniqueCard({ technique }: { technique: Technique }) {
  const isPremium = technique.tier === 'Premium';

  if (!technique.available) {
    return (
      <View style={[styles.card, styles.cardDisabled]}>
        <View style={styles.cardBody}>
          <View style={styles.cardTitleRow}>
            <Text style={[styles.cardTitle, styles.cardTitleDisabled]}>
              {technique.title}
            </Text>
            <View
              style={[
                styles.tierBadge,
                isPremium ? styles.tierBadgePremium : styles.tierBadgeFree,
              ]}
            >
              <Text
                style={[
                  styles.tierBadgeText,
                  isPremium ? styles.tierBadgeTextPremium : styles.tierBadgeTextFree,
                ]}
              >
                {technique.tier}
              </Text>
            </View>
          </View>
          <Text style={styles.cardDescription}>{technique.description}</Text>
          <Text style={styles.cardMeta}>{technique.meta}</Text>
        </View>
        <View style={styles.comingSoonBadge}>
          <Text style={styles.comingSoonText}>Coming soon</Text>
        </View>
      </View>
    );
  }

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => technique.route && router.push(technique.route as any)}
      accessibilityRole="button"
      accessibilityLabel={`Start ${technique.title}`}
    >
      <View style={styles.cardBody}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardTitle}>{technique.title}</Text>
          <View style={styles.tierBadgeFreeActive}>
            <Text style={styles.tierBadgeTextFreeActive}>Free</Text>
          </View>
        </View>
        <Text style={styles.cardDescription}>{technique.description}</Text>
        <Text style={styles.cardMeta}>{technique.meta}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

export default function RelaxScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Relax</Text>
          <Text style={styles.subtitle}>
            Breathing and relaxation techniques to help calm the nervous system
            and support your daily wellbeing.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Breathing exercises</Text>
          {TECHNIQUES.slice(0, 3).map((t) => (
            <TechniqueCard key={t.id} technique={t} />
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Guided sessions</Text>
          {TECHNIQUES.slice(3).map((t) => (
            <TechniqueCard key={t.id} technique={t} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.warmSand },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
    gap: Spacing.xl,
  },
  header: { gap: Spacing.sm },
  title: { ...Typography.display, color: Colors.darkText },
  subtitle: { ...Typography.body, color: Colors.midGray },
  section: { gap: Spacing.sm },
  sectionLabel: { ...Typography.micro, color: Colors.midGray },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.card,
    padding: Spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  cardDisabled: {
    opacity: 0.55,
    borderWidth: Border.width,
    borderColor: Colors.midGray + '30',
  },
  cardPressed: { opacity: 0.8 },
  cardBody: { flex: 1, gap: 4 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  cardTitle: { ...Typography.heading2, color: Colors.darkText },
  cardTitleDisabled: { color: Colors.midGray },
  cardDescription: { ...Typography.body, color: Colors.midGray },
  cardMeta: { ...Typography.caption, color: Colors.midGray + 'CC' },
  chevron: { ...Typography.heading1, color: Colors.midGray },
  // Tier badges
  tierBadge: {
    borderRadius: 4,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
  },
  tierBadgeFree: { backgroundColor: Colors.tealLight },
  tierBadgePremium: { backgroundColor: Colors.goldLight },
  tierBadgeFreeActive: {
    borderRadius: 4,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    backgroundColor: Colors.tealLight,
  },
  tierBadgeText: { ...Typography.micro, fontSize: 9 },
  tierBadgeTextFree: { color: Colors.deepTide },
  tierBadgeTextPremium: { color: Colors.softGold },
  tierBadgeTextFreeActive: { ...Typography.micro, fontSize: 9, color: Colors.deepTide },
  // Coming soon
  comingSoonBadge: {
    backgroundColor: Colors.tealLight,
    borderRadius: Radius.chip,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  comingSoonText: { ...Typography.micro, color: Colors.deepTide },
});
