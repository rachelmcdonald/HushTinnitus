import { StyleSheet, Text, View, SafeAreaView } from 'react-native';
import { Colors, Typography, Spacing } from '@/src/theme';

// Screen 7 — Notification preferences (Phase 2)
// Optional — permission for daily check-in reminder and week 4/8 TFI retest prompt
// Skip clearly available
export default function NotificationsScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Stay on track</Text>
        <Text style={styles.subtitle}>Notification preferences — coming in Phase 2</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.warmSand },
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.xl },
  title: { ...Typography.heading1, color: Colors.darkText, textAlign: 'center', marginBottom: Spacing.sm },
  subtitle: { ...Typography.body, color: Colors.midGray, textAlign: 'center' },
});
