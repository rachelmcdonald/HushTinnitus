import { StyleSheet, Text, View, SafeAreaView } from 'react-native';
import { Colors, Typography, Spacing } from '@/src/theme';

// Screen 3 — Urgent referral prompt (conditional, Phase 2)
// Shown when any red flag answer is yes
// Warm, non-alarming message recommending GP or ENT
// Non-blocking — user enters app normally after dismissing
export default function UrgentReferralScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>We recommend seeing a doctor</Text>
        <Text style={styles.subtitle}>Urgent referral prompt — coming in Phase 2</Text>
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
