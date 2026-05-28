import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet, Text, View, Pressable, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Slider from '@react-native-community/slider';
import { TFI_QUESTIONS } from '@/src/data/tfiQuestions';
import { scoreTFI } from '@/src/utils/tfiScoring';
import { buildAndSaveAssessment } from '@/src/storage/tfi';
import { usePreferences } from '@/src/context/PreferencesContext';
import { Colors, Spacing, Radius, Border } from '@/src/theme';
import { useTheme } from '@/src/context/ThemeContext';

const TOTAL = TFI_QUESTIONS.length; // 25

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

function SubscaleBadge({ label }: { label: string }) {
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

export default function TFIRetestScreen() {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);

  const params = useLocalSearchParams<{ weekNumber?: string }>();
  const weekNumber = parseInt(params.weekNumber ?? '4', 10) as 4 | 8;
  const { updatePreferences } = usePreferences();

  const [responses, setResponses] = useState<number[]>(() => Array(25).fill(5));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sliderValue, setSliderValue] = useState(5);

  useEffect(() => {
    setSliderValue(responses[currentIndex]);
  }, [currentIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  const commitCurrentResponse = useCallback((): number[] => {
    const updated = [...responses];
    updated[currentIndex] = sliderValue;
    setResponses(updated);
    return updated;
  }, [responses, currentIndex, sliderValue]);

  function handleNext() {
    const updated = commitCurrentResponse();
    if (currentIndex === TOTAL - 1) {
      if (Platform.OS !== 'web') {
        const score = scoreTFI(updated);
        const assessment = buildAndSaveAssessment(updated, score, false, weekNumber);
        const prefPatch: Record<string, unknown> = { lastTFIDate: assessment.date };
        if (weekNumber === 4) prefPatch.week4Prompted = true;
        if (weekNumber === 8) prefPatch.week8Prompted = true;
        updatePreferences(prefPatch as any);
        router.replace({
          pathname: '/progress/tfi-retest-result' as any,
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
      const updated = commitCurrentResponse();
      setResponses(updated);
      setCurrentIndex(currentIndex - 1);
    }
  }

  const question = TFI_QUESTIONS[currentIndex];
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
        <SubscaleBadge label={question.subscale} />

        <Text style={styles.questionText}>{question.text}</Text>

        <View style={styles.valueDisplay}>
          <Text style={styles.valueNumber}>{sliderValue}</Text>
          <Text style={styles.valueMax}> / 10</Text>
        </View>

        <View style={styles.sliderContainer}>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={10}
            step={1}
            value={sliderValue}
            onValueChange={(v) => setSliderValue(Math.round(v))}
            minimumTrackTintColor={Colors.calmWave}
            maximumTrackTintColor={colors.textSecondary + '40'}
            thumbTintColor={Colors.deepTide}
            accessibilityLabel={question.text}
          />
          <View style={styles.anchors}>
            <Text style={styles.anchorText}>{question.anchorLow}</Text>
            <Text style={styles.anchorText}>{question.anchorHigh}</Text>
          </View>
        </View>

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

        {question.excludeZero && sliderValue === 0 && (
          <View style={styles.zeroNote}>
            <Text style={styles.zeroNoteText}>
              Selecting 0 means tinnitus had no impact this week — this response
              is noted separately in your score.
            </Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [styles.nextButton, pressed && styles.nextButtonPressed]}
          onPress={handleNext}
          accessibilityRole="button"
          accessibilityLabel={isLast ? 'Submit retest' : 'Next question'}
        >
          <Text style={styles.nextLabel}>{isLast ? 'Submit' : 'Next →'}</Text>
        </Pressable>
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
    valueMax:        { ...typography.heading1, color: colors.textSecondary },
    sliderContainer: { gap: Spacing.xs },
    slider:          { width: '100%', height: 40 },
    anchors: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.xs,
    },
    anchorText: { ...typography.caption, color: colors.textSecondary, maxWidth: '45%' },
    ticks: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.xs,
    },
    tick: {
      ...typography.caption,
      color: colors.textSecondary + '80',
      textAlign: 'center',
      minWidth: 16,
    },
    tickActive: { color: Colors.deepTide, fontWeight: '500' },
    zeroNote: {
      backgroundColor: colors.surfaceVariant,
      borderRadius: Radius.chip,
      padding: Spacing.md,
      borderLeftWidth: 3,
      borderLeftColor: Colors.calmWave,
    },
    zeroNoteText: { ...typography.caption, color: Colors.deepTide, lineHeight: 18 },
    footer: {
      paddingHorizontal: Spacing.xl,
      paddingBottom: Spacing.xl,
      paddingTop: Spacing.md,
      borderTopWidth: Border.width,
      borderTopColor: colors.textSecondary + '20',
    },
    nextButton: {
      backgroundColor: Colors.deepTide,
      borderRadius: Radius.chip,
      paddingVertical: Spacing.base,
      alignItems: 'center',
    },
    nextButtonPressed: { opacity: 0.85 },
    nextLabel: { ...typography.heading2, color: Colors.white },
  });
}
