import { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet, Text, View, Pressable, ScrollView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { TFIAssessment } from '@/src/types';
import { getAssessmentById, getAllAssessments } from '@/src/storage/tfi';
import { Colors, TFISeverityColors, Spacing, Radius, Border } from '@/src/theme';
import { useTheme } from '@/src/context/ThemeContext';

// ─── Constants ────────────────────────────────────────────────────────────────

const GRADE_LABELS: Record<TFIAssessment['grade'], string> = {
  'not-significant': 'Not significant',
  small: 'Small',
  moderate: 'Moderate',
  big: 'Big',
  'very-big': 'Very big',
};

const SUBSCALE_LABELS: Record<keyof TFIAssessment['subscales'], string> = {
  intrusiveness: 'Intrusiveness',
  control: 'Sense of control',
  cognitive: 'Cognitive',
  sleep: 'Sleep',
  auditory: 'Auditory',
  relaxation: 'Relaxation',
  qualityOfLife: 'Quality of life',
  emotional: 'Emotional',
};

function gradeColors(grade: TFIAssessment['grade']) {
  const map: Record<TFIAssessment['grade'], { background: string; text: string }> = {
    'not-significant': TFISeverityColors.notSignificant,
    small: TFISeverityColors.small,
    moderate: TFISeverityColors.moderate,
    big: TFISeverityColors.big,
    'very-big': TFISeverityColors.veryBig,
  };
  return map[grade];
}

// ─── Delta display ────────────────────────────────────────────────────────────

function DeltaBadge({ delta }: { delta: number }) {
  const { colors, typography } = useTheme();
  const deltaBadge = useMemo(() => makeDeltaBadgeStyles(typography), [typography]);

  const improved = delta > 0;
  const label = improved ? `↓ ${delta} points` : delta < 0 ? `↑ ${Math.abs(delta)} points` : 'No change';
  const bg = improved ? Colors.tealLight : delta < 0 ? Colors.coralLight : colors.textSecondary + '20';
  const color = improved ? Colors.deepTide : delta < 0 ? Colors.warmCoral : colors.textSecondary;
  return (
    <View style={[deltaBadge.pill, { backgroundColor: bg }]}>
      <Text style={[deltaBadge.text, { color }]}>{label}</Text>
    </View>
  );
}

function makeDeltaBadgeStyles(typography: ReturnType<typeof useTheme>['typography']) {
  return StyleSheet.create({
    pill: {
      borderRadius: Radius.chip,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs,
      alignSelf: 'flex-start',
    },
    text: { ...typography.micro },
  });
}

// ─── Subscale change row ──────────────────────────────────────────────────────

function SubscaleRow({
  label,
  before,
  after,
}: {
  label: string;
  before: number;
  after: number;
}) {
  const { colors, typography } = useTheme();
  const sub = useMemo(() => makeSubStyles(colors, typography), [colors, typography]);

  const delta = Math.round(before - after);
  const pct = Math.min(100, Math.max(0, after));
  const deltaStr = delta > 0 ? `↓${delta}` : delta < 0 ? `↑${Math.abs(delta)}` : '—';
  const deltaColor = delta > 0 ? Colors.calmWave : delta < 0 ? Colors.warmCoral : colors.textSecondary;

  return (
    <View style={sub.row}>
      <Text style={sub.label}>{label}</Text>
      <View style={sub.trackWrap}>
        <View style={sub.track}>
          <View style={[sub.fill, { width: `${pct}%` as any }]} />
        </View>
        <Text style={sub.score}>{Math.round(after)}</Text>
        <Text style={[sub.delta, { color: deltaColor }]}>{deltaStr}</Text>
      </View>
    </View>
  );
}

function makeSubStyles(
  colors: ReturnType<typeof useTheme>['colors'],
  typography: ReturnType<typeof useTheme>['typography'],
) {
  return StyleSheet.create({
    row: { gap: 4 },
    label: { ...typography.caption, color: colors.textPrimary },
    trackWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    track: {
      flex: 1,
      height: 6,
      backgroundColor: colors.textSecondary + '25',
      borderRadius: 3,
      overflow: 'hidden',
    },
    fill:  { height: '100%', backgroundColor: Colors.deepTide, borderRadius: 3 },
    score: { ...typography.caption, color: colors.textPrimary, width: 24, textAlign: 'right' },
    delta: { ...typography.caption, fontWeight: '500' as const, width: 30, textAlign: 'right' },
  });
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function TFIRetestResultScreen() {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);

  const params = useLocalSearchParams<{ assessmentId?: string }>();
  const [assessment, setAssessment] = useState<TFIAssessment | null>(null);
  const [baseline, setBaseline] = useState<TFIAssessment | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web' || !params.assessmentId) return;
    const current = getAssessmentById(params.assessmentId);
    setAssessment(current);
    if (current) {
      const all = getAllAssessments();
      const earlier = all.filter((a) => a.id !== current.id && a.date < current.date);
      if (earlier.length > 0) {
        setBaseline(earlier[earlier.length - 1]);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!assessment) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loading}>
          <Text style={styles.loadingText}>Loading results…</Text>
        </View>
      </SafeAreaView>
    );
  }

  const { totalScore, grade, subscales, weekNumber } = assessment;
  const gc = gradeColors(grade);
  const delta = baseline ? Math.round(baseline.totalScore - totalScore) : null;
  const mcidAchieved = delta !== null && delta >= 13;
  const subscaleKeys = Object.keys(subscales) as Array<keyof TFIAssessment['subscales']>;
  const sortedKeys = [...subscaleKeys].sort(
    (a, b) => subscales[b] - subscales[a]
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.weekRow}>
          <View style={styles.weekBadge}>
            <Text style={styles.weekBadgeText}>Week {weekNumber} retest complete</Text>
          </View>
        </View>

        <View style={[styles.scoreCard, { backgroundColor: gc.background }]}>
          <View style={styles.scoreRow}>
            <View>
              <Text style={[styles.scoreNumber, { color: gc.text }]}>
                {Math.round(totalScore)}
              </Text>
              <Text style={[styles.scoreOf, { color: gc.text }]}>out of 100</Text>
            </View>
            <View style={[styles.gradeBadge, { backgroundColor: gc.text + '18' }]}>
              <Text style={[styles.gradeBadgeText, { color: gc.text }]}>
                {GRADE_LABELS[grade]}
              </Text>
            </View>
          </View>

          {delta !== null && (
            <View style={styles.deltaRow}>
              <DeltaBadge delta={delta} />
              <Text style={[styles.deltaLabel, { color: gc.text }]}>
                vs. your previous assessment ({Math.round(baseline!.totalScore)})
              </Text>
            </View>
          )}
        </View>

        {mcidAchieved && (
          <View style={styles.mcidCard}>
            <Text style={styles.mcidTitle}>Clinically meaningful improvement</Text>
            <Text style={styles.mcidBody}>
              A reduction of {delta} points meets the validated Minimum Clinically
              Important Difference (MCID) for the TFI — this is a meaningful change
              that goes beyond normal variation.
            </Text>
            <Text style={styles.mcidCitation}>
              Meikle MB et al. (2012). Ear and Hearing, 33(2), 153–176.
            </Text>
          </View>
        )}

        <View style={styles.subscaleCard}>
          <Text style={styles.subscaleTitle}>Subscale breakdown</Text>
          <Text style={styles.subscaleSubtitle}>
            Scores 0–100 · {baseline ? 'Change vs. previous' : 'Current scores'}
          </Text>
          <View style={styles.subscaleRows}>
            {sortedKeys.map((key) => (
              <SubscaleRow
                key={key}
                label={SUBSCALE_LABELS[key]}
                before={baseline?.subscales[key] ?? subscales[key]}
                after={subscales[key]}
              />
            ))}
          </View>
        </View>

        <View style={styles.citation}>
          <Text style={styles.citationLabel}>About the TFI</Text>
          <Text style={styles.citationText}>
            The Tinnitus Functional Index (TFI) is a validated 25-item questionnaire
            measuring the impact of tinnitus across 8 domains. A 13-point improvement
            is the validated Minimum Clinically Important Difference (MCID).
          </Text>
        </View>

        <Pressable
          style={({ pressed }) => [styles.doneBtn, pressed && styles.doneBtnPressed]}
          onPress={() => router.replace('/(tabs)/progress' as any)}
          accessibilityRole="button"
          accessibilityLabel="Back to Progress"
        >
          <Text style={styles.doneBtnLabel}>Back to Progress</Text>
        </Pressable>
      </ScrollView>
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
      gap: Spacing.base,
    },
    loading:     { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { ...typography.body, color: colors.textSecondary },

    weekRow:  { alignItems: 'flex-start' },
    weekBadge: {
      backgroundColor: colors.surfaceVariant,
      borderRadius: Radius.chip,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs,
    },
    weekBadgeText: { ...typography.micro, color: Colors.deepTide },

    scoreCard: {
      borderRadius: Radius.card,
      padding: Spacing.xl,
      gap: Spacing.md,
    },
    scoreRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
    },
    scoreNumber:    { fontSize: 60, fontWeight: '400', lineHeight: 66, letterSpacing: -1 },
    scoreOf:        { ...typography.body },
    gradeBadge: {
      borderRadius: Radius.chip,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs,
      alignSelf: 'flex-end',
    },
    gradeBadgeText: { ...typography.micro },
    deltaRow:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap' },
    deltaLabel: { ...typography.caption, flex: 1 },

    // MCID card
    mcidCard: {
      backgroundColor: colors.surfaceVariant,
      borderRadius: Radius.card,
      padding: Spacing.base,
      gap: Spacing.sm,
      borderLeftWidth: 3,
      borderLeftColor: Colors.calmWave,
    },
    mcidTitle:    { ...typography.heading2, color: Colors.deepTide },
    mcidBody:     { ...typography.body, color: colors.textPrimary, lineHeight: 22 },
    mcidCitation: { ...typography.caption, color: colors.textSecondary, fontStyle: 'italic' },

    // Subscale card
    subscaleCard: {
      backgroundColor: colors.surface,
      borderRadius: Radius.card,
      padding: Spacing.base,
      gap: Spacing.md,
      borderWidth: Border.width,
      borderColor: Colors.calmWave + '33',
    },
    subscaleTitle:    { ...typography.heading2, color: colors.textPrimary },
    subscaleSubtitle: { ...typography.caption, color: colors.textSecondary, marginTop: -Spacing.sm },
    subscaleRows:     { gap: Spacing.md },

    // Citation
    citation: {
      backgroundColor: colors.surface,
      borderRadius: Radius.card,
      padding: Spacing.base,
      gap: Spacing.xs,
      borderLeftWidth: 3,
      borderLeftColor: Colors.calmWave,
    },
    citationLabel: { ...typography.micro, color: Colors.deepTide },
    citationText:  { ...typography.caption, color: colors.textSecondary, lineHeight: 20 },

    // Done button
    doneBtn: {
      backgroundColor: Colors.deepTide,
      borderRadius: Radius.chip,
      paddingVertical: Spacing.base,
      alignItems: 'center',
      marginTop: Spacing.sm,
    },
    doneBtnPressed: { opacity: 0.85 },
    doneBtnLabel:   { ...typography.heading2, color: Colors.white },
  });
}
