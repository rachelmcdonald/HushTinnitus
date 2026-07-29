import { useState, useRef, useCallback, useMemo } from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView, useWindowDimensions } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius } from '@/src/theme';
import { useTheme } from '@/src/context/ThemeContext';
import PremiumFeatureModal from '@/src/components/PremiumFeatureModal';
import ScrollWithIndicator from '@/src/components/ScrollWithIndicator';

// ─── Content catalogue ────────────────────────────────────────────────────────

type GridItem = {
  title: string;
  desc: string;
  route: string;
  icon: keyof typeof Ionicons.glyphMap;
  premium?: boolean;
  // Longer description shown in the premium modal — only needed for premium items.
  modalDescription?: string;
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
    modalDescription:
      'A structured CBT-based journaling tool that guides you through identifying a distressing thought about your tinnitus and reframing it using evidence-based cognitive techniques.',
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

function GridCard({
  item,
  width,
  onPremiumPress,
}: {
  item: GridItem;
  width: number;
  onPremiumPress: (item: GridItem) => void;
}) {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);

  return (
    <Pressable
      style={({ pressed }) => [styles.gridCard, { width }, pressed && styles.cardPressed]}
      onPress={() => (item.premium ? onPremiumPress(item) : router.push(item.route as any))}
      accessibilityRole="button"
      accessibilityLabel={
        item.premium ? `${item.title} — premium feature. Tap for details.` : `Open ${item.title}`
      }
    >
      {item.premium && (
        <Ionicons
          name="lock-closed"
          size={18}
          color={Colors.softGold}
          style={styles.lockIcon}
        />
      )}
      <View style={styles.gridCardTop}>
        <Ionicons name={item.icon} size={22} color={colors.headingAccent} />
      </View>
      <Text style={styles.gridCardTitle}>{item.title}</Text>
      <Text style={styles.gridCardDesc} numberOfLines={2}>{item.desc}</Text>
    </Pressable>
  );
}

// ─── About card ───────────────────────────────────────────────────────────────

function AboutCard() {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);

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
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);
  const cardWidth = (width - Spacing.xl * 2 - Spacing.sm) / 2;
  const scrollRef = useRef<ScrollView>(null);
  const [activePremiumItem, setActivePremiumItem] = useState<GridItem | null>(null);

  // Reset scroll position every time the Learn tab comes into focus.
  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, [])
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollWithIndicator
        ref={scrollRef}
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
            <GridCard
              key={item.title}
              item={item}
              width={cardWidth}
              onPremiumPress={setActivePremiumItem}
            />
          ))}
        </View>

        <AboutCard />

        <Text style={styles.disclaimer}>
          Content here is for educational purposes. It is not a substitute for advice
          from a qualified healthcare professional.
        </Text>
      </ScrollWithIndicator>

      <PremiumFeatureModal
        visible={activePremiumItem !== null}
        onClose={() => setActivePremiumItem(null)}
        featureName={activePremiumItem?.title ?? ''}
        description={activePremiumItem?.modalDescription ?? ''}
      />
    </SafeAreaView>
  );
}

function makeStyles(
  colors: ReturnType<typeof useTheme>['colors'],
  typography: ReturnType<typeof useTheme>['typography'],
) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    scroll: {
      flexGrow: 1,
      paddingHorizontal: Spacing.xl,
      paddingTop: Spacing.xl,
      paddingBottom: Spacing.xl,
      gap: Spacing.xl,
    },

    header: { gap: Spacing.sm },
    title: { ...typography.display, color: colors.textPrimary },
    subtitle: { ...typography.body, color: colors.textSecondary },

    // Grid
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.sm,
    },
    gridCard: {
      backgroundColor: colors.surfaceVariant,
      borderRadius: Radius.card,
      padding: Spacing.md,
      gap: Spacing.xs,
      minHeight: 110,
    },
    cardPressed: { opacity: 0.8 },
    lockIcon: {
      position: 'absolute',
      top: 10,
      right: 10,
    },
    gridCardTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    gridCardTitle: { ...typography.heading2, color: colors.textPrimary },
    gridCardDesc: { ...typography.caption, color: colors.textSecondary, lineHeight: 18 },

    // About button
    aboutCard: {
      backgroundColor: colors.deepTide,
      borderRadius: 8,
      padding: 14,
      alignItems: 'center',
    },
    aboutHeading: { fontSize: 16, fontWeight: '500' as const, color: colors.white },

    disclaimer: {
      ...typography.caption,
      color: colors.textSecondary,
      textAlign: 'center',
      fontStyle: 'italic',
    },
  });
}
