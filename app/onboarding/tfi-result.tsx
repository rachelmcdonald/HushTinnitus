import { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  SafeAreaView,
  ScrollView,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { TFIAssessment } from '@/src/types';
import { getAssessmentById } from '@/src/storage/tfi';
import { gradeFromScore } from '@/src/utils/tfiScoring';
import { usePreferences } from '@/src/context/PreferencesContext';
import { Colors, TFISeverityColors, Typography, Spacing, Radius, Border } from '@/src/theme';

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
  const colors = severityColors(
    { 'not-significant': 8, small: 24, moderate: 42, big: 63, 'very-big': 80 }[grade]
  );
  return (
    <View style={[badge.container, { backgroundColor: colors.background }]}>
      <Text style={[badge.text, { color: colors.text }]}>
        {GRADE_LABELS[grade]}
      </Text>
    </View>
  );
}

const badge = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
    borderRadius: Radius.chip,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  text: {
    ...Typography.micro,
  },
});

type BarRowProps = {
  label: string;
  score: number;
  isFocusArea: boolean;
};

function BarRow({ label, score, isFocusArea }: BarRowProps) {
  const colors = severityColors(score);
  const pct = Math.min(100, Math.max(0, score));

  return (
    <View style={bar.row}>
      <View style={bar.labelRow}>
        <Text style={bar.label}>{label}</Text>
        {isFocusArea && (
          <View style={bar.focusBadge}>
            <Text style={bar.focusText}>Focus area</Text>
          </View>
        )}
      </View>
      <View style={bar.track}>
        <View
          style={[
            bar.fill,
            { width: `${pct}%`, backgroundColor: colors.text },
          ]}
        />
      </View>
      <Text style={[bar.score, { color: colors.text }]}>
        {Math.round(score)}
      </Text>
    </View>
  );
}

const bar = StyleSheet.create({
  row: {
    gap: Spacing.xs,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  label: {
    ...Typography.caption,
    color: Colors.darkText,
    flex: 1,
  },
  focusBadge: {
    backgroundColor: Colors.tealLight,
    borderRadius: 4,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
  },
  focusText: {
    ...Typography.micro,
    fontSize: 9,
    color: Colors.deepTide,
  },
  track: {
    height: 6,
    backgroundColor: Colors.midGray + '25',
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
  score: {
    ...Typography.caption,
    fontWeight: '500',
  },
});

// ─── Very big grade — referral note ──────────────────────────────────────────

function VeryBigReferralCard({ totalScore }: { totalScore: number }) {
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
    <View style={referral.card}>
      <View style={referral.headerRow}>
        <View style={referral.accentBorder} />
        <Text style={referral.heading}>Referral note</Text>
      </View>
      <Text style={referral.body}>
        Copy this to share with your doctor or receptionist.
      </Text>
      <View style={referral.noteBox}>
        <Text style={referral.noteText} selectable>{note}</Text>
      </View>
      <Pressable
        style={({ pressed }) => [
          referral.copyButton,
          copied && referral.copyButtonDone,
          pressed && !copied && referral.copyButtonPressed,
        ]}
        onPress={handleCopy}
        accessibilityRole="button"
        accessibilityLabel={copied ? 'Copied' : 'Copy referral note to clipboard'}
      >
        <Text style={[referral.copyLabel, copied && referral.copyLabelDone]}>
          {copied ? 'Copied ✓' : 'Copy to clipboard'}
        </Text>
      </Pressable>
    </View>
  );
}

const referral = StyleSheet.create({
  card: {
    backgroundColor: Colors.coralLight,
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
    backgroundColor: Colors.warmCoral,
    borderRadius: 2,
  },
  heading: {
    ...Typography.heading2,
    color: Colors.darkText,
  },
  body: {
    ...Typography.caption,
    color: Colors.midGray,
  },
  noteBox: {
    backgroundColor: Colors.white,
    borderRadius: Radius.chip,
    padding: Spacing.md,
  },
  noteText: {
    ...Typography.body,
    color: Colors.darkText,
    lineHeight: 22,
  },
  copyButton: {
    borderWidth: Border.width * 2,
    borderColor: Colors.warmCoral,
    borderRadius: Radius.chip,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  copyButtonDone: {
    borderColor: Colors.calmWave,
    backgroundColor: Colors.tealLight,
  },
  copyButtonPressed: { opacity: 0.7 },
  copyLabel: {
    ...Typography.heading2,
    color: Colors.warmCoral,
  },
  copyLabelDone: {
    color: Colors.calmWave,
  },
});

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

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.warmSand,
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
    ...Typography.body,
    color: Colors.midGray,
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
    ...Typography.body,
    marginTop: -Spacing.md,
  },
  scoreMessage: {
    ...Typography.body,
    lineHeight: 24,
    marginTop: Spacing.xs,
  },

  // Subscale chart card
  chartCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.card,
    padding: Spacing.base,
    gap: Spacing.md,
  },
  chartTitle: {
    ...Typography.heading2,
    color: Colors.darkText,
  },
  chartSubtitle: {
    ...Typography.caption,
    color: Colors.midGray,
    marginTop: -Spacing.sm,
  },
  chartRows: {
    gap: Spacing.md,
  },
  focusNote: {
    ...Typography.caption,
    color: Colors.midGray,
    borderTopWidth: Border.width,
    borderTopColor: Colors.midGray + '30',
    paddingTop: Spacing.md,
  },

  // Footer
  footer: {
    marginTop: Spacing.sm,
  },
  ctaButton: {
    backgroundColor: Colors.deepTide,
    borderRadius: Radius.chip,
    paddingVertical: Spacing.base,
    alignItems: 'center',
  },
  ctaButtonPressed: {
    opacity: 0.85,
  },
  ctaLabel: {
    ...Typography.heading2,
    color: Colors.white,
  },
});
