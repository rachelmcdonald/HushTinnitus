import { StyleSheet, Text, View, SafeAreaView } from 'react-native';
import { Colors, Typography, Spacing } from '@/src/theme';

// Screen 4 — TFI introduction (Phase 2)
// Explains what the TFI is, why it helps, estimated time (4 minutes)
// Skip option available — returns a nudge prompt later
export default function TFIIntroScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Understanding your tinnitus</Text>
        <Text style={styles.subtitle}>TFI introduction — coming in Phase 2</Text>
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
