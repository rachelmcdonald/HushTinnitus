// Centred premium-feature modal — replaces the old bottom-sheet ComingSoonModal
// for tabs that have been migrated to the new gold/deep-tide "locked feature"
// treatment. Colours are fixed brand values regardless of theme, matching the
// existing precedent of ComingSoonModal and PremiumGate's gold gate screens.
import { StyleSheet, Text, View, Pressable, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  featureName: string;
  description: string;
};

export default function PremiumFeatureModal({
  visible,
  onClose,
  featureName,
  description,
}: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}} accessibilityViewIsModal>
          <View style={styles.headerRow}>
            <Ionicons name="lock-closed" size={16} color={Colors.softGold} />
            <Text style={styles.headerText}>Premium Feature</Text>
          </View>

          <Text style={styles.title}>{featureName}</Text>
          <Text style={styles.description}>{description}</Text>

          <Pressable
            style={({ pressed }) => [styles.closeBtn, pressed && styles.closeBtnPressed]}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Text style={styles.closeBtnLabel}>Close</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 400,
    marginHorizontal: 24,
    borderRadius: 16,
    backgroundColor: Colors.deepTide,
    padding: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  headerText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.softGold,
    letterSpacing: 1,
    marginLeft: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.warmSand,
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    lineHeight: 14 * 1.6,
    color: Colors.calmWave,
    textAlign: 'center',
    marginBottom: 20,
  },
  closeBtn: {
    backgroundColor: Colors.softGold,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  closeBtnPressed: { opacity: 0.85 },
  closeBtnLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.deepTide,
  },
});
