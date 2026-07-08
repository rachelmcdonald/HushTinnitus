// Replaces the old paywall UpgradeModal. The app launches fully free — this
// modal explains what a not-yet-built feature will do, it never sells anything.
import { StyleSheet, Text, View, Pressable, Modal } from 'react-native';
import { router } from 'expo-router';
import { Colors, Spacing, Radius } from '@/src/theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  featureName: string;
  description: string;
  // Optional route to an already-built session/feature screen. When set, the
  // modal offers a way to preview that real content ahead of the feature's
  // official (paid) launch — used only where the underlying screen exists.
  previewRoute?: string;
};

export default function ComingSoonModal({
  visible,
  onClose,
  featureName,
  description,
  previewRoute,
}: Props) {
  function handlePreview() {
    onClose();
    if (previewRoute) router.push(previewRoute as any);
  }

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
          <View style={styles.accentBar} />

          <View style={styles.content}>
            <View style={styles.badgeRow}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Coming Soon</Text>
              </View>
            </View>

            <Text style={styles.title}>{featureName}</Text>
            <Text style={styles.description}>{description}</Text>

            <View style={styles.note}>
              <Text style={styles.noteText}>
                This feature is currently in development and will be available in a
                future update — completely free during our launch period.
              </Text>
            </View>

            {previewRoute && (
              <Pressable
                onPress={handlePreview}
                accessibilityRole="button"
                accessibilityLabel="Preview this feature"
              >
                <Text style={styles.previewLink}>Preview this feature →</Text>
              </Pressable>
            )}

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

// Fixed brand colours regardless of theme — matches the existing precedent of
// PremiumGate's gold gate screens, which stay constant in light and dark mode.
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
    backgroundColor: Colors.deepTide,
  },
  content: {
    padding: Spacing.xl,
    gap: Spacing.base,
  },
  badgeRow: { alignItems: 'flex-start' },
  badge: {
    backgroundColor: Colors.deepTide,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: { fontSize: 11, fontWeight: '600', color: Colors.calmWave },
  title: { fontSize: 16, fontWeight: '600', color: Colors.deepTide },
  description: { fontSize: 14, fontWeight: '400', lineHeight: 22, color: Colors.darkText },
  note: {
    backgroundColor: Colors.tealLight,
    borderRadius: Radius.chip,
    padding: Spacing.md,
  },
  noteText: { fontSize: 12, fontWeight: '400', lineHeight: 18, color: Colors.midGray },
  previewLink: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.calmWave,
    textAlign: 'center',
  },
  closeBtn: {
    borderWidth: 1.5,
    borderColor: Colors.deepTide,
    borderRadius: Radius.chip,
    paddingVertical: Spacing.base,
    alignItems: 'center',
  },
  closeBtnPressed: { opacity: 0.7 },
  closeBtnLabel: { fontSize: 16, fontWeight: '500', color: Colors.deepTide },
});
