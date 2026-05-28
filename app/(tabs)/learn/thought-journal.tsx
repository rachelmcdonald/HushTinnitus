import { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getDb } from '@/src/storage/database';
import { usePreferences } from '@/src/context/PreferencesContext';
import UpgradeModal from '@/src/components/UpgradeModal';
import { Colors, Spacing, Radius, Border } from '@/src/theme';
import { useTheme } from '@/src/context/ThemeContext';

// ─── Constants ────────────────────────────────────────────────────────────────

const TOTAL_STEPS = 6;

const EMOTIONS = [
  'Anxious',
  'Frustrated',
  'Sad',
  'Hopeless',
  'Angry',
  'Overwhelmed',
] as const;

type Emotion = typeof EMOTIONS[number];

// ─── Storage ──────────────────────────────────────────────────────────────────

function saveEntry(entry: {
  originalThought: string;
  emotion: string;
  evidenceFor: string;
  friendPerspective: string;
  balancedView: string;
  reframedThought: string;
}): void {
  if (Platform.OS === 'web') return;
  try {
    const id = `tj_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();
    getDb().runSync(
      `INSERT INTO thought_journal
         (id, date, originalThought, emotion, evidenceFor, friendPerspective,
          balancedView, reframedThought, completedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        now,
        entry.originalThought,
        entry.emotion,
        entry.evidenceFor,
        entry.friendPerspective,
        entry.balancedView,
        entry.reframedThought,
        now,
      ]
    );
  } catch {}
}

// ─── Premium gate ─────────────────────────────────────────────────────────────
// The gate screen uses Colors.goldLight as its background — this is an
// intentional brand design that doesn't respond to dark mode. Only typography
// is dynamic; all color values stay hardcoded to preserve contrast on gold.

function PremiumGate({ onBack }: { onBack: () => void }) {
  const { typography } = useTheme();
  const gate = useMemo(() => makeGateStyles(typography), [typography]);
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <SafeAreaView style={gate.safe}>
      <ScrollView contentContainerStyle={gate.scroll} showsVerticalScrollIndicator={false}>
        {/* Back */}
        <Pressable
          style={({ pressed }) => [gate.backBtn, pressed && gate.backBtnPressed]}
          onPress={onBack}
          accessibilityRole="button"
        >
          <Text style={gate.backLabel}>← Learn</Text>
        </Pressable>

        {/* Premium badge + header */}
        <View style={gate.header}>
          <View style={gate.badge}>
            <Text style={gate.badgeText}>Premium feature</Text>
          </View>
          <Text style={gate.title}>CBT Thought Journal</Text>
          <Text style={gate.subtitle}>
            A guided cognitive reframe to help you examine and shift distressing
            thoughts about tinnitus — a structured technique used in evidence-based
            tinnitus management.
          </Text>
        </View>

        {/* Preview (dimmed) */}
        <View style={gate.previewWrapper}>
          <View style={gate.previewOverlay}>
            <View style={gate.lockPill}>
              <Text style={gate.lockText}>🔒  Unlock to access</Text>
            </View>
          </View>
          {/* Mockup of Step 1 */}
          <View style={gate.preview} pointerEvents="none">
            <Text style={gate.previewStepLabel}>Step 1 of 6</Text>
            <Text style={gate.previewHeading}>What's on your mind?</Text>
            <Text style={gate.previewHint}>
              Describe a thought about tinnitus that is causing you distress.
            </Text>
            <View style={gate.previewInput}>
              <Text style={gate.previewPlaceholder}>e.g. "The sound will never get better…"</Text>
            </View>
          </View>
        </View>

        {/* What's included */}
        <View style={gate.featureList}>
          {[
            'Log distressing thoughts and track patterns over time',
            'Guided CBT reframe with research-backed prompts',
            'Compare your original and reframed thoughts side by side',
            'Entries saved privately on your device',
          ].map((f) => (
            <View key={f} style={gate.featureRow}>
              <View style={gate.featureDot} />
              <Text style={gate.featureText}>{f}</Text>
            </View>
          ))}
        </View>

        {/* Citation */}
        <View style={gate.citation}>
          <Text style={gate.citationLabel}>Evidence basis</Text>
          <Text style={gate.citationText}>
            Henry JL, Wilson PH (2001).{' '}
            <Text style={gate.citationItalic}>
              The Psychological Management of Chronic Tinnitus.
            </Text>{' '}
            Allyn & Bacon.
          </Text>
          <Text style={gate.citationNote}>
            Cognitive behavioural approaches, including structured thought
            journalling, form a core component of evidence-informed psychological
            management of tinnitus.
          </Text>
        </View>

        {/* Unlock button */}
        <Pressable
          style={({ pressed }) => [gate.unlockBtn, pressed && gate.unlockBtnPressed]}
          onPress={() => setModalVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Unlock Premium to access the thought journal"
        >
          <Text style={gate.unlockLabel}>Unlock Premium</Text>
        </Pressable>
      </ScrollView>

      <UpgradeModal visible={modalVisible} onClose={() => setModalVisible(false)} />
    </SafeAreaView>
  );
}

function makeGateStyles(typography: ReturnType<typeof useTheme>['typography']) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: Colors.goldLight },
    scroll: {
      flexGrow: 1,
      paddingHorizontal: Spacing.xl,
      paddingTop: Spacing.md,
      paddingBottom: Spacing.xl,
      gap: Spacing.xl,
    },
    backBtn: { alignSelf: 'flex-start', paddingVertical: Spacing.sm },
    backBtnPressed: { opacity: 0.6 },
    backLabel: { ...typography.body, color: Colors.softGold },
    header: { gap: Spacing.md },
    badge: {
      alignSelf: 'flex-start',
      backgroundColor: Colors.softGold,
      borderRadius: Radius.chip,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs,
    },
    badgeText: { ...typography.micro, color: Colors.white },
    title: { ...typography.display, color: Colors.darkText },
    subtitle: { ...typography.body, color: Colors.midGray, lineHeight: 24 },
    // Preview
    previewWrapper: { position: 'relative', borderRadius: Radius.card, overflow: 'hidden' },
    previewOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: Colors.goldLight + 'CC',
      zIndex: 2,
      justifyContent: 'center',
      alignItems: 'center',
    },
    lockPill: {
      backgroundColor: Colors.warmSand,
      borderRadius: Radius.chip,
      paddingHorizontal: Spacing.base,
      paddingVertical: Spacing.sm,
      borderWidth: 1,
      borderColor: Colors.softGold,
    },
    lockText: { ...typography.heading2, color: Colors.softGold },
    preview: {
      backgroundColor: Colors.warmSand,
      borderRadius: Radius.card,
      padding: Spacing.base,
      gap: Spacing.sm,
      opacity: 0.45,
    },
    previewStepLabel: { ...typography.micro, color: Colors.midGray },
    previewHeading: { ...typography.heading1, color: Colors.darkText },
    previewHint: { ...typography.body, color: Colors.midGray },
    previewInput: {
      borderWidth: 1.5,
      borderColor: Colors.midGray + '40',
      borderRadius: Radius.chip,
      padding: Spacing.md,
      minHeight: 80,
      backgroundColor: Colors.warmSand,
    },
    previewPlaceholder: { ...typography.body, color: Colors.midGray },
    // Features
    featureList: {
      backgroundColor: Colors.warmSand,
      borderRadius: Radius.card,
      padding: Spacing.base,
      gap: Spacing.sm,
      borderWidth: 1,
      borderColor: Colors.softGold + '50',
    },
    featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
    featureDot: {
      width: 6, height: 6, borderRadius: 3,
      backgroundColor: Colors.softGold,
      marginTop: 8,
    },
    featureText: { ...typography.body, color: Colors.darkText, flex: 1 },
    // Citation
    citation: {
      backgroundColor: Colors.warmSand,
      borderRadius: Radius.card,
      padding: Spacing.base,
      gap: Spacing.sm,
      borderLeftWidth: 3,
      borderLeftColor: Colors.softGold,
    },
    citationLabel: { ...typography.micro, color: Colors.softGold },
    citationText: { ...typography.caption, color: Colors.darkText, lineHeight: 20 },
    citationItalic: { fontStyle: 'italic' },
    citationNote: { ...typography.caption, color: Colors.midGray, lineHeight: 18 },
    // Unlock button
    unlockBtn: {
      backgroundColor: Colors.softGold,
      borderRadius: Radius.chip,
      paddingVertical: Spacing.base,
      alignItems: 'center',
    },
    unlockBtnPressed: { opacity: 0.85 },
    unlockLabel: { ...typography.heading2, color: Colors.white },
  });
}

// ─── Journal flow ─────────────────────────────────────────────────────────────

function ProgressBar({ step }: { step: number }) {
  const { colors, typography } = useTheme();
  const flow = useMemo(() => makeFlowStyles(colors, typography), [colors, typography]);
  return (
    <View style={flow.progressRow}>
      <Text style={flow.stepLabel}>Step {step} of {TOTAL_STEPS}</Text>
      <View style={flow.track}>
        <View style={[flow.fill, { width: `${(step / TOTAL_STEPS) * 100}%` as any }]} />
      </View>
    </View>
  );
}

function StepHeading({ heading, hint }: { heading: string; hint?: string }) {
  const { colors, typography } = useTheme();
  const flow = useMemo(() => makeFlowStyles(colors, typography), [colors, typography]);
  return (
    <View style={flow.stepHeader}>
      <Text style={flow.heading}>{heading}</Text>
      {hint && <Text style={flow.hint}>{hint}</Text>}
    </View>
  );
}

function PromptInput({
  value,
  onChangeText,
  placeholder,
  minHeight = 100,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  minHeight?: number;
}) {
  const { colors, typography } = useTheme();
  const flow = useMemo(() => makeFlowStyles(colors, typography), [colors, typography]);
  return (
    <TextInput
      style={[flow.input, { minHeight }]}
      multiline
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.textSecondary + '90'}
      textAlignVertical="top"
      accessibilityLabel={placeholder}
    />
  );
}

function JournalFlow({ onBack }: { onBack: () => void }) {
  const { colors, typography } = useTheme();
  const flow = useMemo(() => makeFlowStyles(colors, typography), [colors, typography]);

  const [step, setStep] = useState(1);
  const [done, setDone] = useState(false);

  // Step state
  const [originalThought, setOriginalThought] = useState('');
  const [emotion, setEmotion] = useState<Emotion | null>(null);
  const [evidenceFor, setEvidenceFor] = useState('');
  const [friendPerspective, setFriendPerspective] = useState('');
  const [balancedView, setBalancedView] = useState('');
  const [reframedThought, setReframedThought] = useState('');

  function canAdvance(): boolean {
    if (step === 1) return originalThought.trim().length > 0;
    if (step === 2) return emotion !== null;
    return true; // CBT prompt steps and reframe step allow empty (user may not want to write)
  }

  function handleNext() {
    if (step < TOTAL_STEPS) {
      setStep(step + 1);
    } else {
      // Step 6 → save and show completion
      saveEntry({ originalThought, emotion: emotion!, evidenceFor, friendPerspective, balancedView, reframedThought });
      setDone(true);
    }
  }

  // Completion view
  if (done) {
    return (
      <SafeAreaView style={flow.safe}>
        <ScrollView contentContainerStyle={flow.scroll} showsVerticalScrollIndicator={false}>
          <View style={flow.completionHeader}>
            <View style={flow.completionBadge}>
              <Text style={flow.completionBadgeText}>Entry saved</Text>
            </View>
            <Text style={flow.completionTitle}>Journal entry complete</Text>
            <Text style={flow.completionSubtitle}>
              Here's what you explored in this session.
            </Text>
          </View>

          {/* Side-by-side comparison */}
          <View style={flow.comparison}>
            <View style={flow.compBox}>
              <Text style={flow.compLabel}>You thought</Text>
              <Text style={flow.compText}>{originalThought}</Text>
              <View style={[flow.compTag, { backgroundColor: Colors.coralLight }]}>
                <Text style={[flow.compTagText, { color: Colors.warmCoral }]}>{emotion}</Text>
              </View>
            </View>
            <View style={flow.compArrow}>
              <Text style={flow.compArrowText}>→</Text>
            </View>
            <View style={[flow.compBox, flow.compBoxReframe]}>
              <Text style={[flow.compLabel, { color: Colors.deepTide }]}>A more balanced view</Text>
              <Text style={flow.compText}>
                {reframedThought.trim() || 'No reframed thought written.'}
              </Text>
            </View>
          </View>

          {/* Citation */}
          <View style={flow.citation}>
            <Text style={flow.citationLabel}>Evidence basis</Text>
            <Text style={flow.citationText}>
              Henry JL, Wilson PH (2001).{' '}
              <Text style={flow.citationItalic}>
                The Psychological Management of Chronic Tinnitus.
              </Text>{' '}
              Allyn & Bacon.
            </Text>
            <Text style={flow.citationNote}>
              Structured thought journalling and cognitive reframing are core
              techniques in evidence-informed psychological approaches to managing
              the impact of tinnitus on daily life.
            </Text>
          </View>

          <Pressable
            style={({ pressed }) => [flow.primaryBtn, pressed && flow.primaryBtnPressed]}
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Done"
          >
            <Text style={flow.primaryBtnLabel}>Done</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Step content
  function renderStepContent() {
    switch (step) {
      case 1:
        return (
          <>
            <StepHeading
              heading="What's on your mind?"
              hint="Describe a thought about tinnitus that is causing you distress. Write it as it appears — there's no need to filter it here."
            />
            <PromptInput
              value={originalThought}
              onChangeText={setOriginalThought}
              placeholder={'e.g. "The sound will never get any better…"'}
              minHeight={120}
            />
          </>
        );

      case 2:
        return (
          <>
            <StepHeading
              heading="What emotion does this bring up?"
              hint="Tap the one that feels closest to what you're experiencing right now."
            />
            <View style={flow.emotionGrid}>
              {EMOTIONS.map((e) => (
                <Pressable
                  key={e}
                  style={[flow.emotionTile, emotion === e && flow.emotionTileSelected]}
                  onPress={() => setEmotion(e)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: emotion === e }}
                  accessibilityLabel={e}
                >
                  <Text style={[flow.emotionLabel, emotion === e && flow.emotionLabelSelected]}>
                    {e}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        );

      case 3:
        return (
          <>
            <StepHeading
              heading="What evidence supports this thought?"
              hint="Try to think of specific things that feel like proof the thought is true. Be honest — if it feels true, something is probably supporting it."
            />
            <PromptInput
              value={evidenceFor}
              onChangeText={setEvidenceFor}
              placeholder="What makes this thought feel true to you?"
            />
          </>
        );

      case 4:
        return (
          <>
            <StepHeading
              heading="What would you say to a friend?"
              hint="Imagine a close friend came to you with exactly this thought. What would you say to them? It's often easier to be kinder to others than to ourselves."
            />
            <PromptInput
              value={friendPerspective}
              onChangeText={setFriendPerspective}
              placeholder="What advice or perspective would you offer a friend in this situation?"
            />
          </>
        );

      case 5:
        return (
          <>
            <StepHeading
              heading="What is a more balanced way to see this?"
              hint="This doesn't have to be positive or dismissive — just more complete. Is there another way of looking at the situation that also holds some truth?"
            />
            <PromptInput
              value={balancedView}
              onChangeText={setBalancedView}
              placeholder="A more complete or balanced perspective might be…"
            />
          </>
        );

      case 6:
        return (
          <>
            <StepHeading
              heading="Your reframed thought"
              hint="Using everything you've explored, write a more balanced version of your original thought. It can be brief — a single sentence is enough."
            />
            <View style={flow.originalReminder}>
              <Text style={flow.originalReminderLabel}>Your original thought</Text>
              <Text style={flow.originalReminderText}>{originalThought}</Text>
            </View>
            <PromptInput
              value={reframedThought}
              onChangeText={setReframedThought}
              placeholder="A more balanced way to look at this might be…"
            />
          </>
        );

      default:
        return null;
    }
  }

  return (
    <SafeAreaView style={flow.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Header with back + progress */}
        <View style={flow.topBar}>
          <Pressable
            style={({ pressed }) => [flow.backBtn, pressed && flow.backBtnPressed]}
            onPress={() => (step > 1 ? setStep(step - 1) : onBack())}
            accessibilityRole="button"
            accessibilityLabel={step > 1 ? 'Previous step' : 'Back to Learn'}
          >
            <Text style={flow.backLabel}>{step > 1 ? '← Back' : '← Learn'}</Text>
          </Pressable>
          <ProgressBar step={step} />
        </View>

        {/* Step content */}
        <ScrollView
          contentContainerStyle={flow.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {renderStepContent()}
        </ScrollView>

        {/* Fixed footer with Next/Complete */}
        <View style={flow.footer}>
          <Pressable
            style={({ pressed }) => [
              flow.primaryBtn,
              !canAdvance() && flow.primaryBtnDisabled,
              pressed && canAdvance() && flow.primaryBtnPressed,
            ]}
            onPress={handleNext}
            disabled={!canAdvance()}
            accessibilityRole="button"
            accessibilityLabel={step === TOTAL_STEPS ? 'Complete and save' : 'Next step'}
            accessibilityState={{ disabled: !canAdvance() }}
          >
            <Text
              style={[
                flow.primaryBtnLabel,
                !canAdvance() && flow.primaryBtnLabelDisabled,
              ]}
            >
              {step === TOTAL_STEPS ? 'Save entry' : 'Next →'}
            </Text>
          </Pressable>
          {[3, 4, 5, 6].includes(step) && (
            <Text style={flow.skipHint}>
              You can leave any step blank and continue.
            </Text>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeFlowStyles(
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
    topBar: {
      paddingHorizontal: Spacing.xl,
      paddingTop: Spacing.md,
      paddingBottom: Spacing.sm,
      gap: Spacing.sm,
      borderBottomWidth: Border.width,
      borderBottomColor: Colors.calmWave + '33',
    },
    backBtn: { alignSelf: 'flex-start' },
    backBtnPressed: { opacity: 0.6 },
    backLabel: { ...typography.body, color: Colors.deepTide },
    progressRow: { gap: Spacing.xs },
    stepLabel: { ...typography.micro, color: colors.textSecondary },
    track: {
      height: 3,
      backgroundColor: colors.textSecondary + '25',
      borderRadius: 2,
      overflow: 'hidden',
    },
    fill: { height: '100%', backgroundColor: Colors.calmWave, borderRadius: 2 },
    stepHeader: { gap: Spacing.sm },
    heading: { ...typography.heading1, color: colors.textPrimary },
    hint: { ...typography.body, color: colors.textSecondary, lineHeight: 24 },
    input: {
      borderWidth: 1.5,
      borderColor: colors.textSecondary + '40',
      borderRadius: Radius.card,
      padding: Spacing.md,
      backgroundColor: colors.surfaceVariant,
      ...typography.body,
      color: colors.textPrimary,
      lineHeight: 24,
      textAlignVertical: 'top',
    },
    // Emotion grid — 2 columns
    emotionGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.sm,
    },
    emotionTile: {
      width: '47.5%',
      backgroundColor: colors.surface,
      borderRadius: Radius.card,
      paddingVertical: Spacing.base,
      paddingHorizontal: Spacing.md,
      alignItems: 'center',
      borderWidth: Border.width * 2,
      borderColor: colors.textSecondary + '40',
    },
    emotionTileSelected: {
      backgroundColor: Colors.deepTide,
      borderColor: Colors.deepTide,
    },
    emotionLabel: { ...typography.heading2, color: colors.textSecondary },
    emotionLabelSelected: { color: Colors.white },
    // Original thought reminder (shown on Step 6)
    originalReminder: {
      backgroundColor: colors.surfaceVariant,
      borderRadius: Radius.card,
      padding: Spacing.md,
      gap: Spacing.xs,
      borderLeftWidth: 3,
      borderLeftColor: Colors.calmWave,
    },
    originalReminderLabel: { ...typography.micro, color: Colors.deepTide },
    originalReminderText: { ...typography.body, color: colors.textPrimary, lineHeight: 24 },
    // Footer
    footer: {
      paddingHorizontal: Spacing.xl,
      paddingBottom: Spacing.xl,
      paddingTop: Spacing.md,
      gap: Spacing.sm,
      borderTopWidth: Border.width,
      borderTopColor: Colors.calmWave + '33',
      backgroundColor: colors.background,
    },
    primaryBtn: {
      backgroundColor: Colors.deepTide,
      borderRadius: Radius.chip,
      paddingVertical: Spacing.base,
      alignItems: 'center',
    },
    primaryBtnDisabled: { backgroundColor: colors.textSecondary + '40' },
    primaryBtnPressed: { opacity: 0.85 },
    primaryBtnLabel: { ...typography.heading2, color: Colors.white },
    primaryBtnLabelDisabled: { color: colors.textSecondary },
    skipHint: {
      ...typography.caption,
      color: colors.textSecondary,
      textAlign: 'center',
      fontStyle: 'italic',
    },
    // Completion screen
    completionHeader: { gap: Spacing.md, alignItems: 'flex-start' },
    completionBadge: {
      backgroundColor: colors.surfaceVariant,
      borderRadius: Radius.chip,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs,
    },
    completionBadgeText: { ...typography.micro, color: Colors.deepTide },
    completionTitle: { ...typography.display, color: colors.textPrimary },
    completionSubtitle: { ...typography.body, color: colors.textSecondary },
    // Comparison boxes
    comparison: { gap: Spacing.sm },
    compBox: {
      backgroundColor: colors.surface,
      borderRadius: Radius.card,
      padding: Spacing.base,
      gap: Spacing.sm,
      borderWidth: Border.width,
      borderColor: Colors.calmWave + '33',
    },
    compBoxReframe: {
      borderColor: Colors.calmWave + '60',
      backgroundColor: colors.surfaceVariant,
    },
    compLabel: { ...typography.micro, color: colors.textSecondary },
    compText: { ...typography.body, color: colors.textPrimary, lineHeight: 24 },
    compTag: { alignSelf: 'flex-start', borderRadius: 4, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
    compTagText: { ...typography.micro },
    compArrow: { alignItems: 'center' },
    compArrowText: { fontSize: 20, color: Colors.calmWave },
    // Citation on completion screen
    citation: {
      backgroundColor: colors.surfaceVariant,
      borderRadius: Radius.card,
      padding: Spacing.base,
      gap: Spacing.sm,
      borderLeftWidth: 3,
      borderLeftColor: Colors.calmWave,
    },
    citationLabel: { ...typography.micro, color: Colors.deepTide },
    citationText: { ...typography.caption, color: colors.textPrimary, lineHeight: 20 },
    citationItalic: { fontStyle: 'italic' },
    citationNote: { ...typography.caption, color: colors.textSecondary, lineHeight: 18 },
  });
}

// ─── Root screen ──────────────────────────────────────────────────────────────

export default function ThoughtJournalScreen() {
  const { preferences } = usePreferences();
  const isPremium = preferences?.isPremium ?? false;

  const handleBack = () => router.back();

  if (!isPremium) {
    return <PremiumGate onBack={handleBack} />;
  }

  return <JournalFlow onBack={handleBack} />;
}
