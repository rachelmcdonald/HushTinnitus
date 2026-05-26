import { StyleSheet, Text, View, Pressable, ScrollView, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '@/src/theme';

// ─── Content catalogue ────────────────────────────────────────────────────────

type GridItem = {
  title: string;
  desc: string;
  route: string;
  icon: keyof typeof Ionicons.glyphMap;
  premium?: boolean;
};

const GRID_ITEMS: GridItem[] = [
  {
    title: 'Tinnitus 101',
    desc: 'What tinnitus is and how the brain adapts over time.',
    route: '/learn/tinnitus-101',
    icon: 'ear-outline',
  },
  {
    title: 'The Neurological Loop',
    desc: 'How attention and stress amplify what you hear.',
    route: '/learn/neurological-loop',
    icon: 'pulse-outline',
  },
  {
    title: 'Thought Journal',
    desc: 'Guided cognitive reframing for tinnitus distress.',
    route: '/learn/thought-journal',
    icon: 'journal-outline',
    premium: true,
  },
  {
    title: 'Sleep Hygiene',
    desc: 'Personalised checklist for sleep and tinnitus.',
    route: '/learn/sleep-hygiene',
    icon: 'moon-outline',
  },
  {
    title: 'Noise Exposure',
    desc: 'dB reference chart and hearing protection guide.',
    route: '/learn/noise-exposure',
    icon: 'volume-high-outline',
  },
  {
    title: 'Evidence Citations',
    desc: 'Peer-reviewed references behind this app.',
    route: '/learn/evidence-citations',
    icon: 'document-text-outline',
  },
  {
    title: 'Red Flag Guide',
    desc: 'When to seek urgent medical advice.',
    route: '/learn/red-flag-guide',
    icon: 'warning-outline',
  },
];

// ─── Grid card ────────────────────────────────────────────────────────────────

function GridCard({ item, width }: { item: GridItem; width: number }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.gridCard, { width }, pressed && styles.cardPressed]}
      onPress={() => router.push(item.route as any)}
      accessibilityRole="button"
      accessibilityLabel={`Open ${item.title}`}
    >
      <View style={styles.gridCardTop}>
        <Ionicons name={item.icon} size={22} color={Colors.deepTide} />
        {item.premium && (
          <View style={styles.premiumBadge}>
            <Text style={styles.premiumBadgeText}>Premium</Text>
          </View>
        )}
      </View>
      <Text style={styles.gridCardTitle}>{item.title}</Text>
      <Text style={styles.gridCardDesc} numberOfLines={2}>{item.desc}</Text>
    </Pressable>
  );
}

// ─── About card ───────────────────────────────────────────────────────────────

function AboutCard() {
  return (
    <Pressable
      style={({ pressed }) => [styles.aboutCard, pressed && styles.cardPressed]}
      onPress={() => router.push('/about' as any)}
      accessibilityRole="button"
      accessibilityLabel="Meet the team"
    >
      <Text style={styles.aboutHeading}>Meet the team</Text>
    </Pressable>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function LearnScreen() {
  const { width } = useWindowDimensions();
  const cardWidth = (width - Spacing.xl * 2 - Spacing.sm) / 2;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Learn</Text>
          <Text style={styles.subtitle}>
            Evidence-informed information to help you understand and cope with tinnitus.
          </Text>
        </View>

        <View style={styles.grid}>
          {GRID_ITEMS.map((item) => (
            <GridCard key={item.title} item={item} width={cardWidth} />
          ))}
        </View>

        <AboutCard />

        <Text style={styles.disclaimer}>
          Content here is for educational purposes. It is not a substitute for advice
          from a qualified healthcare professional.
        </Text>
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

  // Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  gridCard: {
    backgroundColor: Colors.tealLight,
    borderRadius: Radius.card,
    padding: Spacing.md,
    gap: Spacing.xs,
    minHeight: 110,
  },
  cardPressed: { opacity: 0.8 },
  gridCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gridCardTitle: { ...Typography.heading2, color: Colors.darkText },
  gridCardDesc: { ...Typography.caption, color: Colors.midGray, lineHeight: 18 },
  premiumBadge: {
    backgroundColor: Colors.goldLight,
    borderRadius: 4,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
  },
  premiumBadgeText: { ...Typography.micro, fontSize: 9, color: Colors.softGold },

  // About button
  aboutCard: {
    backgroundColor: Colors.deepTide,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  aboutHeading: { fontSize: 16, fontWeight: '500' as const, color: Colors.white },

  disclaimer: {
    ...Typography.caption,
    color: Colors.midGray,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
