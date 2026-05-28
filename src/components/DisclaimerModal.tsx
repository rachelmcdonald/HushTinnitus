import { Modal, View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Colors, Spacing, Radius, Border } from '@/src/theme';
import { useTheme } from '@/src/context/ThemeContext';

// Exact wording from Section 8.3 of the Hush Tinnitus specification.
// Do not paraphrase or abridge.
const DISCLAIMER =
  'Hush Tinnitus provides self-management tools and educational content for people ' +
  'living with tinnitus. It is not a medical device and is not intended to diagnose, ' +
  'treat, cure, or prevent tinnitus or any medical condition. Always consult a qualified ' +
  'healthcare professional — including a GP, audiologist, or ENT specialist — before ' +
  'making changes to how you manage your tinnitus. If your tinnitus started suddenly, ' +
  'is pulsatile, or is heard only in one ear, seek medical advice promptly.';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function DisclaimerModal({ visible, onClose }: Props) {
  const { colors, typography, isDark } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      {/* Dim overlay — tap outside to close */}
      <Pressable style={styles.overlay} onPress={onClose} accessibilityLabel="Close">
        {/* Sheet — stop propagation so inner taps don't dismiss */}
        <Pressable
          style={[
            styles.sheet,
            { backgroundColor: isDark ? Colors.midnight : Colors.warmSand },
          ]}
          onPress={() => {}}
        >
          {/* Drag handle */}
          <View style={styles.handle} />

          {/* Header row */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              Medical disclaimer
            </Text>
            <Pressable
              style={({ pressed }) => [styles.closeBtn, pressed && styles.closeBtnPressed]}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Text style={[styles.closeBtnText, { color: colors.textSecondary }]}>✕</Text>
            </Pressable>
          </View>

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: colors.calmWave + '30' }]} />

          {/* Disclaimer body */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.bodyScroll}
          >
            <Text style={[styles.body, { color: colors.textPrimary }]}>
              {DISCLAIMER}
            </Text>
          </ScrollView>

          {/* Close button */}
          <Pressable
            style={({ pressed }) => [
              styles.doneBtn,
              { backgroundColor: colors.deepTide },
              pressed && styles.doneBtnPressed,
            ]}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close disclaimer"
          >
            <Text style={[styles.doneBtnLabel, { color: Colors.white }]}>Close</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: Radius.modal,
    borderTopRightRadius: Radius.modal,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxl,
    gap: Spacing.base,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.midGray + '40',
    alignSelf: 'center',
    marginBottom: Spacing.xs,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '500',
  },
  closeBtn: {
    padding: Spacing.sm,
    borderRadius: Radius.chip,
  },
  closeBtnPressed: { opacity: 0.6 },
  closeBtnText: { fontSize: 16 },
  divider: {
    height: Border.width,
  },
  bodyScroll: {
    paddingVertical: Spacing.sm,
  },
  body: {
    fontSize: 14,
    lineHeight: 22,
  },
  doneBtn: {
    borderRadius: Radius.chip,
    paddingVertical: Spacing.base,
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  doneBtnPressed: { opacity: 0.85 },
  doneBtnLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
});
