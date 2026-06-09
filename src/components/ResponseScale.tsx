import { StyleSheet, Pressable, View, Text } from 'react-native';
import { useTheme } from '@/src/context/ThemeContext';
import { RESPONSE_OPTIONS } from '@/src/data/crestQuestions';

// ─── Constants ────────────────────────────────────────────────────────────────

const SELECTED_BG   = '#5DCAA5';
const SELECTED_TEXT = '#0D4F5C';

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  value: number | null;
  onChange: (value: number) => void;
  questionText: string;
};

// ─── ResponseScale ────────────────────────────────────────────────────────────

export default function ResponseScale({ value, onChange, questionText }: Props) {
  const { isDark } = useTheme();
  const defaultBg   = isDark ? '#1A3D4A' : '#F5F1EB';
  const defaultText = isDark ? '#F5F1EB' : '#1A2B2B';

  return (
    <View style={styles.list}>
      {RESPONSE_OPTIONS.map((option) => {
        const selected = value === option.value;
        return (
          <Pressable
            key={option.value}
            style={[styles.option, { backgroundColor: selected ? SELECTED_BG : defaultBg }]}
            onPress={() => onChange(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={`${option.label}, response to: ${questionText}`}
          >
            <Text style={[
              styles.label,
              {
                color:      selected ? SELECTED_TEXT : defaultText,
                fontWeight: selected ? '600' : '500',
              },
            ]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
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
  label: { fontSize: 16 },
});
