import { StyleSheet, Text, View, Pressable, Modal } from 'react-native';
import { Colors, Typography, Spacing, Radius } from '@/src/theme';

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

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.modal,
    borderTopRightRadius: Radius.modal,
    overflow: 'hidden',
  },
  accentBar: {
    height: 4,
    backgroundColor: Colors.softGold,
  },
  content: {
    padding: Spacing.xl,
    gap: Spacing.base,
  },
  badgeRow: { alignItems: 'flex-start' },
  badge: {
    backgroundColor: Colors.goldLight,
    borderRadius: Radius.chip,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.softGold,
  },
  badgeText: { ...Typography.micro, color: Colors.softGold },
  title: { ...Typography.display, color: Colors.darkText },
  subtitle: { ...Typography.body, color: Colors.midGray },
  featureList: { gap: Spacing.sm },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  featureDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: Colors.softGold,
    marginTop: 7,
  },
  featureText: { ...Typography.body, color: Colors.darkText, flex: 1 },
  price: { ...Typography.heading2, color: Colors.darkText },
  priceSub: { ...Typography.caption, color: Colors.midGray, marginTop: -Spacing.sm },
  comingSoon: {
    backgroundColor: Colors.goldLight,
    borderRadius: Radius.chip,
    padding: Spacing.md,
  },
  comingSoonText: { ...Typography.body, color: Colors.softGold, textAlign: 'center' },
  closeBtn: {
    paddingVertical: Spacing.base,
    alignItems: 'center',
    borderRadius: Radius.chip,
    borderWidth: 1,
    borderColor: Colors.midGray + '50',
  },
  closeBtnPressed: { opacity: 0.7 },
  closeBtnLabel: { ...Typography.heading2, color: Colors.midGray },
});
