import { StyleSheet, Text, View, SafeAreaView } from 'react-native';
import { Colors, Typography, Spacing } from '@/src/theme';

// Screen 6 — TFI result (Phase 2)
// Total score 0-100, severity grade, plain-language interpretation
// Subscale breakdown as horizontal bar chart
// Top 2 highest subscales flagged as focus areas
// Personalised message adapts to severity grade
// "Get started" CTA → enters app, sets onboardingComplete = true
export default function TFIResultScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Your TFI result</Text>
        <Text style={styles.subtitle}>Score, grade and subscale breakdown — coming in Phase 2</Text>
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
