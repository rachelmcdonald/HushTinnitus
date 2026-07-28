import { useState, useRef, useEffect, useMemo } from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView, Platform } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { Colors, Spacing, Radius } from '@/src/theme';
import { saveSoundSession, createSessionId } from '@/src/storage/soundSessions';
import { usePreferences } from '@/src/context/PreferencesContext';
import ComingSoonModal from '@/src/components/ComingSoonModal';
import ComingSoonBadge from '@/src/components/ComingSoonBadge';
import { useTheme } from '@/src/context/ThemeContext';

const TOTAL_SECONDS = 600; // 10 min

// ─── Beach visualisation script ──────────────────────────────────────────────

const IMAGERY_PROMPTS = [
  { at: 0,
    text: 'You are standing at the edge of a warm, calm beach at the end of the day. The light is golden and low on the water.' },
  { at: 40,
    text: 'The sand beneath your feet is warm and fine. With each step you take toward the water, you feel it shifting — solid and real.' },
  { at: 80,
    text: 'The ocean stretches to the horizon — deep teal and still, with slow, gentle waves rolling in and retreating.' },
  { at: 120,
    text: 'Listen to the rhythm of the waves. They arrive softly, dissolve on the shore, and pull back — over and over, unhurried.' },
  { at: 165,
    text: 'Let your breath follow the rhythm of the ocean. Inhale as a wave approaches... exhale as it retreats. There is no rush here.' },
  { at: 210,
    text: 'Above you the sky is wide and clear — pale gold at the horizon, deepening to a quiet blue overhead. You are held under this open sky.' },
  { at: 260,
    text: 'You find a smooth patch of sand and sit. The warmth radiates up through it. Your body is fully supported, completely at rest.' },
  { at: 310,
    text: 'Any sounds you notice — including the ringing in your ears — are simply part of this moment. Like the waves, they are present, and they pass. You do not need to fight them.' },
  { at: 365,
    text: 'With each breath you settle a little deeper into this place of ease. The ocean continues its rhythm, indifferent to time.' },
  { at: 415,
    text: 'A soft breeze moves across your skin, carrying the faint scent of salt and open air. Everything is unhurried.' },
  { at: 465,
    text: 'Your body is heavy and still. Your mind, like the horizon, is open and uncluttered. You belong here — in this quiet, in this moment.' },
  { at: 515,
    text: 'This is what ease feels like. This is your body at rest. You can return to this place whenever you choose.' },
  { at: 560,
    text: 'When you are ready, begin to bring your awareness gently back. The beach remains in your memory. Carry this sense of calm with you.' },
];

function promptAt(elapsed: number) {
  let p = IMAGERY_PROMPTS[0];
  for (const s of IMAGERY_PROMPTS) {
    if (elapsed >= s.at) p = s;
  }
  return p;
}

function saveSession(durationSeconds: number) {
  if (Platform.OS === 'web' || durationSeconds < 5) return;
  try {
    saveSoundSession({
      id: createSessionId(),
      date: new Date().toISOString(),
      sounds: ['guided-imagery-beach'],
      durationSeconds,
      timerMinutes: 0,
      volume: 1,
      balance: 0,
      notchedFrequency: null,
    });
  } catch {}
}

export default function GuidedImageryScreen() {
  const { typography } = useTheme();
  const styles = useMemo(() => makeStyles(typography), [typography]);

  const { preferences } = usePreferences();
  const isPremium = preferences?.isPremium ?? false;

  const [stage, setStage] = useState<'intro' | 'session' | 'done'>('intro');
  const [upgradeVisible, setUpgradeVisible] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);

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
        withTiming(1.3, { duration: 5500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.7, { duration: 5500, easing: Easing.inOut(Easing.ease) }),
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
      setElapsed(elapsedRef.current);
      if (elapsedRef.current >= TOTAL_SECONDS) {
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
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  }

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      cancelAnimation(breathScale);
      safeDeactivate();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const remaining = TOTAL_SECONDS - elapsed;
  const timeLabel = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`;
  const current = promptAt(elapsed);

  // ── Intro ──────────────────────────────────────────────────────────────────
  if (stage === 'intro') {
    return (
      <SafeAreaView style={styles.safe}>
        <ComingSoonModal
          visible={upgradeVisible}
          onClose={() => setUpgradeVisible(false)}
          featureName="Guided Imagery"
          description="A calming visualisation session that guides you through a peaceful natural scene, giving your mind a restorative break from tinnitus awareness."
        />
        <ScrollView contentContainerStyle={styles.introScroll} showsVerticalScrollIndicator={false}>
          <Pressable
            style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
            onPress={() => {
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

          <View style={styles.introHeader}>
            <View style={styles.introBadgeRow}>
              <ComingSoonBadge />
            </View>
            <Text style={styles.introTitle}>Guided Imagery</Text>
            <Text style={styles.introDuration}>10 minutes · Calm beach</Text>
          </View>

          <Text style={styles.introBody}>
            A guided visualisation that takes you through a peaceful beach
            scene at sunset. This session uses the imagination to create a
            physical state of relaxation, helping to reduce arousal and
            create distance from tinnitus-related distress.
          </Text>

          <View style={styles.includesList}>
            {[
              'Fully narrated beach visualisation',
              'Slow breathing animation throughout',
              'Includes a gentle tinnitus acceptance moment',
              'Suitable in the evening or whenever you need calm',
            ].map((item) => (
              <View key={item} style={styles.includesRow}>
                <View style={styles.includesDot} />
                <Text style={styles.includesText}>{item}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.introNote}>
            Find a comfortable position, close your eyes, and allow the
            imagery to unfold at its own pace.
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
        </ScrollView>
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
            You completed 10 minutes of guided imagery. The calm you found
            here is a skill — it becomes easier to access each time you
            practise.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.doneBtn, pressed && styles.btnPressed]}
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(tabs)');
              }
            }}
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
      <View style={styles.session}>
        {/* Breathing orb */}
        <Animated.View style={[styles.breathOrb, breathStyle]} />

        {/* Timer */}
        <Text style={styles.timerText}>
          {isPaused ? 'Paused' : timeLabel}
        </Text>

        {/* Imagery prompt */}
        <View style={styles.promptArea}>
          <Text style={styles.promptText}>{current.text}</Text>
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

    backBtn: { alignSelf: 'flex-start', paddingVertical: Spacing.sm },
    backBtnPressed: { opacity: 0.6 },
    backLabel: { ...typography.body, color: Colors.calmWave },

    // ── Intro ─────────────────────────────────────────────────────────────────
    introScroll: {
      flexGrow: 1,
      paddingHorizontal: Spacing.xl,
      paddingTop: Spacing.md,
      paddingBottom: Spacing.xl,
      gap: Spacing.lg,
    },
    introHeader: { gap: Spacing.xs },
    introBadgeRow: { flexDirection: 'row' },
    introTitle: { ...typography.display, color: Colors.white },
    introDuration: { ...typography.caption, color: Colors.calmWave },
    introBody: { ...typography.body, color: Colors.white + 'B3', lineHeight: 26 },
    introNote: {
      ...typography.caption,
      color: Colors.white + '80',
      lineHeight: 20,
      fontStyle: 'italic',
    },
    includesList: { gap: Spacing.sm },
    includesRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
    includesDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.calmWave, marginTop: 7 },
    includesText: { ...typography.body, color: Colors.white + 'B3', flex: 1 },
    beginBtn: {
      backgroundColor: Colors.calmWave,
      borderRadius: Radius.chip,
      paddingVertical: Spacing.base,
      alignItems: 'center',
    },
    beginBtnLabel: { ...typography.heading2, color: Colors.deepTide },
    unlockBtn: {
      borderWidth: 1,
      borderColor: Colors.calmWave,
      borderRadius: Radius.chip,
      paddingVertical: Spacing.base,
      alignItems: 'center',
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
      width: 72, height: 72, borderRadius: 36,
      backgroundColor: Colors.calmWave,
      alignItems: 'center', justifyContent: 'center',
    },
    doneCheckMark: { fontSize: 32, color: Colors.deepTide, lineHeight: 40 },
    doneTitle: { ...typography.display, color: Colors.white, textAlign: 'center' },
    doneBody: { ...typography.body, color: Colors.white + 'B3', textAlign: 'center', lineHeight: 26 },
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
    session: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: Spacing.xl,
      paddingHorizontal: Spacing.xl,
      overflow: 'hidden',
    },
    breathOrb: {
      position: 'absolute',
      width: 450,
      height: 450,
      borderRadius: 225,
      backgroundColor: Colors.calmWave + '12',
    },
    timerText: {
      fontSize: 22,
      fontWeight: '300',
      color: Colors.white + '80',
      letterSpacing: 1,
    },
    promptArea: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: Spacing.sm,
    },
    promptText: {
      fontSize: 20,
      fontWeight: '300',
      color: Colors.white,
      textAlign: 'center',
      lineHeight: 34,
      letterSpacing: 0.3,
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
    endBtn: { paddingVertical: Spacing.sm, alignItems: 'center' },
    endBtnLabel: { ...typography.body, color: Colors.white + '55' },
    btnPressed: { opacity: 0.7 },
  });
}
