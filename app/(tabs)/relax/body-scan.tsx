import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView, Platform } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
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
import { useTheme } from '@/src/context/ThemeContext';
import { saveSoundSession, createSessionId } from '@/src/storage/soundSessions';
import { usePreferences } from '@/src/context/PreferencesContext';
import ComingSoonModal from '@/src/components/ComingSoonModal';
import ComingSoonBadge from '@/src/components/ComingSoonBadge';

const TOTAL_SECONDS = 600; // 10 min

const SCAN_PROMPTS = [
  { at: 0,
    heading: 'Feet',
    text: 'Begin by bringing your awareness to your feet. Notice any sensations — warmth, pressure, or simply the feeling of contact with the ground.' },
  { at: 50,
    heading: 'Lower legs',
    text: 'Move your attention gently up to your ankles and lower legs. You are not trying to change anything — just observing.' },
  { at: 100,
    heading: 'Knees & thighs',
    text: 'Let awareness rise to your knees and thighs. Notice the weight and temperature where your legs rest.' },
  { at: 150,
    heading: 'Hips & pelvis',
    text: 'Let your attention settle in the hips and pelvis. Breathe gently into this space, allowing it to release.' },
  { at: 200,
    heading: 'Lower back',
    text: 'Guide your awareness to your lower back. With each exhale, allow any tension you find there to soften a little.' },
  { at: 250,
    heading: 'Abdomen',
    text: 'Rest your attention on your abdomen. Feel it rise and fall with each breath — gently, without effort.' },
  { at: 310,
    heading: 'Chest & upper back',
    text: 'Move awareness up to your chest and upper back. Notice your heartbeat, your breathing — the quiet, steady rhythm of your body.' },
  { at: 370,
    heading: 'Arms & hands',
    text: 'Shift attention to your arms and hands. Feel their weight, their warmth, the still air around them.' },
  { at: 430,
    heading: 'Shoulders',
    text: 'Bring awareness to your shoulders and upper back. These often hold tension. Allow each exhale to create a little more ease here.' },
  { at: 480,
    heading: 'Neck & throat',
    text: 'Guide attention gently to your neck and throat. Let these muscles soften with each out-breath.' },
  { at: 530,
    heading: 'Face & jaw',
    text: 'Let awareness move to your face — your jaw, your cheeks, your eyes. Allow everything here to soften and still.' },
  { at: 565,
    heading: 'Whole body',
    text: 'Finally, let your awareness expand to your whole body at once. You have travelled from your feet to the top of your head. Rest in this complete, open awareness.' },
];

function promptAt(elapsed: number) {
  let p = SCAN_PROMPTS[0];
  for (const s of SCAN_PROMPTS) {
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
      sounds: ['body-scan-10min'],
      durationSeconds,
      timerMinutes: 0,
      volume: 1,
      balance: 0,
      notchedFrequency: null,
    });
  } catch {}
}

export default function BodyScanScreen() {
  const { preferences } = usePreferences();
  const isPremium = preferences?.isPremium ?? false;
  const { typography } = useTheme();
  const styles = useMemo(() => makeStyles(typography), [typography]);

  const [stage, setStage] = useState<'intro' | 'session' | 'done'>('intro');
  const [upgradeVisible, setUpgradeVisible] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);
  const sessionStartRef = useRef<number | null>(null);
  const isKeepAwakeActive = useRef(false);
  const scrollRef = useRef<ScrollView>(null);

  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, [])
  );

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
        withTiming(1.25, { duration: 5000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.75, { duration: 5000, easing: Easing.inOut(Easing.ease) }),
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

  const current = promptAt(elapsed);
  const remaining = TOTAL_SECONDS - elapsed;
  const timeLabel = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`;

  // ── Intro ──────────────────────────────────────────────────────────────────
  if (stage === 'intro') {
    return (
      <SafeAreaView style={styles.safe}>
        <ComingSoonModal
          visible={upgradeVisible}
          onClose={() => setUpgradeVisible(false)}
          featureName="Body Scan Meditation"
          description="A 10-minute guided awareness practice that gently moves attention through each part of the body, promoting deep relaxation and reducing tinnitus-related hypervigilance."
        />
        <ScrollView ref={scrollRef} contentContainerStyle={styles.introScroll} showsVerticalScrollIndicator={false}>
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
            <Text style={styles.introTitle}>Body Scan Meditation</Text>
            <Text style={styles.introDuration}>10 minutes</Text>
          </View>

          <Text style={styles.introBody}>
            A guided practice that moves slow, non-judgemental awareness
            through each region of the body from your feet to your head.
            Body scan helps reduce physical tension and develops the capacity
            for calm, present-moment attention.
          </Text>

          <View style={styles.includesList}>
            {[
              '12 body regions, feet to head',
              'Gentle breathing animation throughout',
              'Suitable for any time of day',
              'Based on mindfulness-based approaches',
            ].map((item) => (
              <View key={item} style={styles.includesRow}>
                <View style={styles.includesDot} />
                <Text style={styles.includesText}>{item}</Text>
              </View>
            ))}
          </View>

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
            You completed 10 minutes of body scan. Regular practice builds
            awareness of how tension accumulates and supports a calmer,
            more grounded response to daily stressors.
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
        {/* Breathing orb background */}
        <Animated.View style={[styles.breathOrb, breathStyle]} />

        {/* Timer */}
        <Text style={styles.timerText}>
          {isPaused ? 'Paused' : timeLabel}
        </Text>

        {/* Prompt */}
        <View style={styles.promptArea}>
          <Text style={styles.regionHeading}>{current.heading}</Text>
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
      width: 400,
      height: 400,
      borderRadius: 200,
      backgroundColor: Colors.calmWave + '15',
    },
    timerText: {
      fontSize: 26,
      fontWeight: '300',
      color: Colors.white + 'AA',
      letterSpacing: 1,
    },
    promptArea: { flex: 1, justifyContent: 'center', paddingHorizontal: Spacing.md, gap: Spacing.md },
    regionHeading: { ...typography.heading1, color: Colors.calmWave, textAlign: 'center' },
    promptText: {
      fontSize: 18,
      fontWeight: '300',
      color: Colors.white,
      textAlign: 'center',
      lineHeight: 30,
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
    endBtn: { paddingVertical: Spacing.sm, alignItems: 'center' },
    endBtnLabel: { ...typography.body, color: Colors.white + '55' },
    btnPressed: { opacity: 0.7 },
  });
}
