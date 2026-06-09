import { useState, useMemo } from 'react';
import {
  StyleSheet, Text, View, Pressable, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { CREST_QUESTIONS } from '@/src/data/crestQuestions';
import { scoreCREST } from '@/src/utils/crestScoring';
import { buildAndSaveAssessment } from '@/src/storage/crest';
import { usePreferences } from '@/src/context/PreferencesContext';
import { Colors, Spacing, Radius, Border } from '@/src/theme';
import { useTheme } from '@/src/context/ThemeContext';
import ResponseScale from '@/src/components/ResponseScale';

const TOTAL = CREST_QUESTIONS.length; // 12

const DOMAIN_LABELS: Record<string, string> = {
  intrusion: 'Intrusion',
  emotional: 'Emotional',
  cognitive: 'Cognitive',
  sleep: 'Sleep',
  social: 'Social',
  control: 'Control',
};

function ProgressBar({ current, total }: { current: number; total: number }) {
  const { colors } = useTheme();
  const bar = useMemo(() => makeBarStyles(colors), [colors]);
  const pct = ((current + 1) / total) * 100;
  return (
    <View style={bar.track}>
      <View style={[bar.fill, { width: `${pct}%` }]} />
    </View>
  );
}

function makeBarStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    track: {
      height: 3,
      backgroundColor: colors.textSecondary + '30',
      borderRadius: 2,
      overflow: 'hidden',
    },
    fill: { height: '100%', backgroundColor: Colors.calmWave, borderRadius: 2 },
  });
}

function DomainBadge({ label }: { label: string }) {
  const { colors, typography } = useTheme();
  const badge = useMemo(() => makeBadgeStyles(colors, typography), [colors, typography]);
  return (
    <View style={badge.container}>
      <Text style={badge.text}>{label}</Text>
    </View>
  );
}

function makeBadgeStyles(
  colors: ReturnType<typeof useTheme>['colors'],
  typography: ReturnType<typeof useTheme>['typography'],
) {
  return StyleSheet.create({
    container: {
      alignSelf: 'flex-start',
      backgroundColor: colors.surfaceVariant,
      borderRadius: Radius.chip,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs,
    },
    text: { ...typography.micro, color: Colors.deepTide },
  });
}

export default function CRESTRetestScreen() {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);

  const params = useLocalSearchParams<{ weekNumber?: string }>();
  const weekNumber = parseInt(params.weekNumber ?? '4', 10) as 4 | 8;
  const { updatePreferences } = usePreferences();

  const [responses, setResponses] = useState<(number | null)[]>(() => Array(TOTAL).fill(null));
  const [currentIndex, setCurrentIndex] = useState(0);

  function handleSelect(value: number) {
    const updated = [...responses];
    updated[currentIndex] = value;
    setResponses(updated);

    if (currentIndex === TOTAL - 1) {
      if (Platform.OS !== 'web') {
        const score = scoreCREST(updated as number[]);
        const assessment = buildAndSaveAssessment(updated as number[], score, false, weekNumber);
        const prefPatch: Record<string, unknown> = { lastCRESTDate: assessment.date };
        if (weekNumber === 4) prefPatch.week4Prompted = true;
        if (weekNumber === 8) prefPatch.week8Prompted = true;
        updatePreferences(prefPatch as any);
        router.replace({
          pathname: '/progress/crest-retest-result' as any,
          params: { assessmentId: assessment.id },
        });
      }
    } else {
      setCurrentIndex(currentIndex + 1);
    }
  }

  function handleBack() {
    if (currentIndex === 0) {
      router.back();
    } else {
      setCurrentIndex(currentIndex - 1);
    }
  }

  const question = CREST_QUESTIONS[currentIndex];
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === TOTAL - 1;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={handleBack}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel={isFirst ? 'Cancel retest' : 'Previous question'}
          >
            <Text style={styles.backLabel}>{isFirst ? '← Cancel' : '← Back'}</Text>
          </Pressable>
          <View style={styles.headerRight}>
            <View style={styles.weekBadge}>
              <Text style={styles.weekBadgeText}>Week {weekNumber} retest</Text>
            </View>
            <Text style={styles.counter}>{currentIndex + 1} of {TOTAL}</Text>
          </View>
        </View>
        <ProgressBar current={currentIndex} total={TOTAL} />
      </View>

      <View style={styles.content}>
        <DomainBadge label={DOMAIN_LABELS[question.domain]} />

        <Text style={styles.questionText}>{question.text}</Text>

        <ResponseScale
          value={responses[currentIndex]}
          onChange={handleSelect}
          questionText={question.text}
        />
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerHint}>
          {isLast ? 'Selecting an option submits your retest' : 'Select an option to continue'}
        </Text>
      </View>
    </SafeAreaView>
  );
}

function makeStyles(
  colors: ReturnType<typeof useTheme>['colors'],
  typography: ReturnType<typeof useTheme>['typography'],
) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    header: {
      paddingHorizontal: Spacing.xl,
      paddingTop: Spacing.lg,
      paddingBottom: Spacing.md,
      gap: Spacing.md,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    backButton: { paddingVertical: Spacing.xs, paddingRight: Spacing.sm },
    backLabel:  { ...typography.body, color: Colors.deepTide },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    weekBadge: {
      backgroundColor: colors.surfaceVariant,
      borderRadius: Radius.chip,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 2,
    },
    weekBadgeText: { ...typography.micro, color: Colors.deepTide },
    counter:       { ...typography.caption, color: colors.textSecondary },
    content: {
      flex: 1,
      paddingHorizontal: Spacing.xl,
      paddingTop: Spacing.xl,
      gap: Spacing.xl,
    },
    questionText: { ...typography.heading1, color: colors.textPrimary, lineHeight: 30 },
    footer: {
      paddingHorizontal: Spacing.xl,
      paddingBottom: Spacing.xl,
      paddingTop: Spacing.md,
      borderTopWidth: Border.width,
      borderTopColor: colors.textSecondary + '20',
    },
    footerHint: {
      ...typography.caption,
      color: colors.textSecondary,
      textAlign: 'center',
    },
  });
}
