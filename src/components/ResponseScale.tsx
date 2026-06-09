import { useState, useEffect } from 'react';
import { StyleSheet, Pressable, View, Text } from 'react-native';
import { useTheme } from '@/src/context/ThemeContext';
import { RESPONSE_OPTIONS } from '@/src/data/crestQuestions';

type Props = {
  value: number | null;
  onChange: (value: number) => void;
  questionText: string;
};

export default function ResponseScale({ value, onChange, questionText }: Props) {
  const { isDark } = useTheme();

  // Local selection state — decoupled from the parent's value prop so the
  // tapped button renders selected before React 18 batching advances currentIndex.
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Reset selection when the question changes. Also restores a stored answer
  // when the user navigates back to a previously answered question.
  useEffect(() => {
    setSelectedIndex(value);
  }, [questionText]); // eslint-disable-line react-hooks/exhaustive-deps

  function handlePress(optionValue: number) {
    setSelectedIndex(optionValue);
    onChange(optionValue);
  }

  return (
    <View style={styles.list}>
      {RESPONSE_OPTIONS.map((option) => (
        <Pressable
          key={option.value}
          onPress={() => handlePress(option.value)}
          style={{
            borderRadius: 8,
            paddingVertical: 14,
            paddingHorizontal: 16,
            alignItems: 'center',
            backgroundColor: selectedIndex === option.value
              ? '#5DCAA5'
              : (isDark ? '#1A3D4A' : '#F5F1EB'),
          }}
          accessibilityRole="button"
          accessibilityState={{ selected: selectedIndex === option.value }}
          accessibilityLabel={`${option.label}, response to: ${questionText}`}
        >
          <Text style={{
            fontSize: 16,
            color:      selectedIndex === option.value ? '#0D4F5C' : (isDark ? '#F5F1EB' : '#1A2B2B'),
            fontWeight: selectedIndex === option.value ? '600' : '400',
          }}>
            {option.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10 },
});
