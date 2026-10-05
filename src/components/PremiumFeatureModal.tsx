// Centred premium-feature modal — replaces the old bottom-sheet ComingSoonModal
// for tabs that have been migrated to the new gold/deep-tide "locked feature"
// treatment. The gold/overlay/subscribe-button accents stay fixed brand values
// in both themes; the card background and body text invert for light/dark.
import { useMemo } from 'react';
import { StyleSheet, Text, View, Pressable, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/theme';
import { useTheme } from '@/src/context/ThemeContext';

type Props = {
  visible: boolean;
  onClose: () => void;
  featureName: string;
  description: string;
  // When true, replaces the disabled Subscribe button + italic "Coming Soon"
  // caption with a single prominent "Coming Soon" text — for features with no
  // subscribe path to show yet.
  hideSubscribeButton?: boolean;
};

export default function PremiumFeatureModal({
  visible,
  onClose,
  featureName,
  description,
  hideSubscribeButton,
}: Props) {
  const { isDark } = useTheme();
  const styles = useMemo(() => makeStyles(isDark), [isDark]);

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
          <Pressable
            style={styles.closeIcon}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close" size={22} color={isDark ? Colors.softGold : Colors.deepTide} />
          </Pressable>

          <View style={styles.headerRow}>
            <Ionicons name="lock-closed" size={16} color={Colors.softGold} />
            <Text style={styles.headerText}>Premium Feature</Text>
          </View>

          <Text style={styles.title}>{featureName}</Text>
          <Text style={styles.description}>{description}</Text>

          {hideSubscribeButton ? (
            <Text style={styles.comingSoonProminent}>Coming Soon</Text>
          ) : (
            <>
              <Pressable
                disabled={true}
                style={styles.subscribeBtn}
                accessibilityRole="button"
                accessibilityLabel="Subscribe — coming soon"
                accessibilityState={{ disabled: true }}
              >
                <Text style={styles.subscribeBtnLabel}>Subscribe</Text>
              </Pressable>
              <Text style={styles.comingSoonCaption}>Coming Soon</Text>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function makeStyles(isDark: boolean) {
  return StyleSheet.create({
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
      backgroundColor: isDark ? Colors.deepTide : Colors.warmSand,
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
      color: isDark ? Colors.warmSand : Colors.deepTide,
      textAlign: 'center',
      marginBottom: 12,
    },
    description: {
      fontSize: 14,
      lineHeight: 14 * 1.6,
      color: isDark ? Colors.calmWave : 'rgba(13, 79, 92, 0.8)',
      textAlign: 'center',
      marginBottom: 20,
    },
    closeIcon: {
      position: 'absolute',
      top: 12,
      right: 12,
      zIndex: 1,
    },
    subscribeBtn: {
      backgroundColor: 'rgba(196, 154, 106, 0.6)',
      borderRadius: 8,
      paddingVertical: 12,
      alignItems: 'center',
      marginTop: 4,
    },
    subscribeBtnLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: Colors.deepTide,
    },
    comingSoonCaption: {
      marginTop: 8,
      fontSize: 11,
      fontStyle: 'italic',
      color: isDark ? Colors.calmWave : Colors.midGray,
      textAlign: 'center',
    },
    comingSoonProminent: {
      fontSize: 16,
      fontWeight: '600',
      color: Colors.softGold,
      textAlign: 'center',
      marginTop: 8,
    },
  });
}
