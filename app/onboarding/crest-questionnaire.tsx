import { useState, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { CREST_QUESTIONS } from '@/src/data/crestQuestions';
import { scoreCREST } from '@/src/utils/crestScoring';
import { getInitialDraftState, saveDraft, clearDraft, buildAndSaveAssessment } from '@/src/storage/crest';
import { usePreferences } from '@/src/context/PreferencesContext';
import { Spacing, Radius, Border } from '@/src/theme';
import { useTheme } from '@/src/context/ThemeContext';
import ResponseScale from '@/src/components/ResponseScale';

const TOTAL = CREST_QUESTIONS.length; // 12

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ current, total }: { current: number; total: number }) {
  const { colors } = useTheme();
  const pct = ((current + 1) / total) * 100;
  const progressStyles = useMemo(() => StyleSheet.create({
    track: {
      height: 3,
      backgroundColor: colors.textSecondary + '30',
      borderRadius: 2,
      overflow: 'hidden',
    },
    fill: {
      height: '100%',
      backgroundColor: colors.calmWave,
      borderRadius: 2,
    },
  }), [colors]);

  return (
    <View style={progressStyles.track}>
      <View style={[progressStyles.fill, { width: `${pct}%` }]} />
    </View>
  );
}

// ─── Domain badge ─────────────────────────────────────────────────────────────

const DOMAIN_LABELS: Record<string, string> = {
  intrusion: 'Intrusion',
  emotional: 'Emotional',
  cognitive: 'Cognitive',
  sleep: 'Sleep',
  social: 'Social',
  control: 'Control',
};

function DomainBadge({ label }: { label: string }) {
  const { colors, typography } = useTheme();
  const badgeStyles = useMemo(() => StyleSheet.create({
    container: {
      alignSelf: 'flex-start',
      backgroundColor: colors.surfaceVariant,
      borderRadius: Radius.chip,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs,
    },
    text: {
      ...typography.micro,
      color: colors.deepTide,
    },
  }), [colors, typography]);

  return (
    <View style={badgeStyles.container}>
      <Text style={badgeStyles.text}>{label}</Text>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function CRESTQuestionnaireScreen() {
  const { updatePreferences } = usePreferences();
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);

  const [responses, setResponses] = useState<number[]>(() =>
    Platform.OS === 'web' ? Array(TOTAL).fill(2) : getInitialDraftState().responses
  );
  const [currentIndex, setCurrentIndex] = useState<number>(() =>
    Platform.OS === 'web' ? 0 : getInitialDraftState().currentIndex
  );

  const persistDraft = useCallback(
    (updatedResponses: number[], nextIndex: number) => {
      if (Platform.OS !== 'web') {
        saveDraft(updatedResponses, nextIndex);
      }
    },
    []
  );

  function handleSelect(value: number) {
    const updated = [...responses];
    updated[currentIndex] = value;
    setResponses(updated);

    if (currentIndex === TOTAL - 1) {
      // All 12 answered — score and save
      const score = scoreCREST(updated);
      if (Platform.OS !== 'web') {
        const assessment = buildAndSaveAssessment(updated, score, true, 0);
        clearDraft();
        updatePreferences({ lastCRESTDate: assessment.date });
        router.replace({
          pathname: '/onboarding/crest-result',
          params: { assessmentId: assessment.id },
        });
      } else {
        // Web: skip DB, pass all score data via params
        router.replace({
          pathname: '/onboarding/crest-result',
          params: {
            totalScore: String(score.totalScore),
            severity: score.severity,
            domainsJson: JSON.stringify(score.domains),
          },
        });
      }
    } else {
      persistDraft(updated, currentIndex + 1);
      setCurrentIndex(currentIndex + 1);
    }
  }

  function handleBack() {
    persistDraft(responses, currentIndex - 1);
    setCurrentIndex(currentIndex - 1);
  }

  const question = CREST_QUESTIONS[currentIndex];
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === TOTAL - 1;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          {!isFirst ? (
            <Pressable
              onPress={handleBack}
              style={styles.backButton}
              accessibilityRole="button"
              accessibilityLabel="Previous question"
            >
              <Text style={styles.backLabel}>← Back</Text>
            </Pressable>
          ) : (
            <View style={styles.backPlaceholder} />
          )}
          <Text style={styles.counter}>
            {currentIndex + 1} of {TOTAL}
          </Text>
        </View>
        <ProgressBar current={currentIndex} total={TOTAL} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <DomainBadge label={DOMAIN_LABELS[question.domain]} />

        <Text style={styles.questionText}>{question.text}</Text>

        <ResponseScale
          value={responses[currentIndex]}
          onChange={handleSelect}
          questionText={question.text}
        />
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerHint}>
          {isLast ? 'Selecting an option submits your assessment' : 'Select an option to continue'}
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
    safe: {
      flex: 1,
      backgroundColor: colors.background,
    },

    // Header
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
    backButton: {
      paddingVertical: Spacing.xs,
      paddingRight: Spacing.sm,
    },
    backLabel: {
      ...typography.body,
      color: colors.deepTide,
    },
    backPlaceholder: {
      width: 60,
    },
    counter: {
      ...typography.caption,
      color: colors.textSecondary,
    },

    // Content
    content: {
      flex: 1,
      paddingHorizontal: Spacing.xl,
      paddingTop: Spacing.xl,
      gap: Spacing.xl,
    },
    questionText: {
      ...typography.heading1,
      color: colors.textPrimary,
      lineHeight: 30,
    },

    // Footer
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
