// Wraps any Premium feature. When the user is not premium, the feature is
// visible (soft-dimmed) with a gold badge and lock. Tapping anywhere shows
// the upgrade modal.
import { useState } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { Colors, Typography, Spacing, Radius, Border } from '@/src/theme';
import UpgradeModal from './UpgradeModal';

type Props = {
  isPremium: boolean;
  featureName: string;
  children: React.ReactNode;
};

export default function PremiumGate({ isPremium, featureName, children }: Props) {
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
        accessibilityLabel={`${featureName} — Premium feature. Tap to learn more.`}
      >
        {/* Dimmed content preview */}
        <View style={styles.preview} pointerEvents="none">
          {children}
        </View>

        {/* Gold lock overlay */}
        <View style={styles.overlay}>
          <View style={styles.lockBadge}>
            <Text style={styles.lockIcon}>🔒</Text>
            <Text style={styles.lockLabel}>Premium</Text>
          </View>
          <Text style={styles.lockHint}>Tap to unlock</Text>
        </View>
      </Pressable>

      <UpgradeModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Radius.card,
    overflow: 'hidden',
    borderWidth: Border.width * 2,
    borderColor: Colors.softGold + '80',
  },
  preview: {
    opacity: 0.35,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.goldLight + 'CC',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  lockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.white,
    borderRadius: Radius.chip,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.softGold,
  },
  lockIcon: { fontSize: 14 },
  lockLabel: { ...Typography.heading2, color: Colors.softGold },
  lockHint: { ...Typography.caption, color: Colors.softGold },
});
