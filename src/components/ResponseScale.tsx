import { useMemo } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { RESPONSE_OPTIONS } from '@/src/data/crestQuestions';

type Props = {
  value: number;
  onChange: (value: number) => void;
  questionText: string;
};

// 5 tap-to-select option buttons replacing the 0–10 slider — Part 4 spec.
export default function ResponseScale({ value, onChange, questionText }: Props) {
  const styles = useMemo(() => makeStyles(), []);

  return (
    <View style={styles.list}>
      {RESPONSE_OPTIONS.map((option) => {
        const selected = value === option.value;
        return (
          <Pressable
            key={option.value}
            style={({ pressed }) => [
              styles.option,
              selected ? styles.optionSelected : styles.optionUnselected,
              pressed && styles.optionPressed,
            ]}
            onPress={() => onChange(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={`${option.label}, response to: ${questionText}`}
          >
            <Text style={[styles.label, selected ? styles.labelSelected : styles.labelUnselected]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function makeStyles() {
  return StyleSheet.create({
    list: { gap: 10 },
    option: {
      borderRadius: 8,
      paddingVertical: 14,
      paddingHorizontal: 16,
      alignItems: 'center',
    },
    optionSelected:   { backgroundColor: '#5DCAA5' },
    optionUnselected: { backgroundColor: '#F5F1EB' },
    optionPressed: { opacity: 0.85 },
    label: { fontSize: 16, fontWeight: '500' },
    labelSelected:   { color: '#0D4F5C' },
    labelUnselected: { color: '#1A2B2B' },
  });
}
