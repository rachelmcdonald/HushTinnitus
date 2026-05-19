import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { usePreferences } from '@/src/context/PreferencesContext';
import { Colors } from '@/src/theme';

export default function Index() {
  const { preferences, isLoading } = usePreferences();

  if (isLoading || !preferences) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.warmSand, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={Colors.deepTide} />
      </View>
    );
  }

  if (preferences.onboardingComplete) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/onboarding" />;
}
