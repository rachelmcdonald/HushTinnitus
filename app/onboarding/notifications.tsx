import { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  SafeAreaView,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { usePreferences } from '@/src/context/PreferencesContext';
import { Colors, Typography, Spacing, Radius, Border } from '@/src/theme';

// expo-notifications remote push was removed from Expo Go in SDK 53.
// We import it but guard every call — the UI always renders safely.
let ExpoNotifications: typeof import('expo-notifications') | null = null;
try {
  ExpoNotifications = require('expo-notifications');
} catch {}

// True when running inside Expo Go (executionEnvironment === 'storeClient').
const isExpoGo = Constants.executionEnvironment === 'storeClient';

type NotificationItem = {
  emoji: string;
  heading: string;
  body: string;
};

const NOTIFICATION_ITEMS: NotificationItem[] = [
  {
    emoji: '📋',
    heading: 'Daily check-in',
    body: 'A gentle prompt to log your loudness and distress levels — takes under a minute.',
  },
  {
    emoji: '📅',
    heading: 'TFI retest reminders',
    body: 'A reminder at 4 weeks and 8 weeks to retake the TFI so you can track your progress.',
  },
];

function NotificationRow({ emoji, heading, body }: NotificationItem) {
  return (
    <View style={styles.notifRow}>
      <Text style={styles.notifEmoji}>{emoji}</Text>
      <View style={styles.notifText}>
        <Text style={styles.notifHeading}>{heading}</Text>
        <Text style={styles.notifBody}>{body}</Text>
      </View>
    </View>
  );
}

export default function NotificationsScreen() {
  const { updatePreferences } = usePreferences();
  const [requesting, setRequesting] = useState(false);

  async function handleAllow() {
    setRequesting(true);
    try {
      if (Platform.OS !== 'web' && ExpoNotifications && !isExpoGo) {
        try {
          const { status } = await ExpoNotifications.requestPermissionsAsync();
          updatePreferences({ notificationsEnabled: status === 'granted' });
        } catch {
          // Permission request failed — skip silently, user can enable from Settings.
        }
      }
    } finally {
      setRequesting(false);
      router.replace('/(tabs)');
    }
  }

  function handleSkip() {
    router.replace('/(tabs)');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Stay on track</Text>
          <Text style={styles.subtitle}>
            Optional reminders to help you build consistent habits and monitor
            how your tinnitus changes over time.
          </Text>
        </View>

        <View style={styles.card}>
          {NOTIFICATION_ITEMS.map((item, i) => (
            <View key={item.heading}>
              <NotificationRow {...item} />
              {i < NOTIFICATION_ITEMS.length - 1 && (
                <View style={styles.divider} />
              )}
            </View>
          ))}
        </View>

        <Text style={styles.note}>
          You can change notification settings at any time in the app. We
          will never send promotional messages.
        </Text>

        {isExpoGo && (
          <Text style={styles.devNote}>
            Notification setup requires a development build
          </Text>
        )}

        <View style={styles.footer}>
          <Pressable
            style={({ pressed }) => [
              styles.allowButton,
              pressed && styles.allowButtonPressed,
              requesting && styles.allowButtonDisabled,
            ]}
            onPress={handleAllow}
            disabled={requesting}
            accessibilityRole="button"
            accessibilityLabel="Allow notifications"
          >
            {requesting ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.allowLabel}>Allow notifications</Text>
            )}
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.skipButton,
              pressed && styles.skipButtonPressed,
            ]}
            onPress={handleSkip}
            disabled={requesting}
            accessibilityRole="button"
            accessibilityLabel="Skip for now"
          >
            <Text style={styles.skipLabel}>Skip for now</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.warmSand,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.huge,
    paddingBottom: Spacing.xl,
    gap: Spacing.xl,
  },

  // Header
  header: {
    gap: Spacing.sm,
  },
  title: {
    ...Typography.display,
    color: Colors.darkText,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.midGray,
  },

  // Notification items card
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.card,
    padding: Spacing.base,
    gap: Spacing.md,
  },
  notifRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'flex-start',
  },
  notifEmoji: {
    fontSize: 20,
    lineHeight: 28,
    width: 28,
    textAlign: 'center',
  },
  notifText: {
    flex: 1,
    gap: 2,
  },
  notifHeading: {
    ...Typography.heading2,
    color: Colors.darkText,
  },
  notifBody: {
    ...Typography.body,
    color: Colors.midGray,
  },
  divider: {
    height: Border.width,
    backgroundColor: Colors.midGray + '30',
    marginTop: Spacing.md,
  },

  // Note
  note: {
    ...Typography.caption,
    color: Colors.midGray,
    textAlign: 'center',
  },
  devNote: {
    ...Typography.caption,
    color: Colors.midGray,
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // Footer
  footer: {
    gap: Spacing.sm,
  },
  allowButton: {
    backgroundColor: Colors.deepTide,
    borderRadius: Radius.chip,
    paddingVertical: Spacing.base,
    alignItems: 'center',
    minHeight: 52,
    justifyContent: 'center',
  },
  allowButtonPressed: {
    opacity: 0.85,
  },
  allowButtonDisabled: {
    opacity: 0.7,
  },
  allowLabel: {
    ...Typography.heading2,
    color: Colors.white,
  },
  skipButton: {
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  skipButtonPressed: {
    opacity: 0.6,
  },
  skipLabel: {
    ...Typography.body,
    color: Colors.midGray,
  },
});
