// Centred pre-start modal for the breathing exercises. Matches the
// PremiumFeatureModal overlay and card, except the card uses the screen
// background colour: PremiumFeatureModal's dark-mode card is deepTide, which
// would hide the deepTide Start button.
import { useMemo, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Radius, Spacing } from '@/src/theme';
import { useTheme } from '@/src/context/ThemeContext';

const CARD_MARGIN = 24;
const CARD_MAX_WIDTH = 400;

type Props = {
  visible: boolean;
  title: string;
  description: string;
  onStart: () => void;
  onBack: () => void;
  // The still, resting-state version of the exercise's breathing visual.
  children: ReactNode;
};

export default function BreathingStartModal({
  visible,
  title,
  description,
  onStart,
  onBack,
  children,
}: Props) {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // statusBarTranslucent + edge-to-edge can draw the modal under the navigation
  // bar, so the second limit keeps the centred card clear of it on short screens.
  const maxHeight = Math.min(height * 0.85, height - 2 * (insets.bottom + Spacing.base));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onBack}
      statusBarTranslucent
    >
      {/* Tapping outside doesn't dismiss: there's nothing behind it until Start. */}
      <View style={styles.overlay}>
        <ScrollView
          style={[
            styles.card,
            { width: Math.min(width - CARD_MARGIN * 2, CARD_MAX_WIDTH), maxHeight },
          ]}
          contentContainerStyle={styles.cardContent}
          showsVerticalScrollIndicator={false}
          accessibilityViewIsModal
        >
          <Text style={styles.title} maxFontSizeMultiplier={1.3} accessibilityRole="header">
            {title}
          </Text>
          <Text style={styles.description} maxFontSizeMultiplier={1.3}>
            {description}
          </Text>

          {children}

          <Pressable
            style={({ pressed }) => [styles.startBtn, pressed && styles.startBtnPressed]}
            onPress={onStart}
            accessibilityRole="button"
            accessibilityLabel="Start breathing exercise"
          >
            <Text style={styles.startLabel}>Start</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.backLink, pressed && styles.backLinkPressed]}
            onPress={onBack}
            accessibilityRole="button"
          >
            <Text style={styles.backLabel}>Back to Relax</Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

function makeStyles(
  colors: ReturnType<typeof useTheme>['colors'],
  typography: ReturnType<typeof useTheme>['typography'],
) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    card: {
      flexGrow: 0,
      marginHorizontal: CARD_MARGIN,
      borderRadius: 16,
      backgroundColor: colors.background,
    },
    // Padding sits on the scroll content so text scrolls to the card's edges.
    cardContent: { padding: 24, gap: Spacing.base },
    title: { ...typography.display, color: colors.textPrimary, textAlign: 'center' },
    description: {
      ...typography.body,
      color: colors.textSecondary,
      lineHeight: 24,
      textAlign: 'center',
    },
    startBtn: {
      backgroundColor: Colors.deepTide,
      borderRadius: Radius.chip,
      paddingVertical: Spacing.base,
      alignItems: 'center',
    },
    startBtnPressed: { opacity: 0.85 },
    startLabel: { ...typography.heading2, color: Colors.white },
    backLink: { alignSelf: 'center', paddingVertical: Spacing.sm, paddingHorizontal: Spacing.base },
    backLinkPressed: { opacity: 0.6 },
    backLabel: { ...typography.caption, color: colors.headingAccent },
  });
}
