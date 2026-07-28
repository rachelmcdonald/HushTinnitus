import { useState, useEffect, useRef } from 'react';
import { StyleSheet, Pressable, View, Text } from 'react-native';
import { useTheme } from '@/src/context/ThemeContext';
import { RESPONSE_OPTIONS } from '@/src/data/crestQuestions';

const FLASH_DURATION = 150;

type Props = {
  value: number | null;
  onConfirm: (value: number) => void;
  questionText: string;
  isLast: boolean;
};

export default function ResponseScale({ value, onConfirm, questionText, isLast }: Props) {
  const { isDark, colors, typography } = useTheme();

  // Local selection state — decoupled from the parent's value prop so the
  // tapped button renders selected before React 18 batching advances currentIndex.
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [flashing, setFlashing] = useState(false);

  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset selection when the question changes. Also restores a stored answer
  // when the user navigates back to a previously answered question.
  useEffect(() => {
    if (flashTimeoutRef.current) {
      clearTimeout(flashTimeoutRef.current);
      flashTimeoutRef.current = null;
    }
    setSelectedIndex(value);
    setFlashing(false);
  }, [questionText]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => {
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    };
  }, []);

  function handlePress(optionValue: number) {
    if (flashing) return;
    setSelectedIndex(optionValue);
  }

  function handleConfirm() {
    if (selectedIndex === null || flashing) return;
    setFlashing(true);
    flashTimeoutRef.current = setTimeout(() => {
      flashTimeoutRef.current = null;
      onConfirm(selectedIndex);
    }, FLASH_DURATION);
  }

  return (
    <View>
      <View style={styles.list}>
        {RESPONSE_OPTIONS.map((option) => {
          const isSelected = selectedIndex === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => handlePress(option.value)}
              disabled={flashing}
              style={{
                borderRadius: 8,
                paddingVertical: 14,
                paddingHorizontal: 16,
                alignItems: 'center',
                backgroundColor: isSelected
                  ? (flashing ? '#7DD9B5' : '#5DCAA5')
                  : (isDark ? '#1A3D4A' : '#F5F1EB'),
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${option.label}, response to: ${questionText}`}
            >
              <Text style={{
                fontSize: 16,
                color:      isSelected ? '#0D4F5C' : (isDark ? '#F5F1EB' : '#1A2B2B'),
                fontWeight: isSelected ? '600' : '400',
              }}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {selectedIndex === null ? (
        <Text style={[styles.helperText, { ...typography.caption, color: colors.textSecondary }]}>
          Select an option to continue
        </Text>
      ) : (
        <Pressable
          onPress={handleConfirm}
          disabled={flashing}
          style={styles.confirmBtn}
          accessibilityRole="button"
          accessibilityLabel={isLast ? 'Confirm' : 'Continue'}
        >
          <Text style={styles.confirmBtnText}>{isLast ? 'Confirm' : 'Continue'}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10 },
  helperText: {
    marginTop: 16,
    textAlign: 'center',
  },
  confirmBtn: {
    marginTop: 20,
    marginHorizontal: 16,
    backgroundColor: '#5DCAA5',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0D4F5C',
  },
});
