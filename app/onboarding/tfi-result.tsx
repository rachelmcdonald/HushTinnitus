import { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { TFIAssessment } from '@/src/types';
import { getAssessmentById } from '@/src/storage/tfi';
import { gradeFromScore } from '@/src/utils/tfiScoring';
import { usePreferences } from '@/src/context/PreferencesContext';
import { TFISeverityColors, Spacing, Radius, Border } from '@/src/theme';
import { useTheme } from '@/src/context/ThemeContext';

// ─── Grade content — Section 5.3 ─────────────────────────────────────────────

const GRADE_LABELS: Record<TFIAssessment['grade'], string> = {
  'not-significant': 'Not significant',
  'small': 'Small',
  'moderate': 'Moderate',
  'big': 'Big',
  'very-big': 'Very big',
};

// Tone and plain-language interpretation per Section 5.3 (no prohibited words)
const GRADE_MESSAGES: Record<TFIAssessment['grade'], string> = {
  'not-significant':
    'Your tinnitus is having minimal impact on your daily life. The tools in this app are designed to keep it that way and support you in building habits that may prevent it from becoming more bothersome.',
  'small':
    'Your tinnitus is mildly bothersome at the moment. Many people at this level find that simple, consistent daily habits make a real difference — and this app has the tools to help.',
  'moderate':
    'Your tinnitus is affecting daily life in noticeable ways. The app will focus on the areas most relevant to you. If you haven\'t already spoken with a GP or audiologist about your tinnitus, it may be worth a check-in.',
  'big':
    'Your tinnitus is having a substantial impact on your daily life. This app will guide you step by step through the tools that can help. If you haven\'t had your tinnitus assessed, we recommend mentioning it to your GP — especially if you haven\'t had a hearing test.',
  'very-big':
    'Your tinnitus appears to be having a significant impact on your life. We strongly encourage you to see a GP or ENT specialist soon. All features of this app are available to you right now, and we\'ll be here to support you every step of the way.',
};

// ─── Subscale display ─────────────────────────────────────────────────────────

type SubscaleKey = keyof TFIAssessment['subscales'];

const SUBSCALE_LABELS: Record<SubscaleKey, string> = {
  intrusiveness: 'Intrusiveness',
  control: 'Sense of control',
  cognitive: 'Cognitive',
  sleep: 'Sleep',
  auditory: 'Auditory',
  relaxation: 'Relaxation',
  qualityOfLife: 'Quality of life',
  emotional: 'Emotional',
};

function severityColors(score: number): { background: string; text: string } {
  const grade = gradeFromScore(score);
  switch (grade) {
    case 'not-significant': return TFISeverityColors.notSignificant;
    case 'small':           return TFISeverityColors.small;
    case 'moderate':        return TFISeverityColors.moderate;
    case 'big':             return TFISeverityColors.big;
    case 'very-big':        return TFISeverityColors.veryBig;
  }
}

function topTwoSubscales(subscales: TFIAssessment['subscales']): Set<SubscaleKey> {
  const keys = Object.keys(subscales) as SubscaleKey[];
  const sorted = [...keys].sort((a, b) => subscales[b] - subscales[a]);
  return new Set(sorted.slice(0, 2));
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function GradeBadge({ grade }: { grade: TFIAssessment['grade'] }) {
  const gradeColors = severityColors(
    { 'not-significant': 8, small: 24, moderate: 42, big: 63, 'very-big': 80 }[grade]
  );
  const badgeStyles = useMemo(() => StyleSheet.create({
    container: {
      alignSelf: 'flex-start',
      borderRadius: Radius.chip,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs,
      backgroundColor: gradeColors.background,
    },
    text: {
      fontSize: 11,
      fontWeight: '600' as const,
      color: gradeColors.text,
    },
  }), [gradeColors]);

  return (
    <View style={badgeStyles.container}>
      <Text style={badgeStyles.text}>
        {GRADE_LABELS[grade]}
      </Text>
    </View>
  );
}

type BarRowProps = {
  label: string;
  score: number;
  isFocusArea: boolean;
};

function BarRow({ label, score, isFocusArea }: BarRowProps) {
  const { colors, typography } = useTheme();
  const gradeColors = severityColors(score);
  const pct = Math.min(100, Math.max(0, score));
  const barStyles = useMemo(() => StyleSheet.create({
    row: {
      gap: Spacing.xs,
    },
    labelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    label: {
      ...typography.caption,
      color: colors.textPrimary,
      flex: 1,
    },
    focusBadge: {
      backgroundColor: colors.surfaceVariant,
      borderRadius: 4,
      paddingHorizontal: Spacing.xs,
      paddingVertical: 2,
    },
    focusText: {
      ...typography.micro,
      fontSize: 9,
      color: colors.deepTide,
    },
    track: {
      height: 6,
      backgroundColor: colors.textSecondary + '25',
      borderRadius: 3,
      overflow: 'hidden',
    },
    fill: {
      height: '100%',
      borderRadius: 3,
    },
    score: {
      ...typography.caption,
      fontWeight: '500' as const,
    },
  }), [colors, typography]);

  return (
    <View style={barStyles.row}>
      <View style={barStyles.labelRow}>
        <Text style={barStyles.label}>{label}</Text>
        {isFocusArea && (
          <View style={barStyles.focusBadge}>
            <Text style={barStyles.focusText}>Focus area</Text>
          </View>
        )}
      </View>
      <View style={barStyles.track}>
        <View
          style={[
            barStyles.fill,
            { width: `${pct}%`, backgroundColor: gradeColors.text },
          ]}
        />
      </View>
      <Text style={[barStyles.score, { color: gradeColors.text }]}>
        {Math.round(score)}
      </Text>
    </View>
  );
}

// ─── Very big grade — referral note ──────────────────────────────────────────

function VeryBigReferralCard({ totalScore }: { totalScore: number }) {
  const { colors, typography } = useTheme();
  const referralStyles = useMemo(() => StyleSheet.create({
    card: {
      backgroundColor: colors.coralLight,
      borderRadius: Radius.card,
      padding: Spacing.base,
      gap: Spacing.sm,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    accentBorder: {
      width: 3,
      height: 18,
      backgroundColor: colors.warmCoral,
      borderRadius: 2,
    },
    heading: {
      ...typography.heading2,
      color: colors.textPrimary,
    },
    body: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    noteBox: {
      backgroundColor: colors.surface,
      borderRadius: Radius.chip,
      padding: Spacing.md,
    },
    noteText: {
      ...typography.body,
      color: colors.textPrimary,
      lineHeight: 22,
    },
    copyButton: {
      borderWidth: Border.width * 2,
      borderColor: colors.warmCoral,
      borderRadius: Radius.chip,
      paddingVertical: Spacing.sm,
      alignItems: 'center',
    },
    copyButtonDone: {
      borderColor: colors.calmWave,
      backgroundColor: colors.surfaceVariant,
    },
    copyButtonPressed: { opacity: 0.7 },
    copyLabel: {
      ...typography.heading2,
      color: colors.warmCoral,
    },
    copyLabelDone: {
      color: colors.calmWave,
    },
  }), [colors, typography]);

  const [copied, setCopied] = useState(false);
  const note =
    `Dear Doctor,\n\n` +
    `I have been experiencing tinnitus that is significantly affecting my daily life. ` +
    `My self-assessed Tinnitus Functional Index (TFI) score is ${Math.round(totalScore)}/100.\n\n` +
    `I would appreciate a hearing assessment and, if appropriate, a referral to an ` +
    `audiologist or ENT specialist for further evaluation.\n\n` +
    `Thank you for your time.`;

  async function handleCopy() {
    await Clipboard.setStringAsync(note);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  }

  return (
    <View style={referralStyles.card}>
      <View style={referralStyles.headerRow}>
        <View style={referralStyles.accentBorder} />
        <Text style={referralStyles.heading}>Referral note</Text>
      </View>
      <Text style={referralStyles.body}>
        Copy this to share with your doctor or receptionist.
      </Text>
      <View style={referralStyles.noteBox}>
        <Text style={referralStyles.noteText} selectable>{note}</Text>
      </View>
      <Pressable
        style={({ pressed }) => [
          referralStyles.copyButton,
          copied && referralStyles.copyButtonDone,
          pressed && !copied && referralStyles.copyButtonPressed,
        ]}
        onPress={handleCopy}
        accessibilityRole="button"
        accessibilityLabel={copied ? 'Copied' : 'Copy referral note to clipboard'}
      >
        <Text style={[referralStyles.copyLabel, copied && referralStyles.copyLabelDone]}>
          {copied ? 'Copied ✓' : 'Copy to clipboard'}
        </Text>
      </Pressable>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

type Params = {
  assessmentId?: string;
  totalScore?: string;
  grade?: string;
  subscalesJson?: string;
};

export default function TFIResultScreen() {
  const params = useLocalSearchParams<Params>();
  const { updatePreferences } = usePreferences();
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);
  const [assessment, setAssessment] = useState<TFIAssessment | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web' && params.assessmentId) {
      setAssessment(getAssessmentById(params.assessmentId));
    } else if (params.totalScore && params.grade && params.subscalesJson) {
      setAssessment({
        id: 'web-preview',
        date: new Date().toISOString(),
        totalScore: parseFloat(params.totalScore),
        grade: params.grade as TFIAssessment['grade'],
        subscales: JSON.parse(params.subscalesJson),
        responses: [],
        isBaseline: true,
        weekNumber: 0,
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleGetStarted() {
    // Mark onboarding complete — user is entering the app
    updatePreferences({ onboardingComplete: true });
    router.push('/onboarding/notifications');
  }

  if (!assessment) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading your results…</Text>
        </View>
      </SafeAreaView>
    );
  }

  const { totalScore, grade, subscales } = assessment;
  const gradeColors = severityColors(totalScore);
  const focusAreas = topTwoSubscales(subscales);
  const subscaleKeys = Object.keys(subscales) as SubscaleKey[];
  // Sort descending for display — highest impact first
  const sortedKeys = [...subscaleKeys].sort((a, b) => subscales[b] - subscales[a]);
  const message = GRADE_MESSAGES[grade];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Score display */}
        <View style={[styles.scoreCard, { backgroundColor: gradeColors.background }]}>
          <Text style={[styles.scoreNumber, { color: gradeColors.text }]}>
            {Math.round(totalScore)}
          </Text>
          <Text style={[styles.scoreOf, { color: gradeColors.text }]}>out of 100</Text>
          <GradeBadge grade={grade} />
          <Text style={[styles.scoreMessage, { color: gradeColors.text }]}>
            {message}
          </Text>
        </View>

        {/* Very big — referral card above the chart */}
        {grade === 'very-big' && (
          <VeryBigReferralCard totalScore={totalScore} />
        )}

        {/* Subscale breakdown */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>How tinnitus is affecting you</Text>
          <Text style={styles.chartSubtitle}>
            Subscale scores 0–100 — higher means greater impact
          </Text>
          <View style={styles.chartRows}>
            {sortedKeys.map((key) => (
              <BarRow
                key={key}
                label={SUBSCALE_LABELS[key]}
                score={subscales[key]}
                isFocusArea={focusAreas.has(key)}
              />
            ))}
          </View>
          <Text style={styles.focusNote}>
            Your two highest subscales are flagged as focus areas — the app
            will highlight relevant tools for these.
          </Text>
        </View>

        {/* CTA */}
        <View style={styles.footer}>
          <Pressable
            style={({ pressed }) => [
              styles.ctaButton,
              pressed && styles.ctaButtonPressed,
            ]}
            onPress={handleGetStarted}
            accessibilityRole="button"
            accessibilityLabel="Get started"
          >
            <Text style={styles.ctaLabel}>Get started</Text>
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
      padding: Spacing.xl,
      gap: Spacing.base,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      ...typography.body,
      color: colors.textSecondary,
    },

    // Score card
    scoreCard: {
      borderRadius: Radius.card,
      padding: Spacing.xl,
      alignItems: 'flex-start',
      gap: Spacing.md,
    },
    scoreNumber: {
      fontSize: 72,
      fontWeight: '400',
      lineHeight: 80,
      letterSpacing: -1.5,
    },
    scoreOf: {
      ...typography.body,
      marginTop: -Spacing.md,
    },
    scoreMessage: {
      ...typography.body,
      lineHeight: 24,
      marginTop: Spacing.xs,
    },

    // Subscale chart card
    chartCard: {
      backgroundColor: colors.surface,
      borderRadius: Radius.card,
      padding: Spacing.base,
      gap: Spacing.md,
    },
    chartTitle: {
      ...typography.heading2,
      color: colors.textPrimary,
    },
    chartSubtitle: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: -Spacing.sm,
    },
    chartRows: {
      gap: Spacing.md,
    },
    focusNote: {
      ...typography.caption,
      color: colors.textSecondary,
      borderTopWidth: Border.width,
      borderTopColor: colors.textSecondary + '30',
      paddingTop: Spacing.md,
    },

    // Footer
    footer: {
      marginTop: Spacing.sm,
    },
    ctaButton: {
      backgroundColor: colors.deepTide,
      borderRadius: Radius.chip,
      paddingVertical: Spacing.base,
      alignItems: 'center',
    },
    ctaButtonPressed: {
      opacity: 0.85,
    },
    ctaLabel: {
      ...typography.heading2,
      color: colors.white,
    },
  });
}
