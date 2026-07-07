// Wraps any feature that isn't built yet. Content is visible (soft-dimmed) with
// a "Coming Soon" badge. Tapping opens a modal explaining what the feature will do.
import { useState, useMemo } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { Colors, Spacing, Radius, Border } from '@/src/theme';
import { useTheme } from '@/src/context/ThemeContext';
import ComingSoonBadge from '@/src/components/ComingSoonBadge';
import ComingSoonModal from '@/src/components/ComingSoonModal';

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
        style={styles.container}
        onPress={() => setModalVisible(true)}
        accessibilityRole="button"
        accessibilityLabel={`${featureName} — coming soon. Tap for details.`}
      >
        {/* Dimmed content preview */}
        <View style={styles.preview} pointerEvents="none">
          {children}
        </View>

        {/* Coming soon overlay */}
        <View style={styles.overlay}>
          <ComingSoonBadge />
          <Text style={styles.hint}>Tap for details</Text>
        </View>
      </Pressable>

      <ComingSoonModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        featureName={featureName}
        description={description}
      />
    </>
  );
}

function makeStyles(
  colors: ReturnType<typeof useTheme>['colors'],
  typography: ReturnType<typeof useTheme>['typography'],
) {
  return StyleSheet.create({
    container: {
      borderRadius: Radius.card,
      overflow: 'hidden',
      borderWidth: Border.width * 2,
      borderColor: Colors.deepTide + '30',
    },
    preview: {
      opacity: 0.35,
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.surface + 'E6',
      justifyContent: 'center',
      alignItems: 'center',
      gap: Spacing.xs,
    },
    hint: { ...typography.caption, color: colors.textSecondary },
  });
}
