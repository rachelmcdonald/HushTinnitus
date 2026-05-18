import { StyleSheet, Text, View, SafeAreaView } from 'react-native';
import { Colors, Typography, Spacing } from '@/src/theme';

type Props = {
  title: string;
  description: string;
  accentColor?: string;
};

export default function PlaceholderScreen({
  title,
  description,
  accentColor = Colors.calmWave,
}: Props) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={[styles.pill, { backgroundColor: accentColor + '20' }]}>
          <Text style={[styles.pillText, { color: accentColor }]}>
            Phase 1 — Placeholder
          </Text>
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.warmSand,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.base,
  },
  pill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 8,
  },
  pillText: {
    ...Typography.micro,
  },
  title: {
    ...Typography.display,
    color: Colors.deepTide,
    textAlign: 'center',
  },
  description: {
    ...Typography.body,
    color: Colors.midGray,
    textAlign: 'center',
  },
});
