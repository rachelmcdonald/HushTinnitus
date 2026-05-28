// ─── NO static imports from expo-notifications, expo-print, or expo-sharing ───
// These are loaded dynamically inside handlers to avoid native-module crashes
// in environments where they are unavailable (Expo Go SDK 54+).

import { useState, useMemo, useCallback } from 'react';
import {
  StyleSheet, Text, View, Pressable, ScrollView,
  Switch, Alert, Platform, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Border } from '@/src/theme';
import { useTheme } from '@/src/context/ThemeContext';
import { usePreferences } from '@/src/context/PreferencesContext';
import { getDb } from '@/src/storage/database';
import { getPreferences } from '@/src/storage/preferences';
import DisclaimerModal from '@/src/components/DisclaimerModal';
import type { UserPreferences } from '@/src/types';

// ─── Utilities ────────────────────────────────────────────────────────────────

function safeJSON(s: string | null | undefined): unknown {
  try { return s ? JSON.parse(s) : null; } catch { return null; }
}

function formatShortDate(d: Date): string {
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
}

const isExpoGo = Constants.appOwnership === 'expo';

// ─── Notification scheduling ──────────────────────────────────────────────────

async function applyNotifications(
  enabled: boolean,
  time: string,
  firstLaunchDate: string | null | undefined,
): Promise<{ unavailable?: boolean }> {
  if (Platform.OS === 'web') return {};
  try {
    const Notifs = await import('expo-notifications');

    // Cancel all existing Hush notifications first
    for (const id of ['hush-daily', 'hush-tfi-week4', 'hush-tfi-week8']) {
      Notifs.cancelScheduledNotificationAsync(id).catch(() => {});
    }

    if (!enabled) return {};

    // Ensure permission is granted
    const { status } = await Notifs.getPermissionsAsync();
    let finalStatus = status;
    if (status !== 'granted') {
      const req = await Notifs.requestPermissionsAsync();
      finalStatus = req.status;
    }
    if (finalStatus !== 'granted') return {};

    // Daily check-in
    const [hour, minute] = time.split(':').map(Number);
    await Notifs.scheduleNotificationAsync({
      identifier: 'hush-daily',
      content: {
        title: 'Daily check-in',
        body: 'How is your tinnitus today? Take a moment to log your symptoms.',
        sound: true,
      },
      trigger: {
        type: Notifs.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });

    // TFI retest reminders — auto-scheduled based on firstLaunchDate
    if (firstLaunchDate) {
      const launch = new Date(firstLaunchDate);
      const now = Date.now();

      const w4 = new Date(launch.getTime() + 28 * 86_400_000);
      const w8 = new Date(launch.getTime() + 56 * 86_400_000);

      if (w4.getTime() > now) {
        await Notifs.scheduleNotificationAsync({
          identifier: 'hush-tfi-week4',
          content: {
            title: 'Week 4 TFI check-in',
            body: "It's been 4 weeks — time to retake the TFI and track your progress.",
            sound: true,
          },
          trigger: { type: Notifs.SchedulableTriggerInputTypes.DATE, date: w4 },
        });
      }

      if (w8.getTime() > now) {
        await Notifs.scheduleNotificationAsync({
          identifier: 'hush-tfi-week8',
          content: {
            title: 'Week 8 TFI check-in',
            body: "It's been 8 weeks — time to retake the TFI and see how far you've come.",
            sound: true,
          },
          trigger: { type: Notifs.SchedulableTriggerInputTypes.DATE, date: w8 },
        });
      }
    }

    return {};
  } catch {
    return { unavailable: true };
  }
}

// ─── Time picker sub-component ────────────────────────────────────────────────

function TimePicker({
  savedTime,
  onCommit,
  colors,
  typography,
}: {
  savedTime: string;
  onCommit: (time: string) => void;
  colors: ReturnType<typeof useTheme>['colors'];
  typography: ReturnType<typeof useTheme>['typography'];
}) {
  const [hour, setHour] = useState(() => parseInt(savedTime.split(':')[0] ?? '9', 10));
  const [minute, setMinute] = useState(() => parseInt(savedTime.split(':')[1] ?? '0', 10));

  const currentTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  const isDirty = currentTime !== savedTime;

  function adjHour(d: number) { setHour((h) => (h + d + 24) % 24); }
  function adjMinute(d: number) { setMinute((m) => ((m + d) % 60 + 60) % 60); }

  return (
    <View style={tp.container}>
      <Text style={[tp.label, { color: colors.textSecondary, ...typography.caption }]}>
        Reminder time
      </Text>

      <View style={tp.row}>
        {/* Hour */}
        <View style={tp.unit}>
          <Pressable
            style={({ pressed }) => [tp.arrow, pressed && tp.arrowPressed]}
            onPress={() => adjHour(1)}
            accessibilityLabel="Hour up"
          >
            <Ionicons name="chevron-up" size={18} color={colors.deepTide} />
          </Pressable>
          <View style={[tp.digitBox, { backgroundColor: colors.surface }]}>
            <Text style={[tp.digit, { color: colors.textPrimary, ...typography.heading1 }]}>
              {hour.toString().padStart(2, '0')}
            </Text>
          </View>
          <Pressable
            style={({ pressed }) => [tp.arrow, pressed && tp.arrowPressed]}
            onPress={() => adjHour(-1)}
            accessibilityLabel="Hour down"
          >
            <Ionicons name="chevron-down" size={18} color={colors.deepTide} />
          </Pressable>
        </View>

        <Text style={[tp.colon, { color: colors.textSecondary }]}>:</Text>

        {/* Minute (15-min increments) */}
        <View style={tp.unit}>
          <Pressable
            style={({ pressed }) => [tp.arrow, pressed && tp.arrowPressed]}
            onPress={() => adjMinute(15)}
            accessibilityLabel="Minute up"
          >
            <Ionicons name="chevron-up" size={18} color={colors.deepTide} />
          </Pressable>
          <View style={[tp.digitBox, { backgroundColor: colors.surface }]}>
            <Text style={[tp.digit, { color: colors.textPrimary, ...typography.heading1 }]}>
              {minute.toString().padStart(2, '0')}
            </Text>
          </View>
          <Pressable
            style={({ pressed }) => [tp.arrow, pressed && tp.arrowPressed]}
            onPress={() => adjMinute(-15)}
            accessibilityLabel="Minute down"
          >
            <Ionicons name="chevron-down" size={18} color={colors.deepTide} />
          </Pressable>
        </View>
      </View>

      {isDirty && (
        <Pressable
          style={({ pressed }) => [
            tp.setBtn,
            { backgroundColor: colors.deepTide },
            pressed && tp.setBtnPressed,
          ]}
          onPress={() => onCommit(currentTime)}
          accessibilityRole="button"
          accessibilityLabel="Save reminder time"
        >
          <Text style={[tp.setBtnLabel, { color: Colors.white, ...typography.heading2 }]}>
            Set reminder
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const tp = StyleSheet.create({
  container: { gap: Spacing.sm },
  label: { },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  unit: { alignItems: 'center', gap: Spacing.xs },
  arrow: { padding: Spacing.xs },
  arrowPressed: { opacity: 0.5 },
  digitBox: {
    width: 60,
    height: 52,
    borderRadius: Radius.chip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digit: { },
  colon: { fontSize: 24, fontWeight: '300', marginTop: 4 },
  setBtn: {
    borderRadius: Radius.chip,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  setBtnPressed: { opacity: 0.85 },
  setBtnLabel: { },
});

// ─── Selector component (existing) ───────────────────────────────────────────

function Selector<T extends string>({
  options,
  value,
  onChange,
  colors,
  typography,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
  colors: ReturnType<typeof useTheme>['colors'];
  typography: ReturnType<typeof useTheme>['typography'];
}) {
  return (
    <View style={[sel.row, { backgroundColor: colors.surface, borderColor: colors.calmWave + '40' }]}>
      {options.map((opt, i) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            style={[
              sel.option,
              active && { backgroundColor: colors.deepTide },
              i > 0 && { borderLeftWidth: Border.width, borderLeftColor: colors.calmWave + '40' },
            ]}
            onPress={() => onChange(opt.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            accessibilityLabel={opt.label}
          >
            <Text
              style={[
                { ...typography.caption, fontWeight: active ? '600' : '400' },
                { color: active ? colors.white : colors.textSecondary },
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const sel = StyleSheet.create({
  row: {
    flexDirection: 'row',
    borderRadius: Radius.chip,
    borderWidth: Border.width,
    overflow: 'hidden',
  },
  option: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
});

// ─── Options ──────────────────────────────────────────────────────────────────

const DARK_MODE_OPTIONS: { label: string; value: UserPreferences['darkMode'] }[] = [
  { label: 'System', value: 'system' },
  { label: 'Light',  value: 'light'  },
  { label: 'Dark',   value: 'dark'   },
];

const TEXT_SIZE_OPTIONS: { label: string; value: UserPreferences['textSize'] }[] = [
  { label: 'Small',  value: 'small'  },
  { label: 'Medium', value: 'medium' },
  { label: 'Large',  value: 'large'  },
];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const { colors, typography } = useTheme();
  const { preferences, updatePreferences } = usePreferences();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);

  const [disclaimerVisible, setDisclaimerVisible] = useState(false);
  const [notifApplying, setNotifApplying] = useState(false);
  const [notifUnavailable, setNotifUnavailable] = useState(false);
  const [exporting, setExporting] = useState(false);

  const darkMode          = preferences?.darkMode ?? 'system';
  const textSize          = preferences?.textSize ?? 'medium';
  const notificationsOn   = preferences?.notificationsEnabled ?? false;
  const savedTime         = preferences?.notificationTime ?? '09:00';
  const firstLaunchDate   = preferences?.firstLaunchDate ?? null;

  // Compute TFI reminder dates for display
  const tfiDates = useMemo(() => {
    if (!firstLaunchDate) return null;
    const launch = new Date(firstLaunchDate);
    const now = new Date();
    const w4 = new Date(launch.getTime() + 28 * 86_400_000);
    const w8 = new Date(launch.getTime() + 56 * 86_400_000);
    return {
      w4: { date: w4, future: w4 > now },
      w8: { date: w8, future: w8 > now },
    };
  }, [firstLaunchDate]);

  // Toggle all notifications
  const handleToggleNotifications = useCallback(async (enabled: boolean) => {
    updatePreferences({ notificationsEnabled: enabled });
    setNotifApplying(true);
    setNotifUnavailable(false);
    const result = await applyNotifications(enabled, savedTime, firstLaunchDate);
    if (result.unavailable) setNotifUnavailable(true);
    setNotifApplying(false);
  }, [savedTime, firstLaunchDate, updatePreferences]);

  // Commit a new reminder time
  const handleTimeCommit = useCallback(async (time: string) => {
    updatePreferences({ notificationTime: time });
    setNotifApplying(true);
    const result = await applyNotifications(true, time, firstLaunchDate);
    if (result.unavailable) setNotifUnavailable(true);
    setNotifApplying(false);
  }, [firstLaunchDate, updatePreferences]);

  // Export all data
  const handleExport = useCallback(async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Not available', 'Data export is not supported on web.');
      return;
    }
    setExporting(true);
    try {
      const db = getDb();
      const prefs = getPreferences();

      const tfiRows = db.getAllSync<Record<string, unknown>>('SELECT * FROM tfi_assessments ORDER BY date ASC');
      const logRows = db.getAllSync<Record<string, unknown>>('SELECT * FROM symptom_log ORDER BY date ASC');
      const sessionRows = db.getAllSync<Record<string, unknown>>('SELECT * FROM sound_sessions ORDER BY date ASC');

      const exportData = {
        exportedAt: new Date().toISOString(),
        note: 'All data is stored privately on this device. Nothing is shared with third parties or transmitted to any server.',
        preferences: {
          darkMode:             prefs.darkMode,
          textSize:             prefs.textSize,
          firstLaunchDate:     prefs.firstLaunchDate,
          lastTFIDate:         prefs.lastTFIDate,
          notificationsEnabled: prefs.notificationsEnabled,
          notificationTime:    prefs.notificationTime,
        },
        tfiAssessments: tfiRows.map((r) => ({
          id:          r.id,
          date:        r.date,
          totalScore:  r.totalScore,
          grade:       r.grade,
          isBaseline:  r.isBaseline,
          weekNumber:  r.weekNumber,
          subscales:   safeJSON(r.subscalesJson as string),
          responses:   safeJSON(r.responsesJson as string),
        })),
        symptomLog: logRows.map((r) => ({
          id:         r.id,
          date:       r.date,
          timeOfDay:  r.timeOfDay,
          loudness:   r.loudness,
          distress:   r.distress,
          notes:      r.notes,
          triggers:   safeJSON(r.triggersJson as string),
        })),
        soundSessions: sessionRows.map((r) => ({
          id:              r.id,
          date:            r.date,
          durationSeconds: r.durationSeconds,
          timerMinutes:    r.timerMinutes,
          sounds:          safeJSON(r.soundsJson as string),
        })),
      };

      const json = JSON.stringify(exportData, null, 2);
      const escaped = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

      // Dynamic imports — wrapped in try/catch per spec
      try {
        const Print   = await import('expo-print');
        const Sharing = await import('expo-sharing');

        const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, Helvetica, sans-serif; padding: 24px; }
    h1   { font-size: 18px; font-weight: 500; color: #0D4F5C; margin-bottom: 4px; }
    .sub { font-size: 12px; color: #666; margin-bottom: 20px; }
    pre  { font-size: 10px; line-height: 1.6; white-space: pre-wrap; word-break: break-all; }
  </style>
</head>
<body>
  <h1>Hush Tinnitus — Data Export</h1>
  <p class="sub">Exported: ${new Date().toLocaleString('en-AU')}<br>
  All data is stored privately on this device.</p>
  <pre>${escaped}</pre>
</body>
</html>`;

        const { uri } = await Print.printToFileAsync({ html, base64: false });
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(uri, { dialogTitle: 'Export Hush Tinnitus data' });
        } else {
          Alert.alert('Sharing not available', 'Your device does not support file sharing.');
        }
      } catch {
        Alert.alert('Export failed', 'Could not prepare export file. Please try again.');
      }
    } catch {
      Alert.alert('Export failed', 'Could not read data. Please try again.');
    } finally {
      setExporting(false);
    }
  }, []);

  const showDevNote = notifUnavailable || isExpoGo;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Top bar: back + info icon */}
        <View style={styles.topBar}>
          <Pressable
            style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Text style={styles.backLabel}>← Back</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.infoBtn, pressed && styles.infoBtnPressed]}
            onPress={() => setDisclaimerVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Medical disclaimer"
          >
            <Ionicons name="information-circle-outline" size={22} color={colors.deepTide} />
          </Pressable>
        </View>

        <Text style={styles.title}>Settings</Text>

        {/* ── Appearance ─────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Appearance</Text>

          <View style={styles.row}>
            <View style={styles.rowLabel}>
              <Text style={styles.rowTitle}>Dark mode</Text>
              <Text style={styles.rowDesc}>System follows your device setting.</Text>
            </View>
            <Selector
              options={DARK_MODE_OPTIONS}
              value={darkMode}
              onChange={(v) => updatePreferences({ darkMode: v })}
              colors={colors}
              typography={typography}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <View style={styles.rowLabel}>
              <Text style={styles.rowTitle}>Text size</Text>
              <Text style={styles.rowDesc}>Scales all text across the app.</Text>
            </View>
            <Selector
              options={TEXT_SIZE_OPTIONS}
              value={textSize}
              onChange={(v) => updatePreferences({ textSize: v })}
              colors={colors}
              typography={typography}
            />
          </View>
        </View>

        {/* ── Preview ────────────────────────────────────────────────────── */}
        <View style={styles.previewCard}>
          <Text style={styles.previewLabel}>Preview</Text>
          <Text style={[{ ...typography.display }, styles.previewDisplay]}>
            Hush Tinnitus
          </Text>
          <Text style={[{ ...typography.body }, styles.previewBody]}>
            This text reflects your current text size setting. Headings and
            body copy scale proportionally across all screens.
          </Text>
        </View>

        {/* ── Notifications ──────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Notifications</Text>

          {/* Daily check-in toggle */}
          <View style={styles.switchRow}>
            <View style={styles.rowLabel}>
              <Text style={styles.rowTitle}>Daily check-in reminder</Text>
              <Text style={styles.rowDesc}>
                A gentle daily prompt to log your symptoms — takes under a minute.
              </Text>
            </View>
            {notifApplying ? (
              <ActivityIndicator size="small" color={colors.deepTide} />
            ) : (
              <Switch
                value={notificationsOn}
                onValueChange={handleToggleNotifications}
                trackColor={{ false: colors.textSecondary + '30', true: colors.calmWave }}
                thumbColor={Colors.white}
                ios_backgroundColor={colors.textSecondary + '30'}
                accessibilityLabel="Daily check-in notifications"
              />
            )}
          </View>

          {/* Time picker — shown when notifications are on */}
          {notificationsOn && (
            <>
              <View style={styles.divider} />
              {/* remount when savedTime changes so isDirty resets */}
              <TimePicker
                key={savedTime}
                savedTime={savedTime}
                onCommit={handleTimeCommit}
                colors={colors}
                typography={typography}
              />
            </>
          )}

          <View style={styles.divider} />

          {/* TFI retest reminders */}
          <View style={styles.row}>
            <View style={styles.rowLabel}>
              <Text style={styles.rowTitle}>TFI retest reminders</Text>
              <Text style={styles.rowDesc}>
                Automatically reminded at week 4 and week 8 to retake the TFI.
                Scheduled based on your start date.
              </Text>
              {tfiDates && notificationsOn && (
                <View style={styles.tfiDatesRow}>
                  <Text style={styles.tfiDateItem}>
                    {tfiDates.w4.future
                      ? `Week 4 — ${formatShortDate(tfiDates.w4.date)}`
                      : 'Week 4 — already passed'}
                  </Text>
                  <Text style={styles.tfiDateItem}>
                    {tfiDates.w8.future
                      ? `Week 8 — ${formatShortDate(tfiDates.w8.date)}`
                      : 'Week 8 — already passed'}
                  </Text>
                </View>
              )}
              {!notificationsOn && (
                <Text style={styles.tfiDisabledNote}>
                  Enable notifications above to schedule these.
                </Text>
              )}
            </View>
          </View>

          {/* Dev build note */}
          {showDevNote && (
            <View style={styles.devNote}>
              <Text style={styles.devNoteText}>
                Notification setup requires a development build
              </Text>
            </View>
          )}
        </View>

        {/* ── Data & Privacy ─────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Data &amp; Privacy</Text>

          {/* Required disclosure per Section 7.5 */}
          <Text style={styles.privacyNote}>
            All your data is stored privately on this device. Nothing is shared
            with third parties or transmitted to any server.
          </Text>

          <View style={styles.divider} />

          {/* Export button */}
          <View style={styles.row}>
            <View style={styles.rowLabel}>
              <Text style={styles.rowTitle}>Export my data</Text>
              <Text style={styles.rowDesc}>
                Downloads a file containing all your logs, TFI assessments, and
                sessions that you can save or share.
              </Text>
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.exportBtn,
                pressed && styles.exportBtnPressed,
                exporting && styles.exportBtnDisabled,
              ]}
              onPress={handleExport}
              disabled={exporting}
              accessibilityRole="button"
              accessibilityLabel="Export my data"
            >
              {exporting ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Text style={styles.exportBtnLabel}>Export</Text>
              )}
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <DisclaimerModal
        visible={disclaimerVisible}
        onClose={() => setDisclaimerVisible(false)}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(
  colors: ReturnType<typeof useTheme>['colors'],
  typography: ReturnType<typeof useTheme>['typography'],
) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    scroll: {
      flexGrow: 1,
      paddingHorizontal: Spacing.xl,
      paddingTop: Spacing.md,
      paddingBottom: Spacing.xl,
      gap: Spacing.xl,
    },

    // Top bar
    topBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    backBtn:        { paddingVertical: Spacing.sm, paddingRight: Spacing.sm },
    backBtnPressed: { opacity: 0.6 },
    backLabel:      { fontSize: 14, color: colors.deepTide },
    infoBtn:        { padding: Spacing.sm },
    infoBtnPressed: { opacity: 0.6 },

    title: { fontSize: 28, fontWeight: '400', color: colors.textPrimary, letterSpacing: -0.56 },

    // Sections
    section: {
      backgroundColor: colors.surface,
      borderRadius: Radius.card,
      padding: Spacing.base,
      gap: Spacing.base,
    },
    sectionHeading: {
      ...typography.micro,
      color: colors.deepTide,
    },

    // Rows
    row:       { gap: Spacing.sm },
    switchRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: Spacing.base,
    },
    rowLabel:  { flex: 1, gap: 2 },
    rowTitle:  { fontSize: 14, fontWeight: '500', color: colors.textPrimary },
    rowDesc:   { fontSize: 12, color: colors.textSecondary, lineHeight: 18 },

    divider: { height: Border.width, backgroundColor: colors.calmWave + '30' },

    // TFI dates
    tfiDatesRow: { marginTop: Spacing.xs, gap: 2 },
    tfiDateItem: { fontSize: 11, color: colors.deepTide, lineHeight: 16 },
    tfiDisabledNote: { fontSize: 11, color: colors.textSecondary, fontStyle: 'italic', marginTop: Spacing.xs },

    // Dev note
    devNote: {
      backgroundColor: colors.surfaceVariant,
      borderRadius: Radius.chip,
      padding: Spacing.md,
      borderLeftWidth: 3,
      borderLeftColor: colors.calmWave,
    },
    devNoteText: {
      ...typography.caption,
      color: colors.deepTide,
      fontStyle: 'italic',
    },

    // Privacy text
    privacyNote: {
      ...typography.caption,
      color: colors.textSecondary,
      lineHeight: 18,
    },

    // Export button
    exportBtn: {
      backgroundColor: colors.deepTide,
      borderRadius: Radius.chip,
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.base,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'flex-start',
      minWidth: 72,
      minHeight: 36,
    },
    exportBtnPressed:  { opacity: 0.85 },
    exportBtnDisabled: { opacity: 0.6 },
    exportBtnLabel:    { fontSize: 13, fontWeight: '500', color: Colors.white },

    // Preview card
    previewCard: {
      backgroundColor: colors.surfaceVariant,
      borderRadius: Radius.card,
      padding: Spacing.base,
      gap: Spacing.sm,
    },
    previewLabel: {
      ...typography.micro,
      color: colors.deepTide,
    },
    previewDisplay: { color: colors.textPrimary },
    previewBody:   { color: colors.textSecondary, lineHeight: 22 },
  });
}
