import { Stack } from 'expo-router';
import { Colors } from '@/src/theme';

export default function SoundLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.warmSand },
        animation: 'slide_from_right',
      }}
    />
  );
}
