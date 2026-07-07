import { useState, useRef, useEffect, useMemo } from 'react';
import { StyleSheet, Text, View, Pressable, Platform } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePreferences } from '@/src/context/PreferencesContext';
import ComingSoonModal from '@/src/components/ComingSoonModal';
import ComingSoonBadge from '@/src/components/ComingSoonBadge';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { Colors, Spacing, Radius } from '@/src/theme';
import { saveSoundSession, createSessionId } from '@/src/storage/soundSessions';
import { useTheme } from '@/src/context/ThemeContext';

const TOTAL_SECONDS = 300;
const RING_R = 100;
const RING_STROKE = 4;
const RING_SIZE = (RING_R + RING_STROKE) * 2;
const CIRCUMFERENCE = 2 * Math.PI * RING_R;
const CX = RING_R + RING_STROKE;
const CY = RING_R + RING_STROKE;

const PROMPTS: { at: number; text: string }[] = [
  { at: 0,   text: 'Find a comfortable position and allow your eyes to close gently.' },
  { at: 25,  text: "Notice that your tinnitus is present. You don't need to fight it or push it away." },
  { at: 55,  text: 'Your brain is doing what brains do — attending to sound. That is completely normal.' },
  { at: 85,  text: 'Let your breath become your anchor. Inhale slowly... exhale gently.' },
  { at: 115, text: 'If thoughts arise, notice them without judgement, and gently return to your breath.' },
  { at: 145, text: 'The sound does not define your experience. You can choose where to rest your attention.' },
  { at: 175, text: 'With each breath, allow your body to soften a little more.' },
  { at: 200, text: 'You are learning to co-exist with the sound — not to ignore it, but to change your relationship with it.' },
  { at: 230, text: 'Notice any tension in your body. With each exhale, allow it to release.' },
  { at: 260, text: 'You are building a habit of calm. Each session you practise strengthens that capacity.' },
  { at: 285, text: 'Begin to return your awareness to the room. Carry this sense of ease with you.' },
];

function promptAt(elapsed: number): string {
  let text = PROMPTS[0].text;
  for (const p of PROMPTS) {
    if (elapsed >= p.at) text = p.text;
  }
  return text;
}

function saveSession(durationSeconds: number) {
  if (Platform.OS === 'web' || durationSeconds < 5) return;
  try {
    saveSoundSession({
      id: createSessionId(),
      date: new Date().toISOString(),
      sounds: ['mindfulness-5min'],
      durationSeconds,
      timerMinutes: 0,
      volume: 1,
      balance: 0,
      notchedFrequency: null,
    });
  } catch {}
}

export default function MindfulnessScreen() {
  const { typography } = useTheme();
  const styles = useMemo(() => makeStyles(typography), [typography]);

  const { preferences } = usePreferences();
  const isPremium = preferences?.isPremium ?? false;
  const [upgradeVisible, setUpgradeVisible] = useState(false);
  const [stage, setStage] = useState<'intro' | 'session' | 'done'>('intro');
  const [isPaused, setIsPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [prompt, setPrompt] = useState(PROMPTS[0].text);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);
  const sessionStartRef = useRef<number | null>(null);
  const isKeepAwakeActive = useRef(false);

  function safeDeactivate() {
    if (!isKeepAwakeActive.current) return;
    isKeepAwakeActive.current = false;
    try { deactivateKeepAwake(); } catch {}
  }

  const breathScale = useSharedValue(1);
  const breathStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breathScale.value }],
  }));

  function startBreathing() {
    breathScale.value = withRepeat(
      withSequence(
        withTiming(1.3, { duration: 4500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.7, { duration: 4500, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }

  function stopBreathing() {
    cancelAnimation(breathScale);
    breathScale.value = withTiming(1, { duration: 800 });
  }

  function startTick() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      elapsedRef.current += 1;
      const e = elapsedRef.current;
      setElapsed(e);
      setPrompt(promptAt(e));
      if (e >= TOTAL_SECONDS) {
        clearInterval(intervalRef.current!);
        intervalRef.current = null;
        finishSession();
      }
    }, 1000);
  }

  function finishSession() {
    stopBreathing();
    safeDeactivate();
    saveSession(TOTAL_SECONDS);
    sessionStartRef.current = null;
    setStage('done');
  }

  function handleBegin() {
    elapsedRef.current = 0;
    sessionStartRef.current = Date.now();
    setElapsed(0);
    setPrompt(PROMPTS[0].text);
    setIsPaused(false);
    setStage('session');
    startBreathing();
    startTick();
    isKeepAwakeActive.current = true;
    activateKeepAwakeAsync().catch(() => { isKeepAwakeActive.current = false; });
  }

  function handlePause() {
    setIsPaused(true);
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    cancelAnimation(breathScale);
  }

  function handleResume() {
    setIsPaused(false);
    startBreathing();
    startTick();
  }

  function handleEnd() {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    stopBreathing();
    safeDeactivate();
    if (sessionStartRef.current) {
      const dur = Math.floor((Date.now() - sessionStartRef.current) / 1000);
      saveSession(dur);
      sessionStartRef.current = null;
    }
    router.back();
  }

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      cancelAnimation(breathScale);
      safeDeactivate();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const dashOffset = (elapsed / TOTAL_SECONDS) * CIRCUMFERENCE;
  const remaining = TOTAL_SECONDS - elapsed;
  const timeLabel = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`;

  // ── Intro ──────────────────────────────────────────────────────────────────
  if (stage === 'intro') {
    return (
      <SafeAreaView style={styles.safe}>
        <Pressable
          style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back to Relax"
        >
          <Text style={styles.backLabel}>← Relax</Text>
        </Pressable>
        <View style={styles.introContent}>
          <View style={styles.introHeader}>
            <View style={styles.introBadgeRow}>
              <ComingSoonBadge />
            </View>
            <Text style={styles.introTitle}>Mindfulness Practice</Text>
            <Text style={styles.introDuration}>5 min</Text>
          </View>
          <Text style={styles.introBody}>
            A guided session using mindful awareness to support a calmer
            relationship with tinnitus. Based on habituation principles, regular
            practice helps your brain assign lower priority to the tinnitus
            signal over time.
          </Text>
          <Text style={styles.introBody}>
            Find a quiet, comfortable place to sit or lie down. You don't need
            to silence your tinnitus — just allow it to be there.
          </Text>
          {isPremium ? (
            <Pressable
              style={({ pressed }) => [styles.beginBtn, pressed && styles.btnPressed]}
              onPress={handleBegin}
              accessibilityRole="button"
              accessibilityLabel="Begin session"
            >
              <Text style={styles.beginBtnLabel}>Begin session</Text>
            </Pressable>
          ) : (
            <Pressable
              style={({ pressed }) => [styles.unlockBtn, pressed && styles.btnPressed]}
              onPress={() => setUpgradeVisible(true)}
              accessibilityRole="button"
              accessibilityLabel="Coming soon — tap for details"
            >
              <Text style={styles.unlockBtnLabel}>Coming soon — tap for details</Text>
            </Pressable>
          )}
        </View>
        <ComingSoonModal
          visible={upgradeVisible}
          onClose={() => setUpgradeVisible(false)}
          featureName="Mindfulness Tinnitus Acceptance"
          description="A guided mindfulness session specifically designed for tinnitus — learning to acknowledge the sound without judgement, reducing its emotional impact over time."
        />
      </SafeAreaView>
    );
  }

  // ── Done ───────────────────────────────────────────────────────────────────
  if (stage === 'done') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.doneContent}>
          <View style={styles.doneCheck}>
            <Text style={styles.doneCheckMark}>✓</Text>
          </View>
          <Text style={styles.doneTitle}>Session complete</Text>
          <Text style={styles.doneBody}>
            You practised 5 minutes of mindful awareness. Over time, this
            helps your brain reassign lower priority to the tinnitus signal.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.doneBtn, pressed && styles.btnPressed]}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Done"
          >
            <Text style={styles.doneBtnLabel}>Done</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ── Session ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.sessionOuter}>
        {/* Background breathing orb */}
        <Animated.View style={[styles.breathOrb, breathStyle]} />

        {/* Progress ring + countdown */}
        <View style={styles.ringArea}>
          <Svg width={RING_SIZE} height={RING_SIZE}>
            <Circle
              cx={CX} cy={CY} r={RING_R}
              stroke={Colors.calmWave + '30'}
              strokeWidth={RING_STROKE}
              fill="none"
            />
            <Circle
              cx={CX} cy={CY} r={RING_R}
              stroke={Colors.calmWave}
              strokeWidth={RING_STROKE}
              fill="none"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              transform={`rotate(-90 ${CX} ${CY})`}
            />
          </Svg>
          <Text style={styles.timerText}>
            {isPaused ? 'Paused' : timeLabel}
          </Text>
        </View>

        {/* Timed prompt */}
        <View style={styles.promptArea}>
          <Text style={styles.promptText}>{prompt}</Text>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <Pressable
            style={({ pressed }) => [styles.pauseBtn, pressed && styles.btnPressed]}
            onPress={isPaused ? handleResume : handlePause}
            accessibilityRole="button"
            accessibilityLabel={isPaused ? 'Resume session' : 'Pause session'}
          >
            <Text style={styles.pauseBtnLabel}>{isPaused ? 'Resume' : 'Pause'}</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.endBtn, pressed && styles.btnPressed]}
            onPress={handleEnd}
            accessibilityRole="button"
            accessibilityLabel="End session"
          >
            <Text style={styles.endBtnLabel}>End session</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

function makeStyles(typography: ReturnType<typeof useTheme>['typography']) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: Colors.deepTide },

    backBtn: { margin: Spacing.xl, marginBottom: 0, alignSelf: 'flex-start', paddingVertical: Spacing.sm },
    backBtnPressed: { opacity: 0.6 },
    backLabel: { ...typography.body, color: Colors.calmWave },

    // ── Intro ─────────────────────────────────────────────────────────────────
    introContent: {
      flex: 1,
      paddingHorizontal: Spacing.xl,
      paddingTop: Spacing.xxl,
      justifyContent: 'center',
      gap: Spacing.lg,
    },
    introHeader: { gap: Spacing.xs },
    introBadgeRow: { flexDirection: 'row' },
    introTitle: { ...typography.display, color: Colors.white },
    introDuration: { ...typography.caption, color: Colors.calmWave },
    introBody: { ...typography.body, color: Colors.white + 'B3', lineHeight: 26 },
    beginBtn: {
      backgroundColor: Colors.calmWave,
      borderRadius: Radius.chip,
      paddingVertical: Spacing.base,
      alignItems: 'center',
      marginTop: Spacing.md,
    },
    beginBtnLabel: { ...typography.heading2, color: Colors.deepTide },
    unlockBtn: {
      borderWidth: 1,
      borderColor: Colors.calmWave,
      borderRadius: Radius.chip,
      paddingVertical: Spacing.base,
      alignItems: 'center',
      marginTop: Spacing.md,
    },
    unlockBtnLabel: { ...typography.heading2, color: Colors.calmWave },

    // ── Done ──────────────────────────────────────────────────────────────────
    doneContent: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: Spacing.xl,
      gap: Spacing.lg,
    },
    doneCheck: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: Colors.calmWave,
      alignItems: 'center',
      justifyContent: 'center',
    },
    doneCheckMark: { fontSize: 32, color: Colors.deepTide, lineHeight: 40 },
    doneTitle: { ...typography.display, color: Colors.white, textAlign: 'center' },
    doneBody: {
      ...typography.body,
      color: Colors.white + 'B3',
      textAlign: 'center',
      lineHeight: 26,
    },
    doneBtn: {
      backgroundColor: Colors.calmWave,
      borderRadius: Radius.chip,
      paddingVertical: Spacing.base,
      paddingHorizontal: Spacing.xl,
      alignItems: 'center',
      marginTop: Spacing.md,
    },
    doneBtnLabel: { ...typography.heading2, color: Colors.deepTide },

    // ── Session ───────────────────────────────────────────────────────────────
    sessionOuter: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: Spacing.xl,
      paddingHorizontal: Spacing.xl,
      overflow: 'hidden',
    },
    breathOrb: {
      position: 'absolute',
      width: 420,
      height: 420,
      borderRadius: 210,
      backgroundColor: Colors.calmWave + '18',
    },
    ringArea: {
      width: RING_SIZE,
      height: RING_SIZE,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: Spacing.lg,
    },
    timerText: {
      position: 'absolute',
      fontSize: 30,
      fontWeight: '300',
      color: Colors.white,
      letterSpacing: 1,
    },
    promptArea: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: Spacing.md,
    },
    promptText: {
      fontSize: 20,
      fontWeight: '300',
      color: Colors.white,
      textAlign: 'center',
      lineHeight: 34,
      letterSpacing: 0.2,
    },
    controls: { width: '100%', gap: Spacing.sm },
    pauseBtn: {
      borderWidth: 1,
      borderColor: Colors.calmWave,
      borderRadius: Radius.chip,
      paddingVertical: Spacing.base,
      alignItems: 'center',
    },
    pauseBtnLabel: { ...typography.heading2, color: Colors.calmWave },
    endBtn: {
      paddingVertical: Spacing.sm,
      alignItems: 'center',
    },
    endBtnLabel: { ...typography.body, color: Colors.white + '55' },

    btnPressed: { opacity: 0.7 },
  });
}
