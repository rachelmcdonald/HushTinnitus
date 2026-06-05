import { useMemo } from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, Radius, Border } from '@/src/theme';
import { useTheme } from '@/src/context/ThemeContext';

// ─── Reusable content components ─────────────────────────────────────────────

function BackButton() {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);
  return (
    <Pressable
      style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
      onPress={() => router.back()}
      accessibilityRole="button"
      accessibilityLabel="Back to Learn"
    >
      <Text style={styles.backLabel}>← Learn</Text>
    </Pressable>
  );
}

type SectionProps = { heading: string; children: React.ReactNode };

function Section({ heading, children }: SectionProps) {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);
  return (
    <View style={styles.section}>
      <Text style={styles.sectionHeading}>{heading}</Text>
      {children}
    </View>
  );
}

function Body({ children }: { children: React.ReactNode }) {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);
  return <Text style={styles.body}>{children}</Text>;
}

function BulletPoint({ children }: { children: string }) {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);
  return (
    <View style={styles.bulletRow}>
      <View style={styles.bulletDot} />
      <Text style={[styles.body, styles.bulletText]}>{children}</Text>
    </View>
  );
}

function CitationCard() {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);
  return (
    <View style={styles.citation}>
      <Text style={styles.citationLabel}>Evidence citation</Text>
      <Text style={styles.citationText}>
        Jastreboff PJ (1990). Phantom auditory perception (tinnitus): mechanisms
        of generation and perception.{' '}
        <Text style={styles.citationItalic}>Neuroscience Research</Text>, 8(4),
        221–254.
      </Text>
      <Text style={styles.citationNote}>
        This paper established the neurophysiological model of tinnitus that
        underpins tinnitus retraining therapy and habituation-based approaches.
      </Text>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function Tinnitus101Screen() {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <BackButton />

        <View style={styles.header}>
          <Text style={styles.title}>Tinnitus 101</Text>
          <Text style={styles.lead}>
            A plain-language overview of what tinnitus is, why it occurs, and how
            the brain naturally adapts over time.
          </Text>
        </View>

        <Section heading="What is tinnitus?">
          <Body>
            Tinnitus is the perception of sound — most often a ringing, buzzing,
            hissing, or humming — when no external source is present. Around 15–20%
            of adults experience it to some degree, and for most people it is a
            manageable part of daily life.
          </Body>
          <Body>
            The sound is real. It originates from changes in how the auditory system
            processes signals, not from physical damage that is actively getting
            worse. This distinction matters: tinnitus is a perception, and
            perceptions can change.
          </Body>
        </Section>

        <Section heading="Why does it happen?">
          <Body>
            The inner ear contains tiny hair cells that convert sound vibrations into
            electrical signals sent to the brain. When these cells are stressed — by
            noise exposure, age-related changes, or other factors — the pattern of
            signals they send can change. The brain, which is continuously active
            even in silence, sometimes interprets those changed signals as sound.
          </Body>
          <Body>
            This is similar to a "phantom" experience — the brain generating a
            sensation without external input. In most cases there is no single
            identifiable cause, and that is entirely normal. What matters most is
            not the origin of the signal, but how the brain and nervous system learn
            to respond to it.
          </Body>
        </Section>

        <Section heading="The habituation model">
          <Body>
            Research by Jastreboff (1990) helped explain why some people are
            significantly affected by tinnitus while others with similar signals
            barely notice it. The answer lies in the brain's capacity to learn.
          </Body>
          <Body>
            Habituation is the process by which the brain classifies a signal as
            unimportant and gradually stops prioritising it. You have already
            experienced this: you stop noticing the hum of a refrigerator, the
            sensation of clothes on your skin, or distant traffic noise. None of
            those sensations disappeared — your brain learned to filter them out.
          </Body>
          <Body>
            The same process applies to tinnitus. When the brain learns to classify
            the signal as non-threatening, the emotional and attentional systems stop
            responding to it. The sound may still be present, but it ceases to cause
            distress or interference. For most people, habituation happens gradually
            and naturally — and it can be actively supported.
          </Body>

          <CitationCard />
        </Section>

        <Section heading="What supports the process">
          <Body>
            Habituation does not require eliminating the sound. It happens when
            the brain has enough context and experience to reclassify tinnitus as
            safe and unimportant. Several everyday habits support this:
          </Body>

          <View style={styles.bulletList}>
            <BulletPoint>
              Sound enrichment — keeping a gentle background of sound prevents the
              auditory system from focusing exclusively on tinnitus. Silence makes
              it more prominent.
            </BulletPoint>
            <BulletPoint>
              Relaxation — reducing tension in the nervous system reduces the
              threat signal the brain associates with the sound.
            </BulletPoint>
            <BulletPoint>
              Consistent routines — sleep quality, physical activity, and stress
              levels all influence how noticeable tinnitus feels from day to day.
            </BulletPoint>
            <BulletPoint>
              Redirecting attention — the more the brain monitors for the sound,
              the more it prioritises it. Directing focus elsewhere is a skill
              that develops gradually with practice.
            </BulletPoint>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryText}>
              The tools in this app — sound therapy, breathing exercises, and the
              content in this section — are grounded in this understanding.
              Supporting habituation is what evidence-based tinnitus self-management
              looks like in practice.
            </Text>
          </View>
        </Section>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            For clinical assessment and management guidance, see your GP, audiologist,
            or ENT specialist. This content does not constitute medical advice.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(
  colors: ReturnType<typeof useTheme>['colors'],
  typography: ReturnType<typeof useTheme>['typography'],
) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    scroll: {
      flexGrow: 1,
      paddingHorizontal: Spacing.xl,
      paddingTop: Spacing.md,
      paddingBottom: Spacing.xl,
      gap: Spacing.xl,
    },

    backBtn:        { alignSelf: 'flex-start', paddingVertical: Spacing.sm, paddingRight: Spacing.sm },
    backBtnPressed: { opacity: 0.6 },
    backLabel:      { ...typography.body, color: colors.headingAccent },

    header: { gap: Spacing.md },
    title:  { ...typography.display, color: colors.textPrimary },
    lead:   { ...typography.body, color: colors.textSecondary, lineHeight: 24 },

    section:        { gap: Spacing.md },
    sectionHeading: { ...typography.heading1, color: colors.headingAccent },
    body:           { ...typography.body, color: colors.textPrimary, lineHeight: 24 },

    bulletList: { gap: Spacing.sm, paddingLeft: Spacing.xs },
    bulletRow:  { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
    bulletDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: Colors.calmWave,
      marginTop: 9,
    },
    bulletText: { flex: 1 },

    citation: {
      backgroundColor: colors.surfaceVariant,
      borderRadius: Radius.card,
      padding: Spacing.base,
      gap: Spacing.sm,
      borderLeftWidth: 3,
      borderLeftColor: Colors.calmWave,
    },
    citationLabel:  { ...typography.micro, color: colors.headingAccent },
    citationText:   { ...typography.caption, color: colors.textPrimary, lineHeight: 20 },
    citationItalic: { fontStyle: 'italic' },
    citationNote:   { ...typography.caption, color: colors.textSecondary, lineHeight: 18 },

    summaryCard: {
      backgroundColor: colors.surface,
      borderRadius: Radius.card,
      padding: Spacing.base,
      borderWidth: Border.width,
      borderColor: Colors.calmWave + '50',
    },
    summaryText: { ...typography.body, color: colors.textPrimary, lineHeight: 24 },

    footer: {
      borderTopWidth: Border.width,
      borderTopColor: Colors.calmWave + '33',
      paddingTop: Spacing.md,
    },
    footerText: {
      ...typography.caption,
      color: colors.textSecondary,
      textAlign: 'center',
      fontStyle: 'italic',
    },
  });
}
