import { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView, Platform } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { Colors, Typography, Spacing, Radius, Border } from '@/src/theme';
import { saveSoundSession, createSessionId } from '@/src/storage/soundSessions';
import { usePreferences } from '@/src/context/PreferencesContext';
import UpgradeModal from '@/src/components/UpgradeModal';

// ─── Session constants ────────────────────────────────────────────────────────

const TOTAL_SECONDS = 900; // 15 min

// ─── Body diagram ─────────────────────────────────────────────────────────────

const BODY_W = 110;
const BODY_H = 295;

type PartId =
  | 'head' | 'neck' | 'shoulders' | 'chest' | 'abdomen' | 'hips'
  | 'l-arm-up' | 'r-arm-up' | 'l-arm-lo' | 'r-arm-lo'
  | 'l-hand' | 'r-hand'
  | 'l-thigh' | 'r-thigh' | 'l-calf' | 'r-calf' | 'l-foot' | 'r-foot';

const PARTS: Record<PartId, { left: number; top: number; width: number; height: number; borderRadius?: number }> = {
  head:       { left: 35, top: 0,   width: 40, height: 40, borderRadius: 20 },
  neck:       { left: 49, top: 40,  width: 12, height: 14, borderRadius: 2 },
  shoulders:  { left:  8, top: 54,  width: 94, height: 18, borderRadius: 6 },
  chest:      { left: 22, top: 72,  width: 66, height: 40 },
  abdomen:    { left: 24, top: 112, width: 62, height: 30 },
  hips:       { left: 18, top: 142, width: 74, height: 22, borderRadius: 4 },
  'l-arm-up': { left:  2, top: 58,  width: 16, height: 55, borderRadius: 6 },
  'r-arm-up': { left: 92, top: 58,  width: 16, height: 55, borderRadius: 6 },
  'l-arm-lo': { left:  4, top: 113, width: 14, height: 45, borderRadius: 4 },
  'r-arm-lo': { left: 92, top: 113, width: 14, height: 45, borderRadius: 4 },
  'l-hand':   { left:  2, top: 158, width: 18, height: 22, borderRadius: 6 },
  'r-hand':   { left: 90, top: 158, width: 18, height: 22, borderRadius: 6 },
  'l-thigh':  { left: 20, top: 164, width: 28, height: 65, borderRadius: 4 },
  'r-thigh':  { left: 62, top: 164, width: 28, height: 65, borderRadius: 4 },
  'l-calf':   { left: 22, top: 229, width: 24, height: 50, borderRadius: 4 },
  'r-calf':   { left: 62, top: 229, width: 24, height: 50, borderRadius: 4 },
  'l-foot':   { left: 16, top: 279, width: 30, height: 14, borderRadius: 6 },
  'r-foot':   { left: 58, top: 279, width: 30, height: 14, borderRadius: 6 },
};

const GROUP_PARTS: Record<string, PartId[]> = {
  feet:      ['l-foot', 'r-foot'],
  calves:    ['l-calf', 'r-calf'],
  thighs:    ['l-thigh', 'r-thigh'],
  hips:      ['hips', 'abdomen'],
  abdomen:   ['abdomen'],
  chest:     ['chest'],
  hands:     ['l-hand', 'r-hand'],
  forearms:  ['l-arm-lo', 'r-arm-lo'],
  biceps:    ['l-arm-up', 'r-arm-up'],
  shoulders: ['shoulders'],
  neck:      ['neck'],
  face:      ['head'],
  whole:     ['head', 'neck', 'shoulders', 'chest', 'abdomen', 'hips',
               'l-arm-up', 'r-arm-up', 'l-arm-lo', 'r-arm-lo',
               'l-hand', 'r-hand', 'l-thigh', 'r-thigh',
               'l-calf', 'r-calf', 'l-foot', 'r-foot'],
};

function BodyDiagram({ activeGroup }: { activeGroup: string }) {
  const active = new Set<PartId>(GROUP_PARTS[activeGroup] ?? []);
  return (
    <View style={{ width: BODY_W, height: BODY_H }}>
      {(Object.entries(PARTS) as [PartId, typeof PARTS[PartId]][]).map(([id, p]) => (
        <View
          key={id}
          style={{
            position: 'absolute',
            left: p.left,
            top: p.top,
            width: p.width,
            height: p.height,
            borderRadius: p.borderRadius ?? 0,
            backgroundColor: active.has(id) ? Colors.calmWave : Colors.calmWave + '28',
            borderWidth: 1,
            borderColor: active.has(id) ? Colors.calmWave : Colors.calmWave + '50',
          }}
        />
      ))}
    </View>
  );
}

// ─── Prompts ──────────────────────────────────────────────────────────────────

const PMR_GROUPS = [
  { at: 0,   group: 'feet',      heading: 'Feet & toes',
    text: 'Curl your toes firmly downward, feeling the tension build through your feet. Hold it... now release completely. Feel the warmth spreading.' },
  { at: 60,  group: 'calves',    heading: 'Calves',
    text: 'Pull your feet gently toward you, tensing your calf muscles. Hold... and release. Let your legs go heavy and still.' },
  { at: 120, group: 'thighs',    heading: 'Thighs',
    text: 'Squeeze your thigh muscles firmly together. Hold the tension... now let it go completely. Notice the contrast.' },
  { at: 180, group: 'hips',      heading: 'Hips & glutes',
    text: 'Clench your glutes firmly. Hold... and release. Feel your lower body sinking into a deeper state of ease.' },
  { at: 240, group: 'abdomen',   heading: 'Abdomen',
    text: 'Draw your stomach muscles in gently, holding them firm. Hold... and release. Allow your breath to deepen naturally.' },
  { at: 300, group: 'chest',     heading: 'Chest',
    text: 'Take a slow breath in and hold it. Feel the tension across your chest and ribs... now exhale fully, releasing everything at once.' },
  { at: 360, group: 'hands',     heading: 'Hands',
    text: 'Make tight fists with both hands. Squeeze firmly. Hold... now let your fingers spread open wide. Feel the release.' },
  { at: 420, group: 'forearms',  heading: 'Forearms',
    text: 'Bend your hands back at the wrists, tensing your forearms. Hold... and release. Your arms are becoming pleasantly heavy.' },
  { at: 480, group: 'biceps',    heading: 'Upper arms',
    text: 'Bend your elbows and squeeze your biceps as tightly as you can. Hold the tension... and lower your arms, releasing completely.' },
  { at: 540, group: 'shoulders', heading: 'Shoulders',
    text: 'Shrug your shoulders up toward your ears as far as they will go. Hold... and let them drop completely. Notice the space opening.' },
  { at: 600, group: 'neck',      heading: 'Neck',
    text: 'Gently press the back of your head back, tensing the muscles in your neck. Hold... and release. Let your head be fully supported.' },
  { at: 660, group: 'face',      heading: 'Jaw & mouth',
    text: 'Clench your jaw and press your tongue to the roof of your mouth. Hold... now release and let your jaw drop open slightly.' },
  { at: 720, group: 'face',      heading: 'Face',
    text: 'Scrunch your face tightly — eyes, cheeks, nose, forehead. Hold... and release. Let your face completely smooth and soften.' },
  { at: 780, group: 'face',      heading: 'Forehead',
    text: 'Raise your eyebrows as high as they will go, tensing your forehead. Hold... and let them fall. Your forehead is smooth and at rest.' },
  { at: 840, group: 'whole',     heading: 'Whole body',
    text: 'Scan slowly from your feet to your forehead. Notice the contrast between tension and this new state of ease. Rest here.' },
];

function currentGroup(elapsed: number) {
  let g = PMR_GROUPS[0];
  for (const p of PMR_GROUPS) {
    if (elapsed >= p.at) g = p;
  }
  return g;
}

// ─── Session helper ───────────────────────────────────────────────────────────

function saveSession(durationSeconds: number) {
  if (Platform.OS === 'web' || durationSeconds < 5) return;
  try {
    saveSoundSession({
      id: createSessionId(),
      date: new Date().toISOString(),
      sounds: ['pmr-15min'],
      durationSeconds,
      timerMinutes: 0,
      volume: 1,
      balance: 0,
      notchedFrequency: null,
    });
  } catch {}
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PMRScreen() {
  const { preferences } = usePreferences();
  const isPremium = preferences?.isPremium ?? false;

  const [stage, setStage] = useState<'intro' | 'session' | 'done'>('intro');
  const [upgradeVisible, setUpgradeVisible] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);
  const sessionStartRef = useRef<number | null>(null);

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
    deactivateKeepAwake();
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
    startTick();
    activateKeepAwakeAsync();
  }

  function handlePause() {
    setIsPaused(true);
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }

  function handleResume() {
    setIsPaused(false);
    startTick();
  }

  function handleEnd() {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    deactivateKeepAwake();
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
      deactivateKeepAwake();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const group = currentGroup(elapsed);
  const progressPct = elapsed / TOTAL_SECONDS;
  const remaining = TOTAL_SECONDS - elapsed;
  const timeLabel = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`;

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
            <Text style={styles.introTitle}>Progressive Muscle Relaxation</Text>
            <Text style={styles.introDuration}>15 minutes</Text>
          </View>

          <Text style={styles.introBody}>
            A guided session that systematically tenses and releases each major
            muscle group from your feet to your face. This technique builds
            deep body awareness and helps reduce physical tension associated
            with tinnitus distress.
          </Text>

          <View style={styles.includesList}>
            {[
              '15 guided muscle groups',
              'Body diagram showing current focus area',
              'Timed narration with clear instructions',
              'Suitable at any time of day',
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
          <Text style={styles.doneTitle}>Session complete</Text>
          <Text style={styles.doneBody}>
            You have completed 15 minutes of progressive muscle relaxation.
            Regular practice helps reduce physical tension and supports a
            calmer response to tinnitus over time.
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
      <View style={styles.session}>
        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progressPct * 100}%` as any }]} />
        </View>
        <View style={styles.progressRow}>
          <Text style={styles.progressLabel}>
            {isPaused ? 'Paused' : timeLabel} remaining
          </Text>
          <Text style={styles.progressLabel}>
            {Math.round(progressPct * 100)}%
          </Text>
        </View>

        {/* Body diagram */}
        <View style={styles.diagramArea}>
          <BodyDiagram activeGroup={group.group} />
        </View>

        {/* Current group heading + prompt */}
        <View style={styles.promptArea}>
          <Text style={styles.groupHeading}>{group.heading}</Text>
          <Text style={styles.promptText}>{group.text}</Text>
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
  includesList: { gap: Spacing.sm },
  includesRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  includesDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.calmWave, marginTop: 7 },
  includesText: { ...Typography.body, color: Colors.white + 'B3', flex: 1 },

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
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },
  progressTrack: {
    height: 3,
    backgroundColor: Colors.calmWave + '30',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.calmWave,
    borderRadius: 2,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: { ...Typography.caption, color: Colors.calmWave + 'A0' },

  diagramArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  promptArea: { gap: Spacing.xs },
  groupHeading: {
    ...Typography.heading1,
    color: Colors.calmWave,
  },
  promptText: {
    ...Typography.body,
    color: Colors.white + 'CC',
    lineHeight: 24,
  },

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
