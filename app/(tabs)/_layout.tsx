import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Tabs, router } from 'expo-router';
import { CommonActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/src/theme';
import { useTheme } from '@/src/context/ThemeContext';
import DisclaimerModal from '@/src/components/DisclaimerModal';

const TAB_HEIGHT = 60;

// Every tab whose screen is itself a nested Stack (sound, relax, learn,
// progress) keeps that stack's navigation state when you switch away and
// back — so returning to a tab shows whatever sub-screen you last drilled
// into, not the tab's index. This listener pops that nested stack back to
// its root every time the tab is pressed, whether it was already active or
// not. `route.state` is undefined for tabs with no nested stack (Home), so
// it's a no-op there — safe to attach to every tab uniformly.
function resetTabOnPress({ navigation, route }: any) {
  return {
    tabPress: (e: any) => {
      e.preventDefault();
      navigation.navigate(route.name);

      const state = route.state as
        | { index: number; key: string; routes: { name: string }[] }
        | undefined;

      if (state && state.index > 0) {
        navigation.dispatch({
          ...CommonActions.reset({
            index: 0,
            routes: [{ name: state.routes[0].name }],
          }),
          target: state.key,
        });
      }
    },
  };
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [disclaimerVisible, setDisclaimerVisible] = useState(false);

  const sharedHeaderOptions = {
    headerShown: true,
    headerTitle: '',
    headerStyle: { backgroundColor: colors.background },
    headerShadowVisible: false,
  };

  function InfoButton() {
    return (
      <Pressable
        onPress={() => setDisclaimerVisible(true)}
        style={{ paddingHorizontal: 16, paddingVertical: 8 }}
        accessibilityRole="button"
        accessibilityLabel="Medical disclaimer"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 0 }}
      >
        <Ionicons name="information-circle-outline" size={22} color={colors.deepTide} />
      </Pressable>
    );
  }

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: true,
          tabBarActiveTintColor: Colors.calmWave,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '500',
            letterSpacing: 0.55,
            textTransform: 'uppercase',
          },
          tabBarStyle: {
            backgroundColor: Colors.deepTide,
            borderTopWidth: 0,
            height: TAB_HEIGHT + insets.bottom,
            paddingBottom: insets.bottom,
            paddingTop: 0,
            elevation: 0,
            shadowOpacity: 0,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          listeners={resetTabOnPress}
          options={{
            title: 'Home',
            ...sharedHeaderOptions,
            headerRight: () => (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <InfoButton />
                <Pressable
                  onPress={() => router.push('/settings' as any)}
                  style={{ paddingLeft: 4, paddingRight: 16, paddingVertical: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel="Settings"
                  hitSlop={{ top: 8, bottom: 8, left: 0, right: 0 }}
                >
                  <Ionicons name="settings-outline" size={22} color={colors.deepTide} />
                </Pressable>
              </View>
            ),
            tabBarIcon: ({ focused, color }) => (
              <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="sound"
          listeners={resetTabOnPress}
          options={{
            title: 'Sound',
            ...sharedHeaderOptions,
            headerRight: () => <InfoButton />,
            tabBarIcon: ({ focused, color }) => (
              <Ionicons name={focused ? 'musical-notes' : 'musical-notes-outline'} size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="relax"
          listeners={resetTabOnPress}
          options={{
            title: 'Relax',
            ...sharedHeaderOptions,
            headerRight: () => <InfoButton />,
            tabBarIcon: ({ focused, color }) => (
              <Ionicons name={focused ? 'leaf' : 'leaf-outline'} size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="learn"
          listeners={resetTabOnPress}
          options={{
            title: 'Learn',
            ...sharedHeaderOptions,
            headerRight: () => <InfoButton />,
            tabBarIcon: ({ focused, color }) => (
              <Ionicons name={focused ? 'book' : 'book-outline'} size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="progress"
          listeners={resetTabOnPress}
          options={{
            title: 'Track',
            ...sharedHeaderOptions,
            headerRight: () => <InfoButton />,
            tabBarIcon: ({ focused, color }) => (
              <Ionicons name={focused ? 'bar-chart' : 'bar-chart-outline'} size={24} color={color} />
            ),
          }}
        />
      </Tabs>

      <DisclaimerModal
        visible={disclaimerVisible}
        onClose={() => setDisclaimerVisible(false)}
      />
    </>
  );
}
