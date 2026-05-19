import { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  SafeAreaView,
  Platform,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { router } from 'expo-router';
import { TFI_QUESTIONS } from '@/src/data/tfiQuestions';
import { scoreTFI } from '@/src/utils/tfiScoring';
import { getInitialDraftState, saveDraft, clearDraft, buildAndSaveAssessment } from '@/src/storage/tfi';
import { usePreferences } from '@/src/context/PreferencesContext';
import { Colors, Typography, Spacing, Radius, Border } from '@/src/theme';

const TOTAL = TFI_QUESTIONS.length; // 25

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = ((current + 1) / total) * 100;
  return (
    <View style={progress.track}>
      <View style={[progress.fill, { width: `${pct}%` }]} />
    </View>
  );
}

const progress = StyleSheet.create({
  track: {
    height: 3,
    backgroundColor: Colors.midGray + '30',
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: Colors.calmWave,
    borderRadius: 2,
  },
});

// ─── Subscale badge ───────────────────────────────────────────────────────────

function SubscaleBadge({ label }: { label: string }) {
  return (
    <View style={badge.container}>
      <Text style={badge.text}>{label}</Text>
    </View>
  );
}

const badge = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.tealLight,
    borderRadius: Radius.chip,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  text: {
    ...Typography.micro,
    color: Colors.deepTide,
  },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function TFIQuestionnaireScreen() {
  const { updatePreferences } = usePreferences();

  const [responses, setResponses] = useState<number[]>(() =>
    Platform.OS === 'web' ? Array(25).fill(5) : getInitialDraftState().responses
  );
  const [currentIndex, setCurrentIndex] = useState<number>(() =>
    Platform.OS === 'web' ? 0 : getInitialDraftState().currentIndex
  );
  const [sliderValue, setSliderValue] = useState<number>(5);

  // Sync slider to the current question's saved response whenever index changes
  useEffect(() => {
    setSliderValue(responses[currentIndex]);
  }, [currentIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  const persistDraft = useCallback(
    (updatedResponses: number[], nextIndex: number) => {
      if (Platform.OS !== 'web') {
        saveDraft(updatedResponses, nextIndex);
      }
    },
    []
  );

  function commitCurrentResponse(): number[] {
    const updated = [...responses];
    updated[currentIndex] = sliderValue;
    setResponses(updated);
    return updated;
  }

  function handleNext() {
    const updated = commitCurrentResponse();

    if (currentIndex === TOTAL - 1) {
      // All 25 answered — score and save
      const score = scoreTFI(updated);
      if (Platform.OS !== 'web') {
        const assessment = buildAndSaveAssessment(updated, score, true, 0);
        clearDraft();
        updatePreferences({ lastTFIDate: assessment.date });
        router.replace({
          pathname: '/onboarding/tfi-result',
          params: { assessmentId: assessment.id },
        });
      } else {
        // Web: skip DB, pass all score data via params
        router.replace({
          pathname: '/onboarding/tfi-result',
          params: {
            totalScore: String(score.totalScore),
            grade: score.grade,
            subscalesJson: JSON.stringify(score.subscales),
          },
        });
      }
    } else {
      persistDraft(updated, currentIndex + 1);
      setCurrentIndex(currentIndex + 1);
    }
  }

  function handleBack() {
    const updated = commitCurrentResponse();
    persistDraft(updated, currentIndex - 1);
    setCurrentIndex(currentIndex - 1);
  }

  const question = TFI_QUESTIONS[currentIndex];
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
        <SubscaleBadge label={question.subscale} />

        <Text style={styles.questionText}>{question.text}</Text>

        {/* Current value display */}
        <View style={styles.valueDisplay}>
          <Text style={styles.valueNumber}>{sliderValue}</Text>
          <Text style={styles.valueMax}> / 10</Text>
        </View>

        {/* Slider */}
        <View style={styles.sliderContainer}>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={10}
            step={1}
            value={sliderValue}
            onValueChange={(val) => setSliderValue(Math.round(val))}
            minimumTrackTintColor={Colors.calmWave}
            maximumTrackTintColor={Colors.midGray + '40'}
            thumbTintColor={Colors.deepTide}
            accessibilityLabel={question.text}
          />
          {/* Anchor labels */}
          <View style={styles.anchors}>
            <Text style={styles.anchorText}>{question.anchorLow}</Text>
            <Text style={styles.anchorText}>{question.anchorHigh}</Text>
          </View>
        </View>

        {/* Tick marks 0–10 */}
        <View style={styles.ticks}>
          {Array.from({ length: 11 }, (_, i) => (
            <Text
              key={i}
              style={[styles.tick, i === sliderValue && styles.tickActive]}
            >
              {i}
            </Text>
          ))}
        </View>

        {/* Q1 and Q2 zero note */}
        {question.excludeZero && sliderValue === 0 && (
          <View style={styles.zeroNote}>
            <Text style={styles.zeroNoteText}>
              Selecting 0 means tinnitus had no impact this week — this response
              is noted separately in your score.
            </Text>
          </View>
        )}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [
            styles.nextButton,
            pressed && styles.nextButtonPressed,
          ]}
          onPress={handleNext}
          accessibilityRole="button"
          accessibilityLabel={isLast ? 'Submit assessment' : 'Next question'}
        >
          <Text style={styles.nextLabel}>
            {isLast ? 'Submit' : 'Next →'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.warmSand,
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
    ...Typography.body,
    color: Colors.deepTide,
  },
  backPlaceholder: {
    width: 60,
  },
  counter: {
    ...Typography.caption,
    color: Colors.midGray,
  },

  // Content
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    gap: Spacing.xl,
  },
  questionText: {
    ...Typography.heading1,
    color: Colors.darkText,
    lineHeight: 30,
  },

  // Value display
  valueDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
  },
  valueNumber: {
    fontSize: 52,
    fontWeight: '400',
    color: Colors.deepTide,
    lineHeight: 60,
  },
  valueMax: {
    ...Typography.heading1,
    color: Colors.midGray,
  },

  // Slider
  sliderContainer: {
    gap: Spacing.xs,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  anchors: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xs,
  },
  anchorText: {
    ...Typography.caption,
    color: Colors.midGray,
    maxWidth: '45%',
  },

  // Tick marks
  ticks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xs,
  },
  tick: {
    ...Typography.caption,
    color: Colors.midGray + '80',
    textAlign: 'center',
    minWidth: 16,
  },
  tickActive: {
    color: Colors.deepTide,
    fontWeight: '500',
  },

  // Q1/Q2 zero note
  zeroNote: {
    backgroundColor: Colors.tealLight,
    borderRadius: Radius.chip,
    padding: Spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.calmWave,
  },
  zeroNoteText: {
    ...Typography.caption,
    color: Colors.deepTide,
    lineHeight: 18,
  },

  // Footer
  footer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
    paddingTop: Spacing.md,
    borderTopWidth: Border.width,
    borderTopColor: Colors.midGray + '20',
  },
  nextButton: {
    backgroundColor: Colors.deepTide,
    borderRadius: Radius.chip,
    paddingVertical: Spacing.base,
    alignItems: 'center',
  },
  nextButtonPressed: {
    opacity: 0.85,
  },
  nextLabel: {
    ...Typography.heading2,
    color: Colors.white,
  },
});
