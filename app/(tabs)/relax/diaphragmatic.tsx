import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView, Platform } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { Colors, Spacing, Radius, Border } from '@/src/theme';
import { saveSoundSession, createSessionId } from '@/src/storage/soundSessions';
import { usePreferences } from '@/src/context/PreferencesContext';
import UpgradeModal from '@/src/components/UpgradeModal';
import { useTheme } from '@/src/context/ThemeContext';

// ─── Timing ───────────────────────────────────────────────────────────────────

const INHALE_DURATION = 4000; // 4s
const EXHALE_DURATION = 6000; // 6s
const INHALE_SECONDS  = 4;
const EXHALE_SECONDS  = 6;

// Belly oval animation (practice mode)
const BELLY_SCALE_MIN = 0.78;
const BELLY_SCALE_MAX = 1.0;

// ─── Session helper ───────────────────────────────────────────────────────────

function saveSession(durationSeconds: number) {
  if (Platform.OS === 'web' || durationSeconds < 5) return;
  try {
    saveSoundSession({
      id: createSessionId(),
      date: new Date().toISOString(),
      sounds: ['breathing-diaphragmatic'],
      durationSeconds,
      timerMinutes: 0,
      volume: 1,
      balance: 0,
      notchedFrequency: null,
    });
  } catch {}
}

// ─── Animated belly diagram (instruction mode) ────────────────────────────────
//
// A simple side-view torso outline using React Native shapes:
//  - Two rounded ovals: one for chest (top, moves less), one for belly (bottom,
//    moves more on inhale). No image files.

function BellyDiagram({ isAnimating }: { isAnimating: boolean }) {
  const { colors, typography } = useTheme();
  const diag = useMemo(() => makeDiagStyles(colors, typography), [colors, typography]);

  const bellyScale = useSharedValue(BELLY_SCALE_MIN);
  const chestScale = useSharedValue(0.96);

  useEffect(() => {
    if (isAnimating) {
      // Belly: fuller animation (min → max)
      bellyScale.value = withRepeat(
        withSequence(
          withTiming(BELLY_SCALE_MAX, { duration: INHALE_DURATION, easing: Easing.inOut(Easing.ease) }),
          withTiming(BELLY_SCALE_MIN, { duration: EXHALE_DURATION, easing: Easing.inOut(Easing.ease) })
        ),
        -1, // infinite
        false
      );
      // Chest: very subtle movement (much less than belly)
      chestScale.value = withRepeat(
        withSequence(
          withTiming(1.0, { duration: INHALE_DURATION, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.96, { duration: EXHALE_DURATION, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
    } else {
      cancelAnimation(bellyScale);
      cancelAnimation(chestScale);
      bellyScale.value = withTiming(BELLY_SCALE_MIN, { duration: 400 });
      chestScale.value = withTiming(0.96, { duration: 400 });
    }

    return () => {
      cancelAnimation(bellyScale);
      cancelAnimation(chestScale);
    };
  }, [isAnimating]); // eslint-disable-line react-hooks/exhaustive-deps

  const animatedBellyStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: bellyScale.value }, { scaleX: bellyScale.value * 0.9 + 0.1 }],
  }));
  const animatedChestStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: chestScale.value }],
  }));

  return (
    <View style={diag.container}>
      {/* Head / neck indicator */}
      <View style={diag.head} />

      {/* Body */}
      <View style={diag.body}>
        {/* Chest region */}
        <View style={diag.chestRegion}>
          <Animated.View style={[diag.chestOval, animatedChestStyle]} />
          <Text style={diag.bodyLabel}>Chest</Text>
          <Text style={diag.bodyLabelHint}>moves less</Text>
        </View>

        {/* Belly region */}
        <View style={diag.bellyRegion}>
          <Animated.View style={[diag.bellyOval, animatedBellyStyle]} />
          <Text style={[diag.bodyLabel, diag.bodyLabelBelly]}>Belly</Text>
          <Text style={diag.bodyLabelHint}>rises on inhale</Text>
        </View>
      </View>

      {/* Arrow annotation */}
      <View style={diag.arrowRow}>
        <Text style={diag.arrowText}>↑ inhale — belly rises</Text>
        <Text style={diag.arrowText}>↓ exhale — belly falls</Text>
      </View>
    </View>
  );
}

function makeDiagStyles(
  colors: ReturnType<typeof useTheme>['colors'],
  typography: ReturnType<typeof useTheme>['typography'],
) {
  return StyleSheet.create({
    container: {
      alignItems: 'center',
      gap: Spacing.sm,
      backgroundColor: colors.background,
      borderRadius: Radius.card,
      padding: Spacing.base,
    },
    head: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.background,
      borderWidth: 2,
      borderColor: Colors.deepTide + '40',
    },
    body: {
      width: '100%',
      flexDirection: 'row',
      gap: Spacing.sm,
      justifyContent: 'center',
    },
    chestRegion: {
      flex: 1,
      alignItems: 'center',
      gap: 4,
      paddingVertical: Spacing.sm,
    },
    chestOval: {
      width: 80,
      height: 50,
      borderRadius: 40,
      backgroundColor: Colors.midGray + '25',
      borderWidth: 2,
      borderColor: Colors.midGray + '50',
    },
    bellyRegion: {
      flex: 1,
      alignItems: 'center',
      gap: 4,
      paddingVertical: Spacing.sm,
    },
    bellyOval: {
      width: 90,
      height: 60,
      borderRadius: 45,
      backgroundColor: Colors.calmWave + '35',
      borderWidth: 2,
      borderColor: Colors.calmWave,
    },
    bodyLabel: {
      ...typography.caption,
      color: colors.textPrimary,
      fontWeight: '600',
    },
    bodyLabelBelly: { color: Colors.deepTide },
    bodyLabelHint: { ...typography.micro, color: colors.textSecondary, fontSize: 9 },
    arrowRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      width: '100%',
      paddingTop: Spacing.xs,
      borderTopWidth: Border.width,
      borderTopColor: Colors.midGray + '25',
    },
    arrowText: { ...typography.caption, color: Colors.deepTide, fontSize: 11 },
  });
}

// ─── Practice oval (practice mode) ───────────────────────────────────────────

function PracticeOval() {
  const scale = useSharedValue(BELLY_SCALE_MIN);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(BELLY_SCALE_MAX, { duration: INHALE_DURATION, easing: Easing.inOut(Easing.ease) }),
        withTiming(BELLY_SCALE_MIN, { duration: EXHALE_DURATION, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
    return () => cancelAnimation(scale);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={oval.container}>
      <Animated.View style={[oval.glow, animStyle]} />
      <Animated.View style={[oval.main, animStyle]} />
    </View>
  );
}

const oval = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 240,
  },
  glow: {
    position: 'absolute',
    width: 200,
    height: 140,
    borderRadius: 100,
    backgroundColor: Colors.calmWave + '20',
  },
  main: {
    width: 170,
    height: 120,
    borderRadius: 85,
    backgroundColor: Colors.calmWave,
    shadowColor: Colors.calmWave,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 8,
  },
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function DiaphragmaticScreen() {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);

  const { preferences } = usePreferences();
  const isPremium = preferences?.isPremium ?? false;
  const [upgradeVisible, setUpgradeVisible] = useState(false);
  const [mode, setMode] = useState<'instructions' | 'practice'>('instructions');
  const [isRunning, setIsRunning] = useState(false);
  const [phase, setPhase] = useState<'inhale' | 'exhale'>('inhale');
  const [countdown, setCountdown] = useState(0);

  const intervalRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const isRunningRef  = useRef(false);
  const sessionStartRef = useRef<number | null>(null);

  function clearTimers() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  function startCountdown(seconds: number, onDone: () => void) {
    clearTimers();
    setCountdown(seconds);
    let remaining = seconds;
    intervalRef.current = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearTimers();
        if (isRunningRef.current) onDone();
      } else {
        setCountdown(remaining);
      }
    }, 1000);
  }

  const runExhale = useCallback(() => {
    if (!isRunningRef.current) return;
    setPhase('exhale');
    startCountdown(EXHALE_SECONDS, runInhale);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const runInhale = useCallback(() => {
    if (!isRunningRef.current) return;
    setPhase('inhale');
    startCountdown(INHALE_SECONDS, runExhale);
  }, [runExhale]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleStartPractice() {
    setMode('practice');
    isRunningRef.current = true;
    sessionStartRef.current = Date.now();
    setIsRunning(true);
    runInhale();
  }

  function handleStop() {
    isRunningRef.current = false;
    clearTimers();
    setIsRunning(false);
    setPhase('inhale');
    setCountdown(0);
    if (sessionStartRef.current) {
      const elapsed = Math.floor((Date.now() - sessionStartRef.current) / 1000);
      saveSession(elapsed);
      sessionStartRef.current = null;
    }
    setMode('instructions');
  }

  useEffect(() => {
    return () => {
      isRunningRef.current = false;
      clearTimers();
    };
  }, []);

  const PHASE_COPY = {
    inhale: {
      label: 'Breathe in',
      hint: 'Through your nose — feel your belly rise',
    },
    exhale: {
      label: 'Breathe out',
      hint: 'Slowly — feel your belly gently fall',
    },
  };

  // ── Practice mode ──────────────────────────────────────────────────────────
  if (mode === 'practice') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.practiceScreen}>
          {/* Back / stop */}
          <Pressable
            style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
            onPress={handleStop}
            accessibilityRole="button"
            accessibilityLabel="Stop practice and go back"
          >
            <Text style={styles.backLabel}>← Stop practice</Text>
          </Pressable>

          {/* Phase cue */}
          <View style={styles.practiceCue}>
            <Text style={styles.phaseLabel} accessibilityLiveRegion="polite">
              {PHASE_COPY[phase].label}
            </Text>
            <Text style={styles.phaseHint}>{PHASE_COPY[phase].hint}</Text>
            <Text style={styles.countdown} accessibilityLiveRegion="polite">
              {countdown}
            </Text>
          </View>

          {/* Animated oval */}
          <PracticeOval />

          {/* Duration labels */}
          <View style={styles.durationRow}>
            <Text style={styles.durationLabel}>Inhale: 4s</Text>
            <Text style={styles.durationSep}>·</Text>
            <Text style={styles.durationLabel}>Exhale: 6s</Text>
          </View>

          <Pressable
            style={({ pressed }) => [styles.btn, styles.btnStop, pressed && styles.btnPressed]}
            onPress={handleStop}
            accessibilityRole="button"
            accessibilityLabel="Stop session"
          >
            <Text style={styles.btnLabel}>Stop</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ── Instructions mode ──────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back to Relax"
        >
          <Text style={styles.backLabel}>← Relax</Text>
        </Pressable>

        <View style={styles.header}>
          <Text style={styles.title}>Diaphragmatic Breathing</Text>
          <Text style={styles.lead}>
            Most people breathe shallowly into their chest without realising
            it. Diaphragmatic breathing — breathing into your belly — is the
            body's most relaxed and efficient breathing pattern.
          </Text>
        </View>

        {/* Animated instruction diagram */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>How it works</Text>
          <BellyDiagram isAnimating />
          <Text style={styles.diagramCaption}>
            On inhale, the diaphragm contracts downward, pushing the belly
            outward. On exhale, it relaxes and the belly gently falls. The
            diagram is animated to show the difference between chest and belly
            movement.
          </Text>
        </View>

        {/* Instructions */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Before you begin</Text>
          <View style={styles.instructionCard}>
            {[
              'Find a comfortable seated or lying position.',
              'Place one hand on your chest and one on your belly.',
              'Breathe naturally for a moment and notice which hand moves more.',
              'During the practice, aim for your belly hand to rise on the inhale and fall on the exhale, while your chest hand stays relatively still.',
            ].map((step, i) => (
              <View key={i} style={styles.stepRow}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{i + 1}</Text>
                </View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Practice section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Practice session</Text>
          <Text style={styles.practiceDesc}>
            The practice uses a 4-second inhale and 6-second exhale — a gentle
            ratio that supports relaxation without feeling rushed. Breathe
            through your nose if comfortable; exhale through your nose or with
            softly pursed lips.
          </Text>

          {isPremium ? (
            <Pressable
              style={({ pressed }) => [styles.btn, styles.btnStart, pressed && styles.btnPressed]}
              onPress={handleStartPractice}
              accessibilityRole="button"
              accessibilityLabel="Start diaphragmatic breathing practice"
            >
              <Text style={styles.btnLabel}>Start practice</Text>
            </Pressable>
          ) : (
            <Pressable
              style={({ pressed }) => [styles.btn, styles.btnUnlock, pressed && styles.btnPressed]}
              onPress={() => setUpgradeVisible(true)}
              accessibilityRole="button"
              accessibilityLabel="Unlock Premium to start"
            >
              <Text style={styles.btnLabel}>Unlock Premium</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>

      <UpgradeModal visible={upgradeVisible} onClose={() => setUpgradeVisible(false)} />
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
      paddingTop: Spacing.md,
      paddingBottom: Spacing.xl,
      gap: Spacing.xl,
    },
    backBtn: { alignSelf: 'flex-start', paddingVertical: Spacing.sm },
    backBtnPressed: { opacity: 0.6 },
    backLabel: { ...typography.body, color: colors.deepTide },
    header: { gap: Spacing.sm },
    title: { ...typography.display, color: colors.textPrimary },
    lead: { ...typography.body, color: colors.textSecondary, lineHeight: 24 },
    section: { gap: Spacing.md },
    sectionHeading: { ...typography.heading1, color: colors.deepTide },
    diagramCaption: {
      ...typography.caption,
      color: colors.textSecondary,
      lineHeight: 18,
      fontStyle: 'italic',
    },
    // Instruction card
    instructionCard: {
      backgroundColor: colors.surface,
      borderRadius: Radius.card,
      padding: Spacing.base,
      gap: Spacing.md,
    },
    stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
    stepNumber: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: Colors.calmWave,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      marginTop: 1,
    },
    stepNumberText: { ...typography.caption, color: Colors.white, fontWeight: '700' },
    stepText: { ...typography.body, color: colors.textPrimary, flex: 1, lineHeight: 22 },
    // Practice section
    practiceDesc: { ...typography.body, color: colors.textSecondary, lineHeight: 24 },
    // Buttons
    btn: {
      borderRadius: Radius.chip,
      paddingVertical: Spacing.base,
      alignItems: 'center',
    },
    btnStart:  { backgroundColor: Colors.deepTide },
    btnStop:   { backgroundColor: Colors.warmCoral },
    btnUnlock: { backgroundColor: Colors.softGold },
    btnPressed: { opacity: 0.85 },
    btnLabel: { ...typography.heading2, color: Colors.white },

    // ── Practice screen ──
    practiceScreen: {
      flex: 1,
      paddingHorizontal: Spacing.xl,
      paddingTop: Spacing.md,
      paddingBottom: Spacing.xl,
      gap: Spacing.lg,
      justifyContent: 'space-between',
    },
    practiceCue: {
      alignItems: 'center',
      gap: 4,
    },
    phaseLabel: {
      fontSize: 28,
      fontWeight: '400',
      color: Colors.deepTide,
      letterSpacing: -0.5,
    },
    phaseHint: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
    countdown: {
      fontSize: 52,
      fontWeight: '300',
      color: Colors.deepTide,
      lineHeight: 60,
    },
    durationRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: Spacing.sm,
      alignItems: 'center',
    },
    durationLabel: { ...typography.caption, color: colors.textSecondary },
    durationSep: { ...typography.caption, color: colors.textSecondary },
  });
}
