import { useState } from 'react';
import { StyleSheet, Text, View, Pressable, SafeAreaView, ScrollView } from 'react-native';
import Slider from '@react-native-community/slider';
import { router } from 'expo-router';
import { SoundSource } from '@/src/types';
import { useAudioPlayback } from '@/src/hooks/useAudioPlayback';
import { usePreferences } from '@/src/context/PreferencesContext';
import { audioEngine } from '@/src/audio/AudioEngine';
import { formatHz } from '@/src/audio/PitchMatchEngine';
import NowPlayingBar from '@/src/components/NowPlayingBar';
import PremiumGate from '@/src/components/PremiumGate';
import { isAudioAvailable } from '@/src/audio/AudioEngine';
import { Colors, Typography, Spacing, Radius, Border } from '@/src/theme';

// ─── Sound catalogue ──────────────────────────────────────────────────────────

type SoundDef = {
  id: SoundSource;
  name: string;
  description: string;
};

const NOISE_SOUNDS: SoundDef[] = [
  { id: 'white-noise', name: 'White noise',  description: 'Broadband sound with equal energy at every frequency. Effective for masking environmental noise.' },
  { id: 'pink-noise',  name: 'Pink noise',   description: 'Softer and warmer than white noise, with more energy in lower frequencies. Widely used for relaxation.' },
  { id: 'brown-noise', name: 'Brown noise',  description: 'Deep, low-rumble sound modelled on Brownian motion. Gentler on the ears for extended sessions.' },
];

// PLACEHOLDER: Nature sounds are synthesised approximations of real soundscapes.
// Before release, replace the AudioEngine buffer chains for these IDs with
// createFileSource() calls pointing to royalty-free audio files in assets/sounds/.
// Recommended sources: Freesound.org (CC0) or licensed ambient packs.
const NATURE_SOUNDS: SoundDef[] = [
  { id: 'rain',   name: 'Rain',          description: 'Steady rainfall — white noise filtered through a 3 kHz lowpass.' },
  { id: 'ocean',  name: 'Ocean waves',   description: 'Deep rolling waves — brown noise filtered through a 600 Hz lowpass.' },
  { id: 'stream', name: 'Stream',        description: 'Babbling water — white noise bandpassed around 1.8 kHz.' },
  { id: 'forest', name: 'Forest',        description: 'Soft ambient outdoor sound — pink noise filtered at 1.5 kHz.' },
  { id: 'fire',   name: 'Fire',          description: 'Crackling warmth — brown noise filtered through a 500 Hz lowpass.' },
  { id: 'cafe',   name: 'Cafe ambience', description: 'Gentle background murmur — pink noise with a mid-frequency cut.' },
];

const BINAURAL_SOUNDS: SoundDef[] = [
  { id: 'binaural-alpha', name: 'Alpha waves (8–12 Hz)', description: 'Associated with relaxed, wakeful awareness. Carrier 200 Hz, beat 10 Hz.' },
  { id: 'binaural-theta', name: 'Theta waves (4–8 Hz)',  description: 'Associated with deep relaxation and light sleep. Carrier 200 Hz, beat 6 Hz.' },
];

// Timer durations offered in the UI (minutes)
const TIMER_OPTIONS = [15, 30, 60, 90] as const;

// ─── Utilities ────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function soundNameFor(id: SoundSource): string {
  return (
    [...NOISE_SOUNDS, ...NATURE_SOUNDS, ...BINAURAL_SOUNDS].find(
      (s) => s.id === id
    )?.name ?? id
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

// Sound card — used for all three sections
type SoundCardProps = {
  sound: SoundDef;
  isActive: boolean;
  onPress: () => void;
};

function SoundCard({ sound, isActive, onPress }: SoundCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        card.container,
        isActive && card.containerActive,
        pressed && !isActive && card.containerPressed,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        isActive
          ? `${sound.name}, playing. Tap to stop.`
          : `${sound.name}. Tap to play.`
      }
      accessibilityState={{ selected: isActive }}
    >
      <View style={card.body}>
        <Text style={[card.name, isActive && card.nameActive]}>{sound.name}</Text>
        <Text style={[card.description, isActive && card.descriptionActive]}>
          {sound.description}
        </Text>
      </View>
      <View style={[card.iconWell, isActive && card.iconWellActive]}>
        {isActive ? (
          <View style={card.stopIcon}>
            <View style={[card.stopBar, card.stopBarActive]} />
            <View style={[card.stopBar, card.stopBarActive]} />
          </View>
        ) : (
          <View style={card.playTriangle} />
        )}
      </View>
    </Pressable>
  );
}

const card = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderRadius: Radius.card,
    padding: Spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  containerActive: { backgroundColor: Colors.deepTide },
  containerPressed: { opacity: 0.8 },
  body: { flex: 1, gap: 4 },
  name: { ...Typography.heading2, color: Colors.darkText },
  nameActive: { color: Colors.white },
  description: { ...Typography.body, color: Colors.midGray },
  descriptionActive: { color: Colors.calmWave },
  iconWell: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.tealLight,
    justifyContent: 'center', alignItems: 'center',
  },
  iconWellActive: { backgroundColor: Colors.calmWave + '30' },
  playTriangle: {
    width: 0, height: 0,
    borderTopWidth: 7, borderBottomWidth: 7, borderLeftWidth: 12,
    borderTopColor: Colors.transparent, borderBottomColor: Colors.transparent,
    borderLeftColor: Colors.deepTide,
    marginLeft: 3,
  },
  stopIcon: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  stopBar: { width: 3, height: 14, borderRadius: 2, backgroundColor: Colors.midGray },
  stopBarActive: { backgroundColor: Colors.calmWave },
});

// Now Playing panel — shown while audio is active
type NowPlayingProps = {
  soundName: string;
  timeRemaining: number | null;
  selectedTimer: number | null;
  onSetTimer: (minutes: number | null) => void;
  onStop: () => void;
};

function NowPlayingPanel({
  soundName,
  timeRemaining,
  selectedTimer,
  onSetTimer,
  onStop,
}: NowPlayingProps) {
  const isFading =
    timeRemaining !== null && timeRemaining > 0 && timeRemaining <= 10;

  return (
    <View style={np.container}>
      {/* Header row */}
      <View style={np.headerRow}>
        <View style={np.indicatorRow}>
          <View style={[np.dot, isFading && np.dotFading]} />
          <Text style={np.label}>
            {isFading ? 'Fading out…' : 'Now playing'}
          </Text>
        </View>
        <Pressable
          style={np.stopButton}
          onPress={onStop}
          accessibilityRole="button"
          accessibilityLabel="Stop playback"
        >
          <Text style={np.stopLabel}>Stop</Text>
        </Pressable>
      </View>

      <Text style={np.soundName}>{soundName}</Text>

      {/* Timer display or selector */}
      {timeRemaining !== null ? (
        <View style={np.timerRow}>
          <Text style={[np.countdown, isFading && np.countdownFading]}>
            {formatTime(timeRemaining)}
          </Text>
          <Text style={np.countdownSuffix}>remaining</Text>
        </View>
      ) : (
        <View style={np.timerPickerRow}>
          <Text style={np.timerPickerLabel}>Set timer:</Text>
          {TIMER_OPTIONS.map((min) => (
            <Pressable
              key={min}
              style={({ pressed }) => [
                np.timerChip,
                selectedTimer === min && np.timerChipActive,
                pressed && np.timerChipPressed,
              ]}
              onPress={() => onSetTimer(selectedTimer === min ? null : min)}
              accessibilityRole="button"
              accessibilityLabel={`${min} minute timer${selectedTimer === min ? ', selected' : ''}`}
            >
              <Text
                style={[
                  np.timerChipLabel,
                  selectedTimer === min && np.timerChipLabelActive,
                ]}
              >
                {min}m
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const np = StyleSheet.create({
  container: {
    backgroundColor: Colors.deepTide,
    borderRadius: Radius.card,
    padding: Spacing.base,
    gap: Spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  indicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: Colors.calmWave,
  },
  dotFading: {
    backgroundColor: Colors.softGold,
  },
  label: { ...Typography.micro, color: Colors.calmWave },
  stopButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.chip,
    borderWidth: Border.width * 2,
    borderColor: Colors.calmWave + '60',
  },
  stopLabel: { ...Typography.caption, color: Colors.white },
  soundName: { ...Typography.heading1, color: Colors.white },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  countdown: {
    fontSize: 32,
    fontWeight: '400',
    color: Colors.white,
    lineHeight: 38,
  },
  countdownFading: { color: Colors.softGold },
  countdownSuffix: { ...Typography.body, color: Colors.calmWave },
  timerPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexWrap: 'wrap',
    marginTop: Spacing.xs,
  },
  timerPickerLabel: { ...Typography.caption, color: Colors.calmWave },
  timerChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.chip,
    borderWidth: Border.width * 2,
    borderColor: Colors.calmWave + '50',
  },
  timerChipActive: {
    backgroundColor: Colors.calmWave,
    borderColor: Colors.calmWave,
  },
  timerChipPressed: { opacity: 0.7 },
  timerChipLabel: { ...Typography.micro, color: Colors.white },
  timerChipLabelActive: { color: Colors.deepTide },
});

// Timer selector — shown when nothing is playing
function TimerSelector({
  selected,
  onSelect,
}: {
  selected: number | null;
  onSelect: (min: number | null) => void;
}) {
  return (
    <View style={ts.container}>
      <Text style={ts.label}>Session timer</Text>
      <Text style={ts.hint}>Audio fades out gently when the timer ends.</Text>
      <View style={ts.chipRow}>
        <Pressable
          style={({ pressed }) => [
            ts.chip,
            selected === null && ts.chipActive,
            pressed && ts.chipPressed,
          ]}
          onPress={() => onSelect(null)}
          accessibilityRole="button"
          accessibilityLabel="No timer"
        >
          <Text style={[ts.chipLabel, selected === null && ts.chipLabelActive]}>
            No timer
          </Text>
        </Pressable>
        {TIMER_OPTIONS.map((min) => (
          <Pressable
            key={min}
            style={({ pressed }) => [
              ts.chip,
              selected === min && ts.chipActive,
              pressed && ts.chipPressed,
            ]}
            onPress={() => onSelect(selected === min ? null : min)}
            accessibilityRole="button"
            accessibilityLabel={`${min} minute timer`}
          >
            <Text
              style={[ts.chipLabel, selected === min && ts.chipLabelActive]}
            >
              {min} min
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const ts = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderRadius: Radius.card,
    padding: Spacing.base,
    gap: Spacing.sm,
  },
  label: { ...Typography.heading2, color: Colors.darkText },
  hint: { ...Typography.caption, color: Colors.midGray },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.xs },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.chip,
    borderWidth: Border.width * 2,
    borderColor: Colors.midGray + '50',
  },
  chipActive: {
    backgroundColor: Colors.deepTide,
    borderColor: Colors.deepTide,
  },
  chipPressed: { opacity: 0.7 },
  chipLabel: { ...Typography.micro, color: Colors.midGray },
  chipLabelActive: { color: Colors.white },
});

// Section heading
function SectionHeading({ label }: { label: string }) {
  return <Text style={styles.sectionLabel}>{label}</Text>;
}

// ─── Notched therapy card ─────────────────────────────────────────────────────

type NotchedCardProps = {
  frequencyHz: number;
  isActive: boolean;
  onToggle: () => void;
};

function NotchedTherapyCard({ frequencyHz, isActive, onToggle }: NotchedCardProps) {
  return (
    <View style={nt.card}>
      <View style={nt.headerRow}>
        <View style={nt.titleBlock}>
          <Text style={nt.title}>Notched sound therapy</Text>
          <Text style={nt.frequency}>Notch at {formatHz(frequencyHz)}</Text>
        </View>
        <Pressable
          style={({ pressed }) => [
            nt.toggle,
            isActive && nt.toggleActive,
            pressed && nt.togglePressed,
          ]}
          onPress={onToggle}
          accessibilityRole="switch"
          accessibilityState={{ checked: isActive }}
          accessibilityLabel={`Notched therapy ${isActive ? 'on' : 'off'}`}
        >
          <Text style={[nt.toggleLabel, isActive && nt.toggleLabelActive]}>
            {isActive ? 'On' : 'Off'}
          </Text>
        </Pressable>
      </View>
      <Text style={nt.body}>
        Based on research by Okamoto et al. (2010), listening to sound with a
        narrow notch removed at your tinnitus frequency may reduce auditory
        cortex activity at that frequency over time. Play any sound above with
        notched therapy enabled.
      </Text>
      {isActive && (
        <View style={nt.activeBadge}>
          <Text style={nt.activeBadgeText}>
            Notch filter active — sounds currently play with a notch at {formatHz(frequencyHz)}
          </Text>
        </View>
      )}
    </View>
  );
}

const nt = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.card,
    padding: Spacing.base,
    gap: Spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  titleBlock: { flex: 1, gap: 2 },
  title: { ...Typography.heading2, color: Colors.darkText },
  frequency: { ...Typography.caption, color: Colors.midGray },
  toggle: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.chip,
    borderWidth: Border.width * 2,
    borderColor: Colors.midGray + '50',
    minWidth: 52,
    alignItems: 'center',
  },
  toggleActive: {
    backgroundColor: Colors.deepTide,
    borderColor: Colors.deepTide,
  },
  togglePressed: { opacity: 0.7 },
  toggleLabel: { ...Typography.micro, color: Colors.midGray },
  toggleLabelActive: { color: Colors.white },
  body: { ...Typography.body, color: Colors.midGray, lineHeight: 22 },
  activeBadge: {
    backgroundColor: Colors.tealLight,
    borderRadius: Radius.chip,
    padding: Spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: Colors.calmWave,
  },
  activeBadgeText: { ...Typography.caption, color: Colors.deepTide },
});

// ─── Pitch matching entry ─────────────────────────────────────────────────────

function PitchMatchingEntry({ savedHz }: { savedHz: number | null }) {
  return (
    <Pressable
      style={({ pressed }) => [pm.container, pressed && pm.pressed]}
      onPress={() => router.push('/sound/pitch-matching')}
      accessibilityRole="button"
      accessibilityLabel="Open pitch matching"
    >
      <View style={pm.body}>
        <Text style={pm.title}>Pitch matching</Text>
        <Text style={pm.subtitle}>
          {savedHz
            ? `Saved frequency: ${formatHz(savedHz)}`
            : 'Find your tinnitus frequency using a tone sweep'}
        </Text>
      </View>
      <Text style={pm.arrow}>›</Text>
    </Pressable>
  );
}

const pm = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderRadius: Radius.card,
    padding: Spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  pressed: { opacity: 0.8 },
  body: { flex: 1, gap: 2 },
  title: { ...Typography.heading2, color: Colors.darkText },
  subtitle: { ...Typography.body, color: Colors.midGray },
  arrow: { ...Typography.heading1, color: Colors.midGray },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

// ─── 3-Source mixer preview (Premium) ────────────────────────────────────────

const MIXER_SOUNDS: SoundDef[] = [
  { id: 'white-noise', name: 'White noise', description: '' },
  { id: 'rain',        name: 'Rain',        description: '' },
  { id: 'ocean',       name: 'Ocean waves', description: '' },
];

function MixerPreview() {
  return (
    <View style={mx.container}>
      {MIXER_SOUNDS.map((s, i) => (
        <View key={s.id} style={mx.row}>
          <Text style={mx.label}>{s.name}</Text>
          <Slider
            style={mx.slider}
            minimumValue={0}
            maximumValue={1}
            value={i === 0 ? 0.7 : i === 1 ? 0.4 : 0.3}
            minimumTrackTintColor={Colors.calmWave}
            maximumTrackTintColor={Colors.midGray + '40'}
            thumbTintColor={Colors.deepTide}
            disabled
          />
          <Text style={mx.pct}>{i === 0 ? '70%' : i === 1 ? '40%' : '30%'}</Text>
        </View>
      ))}
    </View>
  );
}

const mx = StyleSheet.create({
  container: { padding: Spacing.base, gap: Spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  label: { ...Typography.caption, color: Colors.darkText, width: 88 },
  slider: { flex: 1, height: 32 },
  pct: { ...Typography.caption, color: Colors.midGray, width: 32, textAlign: 'right' },
});

// ─── Per-ear balance preview (Premium) ───────────────────────────────────────

function BalancePreview() {
  return (
    <View style={bal.container}>
      <View style={bal.labelRow}>
        <Text style={bal.endLabel}>L</Text>
        <Text style={bal.centreLabel}>Centre</Text>
        <Text style={bal.endLabel}>R</Text>
      </View>
      <Slider
        style={bal.slider}
        minimumValue={-1}
        maximumValue={1}
        value={0}
        minimumTrackTintColor={Colors.midGray + '40'}
        maximumTrackTintColor={Colors.midGray + '40'}
        thumbTintColor={Colors.deepTide}
        disabled
      />
    </View>
  );
}

const bal = StyleSheet.create({
  container: { padding: Spacing.base, gap: Spacing.sm },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  endLabel: { ...Typography.caption, color: Colors.darkText },
  centreLabel: { ...Typography.caption, color: Colors.midGray },
  slider: { width: '100%', height: 32 },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function SoundScreen() {
  const {
    currentSound,
    isPlaying,
    isPaused,
    selectedTimer,
    timeRemaining,
    toggle,
    pauseResume,
    stopAll,
    setTimer,
  } = useAudioPlayback();

  const { preferences } = usePreferences();
  const savedPitchHz = preferences?.matchedPitchHz ?? null;
  const isPremium = preferences?.isPremium ?? false;
  const [notchedActive, setNotchedActive] = useState(false);

  function handleNotchedToggle() {
    if (!savedPitchHz) return;
    const next = !notchedActive;
    setNotchedActive(next);
    if (next) {
      audioEngine.enableNotchedTherapy(savedPitchHz);
    } else {
      audioEngine.disableNotchedTherapy();
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Scrollable content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Sound</Text>

        {/* Expo Go / no dev build notice */}
        {!isAudioAvailable() && (
          <View style={styles.devNotice}>
            <Text style={styles.devNoticeText}>
              Audio requires a development build — playback is not available in Expo Go.
            </Text>
          </View>
        )}

        {/* Pitch matching entry */}
        <View style={styles.section}>
          <SectionHeading label="Pitch matching & therapy" />
          <PitchMatchingEntry savedHz={savedPitchHz} />
          {savedPitchHz !== null && (
            <NotchedTherapyCard
              frequencyHz={savedPitchHz}
              isActive={notchedActive}
              onToggle={handleNotchedToggle}
            />
          )}
        </View>

        {/* Background noise */}
        <View style={styles.section}>
          <SectionHeading label="Background noise" />
          {NOISE_SOUNDS.map((s) => (
            <SoundCard
              key={s.id}
              sound={s}
              isActive={currentSound === s.id}
              onPress={() => toggle(s.id)}
            />
          ))}
        </View>

        {/* Nature sounds */}
        <View style={styles.section}>
          <SectionHeading label="Nature sounds" />
          {NATURE_SOUNDS.map((s) => (
            <SoundCard
              key={s.id}
              sound={s}
              isActive={currentSound === s.id}
              onPress={() => toggle(s.id)}
            />
          ))}
        </View>

        {/* Binaural beats */}
        <View style={styles.section}>
          <SectionHeading label="Binaural beats" />
          <View style={styles.advisoryCard}>
            <Text style={styles.advisoryHeading}>Headphones required</Text>
            <Text style={styles.advisoryBody}>
              Binaural beats require stereo headphones to work — they are not
              effective through speakers. Use at a comfortable volume. Not
              recommended while driving or operating machinery. If you have a
              history of seizures or epilepsy, consult your doctor before use.
            </Text>
          </View>
          {BINAURAL_SOUNDS.map((s) => (
            <SoundCard
              key={s.id}
              sound={s}
              isActive={currentSound === s.id}
              onPress={() => toggle(s.id)}
            />
          ))}
        </View>

        {/* 3-Source mixer — Premium */}
        <View style={styles.section}>
          <View style={styles.premiumSectionHeader}>
            <SectionHeading label="Sound mixer" />
            <View style={styles.premiumBadge}>
              <Text style={styles.premiumBadgeText}>Premium</Text>
            </View>
          </View>
          <PremiumGate isPremium={isPremium} featureName="3-source sound mixer">
            <MixerPreview />
          </PremiumGate>
        </View>

        {/* Per-ear balance — Premium */}
        <View style={styles.section}>
          <View style={styles.premiumSectionHeader}>
            <SectionHeading label="Per-ear balance" />
            <View style={styles.premiumBadge}>
              <Text style={styles.premiumBadgeText}>Premium</Text>
            </View>
          </View>
          <PremiumGate isPremium={isPremium} featureName="Per-ear volume balance">
            <BalancePreview />
          </PremiumGate>
        </View>

        {/* Timer selector — only shown when nothing is playing */}
        {!isPlaying && (
          <TimerSelector selected={selectedTimer} onSelect={setTimer} />
        )}
      </ScrollView>

      {/* Fixed Now Playing bar — outside ScrollView, pinned above safe area */}
      {isPlaying && currentSound && (
        <NowPlayingBar
          currentSound={currentSound}
          isPaused={isPaused}
          timeRemaining={timeRemaining}
          selectedTimer={selectedTimer}
          onPauseResume={pauseResume}
          onStop={stopAll}
          onSetTimer={setTimer}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.warmSand,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
    gap: Spacing.xl,
  },
  title: {
    ...Typography.display,
    color: Colors.darkText,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionLabel: {
    ...Typography.micro,
    color: Colors.midGray,
    marginBottom: Spacing.xs,
  },

  // Binaural advisory card
  advisoryCard: {
    backgroundColor: Colors.tealLight,
    borderRadius: Radius.card,
    padding: Spacing.base,
    gap: Spacing.xs,
    borderLeftWidth: 3,
    borderLeftColor: Colors.calmWave,
  },
  advisoryHeading: {
    ...Typography.heading2,
    color: Colors.deepTide,
  },
  advisoryBody: {
    ...Typography.body,
    color: Colors.deepTide,
    lineHeight: 22,
  },

  // Dev build notice
  devNotice: {
    backgroundColor: Colors.goldLight,
    borderRadius: Radius.card,
    padding: Spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.softGold,
  },
  devNoticeText: {
    ...Typography.caption,
    color: Colors.softGold,
  },

  // Premium section header
  premiumSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  premiumBadge: {
    backgroundColor: Colors.goldLight,
    borderRadius: Radius.chip,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderWidth: Border.width,
    borderColor: Colors.softGold,
  },
  premiumBadgeText: {
    ...Typography.micro,
    color: Colors.softGold,
  },
});
