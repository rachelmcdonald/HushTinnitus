import { useMemo } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { SoundSource } from '@/src/types';
import { soundDisplayName } from '@/src/hooks/useAudioPlayback';
import { Colors, Spacing, Radius, Border } from '@/src/theme';
import { useTheme } from '@/src/context/ThemeContext';

const TIMER_OPTIONS = [15, 30, 60, 90] as const;

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

type Props = {
  currentSound: SoundSource;
  isPaused: boolean;
  timeRemaining: number | null;
  selectedTimer: number | null;
  onPauseResume: () => void;
  onStop: () => void;
  onSetTimer: (minutes: number | null) => void;
};

export default function NowPlayingBar({
  currentSound,
  isPaused,
  timeRemaining,
  selectedTimer,
  onPauseResume,
  onStop,
  onSetTimer,
}: Props) {
  const { typography } = useTheme();
  const styles = useMemo(() => makeStyles(typography), [typography]);

  const isFading = timeRemaining !== null && timeRemaining > 0 && timeRemaining <= 10;
  const name = soundDisplayName(currentSound);

  return (
    <View style={styles.container}>
      {/* Top row: indicator + name + pause + stop */}
      <View style={styles.topRow}>
        <View style={styles.nameRow}>
          <View style={[styles.dot, isPaused && styles.dotPaused, isFading && styles.dotFading]} />
          <Text style={styles.soundName} numberOfLines={1}>{name}</Text>
        </View>

        <View style={styles.controls}>
          {/* Pause / resume */}
          <Pressable
            style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
            onPress={onPauseResume}
            accessibilityRole="button"
            accessibilityLabel={isPaused ? 'Resume' : 'Pause'}
          >
            {isPaused ? (
              // Play triangle
              <View style={styles.playTriangle} />
            ) : (
              // Pause bars
              <View style={styles.pauseIcon}>
                <View style={styles.pauseBar} />
                <View style={styles.pauseBar} />
              </View>
            )}
          </Pressable>

          {/* Stop */}
          <Pressable
            style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
            onPress={onStop}
            accessibilityRole="button"
            accessibilityLabel="Stop"
          >
            <View style={styles.stopSquare} />
          </Pressable>
        </View>
      </View>

      {/* Timer row */}
      <View style={styles.timerRow}>
        {timeRemaining !== null ? (
          // Active countdown
          <Text style={[styles.countdown, isFading && styles.countdownFading]}>
            {isFading ? `Fading out… ${formatTime(timeRemaining)}` : formatTime(timeRemaining)}
          </Text>
        ) : (
          // Timer chip selector
          <View style={styles.chipRow}>
            <Text style={styles.timerLabel}>Timer:</Text>
            <Pressable
              style={[styles.chip, selectedTimer === null && styles.chipActive]}
              onPress={() => onSetTimer(null)}
              accessibilityLabel="No timer"
            >
              <Text style={[styles.chipText, selectedTimer === null && styles.chipTextActive]}>
                Off
              </Text>
            </Pressable>
            {TIMER_OPTIONS.map((m) => (
              <Pressable
                key={m}
                style={[styles.chip, selectedTimer === m && styles.chipActive]}
                onPress={() => onSetTimer(selectedTimer === m ? null : m)}
                accessibilityLabel={`${m} minute timer`}
              >
                <Text style={[styles.chipText, selectedTimer === m && styles.chipTextActive]}>
                  {m}m
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

function makeStyles(typography: ReturnType<typeof useTheme>['typography']) {
  return StyleSheet.create({
    container: {
      backgroundColor: Colors.deepTide,
      paddingHorizontal: Spacing.xl,
      paddingTop: Spacing.md,
      paddingBottom: Spacing.base,
      gap: Spacing.sm,
      borderTopWidth: Border.width,
      borderTopColor: Colors.calmWave + '30',
    },

    // Top row
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Spacing.md,
    },
    nameRow: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: Colors.calmWave,
    },
    dotPaused: { backgroundColor: Colors.midGray },
    dotFading: { backgroundColor: Colors.softGold },
    soundName: {
      ...typography.heading2,
      color: Colors.white,
      flex: 1,
    },
    controls: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    iconBtn: {
      width: 36,
      height: 36,
      borderRadius: Radius.chip,
      backgroundColor: Colors.calmWave + '20',
      justifyContent: 'center',
      alignItems: 'center',
    },
    iconBtnPressed: { opacity: 0.7 },

    // Play icon
    playTriangle: {
      width: 0, height: 0,
      borderTopWidth: 6, borderBottomWidth: 6, borderLeftWidth: 10,
      borderTopColor: Colors.transparent, borderBottomColor: Colors.transparent,
      borderLeftColor: Colors.white,
      marginLeft: 2,
    },

    // Pause icon
    pauseIcon: { flexDirection: 'row', gap: 3, alignItems: 'center' },
    pauseBar: { width: 3, height: 12, borderRadius: 1.5, backgroundColor: Colors.white },

    // Stop icon
    stopSquare: {
      width: 12, height: 12,
      borderRadius: 2,
      backgroundColor: Colors.white,
    },

    // Timer row
    timerRow: {
      minHeight: 24,
      justifyContent: 'center',
    },
    countdown: {
      ...typography.body,
      color: Colors.calmWave,
    },
    countdownFading: { color: Colors.softGold },
    chipRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      flexWrap: 'wrap',
    },
    timerLabel: { ...typography.caption, color: Colors.calmWave },
    chip: {
      paddingHorizontal: Spacing.sm,
      paddingVertical: 3,
      borderRadius: Radius.chip,
      borderWidth: Border.width * 2,
      borderColor: Colors.calmWave + '50',
    },
    chipActive: {
      backgroundColor: Colors.calmWave,
      borderColor: Colors.calmWave,
    },
    chipText: { ...typography.micro, color: Colors.calmWave },
    chipTextActive: { color: Colors.deepTide },
  });
}
