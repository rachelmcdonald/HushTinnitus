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
  const [cycleCount, setCycleCount] = useState(0);

  const circleScale = useSharedValue(RESTING_SCALE);
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
      setCycleCount((n) => n + 1);
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
    setCycleCount(0);
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
    if (sessionStartRef.current) {
      const elapsed = Math.floor((Date.now() - sessionStartRef.current) / 1000);
      saveSession(elapsed);
      sessionStartRef.current = null;
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
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!isRunning}
      >
        {/* Back */}
        <Pressable
          style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
          onPress={() => {
            if (isRunning) handleStop();
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)');
            }
          }}
          accessibilityRole="button"
          accessibilityLabel="Back to Relax"
        >
          <Text style={styles.backLabel}>← Relax</Text>
        </Pressable>

        <View style={styles.header}>
          <Text style={styles.title}>4-7-8 Breathing</Text>
          <Text style={styles.lead}>
            Inhale for 4 seconds, hold for 7, exhale for 8. A complete cycle
            takes 19 seconds. Most people find 3–4 cycles helpful for settling
            the nervous system.
          </Text>
        </View>

        {/* Phase indicator */}
        <View style={styles.phaseArea}>
          {isRunning ? (
            <>
              <Text style={styles.phaseLabel} accessibilityLiveRegion="polite">
                {activePhase?.label ?? ''}
              </Text>
              <Text style={styles.phaseHint}>{activePhase?.hint ?? ''}</Text>
              <Text style={styles.countdown} accessibilityLiveRegion="polite">
                {countdown}
              </Text>
            </>
          ) : (
            <Text style={styles.idleLabel}>
              {cycleCount > 0
                ? `${cycleCount} cycle${cycleCount !== 1 ? 's' : ''} completed`
                : 'Tap start when you are ready'}
            </Text>
          )}
        </View>

        {/* Animated circle */}
        <View style={styles.circleContainer}>
          <Animated.View style={[styles.circleGlow, animatedCircleStyle]} />
          <Animated.View style={[styles.circle, animatedCircleStyle]} />
        </View>

        {/* Phase guide */}
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
              >
                {PHASES[p].label}
              </Text>
              <Text
                style={[
                  styles.phaseStepCount,
                  phase === p && styles.phaseStepCountActive,
                ]}
              >
                {PHASES[p].seconds}s
              </Text>
            </View>
          ))}
        </View>

        {/* Start / Stop */}
        <Pressable
          style={({ pressed }) => [
            styles.btn,
            isRunning ? styles.btnStop : styles.btnStart,
            pressed && styles.btnPressed,
          ]}
          onPress={isRunning ? handleStop : handleStart}
          accessibilityRole="button"
          accessibilityLabel={isRunning ? 'Stop session' : 'Start breathing exercise'}
        >
          <Text style={styles.btnLabel}>{isRunning ? 'Stop' : 'Start'}</Text>
        </Pressable>

        {/* Tip */}
        {!isRunning && (
          <Text style={styles.tip}>
            Find a comfortable seated or reclined position. You can breathe
            through your nose for the inhale and gently through your mouth or
            nose for the exhale — whichever feels more natural.
          </Text>
        )}
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
      paddingTop: Spacing.md,
      paddingBottom: Spacing.xl,
      gap: Spacing.lg,
    },
    backBtn: { alignSelf: 'flex-start', paddingVertical: Spacing.sm },
    backBtnPressed: { opacity: 0.6 },
    backLabel: { ...typography.body, color: colors.deepTide },
    header: { gap: Spacing.sm },
    title: { ...typography.display, color: colors.textPrimary },
    lead: { ...typography.body, color: colors.textSecondary, lineHeight: 24 },

    phaseArea: {
      alignItems: 'center',
      minHeight: 80,
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
    idleLabel: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },

    circleContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      height: CIRCLE_BASE * EXPANDED_SCALE + 40,
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
      padding: Spacing.md,
      gap: Spacing.xs,
    },
    phaseStep: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: Spacing.sm,
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
    btnStart: { backgroundColor: Colors.deepTide },
    btnStop: { backgroundColor: Colors.warmCoral },
    btnPressed: { opacity: 0.85 },
    btnLabel: { ...typography.heading2, color: Colors.white },

    tip: {
      ...typography.caption,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
      fontStyle: 'italic',
    },
  });
}
