import { useState } from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView, Modal } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius, Border } from '@/src/theme';
import UpgradeModal from '@/src/components/UpgradeModal';

type Technique = {
  id: string;
  title: string;
  description: string;
  infoText: string;
  meta: string;
  tier: 'Free' | 'Premium';
  route?: string;
  available: boolean;
  premiumGated?: boolean;
};

const TECHNIQUES: Technique[] = [
  {
    id: 'breathing-478',
    title: '4-7-8 Breathing',
    description:
      'A calming breathing cycle that helps settle the nervous system — inhale 4 seconds, hold 7, exhale 8.',
    infoText:
      'The 4-7-8 technique uses a specific ratio of inhale, hold, and exhale to activate the parasympathetic nervous system. The extended exhale reduces physiological arousal and slows the heart rate, supporting a calmer state. Regular practice is associated with reduced anxiety and improved sleep onset.',
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
    infoText:
      'Box breathing (also called square breathing) uses four equal phases of 4 seconds each to regulate the breathing rhythm. The symmetrical pattern makes it easy to learn and return to under stress. It is used in clinical and high-performance settings as a practical tool for managing physiological arousal.',
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
    infoText:
      'Diaphragmatic breathing engages the diaphragm fully rather than relying on shallow chest breathing. This increases lung efficiency and activates the relaxation response. Many people with chronic stress develop habitual shallow breathing; this guided exercise helps retrain that pattern, supporting both general wellbeing and tinnitus management.',
    meta: '5–10 min  ·  Free',
    tier: 'Free',
    route: '/relax/diaphragmatic',
    available: true,
  },
  {
    id: 'mindfulness-5min',
    title: 'Mindfulness Practice',
    description:
      'A short guided mindfulness session to build calm awareness and reduce reactivity to tinnitus.',
    infoText:
      'Mindfulness-based approaches are among the most evidence-informed strategies in tinnitus self-management. This session guides you to observe tinnitus without judgement, supporting habituation — the process by which the brain learns to assign lower priority to the signal. Even short daily sessions can build this capacity over time.',
    meta: '5 min  ·  Free',
    tier: 'Free',
    route: '/relax/mindfulness',
    available: true,
  },
  {
    id: 'mindfulness-10min',
    title: 'Extended Mindfulness',
    description:
      'A deeper 10-minute guided session for those wanting a longer mindfulness practice.',
    infoText:
      'Building on the 5-minute session, this extended practice provides more time to settle into mindful awareness. Longer sessions allow deeper exploration of body sensations and sound, and are associated with stronger habituation outcomes in tinnitus research. Best suited to those who have established a regular shorter practice.',
    meta: '10 min  ·  Premium',
    tier: 'Premium',
    available: true,
    premiumGated: true,
  },
  {
    id: 'pmr',
    title: 'Progressive Muscle Relaxation',
    description:
      'A 15-minute guided session that systematically relaxes each muscle group from head to toe.',
    infoText:
      'Progressive Muscle Relaxation (PMR) involves systematically tensing and releasing muscle groups to produce a state of deep physical relaxation. It is a well-established technique for managing stress and sleep difficulties, and is commonly used as part of broader tinnitus self-management programmes.',
    meta: '15 min  ·  Premium',
    tier: 'Premium',
    available: false,
  },
  {
    id: 'body-scan',
    title: 'Body Scan Meditation',
    description:
      'A 10-minute guided body scan for deep relaxation — a useful companion at any time of day.',
    infoText:
      'A body scan guides awareness through each part of the body in sequence, promoting a sense of physical ease and present-moment focus. It is a common component of mindfulness-based programmes and can be used at any time of day to reset and reduce accumulated tension.',
    meta: '10 min  ·  Premium',
    tier: 'Premium',
    available: false,
  },
  {
    id: 'sleep-routine',
    title: 'Sleep Preparation Routine',
    description:
      'A combined breathing, body scan, and sound enrichment session designed for bedtime.',
    infoText:
      'This session combines breathing exercises, body scan, and sound enrichment into a sequential bedtime routine. Sleep difficulty is one of the most commonly reported impacts of tinnitus, and a consistent pre-sleep routine helps condition the nervous system to settle. Each element builds on the others for a calmer transition to sleep.',
    meta: '15–20 min  ·  Premium',
    tier: 'Premium',
    available: false,
  },
];

function InfoModal({
  visible,
  title,
  body,
  onClose,
}: {
  visible: boolean;
  title: string;
  body: string;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={infoStyles.backdrop} onPress={onClose}>
        <Pressable style={infoStyles.sheet} onPress={() => {}} accessibilityViewIsModal>
          <Text style={infoStyles.title}>{title}</Text>
          <Text style={infoStyles.body}>{body}</Text>
          <Pressable
            style={({ pressed }) => [infoStyles.closeBtn, pressed && infoStyles.closeBtnPressed]}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Text style={infoStyles.closeBtnLabel}>Close</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const infoStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  sheet: {
    backgroundColor: Colors.white,
    borderRadius: Radius.modal,
    padding: Spacing.xl,
    gap: Spacing.base,
  },
  title: { ...Typography.heading1, color: Colors.darkText },
  body: { ...Typography.body, color: Colors.midGray, lineHeight: 24 },
  closeBtn: {
    marginTop: Spacing.sm,
    borderRadius: Radius.chip,
    paddingVertical: Spacing.base,
    alignItems: 'center',
    backgroundColor: Colors.tealLight,
  },
  closeBtnPressed: { opacity: 0.7 },
  closeBtnLabel: { ...Typography.heading2, color: Colors.deepTide },
});

function TechniqueCard({ technique }: { technique: Technique }) {
  const [infoVisible, setInfoVisible] = useState(false);
  const [upgradeVisible, setUpgradeVisible] = useState(false);

  const isPremium = technique.tier === 'Premium';
  const isComingSoon = !technique.available;
  const isPremiumGated = technique.available && technique.premiumGated;

  // Info and upgrade modals are shared across all card types
  const modals = (
    <>
      <InfoModal
        visible={infoVisible}
        title={technique.title}
        body={technique.infoText}
        onClose={() => setInfoVisible(false)}
      />
      {isPremiumGated && (
        <UpgradeModal
          visible={upgradeVisible}
          onClose={() => setUpgradeVisible(false)}
        />
      )}
    </>
  );

  const infoBadge = (
    <Pressable
      style={({ pressed }) => [styles.infoBtn, pressed && styles.infoBtnPressed]}
      onPress={() => setInfoVisible(true)}
      accessibilityRole="button"
      accessibilityLabel={`About ${technique.title}`}
      hitSlop={8}
    >
      <Text style={styles.infoBtnLabel}>ⓘ</Text>
    </Pressable>
  );

  // Coming soon — disabled
  if (isComingSoon) {
    return (
      <View style={[styles.card, styles.cardDisabled]}>
        {modals}
        <View style={styles.cardBody}>
          <View style={styles.cardTitleRow}>
            <Text style={[styles.cardTitle, styles.cardTitleDisabled]} numberOfLines={1}>
              {technique.title}
            </Text>
            {infoBadge}
            <View style={[styles.tierBadge, isPremium ? styles.tierBadgePremium : styles.tierBadgeFree]}>
              <Text style={[styles.tierBadgeText, isPremium ? styles.tierBadgeTextPremium : styles.tierBadgeTextFree]}>
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

  // Premium gated — taps open upgrade modal
  if (isPremiumGated) {
    return (
      <Pressable
        style={({ pressed }) => [styles.card, styles.cardPremiumGated, pressed && styles.cardPressed]}
        onPress={() => setUpgradeVisible(true)}
        accessibilityRole="button"
        accessibilityLabel={`Unlock ${technique.title} — Premium`}
      >
        {modals}
        <View style={styles.cardBody}>
          <View style={styles.cardTitleRow}>
            <Text style={[styles.cardTitle, styles.cardTitleDisabled]} numberOfLines={1}>
              {technique.title}
            </Text>
            {infoBadge}
            <View style={[styles.tierBadge, styles.tierBadgePremium]}>
              <Text style={[styles.tierBadgeText, styles.tierBadgeTextPremium]}>Premium</Text>
            </View>
          </View>
          <Text style={styles.cardDescription}>{technique.description}</Text>
          <Text style={styles.cardMeta}>{technique.meta}</Text>
        </View>
        <Text style={styles.lockIcon}>⚿</Text>
      </Pressable>
    );
  }

  // Available free card
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => technique.route && router.push(technique.route as any)}
      accessibilityRole="button"
      accessibilityLabel={`Start ${technique.title}`}
    >
      {modals}
      <View style={styles.cardBody}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {technique.title}
          </Text>
          {infoBadge}
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
  cardPremiumGated: {
    borderWidth: Border.width,
    borderColor: Colors.softGold + '60',
  },
  cardPressed: { opacity: 0.8 },
  cardBody: { flex: 1, gap: 4 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  cardTitle: { ...Typography.heading2, color: Colors.darkText, flexShrink: 1 },
  cardTitleDisabled: { color: Colors.midGray },
  cardDescription: { ...Typography.body, color: Colors.midGray },
  cardMeta: { ...Typography.caption, color: Colors.midGray + 'CC' },
  chevron: { ...Typography.heading1, color: Colors.midGray },
  lockIcon: { fontSize: 18, color: Colors.softGold },

  // Info button
  infoBtn: { paddingHorizontal: 2 },
  infoBtnPressed: { opacity: 0.5 },
  infoBtnLabel: { fontSize: 15, color: Colors.midGray },

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
