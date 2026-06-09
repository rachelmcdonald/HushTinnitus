import { useEffect } from 'react';
import { StyleSheet, Pressable, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolateColor,
} from 'react-native-reanimated';
import { useTheme } from '@/src/context/ThemeContext';
import { RESPONSE_OPTIONS } from '@/src/data/crestQuestions';

// ─── Constants ────────────────────────────────────────────────────────────────

const SELECTED_BG   = '#5DCAA5';
const SELECTED_TEXT = '#0D4F5C';
const PRESSED_BG    = '#E1F5EE';

const SPRING_SELECT = { damping: 12, stiffness: 180 } as const;
const SPRING_PRESS  = { damping: 15, stiffness: 200 } as const;

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  value: number | null;
  onChange: (value: number) => void;
  questionText: string;
};

type OptionProps = {
  option: { value: number; label: string };
  selected: boolean;
  onPress: () => void;
  questionText: string;
  defaultBg: string;
  defaultText: string;
};

// ─── Single animated option button ────────────────────────────────────────────

function OptionButton({
  option, selected, onPress, questionText, defaultBg, defaultText,
}: OptionProps) {
  const scale        = useSharedValue(selected ? 1.06 : 1.0);
  const bgProgress   = useSharedValue(selected ? 1.0  : 0.0);
  // Tracks selected state readable on the UI thread — press handlers never go stale.
  const isSelectedSV = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    isSelectedSV.value = selected ? 1 : 0;
    if (selected) {
      scale.value      = withSpring(1.06, SPRING_SELECT);
      bgProgress.value = withSpring(1.0,  SPRING_SELECT);
    } else {
      scale.value      = withSpring(1.0,  SPRING_PRESS);
      bgProgress.value = withSpring(0.0,  SPRING_PRESS);
    }
  }, [selected]); // eslint-disable-line react-hooks/exhaustive-deps

  const containerStyle = useAnimatedStyle(() => {
    // Clamp prevents spring overshoot from bleeding colour beyond the defined stops.
    const t = Math.min(1, Math.max(0, bgProgress.value));
    return {
      transform: [{ scale: scale.value }],
      backgroundColor: interpolateColor(t, [0, 0.5, 1.0], [defaultBg, PRESSED_BG, SELECTED_BG]),
    };
  });

  const textStyle = useAnimatedStyle(() => {
    const t = Math.min(1, Math.max(0, bgProgress.value));
    return {
      color: interpolateColor(t, [0, 0.5, 1.0], [defaultText, defaultText, SELECTED_TEXT]),
    };
  });

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        if (!isSelectedSV.value) {
          scale.value      = withSpring(1.03, SPRING_PRESS);
          bgProgress.value = withSpring(0.5,  SPRING_PRESS);
        }
      }}
      onPressOut={() => {
        if (!isSelectedSV.value) {
          scale.value      = withSpring(1.0, SPRING_PRESS);
          bgProgress.value = withSpring(0.0, SPRING_PRESS);
        }
      }}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${option.label}, response to: ${questionText}`}
    >
      <Animated.View style={[styles.option, containerStyle]}>
        <Animated.Text style={[styles.label, textStyle]}>
          {option.label}
        </Animated.Text>
      </Animated.View>
    </Pressable>
  );
}

// ─── ResponseScale ────────────────────────────────────────────────────────────

export default function ResponseScale({ value, onChange, questionText }: Props) {
  const { isDark } = useTheme();
  const defaultBg   = isDark ? '#1A3D4A' : '#F5F1EB';
  const defaultText = isDark ? '#F5F1EB' : '#1A2B2B';

  return (
    <View style={styles.list}>
      {RESPONSE_OPTIONS.map((option) => (
        <OptionButton
          key={option.value}
          option={option}
          selected={value === option.value}
          onPress={() => onChange(option.value)}
          questionText={questionText}
          defaultBg={defaultBg}
          defaultText={defaultText}
        />
      ))}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  list: { gap: 10 },
  option: {
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  label: { fontSize: 16, fontWeight: '500' },
});
