import { StyleSheet, Text, View, Pressable, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius, Border } from '@/src/theme';

type ContentCard = {
  title: string;
  description: string;
  route?: string;
  available: boolean;
  badge?: string;
};

const CONTENT: ContentCard[] = [
  {
    title: 'Tinnitus 101',
    description: 'What tinnitus is, why it happens, and how the brain adapts over time.',
    route: '/learn/tinnitus-101',
    available: true,
  },
  {
    title: 'The neurological loop',
    description: 'How attention and the stress response amplify what you hear — and how to interrupt the cycle.',
    route: '/learn/neurological-loop',
    available: true,
  },
  {
    title: 'Sleep hygiene checklist',
    description: 'A personalised checklist based on how sleep and tinnitus interact. Progress saved on device.',
    route: '/learn/sleep-hygiene',
    available: true,
  },
  {
    title: 'Noise exposure guide',
    description: 'dB reference chart and practical hearing protection recommendations.',
    route: '/learn/noise-exposure',
    available: true,
  },
  {
    title: 'Evidence citations',
    description: 'All 8 peer-reviewed references behind the tools and content in this app.',
    route: '/learn/evidence-citations',
    available: true,
  },
  {
    title: 'CBT thought journal',
    description: 'A guided cognitive reframe for distressing thoughts about tinnitus — step by step.',
    route: '/learn/thought-journal',
    available: true,
  },
  {
    title: 'Red flag guide',
    description: 'When to seek medical advice: sudden onset, pulsatile tinnitus, and one-sided symptoms.',
    route: '/learn/red-flag-guide',
    available: true,
  },
];

function ContentCard({ card }: { card: ContentCard }) {
  if (!card.available) {
    return (
      <View style={[styles.card, styles.cardDisabled]}>
        <View style={styles.cardBody}>
          <Text style={[styles.cardTitle, styles.cardTitleDisabled]}>{card.title}</Text>
          <Text style={styles.cardDescription}>{card.description}</Text>
        </View>
        {card.badge && (
          <View style={styles.comingSoonBadge}>
            <Text style={styles.comingSoonText}>{card.badge}</Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => card.route && router.push(card.route as any)}
      accessibilityRole="button"
      accessibilityLabel={`Open ${card.title}`}
    >
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>{card.title}</Text>
        <Text style={styles.cardDescription}>{card.description}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

export default function LearnScreen() {
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

        <View style={styles.cardList}>
          {CONTENT.map((card) => (
            <ContentCard key={card.title} card={card} />
          ))}
        </View>

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
  cardList: { gap: Spacing.sm },
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
  cardTitle: { ...Typography.heading2, color: Colors.darkText },
  cardTitleDisabled: { color: Colors.midGray },
  cardDescription: { ...Typography.body, color: Colors.midGray },
  chevron: { ...Typography.heading1, color: Colors.midGray },
  comingSoonBadge: {
    backgroundColor: Colors.tealLight,
    borderRadius: Radius.chip,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  comingSoonText: { ...Typography.micro, color: Colors.deepTide },
  disclaimer: {
    ...Typography.caption,
    color: Colors.midGray,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
