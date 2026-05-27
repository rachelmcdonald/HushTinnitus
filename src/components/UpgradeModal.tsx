import { useMemo } from 'react';
import { StyleSheet, Text, View, Pressable, Modal } from 'react-native';
import { Spacing, Radius } from '@/src/theme';
import { useTheme } from '@/src/context/ThemeContext';

const PREMIUM_FEATURES = [
  '3-source sound mixer',
  'Per-ear volume balance',
  'Full relaxation library (PMR, body scan, sleep routine)',
  'CBT thought journal',
  'Trigger tagging and pattern analysis',
  'TFI progress charts and clinician PDF export',
];

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function UpgradeModal({ visible, onClose }: Props) {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}} accessibilityViewIsModal>
          {/* Gold accent bar */}
          <View style={styles.accentBar} />

          <View style={styles.content}>
            <View style={styles.badgeRow}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Premium</Text>
              </View>
            </View>

            <Text style={styles.title}>Unlock the full app</Text>
            <Text style={styles.subtitle}>
              Everything in Hush Tinnitus is free to try. Premium unlocks the
              advanced tools for deeper support.
            </Text>

            <View style={styles.featureList}>
              {PREMIUM_FEATURES.map((f) => (
                <View key={f} style={styles.featureRow}>
                  <View style={styles.featureDot} />
                  <Text style={styles.featureText}>{f}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.price}>AU$8.99 / month · AU$59.99 / year</Text>
            <Text style={styles.priceSub}>
              Cancel any time. No commitment required.
            </Text>

            {/* Payment flow is built in Phase 7. */}
            <View style={styles.comingSoon}>
              <Text style={styles.comingSoonText}>
                In-app purchase coming soon — stay tuned.
              </Text>
            </View>

            <Pressable
              style={({ pressed }) => [styles.closeBtn, pressed && styles.closeBtnPressed]}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Text style={styles.closeBtnLabel}>Close</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function makeStyles(
  colors: ReturnType<typeof useTheme>['colors'],
  typography: ReturnType<typeof useTheme>['typography'],
) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: Radius.modal,
      borderTopRightRadius: Radius.modal,
      overflow: 'hidden',
    },
    accentBar: {
      height: 4,
      backgroundColor: colors.softGold,
    },
    content: {
      padding: Spacing.xl,
      gap: Spacing.base,
    },
    badgeRow: { alignItems: 'flex-start' },
    badge: {
      backgroundColor: colors.goldLight,
      borderRadius: Radius.chip,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs,
      borderWidth: 1,
      borderColor: colors.softGold,
    },
    badgeText: { ...typography.micro, color: colors.softGold },
    title: { ...typography.display, color: colors.textPrimary },
    subtitle: { ...typography.body, color: colors.textSecondary },
    featureList: { gap: Spacing.sm },
    featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
    featureDot: {
      width: 6, height: 6, borderRadius: 3,
      backgroundColor: colors.softGold,
      marginTop: 7,
    },
    featureText: { ...typography.body, color: colors.textPrimary, flex: 1 },
    price: { ...typography.heading2, color: colors.textPrimary },
    priceSub: { ...typography.caption, color: colors.textSecondary, marginTop: -Spacing.sm },
    comingSoon: {
      backgroundColor: colors.goldLight,
      borderRadius: Radius.chip,
      padding: Spacing.md,
    },
    comingSoonText: { ...typography.body, color: colors.softGold, textAlign: 'center' },
    closeBtn: {
      paddingVertical: Spacing.base,
      alignItems: 'center',
      borderRadius: Radius.chip,
      borderWidth: 1,
      borderColor: colors.textSecondary + '50',
    },
    closeBtnPressed: { opacity: 0.7 },
    closeBtnLabel: { ...typography.heading2, color: colors.textSecondary },
  });
}
