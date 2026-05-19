import { StyleSheet, Text, View, SafeAreaView } from 'react-native';
import { Colors, Typography, Spacing } from '@/src/theme';

// Screen 2 — Red flag check (Phase 2)
// 3 yes/no questions: sudden onset (<72h), pulsatile, unilateral
// Any yes → urgent-referral screen
export default function RedFlagScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>A few quick questions</Text>
        <Text style={styles.subtitle}>Red flag check — coming in Phase 2</Text>
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
