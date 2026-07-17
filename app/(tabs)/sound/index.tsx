import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet, Text, View, Pressable, ScrollView,
  FlatList, useWindowDimensions, LayoutAnimation,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withSequence,
  withTiming, cancelAnimation, Easing,
} from 'react-native-reanimated';
import { SoundSource } from '@/src/types';
import { useAudioPlayback } from '@/src/hooks/useAudioPlayback';
import { usePreferences } from '@/src/context/PreferencesContext';
import { audioEngine } from '@/src/audio/AudioEngine';
import { formatHz } from '@/src/audio/PitchMatchEngine';
import NowPlayingBar from '@/src/components/NowPlayingBar';
import { isAudioAvailable } from '@/src/audio/AudioEngine';
import { Colors, Spacing, Radius, Border } from '@/src/theme';
import { useTheme } from '@/src/context/ThemeContext';
import ComingSoonBadge from '@/src/components/ComingSoonBadge';
import ComingSoonModal from '@/src/components/ComingSoonModal';
import ScrollWithIndicator from '@/src/components/ScrollWithIndicator';

// Approximate rendered height of NowPlayingBar's content (excluding the safe
// area inset, which is added separately) — used to keep scroll content clear
// of the bar when it's overlaid at the bottom of the screen.
const NOW_PLAYING_BAR_HEIGHT = 70;

// ─── Sound catalogue ──────────────────────────────────────────────────────────

type SoundDef = {
  id: SoundSource;
  name: string;
};

const NOISE_SOUNDS: SoundDef[] = [
  { id: 'white-noise', name: 'White noise' },
  { id: 'pink-noise',  name: 'Pink noise' },
  { id: 'brown-noise', name: 'Brown noise' },
];

// PLACEHOLDER: Nature sounds are synthesised approximations.
// Before release, replace AudioEngine buffer chains with createFileSource()
// calls pointing to royalty-free audio files in assets/sounds/.
const NATURE_SOUNDS: SoundDef[] = [
  { id: 'rain',   name: 'Rain' },
  { id: 'ocean',  name: 'Ocean waves' },
  { id: 'stream', name: 'Stream' },
  { id: 'forest', name: 'Forest' },
  { id: 'fire',   name: 'Fire' },
  { id: 'cafe',   name: 'Cafe\nAmbience' },
];

const BINAURAL_SOUNDS: SoundDef[] = [
  { id: 'binaural-alpha', name: 'Alpha waves\n8–12 Hz' },
  { id: 'binaural-theta', name: 'Theta waves\n4–8 Hz' },
];

const TIMER_OPTIONS = [15, 30, 60, 90] as const;

// ─── Card constant ────────────────────────────────────────────────────────────

const CARD_HEIGHT = 120;

// Default waveform icon used for Background Noise and Binaural Beats cards.
const DEFAULT_WAVE = 'M8 19 Q11 12 14 19 Q17 26 19 19 Q21 14 23 19 Q25 24 27 19 Q29 15 30 19';

const ICON_COLOR = Colors.calmWave;
const ICON_SIZE  = 36;   // square dimension for 0 0 48 48 viewBox icons

// Nature sound icons — SVG path strings in the shared viewBox ("4 9 30 20").
// Ocean and Forest are handled in SoundIcon below (they need multiple elements).
const SOUND_ICON_PATHS: Partial<Record<SoundSource, string>> = {
  // Cloud outline (bumpy top, flat bottom) + three angled rain drops
  // y-coords shifted +2 so top of cloud clears the viewBox edge with padding
  rain:
    'M8 20 Q8 15 12 15 Q12 12 16 13 Q17 11 20 11 Q23 11 24 13 Q28 12 29 15 Q31 15 31 20 Z' +
    ' M12 22 L13 25 M19 22 L20 25 M26 22 L27 25',

  // Three stacked wavy lines, slightly offset, suggesting flowing water
  stream:
    'M5 15 Q9 13 13 15 Q17 17 21 15 Q25 13 29 15' +
    ' M7 19 Q11 17 15 19 Q19 21 23 19 Q27 17 31 19' +
    ' M5 23 Q9 21 13 23 Q17 25 21 23 Q25 21 29 23',

  // Closed outer flame bezier + inner flame with V-notch at base
  fire:
    'M19 10 C24 13 27 20 24 25 C22 28 16 28 14 25 C11 20 14 13 19 10' +
    ' M16 24 L19 21 L22 24 C24 20 22 16 19 14 C16 16 14 20 16 24',

  // Trapezoid cup + D-shaped handle + two steam wisps
  cafe:
    'M12 15 L26 15 L24 26 L14 26 Z' +
    ' M26 18 C30 18 30 23 26 23' +
    ' M16 13 C15 11 17 10 16 9 M20 13 C21 11 19 10 20 9',
};

// ─── Sound icon ───────────────────────────────────────────────────────────────
// Ocean and Forest need multiple SVG elements so they get their own <Svg>.
// Everything else is routed through SOUND_ICON_PATHS as a single <Path>.

function SoundIcon({ soundId }: { soundId: SoundSource }) {
  if (soundId === 'ocean') {
    return (
      <Svg width={44} height={36} viewBox="0 0 48 24" fill="none">
        <Path
          d="M4 8 C8 4 12 12 16 8 C20 4 24 12 28 8 C32 4 36 12 40 8 C42 6 44 7 44 8"
          stroke={ICON_COLOR}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Path
          d="M4 16 C8 12 12 20 16 16 C20 12 24 20 28 16 C32 12 36 20 40 16 C42 14 44 15 44 16"
          stroke={ICON_COLOR}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity={0.6}
        />
      </Svg>
    );
  }
  if (soundId === 'forest') {
    return (
      <Svg width={44} height={36} viewBox="0 0 48 24" fill="none">
        <Path
          d="M24 3 L36 18 L12 18 Z"
          stroke={ICON_COLOR}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Path
          d="M24 18 L24 23"
          stroke={ICON_COLOR}
          strokeWidth={2}
          strokeLinecap="round"
          fill="none"
        />
      </Svg>
    );
  }
  return (
    <Svg width={44} height={36} viewBox="4 9 30 20">
      <Path
        d={SOUND_ICON_PATHS[soundId] ?? DEFAULT_WAVE}
        stroke={ICON_COLOR}
        strokeWidth={1.8}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ─── Session timer bar ────────────────────────────────────────────────────────

function SessionTimerBar({
  selected,
  onSelect,
}: {
  selected: number | null;
  onSelect: (min: number | null) => void;
}) {
  const { colors, typography } = useTheme();
  const tmr = useMemo(() => makeTmrStyles(colors, typography), [colors, typography]);

  return (
    <View style={tmr.container}>
      <Text style={tmr.label}>Session timer</Text>
      <View style={tmr.pills}>
        <Pressable
          style={[tmr.pill, selected === null && tmr.pillActive]}
          onPress={() => onSelect(null)}
          accessibilityRole="button"
          accessibilityLabel="No timer"
          accessibilityState={{ selected: selected === null }}
        >
          <Text style={[tmr.pillLabel, selected === null && tmr.pillLabelActive]}>Off</Text>
        </Pressable>
        {TIMER_OPTIONS.map((min) => (
          <Pressable
            key={min}
            style={[tmr.pill, selected === min && tmr.pillActive]}
            onPress={() => onSelect(selected === min ? null : min)}
            accessibilityRole="button"
            accessibilityLabel={`${min} minute timer`}
            accessibilityState={{ selected: selected === min }}
          >
            <Text style={[tmr.pillLabel, selected === min && tmr.pillLabelActive]}>
              {min}m
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function makeTmrStyles(
  colors: ReturnType<typeof useTheme>['colors'],
  typography: ReturnType<typeof useTheme>['typography'],
) {
  return StyleSheet.create({
    container: { gap: Spacing.sm },
    label: { ...typography.micro, color: Colors.deepTide },
    pills: { flexDirection: 'row', gap: Spacing.sm },
    pill: {
      flex: 1,
      paddingVertical: Spacing.sm,
      borderRadius: Radius.chip,
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: Colors.deepTide,
    },
    pillActive: {
      backgroundColor: Colors.calmWave,
      borderColor: Colors.calmWave,
    },
    pillLabel:       { ...typography.micro, color: '#5DCAA5' },
    pillLabelActive: { color: Colors.white },
  });
}

// ─── Section heading ──────────────────────────────────────────────────────────

function SectionHeading({ label }: { label: string }) {
  const { typography } = useTheme();
  const sh = useMemo(() => makeShStyles(typography), [typography]);
  return <Text style={sh.text}>{label}</Text>;
}

function makeShStyles(typography: ReturnType<typeof useTheme>['typography']) {
  return StyleSheet.create({
    text: { ...typography.micro, color: Colors.deepTide },
  });
}

// ─── Carousel card ────────────────────────────────────────────────────────────

type CardProps = {
  sound: SoundDef;
  isActive: boolean;
  isPaused: boolean;
  cardWidth: number;
  onToggle: () => void;
  onPauseResume: () => void;
};

function CarouselCard({ sound, isActive, isPaused, cardWidth, onToggle, onPauseResume }: CardProps) {
  const waveOpacity = useSharedValue(0.45);

  useEffect(() => {
    if (isActive && !isPaused) {
      waveOpacity.value = withRepeat(
        withSequence(
          withTiming(1,    { duration: 1200, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.32, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false
      );
    } else {
      cancelAnimation(waveOpacity);
      waveOpacity.value = withTiming(isActive ? 0.7 : 0.45, { duration: 400 });
    }
    return () => { cancelAnimation(waveOpacity); };
  }, [isActive, isPaused]); // eslint-disable-line react-hooks/exhaustive-deps

  const waveStyle = useAnimatedStyle(() => ({ opacity: waveOpacity.value }));

  const a11yLabel = isActive
    ? `${sound.name} ${isPaused ? 'paused' : 'playing'}. Tap to ${isPaused ? 'resume' : 'pause'}.`
    : `${sound.name}. Tap to play.`;

  return (
    <Pressable
      style={[cc.card, { width: cardWidth }]}
      onPress={isActive ? onPauseResume : onToggle}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      accessibilityState={{ selected: isActive }}
    >
      <View style={cc.row}>
        <Animated.View style={[waveStyle, cc.iconWrap]}>
          <SoundIcon soundId={sound.id} />
        </Animated.View>

        <View style={cc.nameWrap}>
          <Text style={cc.name} numberOfLines={2}>{sound.name}</Text>
        </View>

        <View style={cc.playBtn}>
          {isActive && !isPaused ? (
            <View style={cc.pauseIcon}>
              <View style={cc.pauseBar} />
              <View style={cc.pauseBar} />
            </View>
          ) : (
            <View style={cc.playTriangle} />
          )}
        </View>
      </View>

      {isActive && <View style={cc.activeStripe} />}
    </Pressable>
  );
}

const cc = StyleSheet.create({
  card: {
    height: CARD_HEIGHT,
    backgroundColor: Colors.darkCard,
    borderRadius: Radius.card,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    gap: Spacing.md,
  },
  iconWrap: {
    width: 44,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    width: '100%',
    fontSize: 16,
    fontWeight: '500',
    color: Colors.white,
    letterSpacing: -0.2,
    lineHeight: 21,
    textAlign: 'center',
  },
  playBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.calmWave,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  playTriangle: {
    width: 0, height: 0,
    borderTopWidth: 7, borderBottomWidth: 7, borderLeftWidth: 12,
    borderTopColor: Colors.transparent, borderBottomColor: Colors.transparent,
    borderLeftColor: Colors.deepTide,
    marginLeft: 3,
  },
  pauseIcon: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  pauseBar:  { width: 3, height: 14, borderRadius: 2, backgroundColor: Colors.deepTide },
  activeStripe: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: 3,
    backgroundColor: Colors.calmWave,
  },
});

// ─── Sound carousel ───────────────────────────────────────────────────────────

type CarouselProps = {
  sounds: SoundDef[];
  currentSound: SoundSource | null;
  isPaused: boolean;
  onToggle: (id: SoundSource) => void;
  onPauseResume: () => void;
  cardWidth: number;
};

function SoundCarousel({
  sounds, currentSound, isPaused, onToggle, onPauseResume, cardWidth,
}: CarouselProps) {
  const { colors } = useTheme();
  const cr = useMemo(() => makeCrStyles(colors), [colors]);

  const listRef = useRef<FlatList<SoundDef>>(null);
  const [idx, setIdx] = useState(0);

  function goTo(i: number) {
    const next = Math.max(0, Math.min(sounds.length - 1, i));
    listRef.current?.scrollToIndex({ index: next, animated: true });
    setIdx(next);
  }

  return (
    <View style={cr.wrapper}>
      <FlatList
        ref={listRef}
        data={sounds}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const i = Math.round(e.nativeEvent.contentOffset.x / cardWidth);
          setIdx(Math.max(0, Math.min(sounds.length - 1, i)));
        }}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <CarouselCard
            sound={item}
            isActive={currentSound === item.id}
            isPaused={isPaused}
            cardWidth={cardWidth}
            onToggle={() => onToggle(item.id)}
            onPauseResume={onPauseResume}
          />
        )}
        getItemLayout={(_, index) => ({
          length: cardWidth,
          offset: cardWidth * index,
          index,
        })}
      />

      {sounds.length > 1 && (
        <View style={cr.dots}>
          {sounds.map((s, i) => (
            <Pressable
              key={s.id}
              style={[cr.dot, i === idx && cr.dotActive]}
              onPress={() => goTo(i)}
              accessibilityRole="button"
              accessibilityLabel={s.name}
            />
          ))}
        </View>
      )}
    </View>
  );
}

function makeCrStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    wrapper: { gap: Spacing.xs },
    dots: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: Spacing.xs,
      paddingTop: Spacing.xs,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.textSecondary + '50',
    },
    dotActive: { backgroundColor: Colors.calmWave },
  });
}

// ─── Premium teaser ───────────────────────────────────────────────────────────

const PREMIUM_FEATURES = [
  {
    id: 'mixer',
    title: '3-source mixer',
    subtitle: 'Layer sounds at custom volumes',
    description:
      'Blend up to three sounds simultaneously, each with its own volume control — create your perfect personalised soundscape combining noise, nature sounds, and binaural beats.',
  },
  {
    id: 'balance',
    title: 'Per-ear balance',
    subtitle: 'Adjust L/R volume independently',
    description:
      'Adjust the left and right volume balance independently, ideal for people whose tinnitus is louder in one ear than the other.',
  },
] as const;

function PremiumTeaser() {
  const { colors, typography } = useTheme();
  const pt = useMemo(() => makePtStyles(colors, typography), [colors, typography]);
  const [activeFeature, setActiveFeature] = useState<(typeof PREMIUM_FEATURES)[number] | null>(null);

  return (
    <View style={pt.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={pt.scroll}
      >
        {PREMIUM_FEATURES.map((f) => (
          <Pressable
            key={f.id}
            style={({ pressed }) => [pt.card, pressed && pt.cardPressed]}
            onPress={() => setActiveFeature(f)}
            accessibilityRole="button"
            accessibilityLabel={`${f.title} — coming soon. Tap for details.`}
          >
            <ComingSoonBadge />
            <Text style={pt.cardTitle}>{f.title}</Text>
            <Text style={pt.cardSubtitle}>{f.subtitle}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <Text style={pt.moreLabel}>...and more coming soon</Text>

      <ComingSoonModal
        visible={activeFeature !== null}
        onClose={() => setActiveFeature(null)}
        featureName={activeFeature?.title ?? ''}
        description={activeFeature?.description ?? ''}
      />
    </View>
  );
}

function makePtStyles(
  colors: ReturnType<typeof useTheme>['colors'],
  typography: ReturnType<typeof useTheme>['typography'],
) {
  return StyleSheet.create({
    wrapper: { gap: Spacing.md },
    scroll:  { gap: Spacing.md, paddingRight: Spacing.sm },
    card: {
      backgroundColor: colors.surfaceVariant,
      borderRadius: Radius.card,
      padding: Spacing.base,
      width: 190,
      gap: Spacing.xs,
      borderWidth: Border.width,
      borderColor: Colors.deepTide + '30',
    },
    cardPressed:  { opacity: 0.8 },
    cardTitle:    { ...typography.heading2, fontWeight: '600' as const, color: colors.textPrimary },
    cardSubtitle: { ...typography.caption, color: colors.textSecondary, lineHeight: 18 },
    moreLabel:    { ...typography.caption, color: colors.textSecondary, textAlign: 'center' },
  });
}

// ─── Pitch matching entry (tool, not sound) ───────────────────────────────────

function PitchMatchingEntry({ savedHz }: { savedHz: number | null }) {
  const { typography } = useTheme();
  const pm = useMemo(() => makePmStyles(typography), [typography]);

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

function makePmStyles(typography: ReturnType<typeof useTheme>['typography']) {
  return StyleSheet.create({
    container: {
      backgroundColor: Colors.deepTide,
      borderRadius: Radius.card,
      padding: Spacing.base,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
    },
    pressed: { opacity: 0.85 },
    body:     { flex: 1, gap: 4 },
    title:    { ...typography.heading2, color: Colors.white },
    subtitle: { ...typography.body, color: Colors.calmWave },
    arrow:    { ...typography.heading1, color: Colors.calmWave },
  });
}

// ─── Notched therapy card (tool, not sound) ───────────────────────────────────

type NotchedCardProps = {
  frequencyHz: number | null;
  isActive: boolean;
  onToggle: () => void;
};

function NotchedTherapyCard({ frequencyHz, isActive, onToggle }: NotchedCardProps) {
  const { typography } = useTheme();
  const nt = useMemo(() => makeNtStyles(typography), [typography]);
  const [isExpanded, setIsExpanded] = useState(false);

  function toggleExpanded() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded((prev) => !prev);
  }

  return (
    <View style={nt.card}>
      <View style={nt.headerRow}>
        <View style={nt.titleBlock}>
          <Text style={nt.title}>Notched Sound Therapy</Text>
          {frequencyHz !== null && (
            <Text style={nt.frequency}>Notch at {formatHz(frequencyHz)}</Text>
          )}
        </View>
        {frequencyHz !== null && (
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
        )}
      </View>

      {frequencyHz === null ? (
        <View style={nt.requiredNotice}>
          <Text style={nt.requiredText}>
            Pitch matching required — use the pitch matching tool above to find
            and save your tinnitus frequency before enabling notched therapy.
          </Text>
        </View>
      ) : (
        <>
          <Pressable
            style={nt.infoRow}
            onPress={toggleExpanded}
            accessibilityRole="button"
            accessibilityLabel="What is notched sound therapy?"
            accessibilityState={{ expanded: isExpanded }}
          >
            <Text style={nt.infoRowLabel}>What is notched sound therapy?</Text>
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={Colors.calmWave}
            />
          </Pressable>

          {isExpanded && (
            <View style={nt.infoBody}>
              <Text style={nt.body}>
                Notched sound therapy works by removing a narrow band of frequencies
                centred on your personal tinnitus pitch from any sound you play. This
                is based on a process called lateral inhibition — when the auditory
                system processes sound with a frequency "notch", the brain regions
                surrounding your tinnitus frequency become more active, which over
                time may gradually reduce the hyperactivity associated with tinnitus
                perception.
              </Text>
              <Text style={nt.body}>
                To use this feature, first use the pitch matching tool above to
                identify and save your tinnitus frequency. When notched therapy is
                enabled, a precise filter is applied to all sounds played in the app,
                centred on your saved frequency.
              </Text>
              <Text style={nt.body}>
                This is an experimental supplementary approach based on research by
                Okamoto et al. (2010). Results vary between individuals and it is
                intended for use alongside — not as a replacement for — professional
                audiological care.
              </Text>
            </View>
          )}

          {isActive && (
            <View style={nt.activeBadge}>
              <Text style={nt.activeBadgeText}>
                Notch filter active — sounds play with a notch at {formatHz(frequencyHz)}
              </Text>
            </View>
          )}
        </>
      )}
    </View>
  );
}

function makeNtStyles(typography: ReturnType<typeof useTheme>['typography']) {
  return StyleSheet.create({
    card: {
      backgroundColor: Colors.deepTide,
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
    titleBlock:       { flex: 1, gap: 2 },
    title:            { ...typography.heading2, color: Colors.white },
    frequency:        { ...typography.caption, color: Colors.calmWave },
    toggle: {
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs,
      borderRadius: Radius.chip,
      borderWidth: Border.width * 2,
      borderColor: Colors.white + '40',
      minWidth: 52,
      alignItems: 'center',
    },
    toggleActive:      { backgroundColor: Colors.calmWave, borderColor: Colors.calmWave },
    togglePressed:     { opacity: 0.7 },
    toggleLabel:       { ...typography.micro, color: Colors.white },
    toggleLabelActive: { color: Colors.deepTide },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    infoRowLabel: { fontSize: 13, color: Colors.calmWave },
    infoBody: { paddingTop: 12, paddingBottom: 0, gap: Spacing.sm },
    body: { fontSize: 13, color: Colors.calmWave + 'CC', lineHeight: 20.8 },
    requiredNotice: {
      backgroundColor: Colors.white + '10',
      borderRadius: Radius.chip,
      padding: Spacing.sm,
      borderLeftWidth: 3,
      borderLeftColor: Colors.white + '40',
    },
    requiredText: { ...typography.caption, color: Colors.calmWave, lineHeight: 18 },
    activeBadge: {
      backgroundColor: Colors.calmWave + '22',
      borderRadius: Radius.chip,
      padding: Spacing.sm,
      borderLeftWidth: 3,
      borderLeftColor: Colors.calmWave,
    },
    activeBadgeText: { ...typography.caption, color: Colors.calmWave },
  });
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function SoundScreen() {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  // Reset scroll position every time the Sound tab comes into focus.
  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, [])
  );

  // Preload all file-based sound assets in the background on first mount so
  // the per-play download step is already complete when the user taps a card.
  useEffect(() => {
    audioEngine.preloadAssets();
  }, []);

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
  const [notchedActive, setNotchedActive] = useState(false);

  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = screenWidth - Spacing.xl * 2;

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

  const carouselProps = {
    currentSound,
    isPaused,
    onToggle: toggle,
    onPauseResume: pauseResume,
    cardWidth,
  };

  const isNowPlayingVisible = isPlaying && !!currentSound;

  return (
    // 'bottom' edge intentionally excluded — NowPlayingBar is absolutely
    // positioned at the true bottom of this container and accounts for the
    // safe-area inset itself, so double-insetting here would recreate the gap.
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollWithIndicator
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          isNowPlayingVisible && {
            paddingBottom: NOW_PLAYING_BAR_HEIGHT + insets.bottom,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Sound</Text>

        {!isAudioAvailable() && (
          <View style={styles.devNotice}>
            <Text style={styles.devNoticeText}>
              Audio requires a development build — playback is not available in Expo Go.
            </Text>
          </View>
        )}

        <SessionTimerBar selected={selectedTimer} onSelect={setTimer} />

        <View style={styles.section}>
          <SectionHeading label="Background noise" />
          <SoundCarousel sounds={NOISE_SOUNDS} {...carouselProps} />
        </View>

        <View style={styles.section}>
          <SectionHeading label="Nature sounds" />
          <SoundCarousel sounds={NATURE_SOUNDS} {...carouselProps} />
        </View>

        <View style={styles.section}>
          <SectionHeading label="Binaural beats" />
          <SoundCarousel sounds={BINAURAL_SOUNDS} {...carouselProps} />
          <Text style={styles.binauralNote}>
            Headphones required. Not recommended while driving or operating machinery.
            If you have a history of seizures, consult your doctor before use.
          </Text>
        </View>

        <View style={styles.section}>
          <SectionHeading label="Coming Soon" />
          <PremiumTeaser />
        </View>

        <View style={styles.section}>
          <SectionHeading label="Pitch matching & therapy" />
          <PitchMatchingEntry savedHz={savedPitchHz} />
          <NotchedTherapyCard
            frequencyHz={savedPitchHz}
            isActive={notchedActive}
            onToggle={handleNotchedToggle}
          />
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollWithIndicator>

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

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(
  colors: ReturnType<typeof useTheme>['colors'],
  typography: ReturnType<typeof useTheme>['typography'],
) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    scroll: { flex: 1 },
    scrollContent: {
      paddingHorizontal: Spacing.xl,
      paddingTop: Spacing.xl,
      paddingBottom: Spacing.xl,
      gap: Spacing.xl,
    },
    title: { ...typography.display, color: colors.textPrimary },

    section: { gap: Spacing.sm },

    binauralNote: {
      ...typography.caption,
      color: colors.textSecondary,
      lineHeight: 18,
      fontStyle: 'italic',
      paddingHorizontal: Spacing.xs,
    },

    devNotice: {
      backgroundColor: Colors.goldLight,
      borderRadius: Radius.card,
      padding: Spacing.md,
      borderLeftWidth: 3,
      borderLeftColor: Colors.softGold,
    },
    devNoticeText: { ...typography.caption, color: Colors.softGold },

    bottomSpacer: { height: Spacing.xxl },
  });
}
