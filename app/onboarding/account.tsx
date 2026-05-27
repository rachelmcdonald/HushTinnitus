import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Spacing } from '@/src/theme';
import { useTheme } from '@/src/context/ThemeContext';

// Screen 8 — Optional account creation (Phase 2)
// Email/password or Sign in with Apple / Google
// Clearly labelled as optional — all features available without account
// Account enables cloud sync of symptom log (Phase 2 cloud feature)
export default function AccountScreen() {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Save your progress</Text>
        <Text style={styles.subtitle}>Optional account creation — coming in Phase 2</Text>
      </View>
    </SafeAreaView>
  );
}

function makeStyles(
  colors: ReturnType<typeof useTheme>['colors'],
  typography: ReturnType<typeof useTheme>['typography'],
) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    container: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.xl },
    title: { ...typography.heading1, color: colors.textPrimary, textAlign: 'center', marginBottom: Spacing.sm },
    subtitle: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  });
}
