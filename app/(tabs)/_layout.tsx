import { Tabs } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, TabBar, Typography, Spacing } from '@/src/theme';

type TabIconProps = {
  focused: boolean;
  label: string;
  emoji: string;
};

function TabIcon({ focused, label, emoji }: TabIconProps) {
  return (
    <View style={styles.iconWrapper}>
      <Text style={[styles.emoji, focused && styles.emojiActive]}>{emoji}</Text>
      <Text
        style={[
          styles.label,
          { color: focused ? TabBar.activeTintColor : TabBar.inactiveTintColor },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: TabBar.backgroundColor,
          borderTopColor: TabBar.borderTopColor,
          borderTopWidth: TabBar.borderTopWidth,
          height: 64,
          paddingBottom: Spacing.xs,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} label="Home" emoji="🏠" />
          ),
        }}
      />
      <Tabs.Screen
        name="sound"
        options={{
          title: 'Sound',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} label="Sound" emoji="🔊" />
          ),
        }}
      />
      <Tabs.Screen
        name="relax"
        options={{
          title: 'Relax',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} label="Relax" emoji="🌿" />
          ),
        }}
      />
      <Tabs.Screen
        name="learn"
        options={{
          title: 'Learn',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} label="Learn" emoji="📖" />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} label="Progress" emoji="📈" />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingTop: Spacing.xs,
  },
  emoji: {
    fontSize: 20,
    opacity: 0.5,
  },
  emojiActive: {
    opacity: 1,
  },
  label: {
    ...Typography.micro,
    textTransform: 'uppercase',
  },
});
