import { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet, Text, View, Pressable, ScrollView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { CRESTAssessment } from '@/src/types';
import { getAssessmentById, getAllAssessments } from '@/src/storage/crest';
import { severityLabel, MEANINGFUL_CHANGE_THRESHOLD, isMeaningfulImprovement } from '@/src/utils/crestScoring';
import { Colors, CRESTSeverityColors, Spacing, Radius, Border } from '@/src/theme';
import { useTheme } from '@/src/context/ThemeContext';

// ─── Constants ────────────────────────────────────────────────────────────────

type DomainKey = keyof CRESTAssessment['domains'];

const DOMAIN_LABELS: Record<DomainKey, string> = {
  intrusion: 'Intrusion',
  emotional: 'Emotional',
  cognitive: 'Cognitive',
  sleep: 'Sleep',
  social: 'Social',
  control: 'Sense of control',
};

function severityColors(severity: CRESTAssessment['severity']) {
  return CRESTSeverityColors[severity];
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

// ─── Domain change row ────────────────────────────────────────────────────────

function DomainRow({
  label,
  before,
  after,
}: {
  label: string;
  before: number;
  after: number;
}) {
  const { colors, typography, isDark } = useTheme();
  const sub = useMemo(() => makeSubStyles(colors, typography, isDark), [colors, typography, isDark]);

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
  isDark: boolean,
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
      backgroundColor: isDark ? Colors.darkCard : Colors.tealLight,
      borderRadius: 6,
      overflow: 'hidden',
    },
    fill:  { height: '100%', backgroundColor: Colors.calmWave, borderRadius: 6 },
    score: { ...typography.caption, color: Colors.calmWave, width: 24, textAlign: 'right' },
    delta: { ...typography.caption, fontWeight: '500' as const, width: 30, textAlign: 'right' },
  });
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function CRESTRetestResultScreen() {
  const { colors, typography, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, typography, isDark), [colors, typography, isDark]);

  const params = useLocalSearchParams<{ assessmentId?: string }>();
  const [assessment, setAssessment] = useState<CRESTAssessment | null>(null);
  const [baseline, setBaseline] = useState<CRESTAssessment | null>(null);

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

  const { totalScore, severity, domains, weekNumber } = assessment;
  const gc = severityColors(severity);
  const delta = baseline ? Math.round(baseline.totalScore - totalScore) : null;
  const meaningfulImprovement = delta !== null && isMeaningfulImprovement(delta);
  const domainKeys = Object.keys(domains) as DomainKey[];
  const sortedKeys = [...domainKeys].sort(
    (a, b) => domains[b] - domains[a]
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
              <Text style={styles.scoreNumber}>
                {Math.round(totalScore)}
              </Text>
              <Text style={styles.scoreOf}>out of 100</Text>
            </View>
            <View style={styles.gradeBadge}>
              <Text style={styles.gradeBadgeText}>
                {severityLabel(severity)}
              </Text>
            </View>
          </View>

          {delta !== null && (
            <View style={styles.deltaRow}>
              <DeltaBadge delta={delta} />
              <Text style={styles.deltaLabel}>
                vs. your previous assessment ({Math.round(baseline!.totalScore)})
              </Text>
            </View>
          )}
        </View>

        {meaningfulImprovement && (
          <View style={styles.meaningfulCard}>
            <Text style={styles.meaningfulTitle}>Clinically meaningful improvement</Text>
            <Text style={styles.meaningfulBody}>
              A reduction of {delta} points meets the {MEANINGFUL_CHANGE_THRESHOLD}-point
              meaningful change threshold for the CREST scale — this is a meaningful
              change that goes beyond normal week-to-week variation.
            </Text>
          </View>
        )}

        <View style={styles.domainCard}>
          <Text style={styles.domainTitle}>Domain breakdown</Text>
          <Text style={styles.domainSubtitle}>
            Scores 0–100 · {baseline ? 'Change vs. previous' : 'Current scores'}
          </Text>
          <View style={styles.domainRows}>
            {sortedKeys.map((key) => (
              <DomainRow
                key={key}
                label={DOMAIN_LABELS[key]}
                before={baseline?.domains[key] ?? domains[key]}
                after={domains[key]}
              />
            ))}
          </View>
        </View>

        <View style={styles.citation}>
          <Text style={styles.citationLabel}>About the CREST assessment</Text>
          <Text style={styles.citationText}>
            CREST (Compact Rating and Experience of Symptoms in Tinnitus) is a
            12-question scale measuring the impact of tinnitus across 6 domains.
            A drop of {MEANINGFUL_CHANGE_THRESHOLD} or more points is considered a
            meaningful improvement.
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
  isDark: boolean,
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
    scoreNumber:    { fontSize: 60, fontWeight: '400', lineHeight: 66, letterSpacing: -1, color: Colors.calmWave },
    scoreOf:        { ...typography.body, color: colors.textSecondary },
    gradeBadge: {
      borderRadius: Radius.chip,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs,
      alignSelf: 'flex-end',
      backgroundColor: Colors.calmWave + '20',
    },
    gradeBadgeText: { ...typography.micro, color: isDark ? Colors.warmSand : Colors.deepTide },
    deltaRow:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap' },
    deltaLabel: { ...typography.caption, flex: 1, color: colors.textPrimary },

    // Meaningful-change card
    meaningfulCard: {
      backgroundColor: Colors.tealLight,
      borderRadius: Radius.card,
      padding: Spacing.base,
      gap: Spacing.sm,
      borderLeftWidth: 3,
      borderLeftColor: Colors.calmWave,
    },
    meaningfulTitle:    { ...typography.heading2, color: '#085041' },
    meaningfulBody:     { ...typography.body, color: '#085041', lineHeight: 22 },
    meaningfulCitation: { ...typography.caption, color: colors.textSecondary, fontStyle: 'italic' },

    // Domain card
    domainCard: {
      backgroundColor: colors.surface,
      borderRadius: Radius.card,
      padding: Spacing.base,
      gap: Spacing.md,
      borderWidth: Border.width,
      borderColor: Colors.calmWave + '33',
    },
    domainTitle:    { ...typography.heading2, color: colors.textPrimary },
    domainSubtitle: { ...typography.caption, color: colors.textSecondary, marginTop: -Spacing.sm },
    domainRows:     { gap: Spacing.md },

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
