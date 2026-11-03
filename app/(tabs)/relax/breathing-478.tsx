import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView, Platform } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { Duration, Colors, Spacing, Radius } from '@/src/theme';
import { useTheme } from '@/src/context/ThemeContext';
import { saveSoundSession, createSessionId } from '@/src/storage/soundSessions';
import BreathingStartModal from '@/src/components/BreathingStartModal';

// ─── Phase definitions ────────────────────────────────────────────────────────

type Phase = 'idle' | 'inhale' | 'hold' | 'exhale';

const PHASES: Record<Exclude<Phase, 'idle'>, { label: string; hint: string; seconds: number; duration: number }> = {
  inhale: {
    label: 'Breathe in',
    hint: 'Slowly through your nose',
    seconds: 4,
    duration: Duration.breathingInhale,
  },
  hold: {
    label: 'Hold',
    hint: 'Keep still, stay relaxed',
    seconds: 7,
    duration: Duration.breathingHold,
  },
  exhale: {
    label: 'Breathe out',
    hint: 'Slowly through your mouth',
    seconds: 8,
    duration: Duration.breathingExhale,
  },
};

const RESTING_SCALE = 0.72;
const EXPANDED_SCALE = 1.18;
const CIRCLE_BASE = 170; // px — base diameter
const STILL_CIRCLE = { transform: [{ scale: RESTING_SCALE }] };

// ─── Session helper ───────────────────────────────────────────────────────────

function saveSession(durationSeconds: number) {
  if (Platform.OS === 'web' || durationSeconds < 5) return;
  try {
    saveSoundSession({
      id: createSessionId(),
      date: new Date().toISOString(),
      sounds: ['breathing-478'],
      durationSeconds,
      timerMinutes: 0,
      volume: 1,
      balance: 0,
      notchedFrequency: null,
    });
  } catch {}
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function Breathing478Screen() {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);

  const [isRunning, setIsRunning] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [countdown, setCountdown] = useState(0);
  const [isLeaving, setIsLeaving] = useState(false);

  const circleScale = useSharedValue(RESTING_SCALE);
  const scrollRef = useRef<ScrollView>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isRunningRef = useRef(false);
  const sessionStartRef = useRef<number | null>(null);

  const animatedCircleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: circleScale.value }],
  }));

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
    circleScale.value = withTiming(RESTING_SCALE, {
      duration: PHASES.exhale.duration,
      easing: Easing.inOut(Easing.ease),
    });
    startCountdown(PHASES.exhale.seconds, () => {
      runInhale();
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const runHold = useCallback(() => {
    if (!isRunningRef.current) return;
    setPhase('hold');
    startCountdown(PHASES.hold.seconds, runExhale);
  }, [runExhale]); // eslint-disable-line react-hooks/exhaustive-deps

  const runInhale = useCallback(() => {
    if (!isRunningRef.current) return;
    setPhase('inhale');
    circleScale.value = withTiming(EXPANDED_SCALE, {
      duration: PHASES.inhale.duration,
      easing: Easing.inOut(Easing.ease),
    });
    startCountdown(PHASES.inhale.seconds, runHold);
  }, [runHold]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleStart() {
    isRunningRef.current = true;
    sessionStartRef.current = Date.now();
    setIsRunning(true);
    runInhale();
  }

  function handleStop() {
    isRunningRef.current = false;
    clearTimers();
    cancelAnimation(circleScale);
    circleScale.value = withTiming(RESTING_SCALE, {
      duration: 600,
      easing: Easing.inOut(Easing.ease),
    });
    setIsRunning(false);
    setPhase('idle');
    setCountdown(0);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    if (sessionStartRef.current) {
      const elapsed = Math.floor((Date.now() - sessionStartRef.current) / 1000);
      saveSession(elapsed);
      sessionStartRef.current = null;
    }
  }

  function handleBack() {
    // Set before handleStop's state update commits, so the pre-start modal
    // doesn't reappear over the outgoing screen.
    setIsLeaving(true);
    if (isRunning) handleStop();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  }

  useEffect(() => {
    return () => {
      isRunningRef.current = false;
      clearTimers();
      cancelAnimation(circleScale);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const activePhase = phase !== 'idle' ? PHASES[phase] : null;

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        // Always scrollable (was disabled while running) so Stop stays
        // reachable when large system font sizes push it below the fold.
        scrollEnabled={true}
      >
        {/* Back */}
        <Pressable
          style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel="Back to Relax"
        >
          <Text style={styles.backLabel}>← Relax</Text>
        </Pressable>

        {/* Phase indicator */}
        <View style={styles.phaseArea}>
          {isRunning && (
            <>
              <Text style={styles.phaseLabel} accessibilityLiveRegion="polite">
                {activePhase?.label ?? ''}
              </Text>
              <Text style={styles.phaseHint}>{activePhase?.hint ?? ''}</Text>
              <Text style={styles.countdown} accessibilityLiveRegion="polite">
                {countdown}
              </Text>
            </>
          )}
        </View>

        {/* Animated circle */}
        <View style={styles.circleContainer}>
          <Animated.View style={[styles.circleGlow, animatedCircleStyle]} />
          <Animated.View style={[styles.circle, animatedCircleStyle]} />
        </View>

        {/* Phase guide */}
        {isRunning && (
          <View style={styles.phaseGuide}>
            {(['inhale', 'hold', 'exhale'] as const).map((p) => (
              <View
                key={p}
                style={[styles.phaseStep, phase === p && styles.phaseStepActive]}
              >
                <Text
                  style={[
                    styles.phaseStepLabel,
                    phase === p && styles.phaseStepLabelActive,
                  ]}
                  maxFontSizeMultiplier={1.3}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {PHASES[p].label}
                </Text>
                <Text
                  style={[
                    styles.phaseStepCount,
                    phase === p && styles.phaseStepCountActive,
                  ]}
                  maxFontSizeMultiplier={1.3}
                  numberOfLines={1}
                >
                  {PHASES[p].seconds}s
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Stop */}
        {isRunning && (
          <Pressable
            style={({ pressed }) => [styles.btn, styles.btnStop, pressed && styles.btnPressed]}
            onPress={handleStop}
            accessibilityRole="button"
            accessibilityLabel="Stop session"
          >
            <Text style={styles.btnLabel}>Stop</Text>
          </Pressable>
        )}
      </ScrollView>

      <BreathingStartModal
        visible={!isRunning && !isLeaving}
        title="4-7-8 Breathing"
        description="Inhale for 4 seconds, hold for 7, exhale for 8. A complete cycle takes 19 seconds. Most people find 3–4 cycles helpful for settling the nervous system."
        onStart={handleStart}
        onBack={handleBack}
      >
        <View style={styles.stillVisual}>
          <View style={[styles.circleGlow, STILL_CIRCLE]} />
          <View style={[styles.circle, STILL_CIRCLE]} />
        </View>
      </BreathingStartModal>
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
      paddingTop: 0,
      paddingBottom: Spacing.xl,
      gap: Spacing.md,
    },
    // Negative marginBottom pulls the phase text up to 4px below "← Relax" (was
    // 20px: 8px button padding + 12px scroll gap) so the Stop button fits
    // without scrolling. The padding is kept so the tap target doesn't shrink.
    backBtn: {
      alignSelf: 'flex-start',
      paddingTop: 0,
      paddingBottom: Spacing.sm,
      marginBottom: -(Spacing.sm + Spacing.md - Spacing.xs),
    },
    backBtnPressed: { opacity: 0.6 },
    backLabel: { ...typography.body, color: colors.headingAccent },

    phaseArea: {
      alignItems: 'center',
      // Reserves the running height so the visual doesn't shift on Start/Stop.
      minHeight: 126,
      justifyContent: 'center',
      gap: 4,
    },
    phaseLabel: {
      fontSize: 28,
      fontWeight: '400',
      color: colors.deepTide,
      letterSpacing: -0.5,
    },
    phaseHint: { ...typography.body, color: colors.textSecondary },
    countdown: {
      fontSize: 52,
      fontWeight: '300',
      color: colors.deepTide,
      lineHeight: 60,
    },

    circleContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      height: CIRCLE_BASE * EXPANDED_SCALE + 40,
    },
    stillVisual: {
      alignItems: 'center',
      justifyContent: 'center',
      height: (CIRCLE_BASE + 30) * RESTING_SCALE,
    },
    circleGlow: {
      position: 'absolute',
      width: CIRCLE_BASE + 30,
      height: CIRCLE_BASE + 30,
      borderRadius: (CIRCLE_BASE + 30) / 2,
      backgroundColor: Colors.calmWave + '25',
    },
    circle: {
      width: CIRCLE_BASE,
      height: CIRCLE_BASE,
      borderRadius: CIRCLE_BASE / 2,
      backgroundColor: Colors.calmWave,
      shadowColor: Colors.calmWave,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.3,
      shadowRadius: 20,
      elevation: 8,
    },

    phaseGuide: {
      flexDirection: 'row',
      backgroundColor: colors.background,
      borderRadius: Radius.card,
      gap: Spacing.xs,
    },
    phaseStep: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: Spacing.xs,
      borderRadius: Radius.chip,
      gap: 2,
    },
    phaseStepActive: { backgroundColor: colors.surfaceVariant },
    phaseStepLabel: { ...typography.caption, color: colors.textSecondary },
    phaseStepLabelActive: { color: colors.deepTide, fontWeight: '600' },
    phaseStepCount: { ...typography.heading2, color: colors.textSecondary },
    phaseStepCountActive: { color: colors.deepTide },

    btn: {
      borderRadius: Radius.chip,
      paddingVertical: Spacing.base,
      alignItems: 'center',
    },
    btnStop: { backgroundColor: Colors.warmCoral },
    btnPressed: { opacity: 0.85 },
    btnLabel: { ...typography.heading2, color: Colors.white },

  });
}
