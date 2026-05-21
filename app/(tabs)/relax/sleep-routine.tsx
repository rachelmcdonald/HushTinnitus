import { useState, useRef, useEffect } from 'react';
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
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { Colors, Typography, Spacing, Radius, Border } from '@/src/theme';
import { saveSoundSession, createSessionId } from '@/src/storage/soundSessions';
import { usePreferences } from '@/src/context/PreferencesContext';
import UpgradeModal from '@/src/components/UpgradeModal';

// ─── Constants ─────────────────────────────────────────────────────────────────

const STAGE1_SECONDS = 300;  // 5 min box breathing
const STAGE2_SECONDS = 300;  // 5 min body scan
const BOX_PHASE_SECS = 4;    // all box phases = 4 s
const CIRCLE_BASE = 160;
const RESTING_SCALE = 0.72;
const EXPANDED_SCALE = 1.18;

type RoutineStage = 'intro' | 'stage1' | 'stage2' | 'stage3' | 'done';
type BoxPhase = 'inhale' | 'hold1' | 'exhale' | 'hold2';

const BOX_PHASE_LABELS: Record<BoxPhase, { label: string; hint: string }> = {
  inhale: { label: 'Breathe in',  hint: 'Through your nose' },
  hold1:  { label: 'Hold',        hint: 'Stay still' },
  exhale: { label: 'Breathe out', hint: 'Slowly release' },
  hold2:  { label: 'Hold',        hint: 'Rest here' },
};

function getBoxPhase(elapsed: number): BoxPhase {
  const pos = elapsed % 16;
  if (pos < 4)  return 'inhale';
  if (pos < 8)  return 'hold1';
  if (pos < 12) return 'exhale';
  return 'hold2';
}

function getBoxCountdown(elapsed: number): number {
  return BOX_PHASE_SECS - (elapsed % BOX_PHASE_SECS);
}

// ─── Stage 2 prompts ──────────────────────────────────────────────────────────

const SLEEP_SCAN_PROMPTS = [
  { at: 0,   text: 'Begin with your feet. Let them relax completely and feel them growing heavy and still.' },
  { at: 38,  text: 'Your calves and knees softening now. Your lower legs are releasing.' },
  { at: 75,  text: 'Thighs and hips. Feel your lower body sinking deeper. Heavy and supported.' },
  { at: 112, text: 'Your abdomen rises and falls with each breath. Let each exhale carry you a little further.' },
  { at: 150, text: 'Chest and upper back. Your breathing is slow and easy now. Nothing to do.' },
  { at: 188, text: 'Arms and hands. Warm and heavy. Let them rest completely.' },
  { at: 225, text: 'Neck, jaw, and face. Everything softening. Let your jaw drop gently.' },
  { at: 262, text: 'Your whole body is heavy and at rest. You are safe. You are ready for sleep.' },
];

function sleepScanPromptAt(elapsed: number): string {
  let text = SLEEP_SCAN_PROMPTS[0].text;
  for (const p of SLEEP_SCAN_PROMPTS) {
    if (elapsed >= p.at) text = p.text;
  }
  return text;
}

// ─── Session helper ────────────────────────────────────────────────────────────

function saveSession(durationSeconds: number) {
  if (Platform.OS === 'web' || durationSeconds < 5) return;
  try {
    saveSoundSession({
      id: createSessionId(),
      date: new Date().toISOString(),
      sounds: ['sleep-routine'],
      durationSeconds,
      timerMinutes: 0,
      volume: 1,
      balance: 0,
      notchedFrequency: null,
    });
  } catch {}
}

// ─── Stage indicator ──────────────────────────────────────────────────────────

function StageIndicator({ active }: { active: 1 | 2 | 3 }) {
  const steps = [
    { n: 1 as const, label: 'Breathing' },
    { n: 2 as const, label: 'Body scan' },
    { n: 3 as const, label: 'Sound' },
  ];
  return (
    <View style={si.row}>
      {steps.map((s, i) => (
        <View key={s.n} style={si.stepWrapper}>
          {i > 0 && <View style={[si.connector, active > s.n - 1 && si.connectorDone]} />}
          <View style={si.step}>
            <View style={[
              si.dot,
              active === s.n && si.dotActive,
              active > s.n && si.dotDone,
            ]}>
              <Text style={[si.dotText, (active === s.n || active > s.n) && si.dotTextActive]}>
                {active > s.n ? '✓' : String(s.n)}
              </Text>
            </View>
            <Text style={[si.label, active === s.n && si.labelActive]}>
              {s.label}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const si = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
  },
  stepWrapper: { flexDirection: 'row', alignItems: 'center' },
  connector: {
    width: 32,
    height: 1,
    backgroundColor: Colors.white + '30',
    marginBottom: 18,
  },
  connectorDone: { backgroundColor: Colors.calmWave + '70' },
  step: { alignItems: 'center', gap: 4 },
  dot: {
    width: 26, height: 26, borderRadius: 13,
    borderWidth: 1,
    borderColor: Colors.white + '40',
    alignItems: 'center', justifyContent: 'center',
  },
  dotActive: {
    borderColor: Colors.calmWave,
    backgroundColor: Colors.calmWave + '20',
  },
  dotDone: {
    borderColor: Colors.calmWave,
    backgroundColor: Colors.calmWave,
  },
  dotText: { fontSize: 11, fontWeight: '500' as const, color: Colors.white + '60' },
  dotTextActive: { color: Colors.white },
  label: { ...Typography.caption, color: Colors.white + '50', fontSize: 10 },
  labelActive: { color: Colors.calmWave },
});

// ─── Screen ────────────────────────────────────────────────────────────────────

export default function SleepRoutineScreen() {
  const { preferences } = usePreferences();
  const isPremium = preferences?.isPremium ?? false;

  const [stage, setStage] = useState<RoutineStage>('intro');
  const [upgradeVisible, setUpgradeVisible] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [s1Elapsed, setS1Elapsed] = useState(0);
  const [s2Elapsed, setS2Elapsed] = useState(0);

  const s1IntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const s2IntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const s1ElapsedRef = useRef(0);
  const s2ElapsedRef = useRef(0);
  const sessionStartRef = useRef<number | null>(null);
  const sessionSavedRef = useRef(false);
  const prevBoxPhaseRef = useRef<string>('');
  const isKeepAwakeActive = useRef(false);

  function safeDeactivate() {
    if (!isKeepAwakeActive.current) return;
    isKeepAwakeActive.current = false;
    try { deactivateKeepAwake(); } catch {}
  }

  // Shared animation values
  const stageOpacity = useSharedValue(1);
  const circleScale = useSharedValue(RESTING_SCALE);
  const breathOrbScale = useSharedValue(1);

  const stageAnimStyle = useAnimatedStyle(() => ({ opacity: stageOpacity.value }));
  const circleAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: circleScale.value }],
  }));
  const breathOrbStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breathOrbScale.value }],
  }));

  // ── Box phase animation (tracks s1Elapsed changes) ────────────────────────
  useEffect(() => {
    if (stage !== 'stage1' || isPaused) return;
    const phase = getBoxPhase(s1Elapsed);
    if (phase === prevBoxPhaseRef.current) return;
    prevBoxPhaseRef.current = phase;
    const ease = Easing.inOut(Easing.ease);
    if (phase === 'inhale') {
      circleScale.value = withTiming(EXPANDED_SCALE, { duration: 4000, easing: ease });
    } else if (phase === 'exhale') {
      circleScale.value = withTiming(RESTING_SCALE, { duration: 4000, easing: ease });
    }
  }, [s1Elapsed, stage, isPaused]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fade + set stage helper ────────────────────────────────────────────────
  function goToStage(next: RoutineStage) {
    stageOpacity.value = withTiming(0, { duration: 400 }, (finished) => {
      if (finished) {
        runOnJS(setStage)(next);
        stageOpacity.value = withTiming(1, { duration: 600 });
      }
    });
  }

  // ── Stage 1: box breathing ─────────────────────────────────────────────────
  function startStage1() {
    prevBoxPhaseRef.current = '';
    circleScale.value = RESTING_SCALE;
    s1ElapsedRef.current = 0;
    setS1Elapsed(0);
    if (s1IntervalRef.current) clearInterval(s1IntervalRef.current);
    s1IntervalRef.current = setInterval(() => {
      s1ElapsedRef.current += 1;
      setS1Elapsed(s1ElapsedRef.current);
      if (s1ElapsedRef.current >= STAGE1_SECONDS) {
        clearInterval(s1IntervalRef.current!);
        s1IntervalRef.current = null;
        goToStage('stage2');
        startStage2();
      }
    }, 1000);
  }

  // ── Stage 2: body scan ─────────────────────────────────────────────────────
  function startBreathOrb() {
    breathOrbScale.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 5000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.8, { duration: 5000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }

  function stopBreathOrb() {
    cancelAnimation(breathOrbScale);
    breathOrbScale.value = withTiming(1, { duration: 600 });
  }

  function startStage2() {
    cancelAnimation(circleScale);
    startBreathOrb();
    s2ElapsedRef.current = 0;
    setS2Elapsed(0);
    if (s2IntervalRef.current) clearInterval(s2IntervalRef.current);
    s2IntervalRef.current = setInterval(() => {
      s2ElapsedRef.current += 1;
      setS2Elapsed(s2ElapsedRef.current);
      if (s2ElapsedRef.current >= STAGE2_SECONDS) {
        clearInterval(s2IntervalRef.current!);
        s2IntervalRef.current = null;
        stopBreathOrb();
        if (!sessionSavedRef.current) {
          saveSession(STAGE1_SECONDS + STAGE2_SECONDS);
          sessionSavedRef.current = true;
        }
        safeDeactivate();
        goToStage('stage3');
      }
    }, 1000);
  }

  // ── Begin ──────────────────────────────────────────────────────────────────
  function handleBegin() {
    sessionStartRef.current = Date.now();
    sessionSavedRef.current = false;
    setIsPaused(false);
    setStage('stage1');
    startStage1();
    isKeepAwakeActive.current = true;
    activateKeepAwakeAsync().catch(() => { isKeepAwakeActive.current = false; });
  }

  // ── Pause / Resume ─────────────────────────────────────────────────────────
  function handlePause() {
    setIsPaused(true);
    if (s1IntervalRef.current) { clearInterval(s1IntervalRef.current); s1IntervalRef.current = null; }
    if (s2IntervalRef.current) { clearInterval(s2IntervalRef.current); s2IntervalRef.current = null; }
    cancelAnimation(circleScale);
    cancelAnimation(breathOrbScale);
  }

  function handleResume() {
    setIsPaused(false);
    if (stage === 'stage1') {
      prevBoxPhaseRef.current = '';
      if (s1IntervalRef.current) clearInterval(s1IntervalRef.current);
      s1IntervalRef.current = setInterval(() => {
        s1ElapsedRef.current += 1;
        setS1Elapsed(s1ElapsedRef.current);
        if (s1ElapsedRef.current >= STAGE1_SECONDS) {
          clearInterval(s1IntervalRef.current!);
          s1IntervalRef.current = null;
          goToStage('stage2');
          startStage2();
        }
      }, 1000);
    } else if (stage === 'stage2') {
      startBreathOrb();
      if (s2IntervalRef.current) clearInterval(s2IntervalRef.current);
      s2IntervalRef.current = setInterval(() => {
        s2ElapsedRef.current += 1;
        setS2Elapsed(s2ElapsedRef.current);
        if (s2ElapsedRef.current >= STAGE2_SECONDS) {
          clearInterval(s2IntervalRef.current!);
          s2IntervalRef.current = null;
          stopBreathOrb();
          if (!sessionSavedRef.current) {
            saveSession(STAGE1_SECONDS + STAGE2_SECONDS);
            sessionSavedRef.current = true;
          }
          safeDeactivate();
          goToStage('stage3');
        }
      }, 1000);
    }
  }

  // ── Early end ──────────────────────────────────────────────────────────────
  function handleEndEarly() {
    if (s1IntervalRef.current) { clearInterval(s1IntervalRef.current); s1IntervalRef.current = null; }
    if (s2IntervalRef.current) { clearInterval(s2IntervalRef.current); s2IntervalRef.current = null; }
    cancelAnimation(circleScale);
    stopBreathOrb();
    safeDeactivate();
    if (!sessionSavedRef.current && sessionStartRef.current) {
      const elapsed = Math.floor((Date.now() - sessionStartRef.current) / 1000);
      saveSession(elapsed);
      sessionSavedRef.current = true;
    }
    router.back();
  }

  // ── Stage 3 actions ────────────────────────────────────────────────────────
  function handleOpenSound() {
    router.navigate('/(tabs)/sound' as any);
  }

  function handleDone() {
    setStage('done');
  }

  // ── Cleanup ────────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (s1IntervalRef.current) clearInterval(s1IntervalRef.current);
      if (s2IntervalRef.current) clearInterval(s2IntervalRef.current);
      cancelAnimation(circleScale);
      cancelAnimation(breathOrbScale);
      safeDeactivate();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const activeStageNum = stage === 'stage1' ? 1 : stage === 'stage2' ? 2 : 3;
  const boxPhase = getBoxPhase(s1Elapsed);
  const boxCountdown = getBoxCountdown(s1Elapsed);
  const s1Remaining = STAGE1_SECONDS - s1Elapsed;
  const s2Remaining = STAGE2_SECONDS - s2Elapsed;

  // ── Intro ──────────────────────────────────────────────────────────────────
  if (stage === 'intro') {
    return (
      <SafeAreaView style={styles.safe}>
        <UpgradeModal visible={upgradeVisible} onClose={() => setUpgradeVisible(false)} />
        <ScrollView contentContainerStyle={styles.introScroll} showsVerticalScrollIndicator={false}>
          <Pressable
            style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Back to Relax"
          >
            <Text style={styles.backLabel}>← Relax</Text>
          </Pressable>

          <View style={styles.introHeader}>
            <View style={styles.introBadgeRow}>
              <View style={styles.premiumBadge}>
                <Text style={styles.premiumBadgeText}>Premium</Text>
              </View>
            </View>
            <Text style={styles.introTitle}>Sleep Preparation</Text>
            <Text style={styles.introDuration}>~10 minutes · 3 stages</Text>
          </View>

          <Text style={styles.introBody}>
            A three-stage evening routine that combines box breathing, a
            condensed body scan, and a gentle sound prompt to ease the
            transition into sleep. Each stage builds naturally on the last.
          </Text>

          {/* Stage preview */}
          <View style={styles.stagePreview}>
            {[
              { n: '1', label: 'Box breathing', detail: '5 min — regulate and settle' },
              { n: '2', label: 'Body scan',     detail: '5 min — release and deepen' },
              { n: '3', label: 'Sound therapy', detail: 'Optional — gentle background sound' },
            ].map((s) => (
              <View key={s.n} style={styles.stagePreviewRow}>
                <View style={styles.stagePreviewNum}>
                  <Text style={styles.stagePreviewNumText}>{s.n}</Text>
                </View>
                <View style={styles.stagePreviewContent}>
                  <Text style={styles.stagePreviewLabel}>{s.label}</Text>
                  <Text style={styles.stagePreviewDetail}>{s.detail}</Text>
                </View>
              </View>
            ))}
          </View>

          <Text style={styles.introNote}>
            Lie down in a comfortable position before starting. Use headphones
            or a low speaker volume if you choose to add sound in stage 3.
          </Text>

          {isPremium ? (
            <Pressable
              style={({ pressed }) => [styles.beginBtn, pressed && styles.btnPressed]}
              onPress={handleBegin}
              accessibilityRole="button"
              accessibilityLabel="Begin routine"
            >
              <Text style={styles.beginBtnLabel}>Begin routine</Text>
            </Pressable>
          ) : (
            <Pressable
              style={({ pressed }) => [styles.unlockBtn, pressed && styles.btnPressed]}
              onPress={() => setUpgradeVisible(true)}
              accessibilityRole="button"
              accessibilityLabel="Unlock Premium"
            >
              <Text style={styles.unlockBtnLabel}>Unlock Premium</Text>
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
          <Text style={styles.doneTitle}>Routine complete</Text>
          <Text style={styles.doneBody}>
            You completed your sleep preparation routine. Consistent use of
            this sequence helps condition your nervous system to associate
            these steps with rest.
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

  // ── Active session ─────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.session}>
        {/* Stage indicator */}
        <StageIndicator active={activeStageNum as 1 | 2 | 3} />

        {/* Stage content — fades between stages */}
        <Animated.View style={[styles.stageContent, stageAnimStyle]}>

          {/* ── Stage 1: box breathing ──────────────────────────────────── */}
          {stage === 'stage1' && (
            <View style={styles.stageInner}>
              <Text style={styles.stageTimeLabel}>
                {isPaused ? 'Paused' : `${Math.floor(s1Remaining / 60)}:${String(s1Remaining % 60).padStart(2, '0')}`}
              </Text>

              {/* Animated breathing circle */}
              <View style={styles.circleContainer}>
                <Animated.View style={[styles.circleGlow, circleAnimStyle]} />
                <Animated.View style={[styles.circle, circleAnimStyle]} />
              </View>

              <View style={styles.boxPhaseDisplay}>
                <Text style={styles.boxPhaseLabel}>
                  {BOX_PHASE_LABELS[boxPhase].label}
                </Text>
                <Text style={styles.boxPhaseHint}>
                  {BOX_PHASE_LABELS[boxPhase].hint}
                </Text>
                <Text style={styles.boxCountdown}>{boxCountdown}</Text>
              </View>
            </View>
          )}

          {/* ── Stage 2: body scan ──────────────────────────────────────── */}
          {stage === 'stage2' && (
            <View style={styles.stageInner}>
              {/* Breathing orb background */}
              <Animated.View style={[styles.breathOrb, breathOrbStyle]} />

              <Text style={styles.stageTimeLabel}>
                {isPaused ? 'Paused' : `${Math.floor(s2Remaining / 60)}:${String(s2Remaining % 60).padStart(2, '0')}`}
              </Text>

              <View style={styles.scanPromptArea}>
                <Text style={styles.scanPromptText}>
                  {sleepScanPromptAt(s2Elapsed)}
                </Text>
              </View>
            </View>
          )}

          {/* ── Stage 3: sound prompt ───────────────────────────────────── */}
          {stage === 'stage3' && (
            <View style={styles.stageInner}>
              <View style={styles.soundPromptArea}>
                <Text style={styles.soundPromptTitle}>Begin a gentle background sound</Text>
                <Text style={styles.soundPromptBody}>
                  A low, steady sound — rain, ocean, or soft noise — can help
                  ease your mind toward sleep by providing a steady, neutral
                  signal for your attention to rest on.
                </Text>
                <Text style={styles.soundPromptBody}>
                  This step is optional. If you are already comfortable and
                  sleepy, you can skip it and rest.
                </Text>

                <Pressable
                  style={({ pressed }) => [styles.soundBtn, pressed && styles.btnPressed]}
                  onPress={handleOpenSound}
                  accessibilityRole="button"
                  accessibilityLabel="Open Sound Therapy"
                >
                  <Text style={styles.soundBtnLabel}>Open Sound Therapy</Text>
                </Pressable>
              </View>
            </View>
          )}

        </Animated.View>

        {/* Controls */}
        {(stage === 'stage1' || stage === 'stage2') && (
          <View style={styles.controls}>
            <Pressable
              style={({ pressed }) => [styles.pauseBtn, pressed && styles.btnPressed]}
              onPress={isPaused ? handleResume : handlePause}
              accessibilityRole="button"
              accessibilityLabel={isPaused ? 'Resume' : 'Pause'}
            >
              <Text style={styles.pauseBtnLabel}>{isPaused ? 'Resume' : 'Pause'}</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.endBtn, pressed && styles.btnPressed]}
              onPress={handleEndEarly}
              accessibilityRole="button"
              accessibilityLabel="End session"
            >
              <Text style={styles.endBtnLabel}>End session</Text>
            </Pressable>
          </View>
        )}

        {stage === 'stage3' && (
          <View style={styles.controls}>
            <Pressable
              style={({ pressed }) => [styles.pauseBtn, pressed && styles.btnPressed]}
              onPress={handleDone}
              accessibilityRole="button"
              accessibilityLabel="I'm done for tonight"
            >
              <Text style={styles.pauseBtnLabel}>Done for tonight</Text>
            </Pressable>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.deepTide },

  backBtn: { alignSelf: 'flex-start', paddingVertical: Spacing.sm },
  backBtnPressed: { opacity: 0.6 },
  backLabel: { ...Typography.body, color: Colors.calmWave },

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
  premiumBadge: {
    backgroundColor: Colors.goldLight,
    borderRadius: Radius.chip,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderWidth: Border.width,
    borderColor: Colors.softGold,
  },
  premiumBadgeText: { ...Typography.micro, color: Colors.softGold },
  introTitle: { ...Typography.display, color: Colors.white },
  introDuration: { ...Typography.caption, color: Colors.calmWave },
  introBody: { ...Typography.body, color: Colors.white + 'B3', lineHeight: 26 },
  introNote: {
    ...Typography.caption,
    color: Colors.white + '70',
    lineHeight: 20,
    fontStyle: 'italic',
  },

  stagePreview: {
    gap: Spacing.md,
    backgroundColor: Colors.white + '08',
    borderRadius: Radius.card,
    padding: Spacing.base,
  },
  stagePreviewRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  stagePreviewNum: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.calmWave + '30',
    alignItems: 'center', justifyContent: 'center',
  },
  stagePreviewNumText: { ...Typography.heading2, color: Colors.calmWave },
  stagePreviewContent: { flex: 1, gap: 2 },
  stagePreviewLabel: { ...Typography.heading2, color: Colors.white },
  stagePreviewDetail: { ...Typography.caption, color: Colors.white + '70' },

  beginBtn: {
    backgroundColor: Colors.calmWave,
    borderRadius: Radius.chip,
    paddingVertical: Spacing.base,
    alignItems: 'center',
  },
  beginBtnLabel: { ...Typography.heading2, color: Colors.deepTide },
  unlockBtn: {
    backgroundColor: Colors.softGold,
    borderRadius: Radius.chip,
    paddingVertical: Spacing.base,
    alignItems: 'center',
  },
  unlockBtnLabel: { ...Typography.heading2, color: Colors.white },

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
  doneTitle: { ...Typography.display, color: Colors.white, textAlign: 'center' },
  doneBody: { ...Typography.body, color: Colors.white + 'B3', textAlign: 'center', lineHeight: 26 },
  doneBtn: {
    backgroundColor: Colors.calmWave,
    borderRadius: Radius.chip,
    paddingVertical: Spacing.base,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  doneBtnLabel: { ...Typography.heading2, color: Colors.deepTide },

  // ── Session ───────────────────────────────────────────────────────────────
  session: {
    flex: 1,
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
    gap: Spacing.base,
  },
  stageContent: { flex: 1 },
  stageInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-around',
    overflow: 'hidden',
  },
  stageTimeLabel: {
    fontSize: 22,
    fontWeight: '300' as const,
    color: Colors.white + '80',
    letterSpacing: 1,
  },

  // Stage 1 — box breathing circle
  circleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: CIRCLE_BASE * EXPANDED_SCALE + 40,
    height: CIRCLE_BASE * EXPANDED_SCALE + 40,
  },
  circleGlow: {
    position: 'absolute',
    width: CIRCLE_BASE + 30,
    height: CIRCLE_BASE + 30,
    borderRadius: (CIRCLE_BASE + 30) / 2,
    backgroundColor: Colors.calmWave + '20',
  },
  circle: {
    width: CIRCLE_BASE,
    height: CIRCLE_BASE,
    borderRadius: CIRCLE_BASE / 2,
    backgroundColor: Colors.calmWave + '60',
  },
  boxPhaseDisplay: { alignItems: 'center', gap: 4 },
  boxPhaseLabel: {
    fontSize: 26,
    fontWeight: '400' as const,
    color: Colors.white,
    letterSpacing: -0.3,
  },
  boxPhaseHint: { ...Typography.body, color: Colors.white + '80' },
  boxCountdown: {
    fontSize: 48,
    fontWeight: '300' as const,
    color: Colors.calmWave,
    lineHeight: 56,
  },

  // Stage 2 — body scan
  breathOrb: {
    position: 'absolute',
    width: 380,
    height: 380,
    borderRadius: 190,
    backgroundColor: Colors.calmWave + '12',
  },
  scanPromptArea: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
  scanPromptText: {
    fontSize: 19,
    fontWeight: '300' as const,
    color: Colors.white,
    textAlign: 'center',
    lineHeight: 32,
  },

  // Stage 3 — sound prompt
  soundPromptArea: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.lg,
    paddingHorizontal: Spacing.xs,
  },
  soundPromptTitle: {
    ...Typography.heading1,
    color: Colors.calmWave,
    textAlign: 'center',
  },
  soundPromptBody: {
    ...Typography.body,
    color: Colors.white + 'B3',
    textAlign: 'center',
    lineHeight: 24,
  },
  soundBtn: {
    backgroundColor: Colors.calmWave + '25',
    borderWidth: 1,
    borderColor: Colors.calmWave,
    borderRadius: Radius.chip,
    paddingVertical: Spacing.base,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  soundBtnLabel: { ...Typography.heading2, color: Colors.calmWave },

  // Controls
  controls: { gap: Spacing.sm },
  pauseBtn: {
    borderWidth: 1,
    borderColor: Colors.calmWave,
    borderRadius: Radius.chip,
    paddingVertical: Spacing.base,
    alignItems: 'center',
  },
  pauseBtnLabel: { ...Typography.heading2, color: Colors.calmWave },
  endBtn: { paddingVertical: Spacing.sm, alignItems: 'center' },
  endBtnLabel: { ...Typography.body, color: Colors.white + '55' },

  btnPressed: { opacity: 0.7 },
});
