import { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Spacing, Radius, Border } from '@/src/theme';
import { useTheme } from '@/src/context/ThemeContext';

type Answer = 'yes' | 'no' | null;

const QUESTIONS = [
  {
    id: 'suddenOnset' as const,
    text: 'Did your tinnitus start suddenly within the last 72 hours?',
  },
  {
    id: 'pulsatile' as const,
    text: 'Does your tinnitus pulse or beat in time with your heartbeat?',
  },
  {
    id: 'unilateral' as const,
    text: 'Do you only hear tinnitus in one ear?',
  },
];

type QuestionId = 'suddenOnset' | 'pulsatile' | 'unilateral';
type Answers = Record<QuestionId, Answer>;

type QuestionCardProps = {
  question: string;
  answer: Answer;
  onAnswer: (answer: Answer) => void;
};

function QuestionCard({ question, answer, onAnswer }: QuestionCardProps) {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);

  return (
    <View style={styles.card}>
      <Text style={styles.questionText}>{question}</Text>
      <View style={styles.toggleRow}>
        <Pressable
          style={[styles.toggleButton, answer === 'yes' && styles.toggleSelected]}
          onPress={() => onAnswer('yes')}
          accessibilityRole="radio"
          accessibilityState={{ selected: answer === 'yes' }}
          accessibilityLabel="Yes"
        >
          <Text
            style={[
              styles.toggleLabel,
              answer === 'yes' && styles.toggleLabelSelected,
            ]}
          >
            Yes
          </Text>
        </Pressable>
        <Pressable
          style={[styles.toggleButton, answer === 'no' && styles.toggleSelected]}
          onPress={() => onAnswer('no')}
          accessibilityRole="radio"
          accessibilityState={{ selected: answer === 'no' }}
          accessibilityLabel="No"
        >
          <Text
            style={[
              styles.toggleLabel,
              answer === 'no' && styles.toggleLabelSelected,
            ]}
          >
            No
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function RedFlagScreen() {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);
  const [answers, setAnswers] = useState<Answers>({
    suddenOnset: null,
    pulsatile: null,
    unilateral: null,
  });

  const allAnswered = QUESTIONS.every((q) => answers[q.id] !== null);
  const anyYes = QUESTIONS.some((q) => answers[q.id] === 'yes');

  function setAnswer(id: QuestionId, value: Answer) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  function handleContinue() {
    if (anyYes) {
      router.push({
        pathname: '/onboarding/urgent-referral',
        params: {
          suddenOnset: answers.suddenOnset === 'yes' ? 'true' : 'false',
          pulsatile: answers.pulsatile === 'yes' ? 'true' : 'false',
          unilateral: answers.unilateral === 'yes' ? 'true' : 'false',
        },
      });
    } else {
      router.push('/onboarding/crest-intro');
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Before we begin</Text>
          <Text style={styles.subtitle}>
            A few quick questions so we can point you to the right support.
            There are no wrong answers.
          </Text>
        </View>

        <View style={styles.questions}>
          {QUESTIONS.map((q) => (
            <QuestionCard
              key={q.id}
              question={q.text}
              answer={answers[q.id]}
              onAnswer={(val) => setAnswer(q.id, val)}
            />
          ))}
        </View>

        <View style={styles.footer}>
          <Pressable
            style={({ pressed }) => [
              styles.continueButton,
              !allAnswered && styles.continueButtonDisabled,
              pressed && allAnswered && styles.continueButtonPressed,
            ]}
            onPress={handleContinue}
            disabled={!allAnswered}
            accessibilityRole="button"
            accessibilityLabel="Continue"
            accessibilityState={{ disabled: !allAnswered }}
          >
            <Text
              style={[
                styles.continueLabel,
                !allAnswered && styles.continueLabelDisabled,
              ]}
            >
              Continue
            </Text>
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
      paddingHorizontal: Spacing.xl,
      paddingTop: Spacing.huge,
      paddingBottom: Spacing.xl,
      gap: Spacing.xxl,
    },

    // Header
    header: {
      gap: Spacing.sm,
    },
    title: {
      ...typography.display,
      color: colors.textPrimary,
    },
    subtitle: {
      ...typography.body,
      color: colors.textSecondary,
    },

    // Question cards
    questions: {
      gap: Spacing.md,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: Radius.card,
      padding: Spacing.base,
      gap: Spacing.md,
    },
    questionText: {
      ...typography.body,
      color: colors.textPrimary,
    },
    toggleRow: {
      flexDirection: 'row',
      gap: Spacing.sm,
    },
    toggleButton: {
      flex: 1,
      paddingVertical: Spacing.sm,
      borderRadius: Radius.chip,
      borderWidth: Border.width * 2,
      borderColor: colors.textSecondary + '60',
      alignItems: 'center',
    },
    toggleSelected: {
      backgroundColor: colors.deepTide,
      borderColor: colors.deepTide,
    },
    toggleLabel: {
      ...typography.heading2,
      color: colors.textSecondary,
    },
    toggleLabelSelected: {
      color: colors.white,
    },

    // Footer
    footer: {
      gap: Spacing.md,
    },
    continueButton: {
      backgroundColor: colors.deepTide,
      borderRadius: Radius.chip,
      paddingVertical: Spacing.base,
      alignItems: 'center',
    },
    continueButtonDisabled: {
      backgroundColor: colors.textSecondary + '40',
    },
    continueButtonPressed: {
      opacity: 0.85,
    },
    continueLabel: {
      ...typography.heading2,
      color: colors.white,
    },
    continueLabelDisabled: {
      color: colors.textSecondary,
    },
  });
}
