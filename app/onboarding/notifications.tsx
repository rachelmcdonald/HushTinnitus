// ─── NO static imports from expo-notifications ───────────────────────────────
// expo-notifications throws at module-evaluation time in Expo Go SDK 53.
// The only safe pattern is a dynamic import() inside the button handler.

import { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { usePreferences } from '@/src/context/PreferencesContext';
import { Colors, Typography, Spacing, Radius, Border } from '@/src/theme';

const isExpoGo = Constants.appOwnership === 'expo';

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
  const [unavailableNote, setUnavailableNote] = useState(false);

  async function handleAllow() {
    setRequesting(true);
    setUnavailableNote(false);

    if (Platform.OS !== 'web') {
      try {
        // Dynamic import — only runs on button press, never at module load time
        const ExpoNotifications = await import('expo-notifications');
        const { status } = await ExpoNotifications.requestPermissionsAsync();
        updatePreferences({ notificationsEnabled: status === 'granted' });
      } catch {
        // expo-notifications not available (Expo Go SDK 53+)
        setUnavailableNote(true);
        setRequesting(false);
        return; // Show message; user can tap Skip to continue
      }
    }

    setRequesting(false);
    router.replace('/(tabs)');
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

        {(unavailableNote || isExpoGo) && (
          <View style={styles.devNote}>
            <Text style={styles.devNoteText}>
              Notification setup requires a development build
            </Text>
          </View>
        )}

        <Text style={styles.note}>
          You can change notification settings at any time in the app. We
          will never send promotional messages.
        </Text>

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
  header: { gap: Spacing.sm },
  title: { ...Typography.display, color: Colors.darkText },
  subtitle: { ...Typography.body, color: Colors.midGray },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.card,
    padding: Spacing.base,
    gap: Spacing.md,
  },
  notifRow: { flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start' },
  notifEmoji: { fontSize: 20, lineHeight: 28, width: 28, textAlign: 'center' },
  notifText: { flex: 1, gap: 2 },
  notifHeading: { ...Typography.heading2, color: Colors.darkText },
  notifBody: { ...Typography.body, color: Colors.midGray },
  divider: {
    height: Border.width,
    backgroundColor: Colors.midGray + '30',
    marginTop: Spacing.md,
  },
  devNote: {
    backgroundColor: Colors.tealLight,
    borderRadius: Radius.chip,
    padding: Spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.calmWave,
  },
  devNoteText: {
    ...Typography.caption,
    color: Colors.deepTide,
    fontStyle: 'italic',
  },
  note: { ...Typography.caption, color: Colors.midGray, textAlign: 'center' },
  footer: { gap: Spacing.sm },
  allowButton: {
    backgroundColor: Colors.deepTide,
    borderRadius: Radius.chip,
    paddingVertical: Spacing.base,
    alignItems: 'center',
    minHeight: 52,
    justifyContent: 'center',
  },
  allowButtonPressed: { opacity: 0.85 },
  allowButtonDisabled: { opacity: 0.7 },
  allowLabel: { ...Typography.heading2, color: Colors.white },
  skipButton: { paddingVertical: Spacing.sm, alignItems: 'center' },
  skipButtonPressed: { opacity: 0.6 },
  skipLabel: { ...Typography.body, color: Colors.midGray },
});
