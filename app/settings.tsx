// ─── NO static imports from expo-notifications, expo-print, or expo-sharing ───
// These are loaded dynamically inside handlers to avoid native-module crashes
// in environments where they are unavailable (Expo Go SDK 54+).

import { useState, useMemo, useCallback } from 'react';
import {
  StyleSheet, Text, View, Pressable,
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
import DisclaimerModal from '@/src/components/DisclaimerModal';
import ComingSoonModal from '@/src/components/ComingSoonModal';
import ComingSoonBadge from '@/src/components/ComingSoonBadge';
import ScrollWithIndicator from '@/src/components/ScrollWithIndicator';
import type { UserPreferences } from '@/src/types';

// ─── Utilities ────────────────────────────────────────────────────────────────

function safeJSON(s: string | null | undefined): unknown {
  try { return s ? JSON.parse(s) : null; } catch { return null; }
}

function formatShortDate(d: Date): string {
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
}

const isExpoGo = Constants.appOwnership === 'expo';

// ─── Personal report (plain-text export) ─────────────────────────────────────

// Exact wording from Section 8.3 of the Hush Tinnitus specification.
// Do not paraphrase or abridge.
const REPORT_DISCLAIMER =
  'Hush Tinnitus provides self-management tools and educational content for people ' +
  'living with tinnitus. It is not a medical device and is not intended to diagnose, ' +
  'treat, cure, or prevent tinnitus or any medical condition. Always consult a qualified ' +
  'healthcare professional — including a GP, audiologist, or ENT specialist — before ' +
  'making changes to how you manage your tinnitus. If your tinnitus started suddenly, ' +
  'is pulsatile, or is heard only in one ear, seek medical advice promptly.';

const REPORT_SEVERITY_LABELS: Record<string, string> = {
  'minimal':     'Minimal impact',
  'mild':        'Mild impact',
  'moderate':    'Moderate impact',
  'significant': 'Significant impact',
  'severe':      'Severe impact',
};

const REPORT_TRIGGER_LABELS: Record<string, string> = {
  noise:        'Noise',
  stress:       'Stress',
  caffeine:     'Caffeine',
  alcohol:      'Alcohol',
  'poor-sleep': 'Poor sleep',
  illness:      'Illness',
  other:        'Other',
};

const REPORT_SOUND_LABELS: Record<string, string> = {
  'white-noise':    'White noise',
  'pink-noise':     'Pink noise',
  'brown-noise':    'Brown noise',
  rain:             'Rain',
  ocean:            'Ocean waves',
  stream:           'Stream',
  forest:           'Forest',
  fire:             'Fire',
  cafe:             'Cafe ambience',
  'binaural-alpha': 'Alpha waves',
  'binaural-theta': 'Theta waves',
};

function buildPersonalReport(
  crestRows: Array<Record<string, unknown>>,
  logRows: Array<Record<string, unknown>>,
  sessionRows: Array<Record<string, unknown>>,
): string {
  const lines: string[] = [];

  lines.push('--- HUSH TINNITUS — PERSONAL REPORT ---');
  lines.push(`Generated: ${formatShortDate(new Date())}`);
  lines.push('');

  // ── CREST history ──
  lines.push('CREST HISTORY');
  const baseline = crestRows.find((r) => r.isBaseline === 1);
  const week4 = crestRows.find((r) => r.weekNumber === 4);
  const week8 = crestRows.find((r) => r.weekNumber === 8);

  if (baseline) {
    lines.push(`Baseline score: ${baseline.totalScore} — ${REPORT_SEVERITY_LABELS[baseline.severity as string] ?? baseline.severity}`);
  } else {
    lines.push('Baseline score: not yet recorded');
  }
  if (week4) {
    lines.push(`Week 4 score: ${week4.totalScore} — ${REPORT_SEVERITY_LABELS[week4.severity as string] ?? week4.severity}`);
  }
  if (week8) {
    lines.push(`Week 8 score: ${week8.totalScore} — ${REPORT_SEVERITY_LABELS[week8.severity as string] ?? week8.severity}`);
  }

  const latest = week8 ?? week4 ?? null;
  if (baseline && latest) {
    const delta = Math.round((baseline.totalScore as number) - (latest.totalScore as number));
    const direction = delta > 0 ? 'improvement' : delta < 0 ? 'worsening' : 'no change';
    lines.push(`Change from baseline: ${Math.abs(delta)} points ${direction}`);
    if (delta >= 8) {
      lines.push('Meaningful improvement achieved (8-point change threshold)');
    }
  }
  lines.push('');

  // ── Symptom log summary (last 30 days) ──
  lines.push('SYMPTOM LOG SUMMARY (last 30 days)');
  const cutoff = Date.now() - 30 * 86_400_000;
  const recentLogs = logRows.filter((r) => new Date(r.date as string).getTime() >= cutoff);

  if (recentLogs.length > 0) {
    const avgLoudness = recentLogs.reduce((s, r) => s + (r.loudness as number), 0) / recentLogs.length;
    const avgDistress = recentLogs.reduce((s, r) => s + (r.distress as number), 0) / recentLogs.length;

    const triggerCounts: Record<string, number> = {};
    for (const r of recentLogs) {
      const triggers = (safeJSON(r.triggersJson as string) as string[] | null) ?? [];
      for (const t of triggers) triggerCounts[t] = (triggerCounts[t] ?? 0) + 1;
    }
    const topTriggers = Object.entries(triggerCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([t]) => REPORT_TRIGGER_LABELS[t] ?? t);

    lines.push(`Average loudness: ${avgLoudness.toFixed(1)} / 10`);
    lines.push(`Average distress: ${avgDistress.toFixed(1)} / 10`);
    lines.push(`Most frequent triggers: ${topTriggers.length > 0 ? topTriggers.join(', ') : 'None logged'}`);
    lines.push(`Total entries: ${recentLogs.length}`);
  } else {
    lines.push('No symptom log entries in the last 30 days.');
  }
  lines.push('');

  // ── Session summary ──
  lines.push('SESSION SUMMARY');
  if (sessionRows.length > 0) {
    const totalSeconds = sessionRows.reduce((s, r) => s + (r.durationSeconds as number), 0);
    const totalMinutes = Math.round(totalSeconds / 60);

    const soundCounts: Record<string, number> = {};
    for (const r of sessionRows) {
      const sounds = (safeJSON(r.soundsJson as string) as string[] | null) ?? [];
      for (const s of sounds) soundCounts[s] = (soundCounts[s] ?? 0) + 1;
    }
    const mostUsed = Object.entries(soundCounts).sort((a, b) => b[1] - a[1])[0];
    const mostUsedSound = mostUsed ? (REPORT_SOUND_LABELS[mostUsed[0]] ?? mostUsed[0]) : 'None logged';

    lines.push(`Total sessions completed: ${sessionRows.length}`);
    lines.push(`Total minutes logged: ${totalMinutes}`);
    lines.push(`Most used sound: ${mostUsedSound}`);
  } else {
    lines.push('No sound sessions logged yet.');
  }
  lines.push('');

  lines.push('---');
  lines.push(REPORT_DISCLAIMER);

  return lines.join('\n');
}

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
    for (const id of ['hush-daily', 'hush-crest-week4', 'hush-crest-week8']) {
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

    // CREST retest reminders — auto-scheduled based on firstLaunchDate
    if (firstLaunchDate) {
      const launch = new Date(firstLaunchDate);
      const now = Date.now();

      const w4 = new Date(launch.getTime() + 28 * 86_400_000);
      const w8 = new Date(launch.getTime() + 56 * 86_400_000);

      if (w4.getTime() > now) {
        await Notifs.scheduleNotificationAsync({
          identifier: 'hush-crest-week4',
          content: {
            title: 'Week 4 CREST check-in',
            body: "It's been 4 weeks — time to retake the CREST assessment and track your progress.",
            sound: true,
          },
          trigger: { type: Notifs.SchedulableTriggerInputTypes.DATE, date: w4 },
        });
      }

      if (w8.getTime() > now) {
        await Notifs.scheduleNotificationAsync({
          identifier: 'hush-crest-week8',
          content: {
            title: 'Week 8 CREST check-in',
            body: "It's been 8 weeks — time to retake the CREST assessment and see how far you've come.",
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
  const [exportComingSoonVisible, setExportComingSoonVisible] = useState(false);
  const [notifApplying, setNotifApplying] = useState(false);
  const [notifUnavailable, setNotifUnavailable] = useState(false);
  const [exporting, setExporting] = useState(false);

  const darkMode          = preferences?.darkMode ?? 'system';
  const textSize          = preferences?.textSize ?? 'medium';
  const notificationsOn   = preferences?.notificationsEnabled ?? false;
  const savedTime         = preferences?.notificationTime ?? '09:00';
  const firstLaunchDate   = preferences?.firstLaunchDate ?? null;
  const isPremium         = preferences?.isPremium ?? false;

  // Compute CREST reminder dates for display
  const crestDates = useMemo(() => {
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

  // Export a readable personal report
  const handleExport = useCallback(async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Not available', 'Data export is not supported on web.');
      return;
    }
    setExporting(true);
    try {
      const db = getDb();

      const crestRows = db.getAllSync<Record<string, unknown>>('SELECT * FROM crest_assessments ORDER BY date ASC');
      const logRows = db.getAllSync<Record<string, unknown>>('SELECT * FROM symptom_log ORDER BY date ASC');
      const sessionRows = db.getAllSync<Record<string, unknown>>('SELECT * FROM sound_sessions ORDER BY date ASC');

      const report = buildPersonalReport(crestRows, logRows, sessionRows);

      // Dynamic imports — wrapped in try/catch per spec
      try {
        const FileSystem = await import('expo-file-system');
        const Sharing    = await import('expo-sharing');

        const file = new FileSystem.File(FileSystem.Paths.cache, `hush-tinnitus-report-${Date.now()}.txt`);
        file.write(report);

        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(file.uri, {
            dialogTitle: 'Share your Hush Tinnitus report',
            mimeType: 'text/plain',
            UTI: 'public.plain-text',
          });
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
      <ScrollWithIndicator
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

          {/* CREST retest reminders */}
          <View style={styles.row}>
            <View style={styles.rowLabel}>
              <Text style={styles.rowTitle}>CREST retest reminders</Text>
              <Text style={styles.rowDesc}>
                Automatically reminded at week 4 and week 8 to retake the CREST assessment.
                Scheduled based on your start date.
              </Text>
              {crestDates && notificationsOn && (
                <View style={styles.crestDatesRow}>
                  <Text style={styles.crestDateItem}>
                    {crestDates.w4.future
                      ? `Week 4 — ${formatShortDate(crestDates.w4.date)}`
                      : 'Week 4 — already passed'}
                  </Text>
                  <Text style={styles.crestDateItem}>
                    {crestDates.w8.future
                      ? `Week 8 — ${formatShortDate(crestDates.w8.date)}`
                      : 'Week 8 — already passed'}
                  </Text>
                </View>
              )}
              {!notificationsOn && (
                <Text style={styles.crestDisabledNote}>
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

          {/* Export — Premium feature */}
          {isPremium ? (
            <View style={styles.row}>
              <View style={styles.rowLabel}>
                <Text style={styles.rowTitle}>Export my data</Text>
                <Text style={styles.rowDesc}>
                  Downloads a file containing all your logs, CREST assessments, and
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
          ) : (
            <View style={styles.exportGate}>
              <View style={styles.exportGateTop}>
                <View style={styles.exportGateLabel}>
                  <Text style={styles.exportGateTitle}>Export my data</Text>
                  <ComingSoonBadge />
                </View>
              </View>
              <Text style={styles.exportGateDesc}>
                Downloads a file containing all your logs, CREST assessments, and
                sessions that you can save or share.
              </Text>
              <Pressable
                style={({ pressed }) => [styles.exportGateBtn, pressed && styles.exportGateBtnPressed]}
                onPress={() => setExportComingSoonVisible(true)}
                accessibilityRole="button"
                accessibilityLabel="Coming soon — tap for details"
              >
                <Text style={styles.exportGateBtnLabel}>Coming soon — tap for details</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* ── About ──────────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Pressable
            style={({ pressed }) => [styles.navRow, pressed && styles.navRowPressed]}
            onPress={() => router.push('/premium' as any)}
            accessibilityRole="button"
            accessibilityLabel="Premium Features"
          >
            <Text style={styles.rowTitle}>Premium Features</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.calmWave} />
          </Pressable>
        </View>
      </ScrollWithIndicator>

      <DisclaimerModal
        visible={disclaimerVisible}
        onClose={() => setDisclaimerVisible(false)}
      />

      <ComingSoonModal
        visible={exportComingSoonVisible}
        onClose={() => setExportComingSoonVisible(false)}
        featureName="Export My Data"
        description="Export all your personal app data as a structured text file — your symptom logs, CREST scores, and session history — for your own records or to share with a healthcare professional."
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
    navRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    navRowPressed: { opacity: 0.6 },
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

    // CREST dates
    crestDatesRow: { marginTop: Spacing.xs, gap: 2 },
    crestDateItem: { fontSize: 11, color: colors.deepTide, lineHeight: 16 },
    crestDisabledNote: { fontSize: 11, color: colors.textSecondary, fontStyle: 'italic', marginTop: Spacing.xs },

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

    // Export — coming soon gate card
    exportGate: {
      backgroundColor: colors.surfaceVariant,
      borderRadius: Radius.card,
      padding: Spacing.base,
      gap: Spacing.sm,
      borderWidth: Border.width,
      borderColor: Colors.deepTide + '30',
    },
    exportGateTop:      { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    exportGateLabel:    { flex: 1, gap: 4 },
    exportGateTitle:    { fontSize: 14, fontWeight: '500', color: colors.textPrimary },
    exportGateDesc:      { fontSize: 12, color: colors.textSecondary, lineHeight: 18 },
    exportGateBtn: {
      borderWidth: 1.5,
      borderColor: Colors.deepTide,
      borderRadius: Radius.chip,
      paddingVertical: Spacing.sm,
      alignItems: 'center',
    },
    exportGateBtnPressed: { opacity: 0.85 },
    exportGateBtnLabel:   { fontSize: 13, fontWeight: '500', color: Colors.deepTide },

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
