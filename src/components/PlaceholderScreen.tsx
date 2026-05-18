import { StyleSheet, Text, View, SafeAreaView } from 'react-native';
import { Colors, Typography, Spacing } from '@/src/theme';

type Props = {
  title: string;
  subtitle: string;
};

export default function PlaceholderScreen({ title, subtitle }: Props) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
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
    gap: Spacing.sm,
  },
  title: {
    ...Typography.heading1,
    color: Colors.darkText,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.body,
    color: Colors.midGray,
    textAlign: 'center',
  },
});
