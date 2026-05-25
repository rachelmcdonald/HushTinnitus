import { useState, useRef, useEffect, useCallback } from 'react';
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
import { Duration, Colors, Typography, Spacing, Radius, Border } from '@/src/theme';
import { saveSoundSession, createSessionId } from '@/src/storage/soundSessions';
import { usePreferences } from '@/src/context/PreferencesContext';
import UpgradeModal from '@/src/components/UpgradeModal';

// ─── Geometry ─────────────────────────────────────────────────────────────────

const SQUARE = 200;    // side length of the box, px
const DOT = 18;        // dot diameter, px
const HALF_DOT = DOT / 2;

// Dot top-left positions at each corner (dot centered at corner):
// Using left/top in animated style; dot is absolute inside the square view
const CORNER = {
  bottomLeft: { left: -HALF_DOT, top: SQUARE - HALF_DOT },
  bottomRight: { left: SQUARE - HALF_DOT, top: SQUARE - HALF_DOT },
  topRight:    { left: SQUARE - HALF_DOT, top: -HALF_DOT },
  topLeft:     { left: -HALF_DOT, top: -HALF_DOT },
};

type BoxPhase = 'idle' | 'inhale' | 'hold1' | 'exhale' | 'hold2';

const PHASE_DURATION = Duration.breathingInhale; // 4000ms for all box phases
const PHASE_SECONDS = 4;

const PHASE_LABELS: Record<Exclude<BoxPhase, 'idle'>, { label: string; hint: string }> = {
  inhale:  { label: 'Breathe in',  hint: 'Slowly through your nose' },
  hold1:   { label: 'Hold',        hint: 'Stay relaxed' },
  exhale:  { label: 'Breathe out', hint: 'Slowly through your mouth' },
  hold2:   { label: 'Hold',        hint: 'Stay relaxed' },
};

// ─── Session helper ───────────────────────────────────────────────────────────

function saveSession(durationSeconds: number) {
  if (Platform.OS === 'web' || durationSeconds < 5) return;
  try {
    saveSoundSession({
      id: createSessionId(),
      date: new Date().toISOString(),
      sounds: ['breathing-box'],
      durationSeconds,
      timerMinutes: 0,
      volume: 1,
      balance: 0,
      notchedFrequency: null,
    });
  } catch {}
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function BoxBreathingScreen() {
  const { preferences } = usePreferences();
  const isPremium = preferences?.isPremium ?? false;
  const [upgradeVisible, setUpgradeVisible] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [phase, setPhase] = useState<BoxPhase>('idle');
  const [countdown, setCountdown] = useState(0);
  const [cycleCount, setCycleCount] = useState(0);

  // Dot position as shared values (left/top in absolute coordinates)
  const dotLeft = useSharedValue(CORNER.bottomLeft.left);
  const dotTop  = useSharedValue(CORNER.bottomLeft.top);

  const intervalRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const isRunningRef  = useRef(false);
  const sessionStartRef = useRef<number | null>(null);

  const animatedDotStyle = useAnimatedStyle(() => ({
    left: dotLeft.value,
    top:  dotTop.value,
  }));

  function clearTimers() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  function startCountdown(onDone: () => void) {
    clearTimers();
    setCountdown(PHASE_SECONDS);
    let remaining = PHASE_SECONDS;
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

  function animateDot(
    toLeft: number,
    toTop: number,
    onDone: () => void
  ) {
    const easing = Easing.inOut(Easing.ease);
    dotLeft.value = withTiming(toLeft, { duration: PHASE_DURATION, easing });
    dotTop.value  = withTiming(toTop,  { duration: PHASE_DURATION, easing });
    startCountdown(onDone);
  }

  const runHold2 = useCallback(() => {
    if (!isRunningRef.current) return;
    setPhase('hold2');
    // Phase 4: top-left → bottom-left (left stays -HALF_DOT, top goes bottom)
    animateDot(CORNER.bottomLeft.left, CORNER.bottomLeft.top, () => {
      setCycleCount((n) => n + 1);
      runInhale();
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const runExhale = useCallback(() => {
    if (!isRunningRef.current) return;
    setPhase('exhale');
    // Phase 3: top-right → top-left (top stays -HALF_DOT, left goes left)
    animateDot(CORNER.topLeft.left, CORNER.topLeft.top, runHold2);
  }, [runHold2]); // eslint-disable-line react-hooks/exhaustive-deps

  const runHold1 = useCallback(() => {
    if (!isRunningRef.current) return;
    setPhase('hold1');
    // Phase 2: bottom-right → top-right (left stays SQUARE-HALF_DOT, top goes up)
    animateDot(CORNER.topRight.left, CORNER.topRight.top, runExhale);
  }, [runExhale]); // eslint-disable-line react-hooks/exhaustive-deps

  const runInhale = useCallback(() => {
    if (!isRunningRef.current) return;
    setPhase('inhale');
    // Phase 1: bottom-left → bottom-right (top stays SQUARE-HALF_DOT, left goes right)
    animateDot(CORNER.bottomRight.left, CORNER.bottomRight.top, runHold1);
  }, [runHold1]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleStart() {
    // Reset dot to starting corner
    dotLeft.value = CORNER.bottomLeft.left;
    dotTop.value  = CORNER.bottomLeft.top;
    isRunningRef.current = true;
    sessionStartRef.current = Date.now();
    setIsRunning(true);
    setCycleCount(0);
    runInhale();
  }

  function handleStop() {
    isRunningRef.current = false;
    clearTimers();
    cancelAnimation(dotLeft);
    cancelAnimation(dotTop);
    // Return dot to start
    dotLeft.value = withTiming(CORNER.bottomLeft.left, { duration: 400 });
    dotTop.value  = withTiming(CORNER.bottomLeft.top,  { duration: 400 });
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
      cancelAnimation(dotLeft);
      cancelAnimation(dotTop);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const activePhase = phase !== 'idle' ? PHASE_LABELS[phase] : null;

  // Which side of the square is "active" for highlighting the label
  const activeSide: Record<BoxPhase, 'bottom' | 'right' | 'top' | 'left' | null> = {
    idle:   null,
    inhale: 'bottom',
    hold1:  'right',
    exhale: 'top',
    hold2:  'left',
  };
  const currentSide = activeSide[phase];

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
          onPress={() => { if (isRunning) handleStop(); router.back(); }}
          accessibilityRole="button"
          accessibilityLabel="Back to Relax"
        >
          <Text style={styles.backLabel}>← Relax</Text>
        </Pressable>

        <View style={styles.header}>
          <Text style={styles.title}>Box Breathing</Text>
          <Text style={styles.lead}>
            Four equal phases of 4 seconds each — inhale, hold, exhale, hold.
            Follow the dot around the box and breathe with it.
          </Text>
        </View>

        {/* Phase display */}
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
                : 'Follow the dot around the box'}
            </Text>
          )}
        </View>

        {/* Box with animated dot and side labels */}
        <View style={styles.boxWrapper}>
          {/* Top label */}
          <Text style={[styles.sideLabel, styles.sideLabelTop, currentSide === 'top' && styles.sideLabelActive]}>
            Breathe out
          </Text>

          <View style={styles.boxRow}>
            {/* Left label */}
            <Text style={[styles.sideLabel, styles.sideLabelSide, currentSide === 'left' && styles.sideLabelActive]}>
              Hold
            </Text>

            {/* The box */}
            <View style={styles.box}>
              {/* Corner dots (static, visual guides) */}
              {[
                CORNER.topLeft,
                CORNER.topRight,
                CORNER.bottomLeft,
                CORNER.bottomRight,
              ].map((pos, i) => (
                <View
                  key={i}
                  style={[styles.cornerMark, { left: pos.left + HALF_DOT - 4, top: pos.top + HALF_DOT - 4 }]}
                />
              ))}

              {/* Animated dot */}
              <Animated.View style={[styles.dot, animatedDotStyle]} />
            </View>

            {/* Right label */}
            <Text style={[styles.sideLabel, styles.sideLabelSide, currentSide === 'right' && styles.sideLabelActive]}>
              Hold
            </Text>
          </View>

          {/* Bottom label */}
          <Text style={[styles.sideLabel, styles.sideLabelBottom, currentSide === 'bottom' && styles.sideLabelActive]}>
            Breathe in
          </Text>
        </View>

        {/* Start / Stop */}
        {isRunning || isPremium ? (
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

        {!isRunning && (
          <Text style={styles.tip}>
            Breathe naturally through your nose for both inhale and exhale.
            Each complete cycle takes 16 seconds. Most people find 4–6 cycles
            helpful for building focus and calm.
          </Text>
        )}
      </ScrollView>

      <UpgradeModal visible={upgradeVisible} onClose={() => setUpgradeVisible(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.warmSand },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
    gap: Spacing.lg,
  },
  backBtn: { alignSelf: 'flex-start', paddingVertical: Spacing.sm },
  backBtnPressed: { opacity: 0.6 },
  backLabel: { ...Typography.body, color: Colors.deepTide },
  header: { gap: Spacing.sm },
  title: { ...Typography.display, color: Colors.darkText },
  lead: { ...Typography.body, color: Colors.midGray, lineHeight: 24 },

  phaseArea: {
    alignItems: 'center',
    minHeight: 80,
    justifyContent: 'center',
    gap: 4,
  },
  phaseLabel: {
    fontSize: 28,
    fontWeight: '400',
    color: Colors.deepTide,
    letterSpacing: -0.5,
  },
  phaseHint: { ...Typography.body, color: Colors.midGray },
  countdown: {
    fontSize: 52,
    fontWeight: '300',
    color: Colors.deepTide,
    lineHeight: 60,
  },
  idleLabel: { ...Typography.body, color: Colors.midGray, textAlign: 'center' },

  // Box diagram with labels
  boxWrapper: { alignItems: 'center', gap: Spacing.sm },
  boxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },

  // The square
  box: {
    width: SQUARE,
    height: SQUARE,
    borderWidth: 2,
    borderColor: Colors.deepTide,
    borderRadius: 4,
    overflow: 'visible',
    position: 'relative',
    backgroundColor: Colors.tealLight,
  },

  // Corner guide marks
  cornerMark: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.deepTide + '50',
  },

  // Animated dot
  dot: {
    position: 'absolute',
    width: DOT,
    height: DOT,
    borderRadius: HALF_DOT,
    backgroundColor: Colors.calmWave,
    shadowColor: Colors.calmWave,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },

  // Side labels
  sideLabel: {
    ...Typography.caption,
    color: Colors.midGray,
    textAlign: 'center',
  },
  sideLabelTop:    { marginBottom: 2 },
  sideLabelBottom: { marginTop: 2 },
  sideLabelSide:   { width: 40, fontSize: 11 },
  sideLabelActive: { color: Colors.deepTide, fontWeight: '600' },

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
  btnLabel: { ...Typography.heading2, color: Colors.white },

  tip: {
    ...Typography.caption,
    color: Colors.midGray,
    textAlign: 'center',
    lineHeight: 20,
    fontStyle: 'italic',
  },
});
