// Wraps any feature that isn't built yet. Renders as a small locked-feature
// card — matches the padlock-card treatment used across Sound, Relax, and
// Learn tabs — instead of the real content. Tapping opens the shared centred
// premium modal explaining what the feature will do.
import { useState, useMemo } from 'react';
import { StyleSheet, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius } from '@/src/theme';
import { useTheme } from '@/src/context/ThemeContext';
import PremiumFeatureModal from '@/src/components/PremiumFeatureModal';

type Props = {
  isPremium: boolean;
  featureName: string;
  description: string;
  children: React.ReactNode;
};

export default function PremiumGate({ isPremium, featureName, description, children }: Props) {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);
  const [modalVisible, setModalVisible] = useState(false);

  if (isPremium) {
    return <>{children}</>;
  }

  return (
    <>
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={() => setModalVisible(true)}
        accessibilityRole="button"
        accessibilityLabel={`${featureName} — premium feature. Tap for details.`}
      >
        <Ionicons
          name="lock-closed"
          size={18}
          color={Colors.softGold}
          style={styles.lockIcon}
        />
        <Text style={styles.title}>{featureName}</Text>
        <Text style={styles.description} numberOfLines={2}>{description}</Text>
      </Pressable>

      <PremiumFeatureModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        featureName={featureName}
        description={description}
      />
    </>
  );
}

// Matches app/(tabs)/relax/index.tsx's premiumCard/premiumCardTitle/
// premiumCardDuration styling exactly, for a consistent locked-feature look
// across tabs.
function makeStyles(
  colors: ReturnType<typeof useTheme>['colors'],
  typography: ReturnType<typeof useTheme>['typography'],
) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surfaceVariant,
      borderRadius: Radius.card,
      borderWidth: 1,
      borderColor: colors.deepTide + '30',
      padding: Spacing.md,
      gap: Spacing.xs,
    },
    cardPressed: { opacity: 0.8 },
    lockIcon: {
      position: 'absolute',
      top: 10,
      right: 10,
    },
    title: {
      ...typography.heading2,
      fontSize: typography.heading2.fontSize - 2,
      fontWeight: '600' as const,
      color: colors.textPrimary,
    },
    description: { ...typography.caption, color: colors.textSecondary },
  });
}
