import { Animated, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/theme';

type Props = {
  visible: boolean;
  opacity: Animated.Value;
  onPress: () => void;
};

export default function BackToTopButton({ visible, opacity, onPress }: Props) {
  if (!visible) return null;

  return (
    <Animated.View style={[styles.wrapper, { opacity }]}>
      <Pressable
        style={styles.button}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="Back to top"
      >
        <Ionicons name="chevron-up" size={22} color={Colors.calmWave} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    zIndex: 10,
  },
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.deepTide,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
