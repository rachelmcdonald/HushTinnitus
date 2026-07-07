import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/src/theme';

export default function ComingSoonBadge() {
  return (
    <View style={styles.pill}>
      <Text style={styles.text}>Coming Soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.deepTide,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.calmWave,
  },
});
