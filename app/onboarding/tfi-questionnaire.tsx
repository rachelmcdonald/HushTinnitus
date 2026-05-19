import { StyleSheet, Text, View, SafeAreaView } from 'react-native';
import { Colors, Typography, Spacing } from '@/src/theme';

// Screen 5 — TFI questionnaire (Phase 2)
// 25 questions across 8 subscales, 0-10 horizontal slider each
// Progress bar, back navigation, save/resume on exit
export default function TFIQuestionnaireScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Tinnitus Functional Index</Text>
        <Text style={styles.subtitle}>25-question assessment — coming in Phase 2</Text>
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
