import { useState, useEffect, useCallback, useMemo } from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import { router } from 'expo-router';
import {
  pitchMatchEngine,
  sliderToHz,
  hzToSlider,
  formatHz,
} from '@/src/audio/PitchMatchEngine';
import { usePreferences } from '@/src/context/PreferencesContext';
import { Colors, Spacing, Radius, Border } from '@/src/theme';
import { useTheme } from '@/src/context/ThemeContext';

const SLIDER_STEPS = 1000;

// ─── Back button ──────────────────────────────────────────────────────────────

function BackButton() {
  const { typography } = useTheme();
  const back = useMemo(() => makeBackStyles(typography), [typography]);

  return (
    <Pressable
      style={({ pressed }) => [back.button, pressed && back.pressed]}
      onPress={() => router.back()}
      accessibilityRole="button"
      accessibilityLabel="Back to Sound"
    >
      <Text style={back.label}>← Sound</Text>
    </Pressable>
  );
}

function makeBackStyles(typography: ReturnType<typeof useTheme>['typography']) {
  return StyleSheet.create({
    button: { paddingVertical: Spacing.sm, paddingRight: Spacing.md, alignSelf: 'flex-start' },
    pressed: { opacity: 0.6 },
    label: { ...typography.body, color: Colors.deepTide },
  });
}

// ─── Frequency display ────────────────────────────────────────────────────────

function FrequencyDisplay({ hz }: { hz: number }) {
  const { colors, typography } = useTheme();
  const freq = useMemo(() => makeFreqStyles(colors, typography), [colors, typography]);
  const label = formatHz(hz);
  return (
    <View style={freq.container}>
      <Text style={freq.value}>{label}</Text>
      <Text style={freq.range}>100 Hz — 15 kHz</Text>
    </View>
  );
}

function makeFreqStyles(
  colors: ReturnType<typeof useTheme>['colors'],
  typography: ReturnType<typeof useTheme>['typography'],
) {
  return StyleSheet.create({
    container: { alignItems: 'center', gap: Spacing.xs },
    value: {
      fontSize: 52,
      fontWeight: '400',
      color: Colors.deepTide,
      letterSpacing: -1,
      lineHeight: 60,
    },
    range: { ...typography.caption, color: colors.textSecondary },
  });
}

// ─── Play / Stop button ───────────────────────────────────────────────────────

function PlayStopButton({
  isPlaying,
  onPress,
}: {
  isPlaying: boolean;
  onPress: () => void;
}) {
  const { colors, typography } = useTheme();
  const btn = useMemo(() => makeBtnStyles(colors, typography), [colors, typography]);

  return (
    <Pressable
      style={({ pressed }) => [
        btn.container,
        isPlaying && btn.containerPlaying,
        pressed && btn.pressed,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={isPlaying ? 'Stop tone' : 'Play tone'}
    >
      {isPlaying ? (
        <View style={btn.stopIcon}>
          <View style={btn.stopBar} />
          <View style={btn.stopBar} />
        </View>
      ) : (
        <View style={btn.playTriangle} />
      )}
      <Text style={[btn.label, isPlaying && btn.labelPlaying]}>
        {isPlaying ? 'Stop tone' : 'Play tone'}
      </Text>
    </Pressable>
  );
}

function makeBtnStyles(
  colors: ReturnType<typeof useTheme>['colors'],
  typography: ReturnType<typeof useTheme>['typography'],
) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.sm,
      backgroundColor: colors.surfaceVariant,
      borderRadius: Radius.chip,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.xl,
    },
    containerPlaying: { backgroundColor: Colors.deepTide },
    pressed: { opacity: 0.8 },
    playTriangle: {
      width: 0, height: 0,
      borderTopWidth: 7, borderBottomWidth: 7, borderLeftWidth: 12,
      borderTopColor: Colors.transparent, borderBottomColor: Colors.transparent,
      borderLeftColor: Colors.deepTide,
    },
    stopIcon: { flexDirection: 'row', gap: 4, alignItems: 'center' },
    stopBar: { width: 3, height: 14, borderRadius: 2, backgroundColor: Colors.white },
    label: { ...typography.heading2, color: Colors.deepTide },
    labelPlaying: { color: Colors.white },
  });
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function PitchMatchingScreen() {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);

  const { preferences, updatePreferences } = usePreferences();
  const savedHz = preferences?.matchedPitchHz ?? null;

  const [sliderValue, setSliderValue] = useState<number>(() =>
    hzToSlider(savedHz ?? 1000)
  );
  const [hz, setHz] = useState<number>(() => savedHz ?? 1000);
  const [isPlaying, setIsPlaying] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    return () => {
      pitchMatchEngine.stop();
    };
  }, []);

  const handleSliderChange = useCallback(
    (value: number) => {
      const rounded = Math.round(value);
      const newHz = sliderToHz(rounded);
      setSliderValue(rounded);
      setHz(newHz);
      setSaved(false);
      if (Platform.OS !== 'web') {
        pitchMatchEngine.setFrequency(newHz);
      }
    },
    []
  );

  function handlePlayStop() {
    if (Platform.OS === 'web') {
      setIsPlaying((prev) => !prev);
      return;
    }
    if (isPlaying) {
      pitchMatchEngine.stop();
      setIsPlaying(false);
    } else {
      pitchMatchEngine.start(hz);
      setIsPlaying(true);
    }
  }

  function handleSave() {
    updatePreferences({ matchedPitchHz: hz });
    if (isPlaying && Platform.OS !== 'web') {
      pitchMatchEngine.stop();
      setIsPlaying(false);
    }
    setSaved(true);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <BackButton />

        <View style={styles.header}>
          <Text style={styles.title}>Pitch matching</Text>
          <Text style={styles.subtitle}>
            Play a tone and adjust the slider until it closely matches the
            pitch of your tinnitus. Save the frequency to enable notched
            sound therapy.
          </Text>
        </View>

        <FrequencyDisplay hz={hz} />

        <View style={styles.sliderSection}>
          <View style={styles.sliderLabelRow}>
            <Text style={styles.sliderEndLabel}>100 Hz</Text>
            <Text style={styles.sliderEndLabel}>15 kHz</Text>
          </View>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={SLIDER_STEPS}
            step={1}
            value={sliderValue}
            onValueChange={handleSliderChange}
            minimumTrackTintColor={Colors.calmWave}
            maximumTrackTintColor={Colors.midGray + '40'}
            thumbTintColor={Colors.deepTide}
            accessibilityLabel={`Frequency ${formatHz(hz)}`}
          />
          <Text style={styles.sliderHint}>
            Slide left for lower frequencies, right for higher
          </Text>
        </View>

        <PlayStopButton isPlaying={isPlaying} onPress={handlePlayStop} />

        <View style={styles.instructionCard}>
          <Text style={styles.instructionHeading}>How to use</Text>
          <Text style={styles.instructionStep}>
            1. Tap Play tone to start the reference signal.
          </Text>
          <Text style={styles.instructionStep}>
            2. Adjust the slider while comparing the tone to your tinnitus.
          </Text>
          <Text style={styles.instructionStep}>
            3. When the tone closely matches, tap Save my frequency.
          </Text>
          <Text style={styles.instructionStep}>
            4. Your saved frequency enables notched sound therapy on the
            Sound screen.
          </Text>
          <Text style={styles.instructionNote}>
            Tip: Many people with tinnitus perceive their tone in the 2–8 kHz
            range. If unsure, start in the middle and adjust from there.
          </Text>
        </View>

        {saved ? (
          <View style={styles.savedBadge}>
            <Text style={styles.savedText}>
              Saved — {formatHz(hz)} stored as your tinnitus frequency
            </Text>
          </View>
        ) : (
          <Pressable
            style={({ pressed }) => [
              styles.saveButton,
              pressed && styles.saveButtonPressed,
            ]}
            onPress={handleSave}
            accessibilityRole="button"
            accessibilityLabel={`Save ${formatHz(hz)} as my tinnitus frequency`}
          >
            <Text style={styles.saveLabel}>Save my frequency</Text>
          </Pressable>
        )}

        {savedHz !== null && savedHz !== hz && (
          <View style={styles.previousSaved}>
            <Text style={styles.previousSavedText}>
              Previously saved: {formatHz(savedHz)}
            </Text>
            <Pressable
              onPress={() => {
                const pos = hzToSlider(savedHz);
                setSliderValue(pos);
                setHz(savedHz);
                if (isPlaying && Platform.OS !== 'web') {
                  pitchMatchEngine.setFrequency(savedHz);
                }
              }}
              accessibilityRole="button"
              accessibilityLabel={`Restore saved frequency ${formatHz(savedHz)}`}
            >
              <Text style={styles.restoreLabel}>Restore</Text>
            </Pressable>
          </View>
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
      gap: Spacing.xl,
    },

    header: { gap: Spacing.sm },
    title:    { ...typography.display, color: colors.textPrimary },
    subtitle: { ...typography.body, color: colors.textSecondary },

    sliderSection: { gap: Spacing.sm },
    sliderLabelRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.xs,
    },
    sliderEndLabel: { ...typography.caption, color: colors.textSecondary },
    slider: { width: '100%', height: 40 },
    sliderHint: { ...typography.caption, color: colors.textSecondary, textAlign: 'center' },

    instructionCard: {
      backgroundColor: colors.surface,
      borderRadius: Radius.card,
      padding: Spacing.base,
      gap: Spacing.sm,
    },
    instructionHeading: { ...typography.heading2, color: colors.textPrimary },
    instructionStep:    { ...typography.body, color: colors.textPrimary, lineHeight: 22 },
    instructionNote: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: Spacing.xs,
      borderTopWidth: Border.width,
      borderTopColor: Colors.calmWave + '33',
      paddingTop: Spacing.sm,
    },

    saveButton: {
      backgroundColor: Colors.deepTide,
      borderRadius: Radius.chip,
      paddingVertical: Spacing.base,
      alignItems: 'center',
    },
    saveButtonPressed: { opacity: 0.85 },
    saveLabel: { ...typography.heading2, color: Colors.white },
    savedBadge: {
      backgroundColor: colors.surfaceVariant,
      borderRadius: Radius.chip,
      padding: Spacing.base,
      borderLeftWidth: 3,
      borderLeftColor: Colors.calmWave,
    },
    savedText: { ...typography.body, color: Colors.deepTide },

    previousSaved: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.xs,
    },
    previousSavedText: { ...typography.caption, color: colors.textSecondary },
    restoreLabel: { ...typography.caption, color: Colors.deepTide, fontWeight: '500' },
  });
}
