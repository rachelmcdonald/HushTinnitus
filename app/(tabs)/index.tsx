import React, { useCallback, useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { Spacing, Radius } from '@/src/theme';
import { useTheme } from '@/src/context/ThemeContext';
import { getTodayLogs } from '@/src/storage/symptomLog';
import { getRecentSessions } from '@/src/storage/soundSessions';
import { getPreferences } from '@/src/storage/preferences';
import { getDb } from '@/src/storage/database';
import type { SoundSession, SymptomLog } from '@/src/types';

// ─── helpers ──────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  if (hour >= 17 && hour < 22) return 'Good evening';
  return 'Hello';
}

function isoDateKey(offsetMs = 0): string {
  return new Date(Date.now() - offsetMs).toISOString().substring(0, 10);
}

function computeStreak(): number {
  if (Platform.OS === 'web') return 0;
  const db = getDb();

  const logRows = db.getAllSync<{ d: string }>(
    "SELECT DISTINCT substr(date, 1, 10) as d FROM symptom_log"
  );
  const sessionRows = db.getAllSync<{ d: string }>(
    "SELECT DISTINCT substr(date, 1, 10) as d FROM sound_sessions"
  );

  const active = new Set<string>();
  for (const r of logRows) active.add(r.d);
  for (const r of sessionRows) active.add(r.d);
  if (active.size === 0) return 0;

  const today = isoDateKey(0);
  const yesterday = isoDateKey(86400000);

  // Don't penalise users who haven't logged yet today — carry streak from yesterday
  const startOffset = active.has(today) ? 0 : active.has(yesterday) ? 1 : -1;
  if (startOffset === -1) return 0;

  let count = 0;
  for (let i = startOffset; i < 366; i++) {
    if (active.has(isoDateKey(i * 86400000))) {
      count++;
    } else {
      break;
    }
  }
  return count;
}

function formatSessionDate(isoDate: string): string {
  const day = isoDate.substring(0, 10);
  if (day === isoDateKey(0)) return 'Today';
  if (day === isoDateKey(86400000)) return 'Yesterday';
  const d = new Date(isoDate);
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  if (m < 1) return '<1 min';
  return `${m} min`;
}

function formatSoundName(raw: string): string {
  return raw.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function shouldShowTFICheckIn(prefs: ReturnType<typeof getPreferences>): { show: boolean; weekNumber: number } {
  const { firstLaunchDate, week4Prompted, week8Prompted } = prefs;
  const days = (Date.now() - new Date(firstLaunchDate).getTime()) / 86400000;
  if (days >= 56 && !week8Prompted) return { show: true, weekNumber: 8 };
  if (days >= 28 && !week4Prompted) return { show: true, weekNumber: 4 };
  return { show: false, weekNumber: 0 };
}

// ─── component ────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter();
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);

  const [greeting, setGreeting] = useState(getGreeting);
  const [streak, setStreak] = useState(0);
  const [todayEntry, setTodayEntry] = useState<SymptomLog | null>(null);
  const [todaySessionCount, setTodaySessionCount] = useState(0);
  const [recentSessions, setRecentSessions] = useState<SoundSession[]>([]);
  const [tfiCheckIn, setTfiCheckIn] = useState<{ show: boolean; weekNumber: number }>({
    show: false,
    weekNumber: 0,
  });

  useFocusEffect(
    useCallback(() => {
      setGreeting(getGreeting());
      setStreak(computeStreak());

      const todayLogs = getTodayLogs();
      setTodayEntry(todayLogs[0] ?? null);

      const today = isoDateKey(0);
      const all = getRecentSessions(50);
      setTodaySessionCount(all.filter(s => s.date.substring(0, 10) === today).length);
      setRecentSessions(all.slice(0, 5));

      setTfiCheckIn(shouldShowTFICheckIn(getPreferences()));
    }, [])
  );

  const goToLogEntry = () => {
    if (todayEntry) {
      router.push({ pathname: '/(tabs)/progress/log-entry', params: { existingId: todayEntry.id } });
    } else {
      router.push('/(tabs)/progress/log-entry');
    }
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Greeting */}
      <View style={styles.greetingSection}>
        <Text style={styles.greetingText}>{greeting}</Text>
        <Text style={styles.greetingSubtitle}>{"Here's your day at a glance."}</Text>
      </View>

      {/* Streak card */}
      <View style={styles.card}>
        <View style={styles.streakRow}>
          <Svg width={38} height={38} viewBox="0 0 38 38">
            <Path
              d="M8 19 Q11 12 14 19 Q17 26 19 19 Q21 14 23 19 Q25 24 27 19 Q29 15 30 19"
              stroke={colors.calmWave}
              strokeWidth={2.5}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
          <View style={styles.streakNumbers}>
            <Text style={styles.streakCount}>{streak}</Text>
            <Text style={styles.streakLabel}>day streak</Text>
          </View>
        </View>
        <Text style={styles.streakNote}>
          {streak === 0
            ? 'Log your symptoms or play a sound session to start your streak.'
            : streak >= 7
            ? `${streak} days in a row — every check-in counts.`
            : 'Keep going — consistency helps you notice what makes a difference.'}
        </Text>
      </View>

      {/* Today snapshot */}
      <View style={styles.snapshotCard}>
        <Text style={styles.snapshotTitle}>Today</Text>

        <Pressable style={styles.snapshotRow} onPress={goToLogEntry}>
          <View style={styles.snapshotRowLeft}>
            <Text style={styles.snapshotRowLabel}>Symptoms</Text>
            {todayEntry ? (
              <Text style={styles.snapshotRowValue}>
                {`Loudness ${todayEntry.loudness}/10 · Distress ${todayEntry.distress}/10`}
              </Text>
            ) : (
              <Text style={styles.snapshotRowEmpty}>Not logged yet</Text>
            )}
          </View>
          <Text style={styles.chevron}>{'›'}</Text>
        </Pressable>

        <View style={styles.rowDivider} />

        <Pressable style={styles.snapshotRow} onPress={() => router.push('/(tabs)/sound')}>
          <View style={styles.snapshotRowLeft}>
            <Text style={styles.snapshotRowLabel}>Sound sessions</Text>
            {todaySessionCount > 0 ? (
              <Text style={styles.snapshotRowValue}>
                {`${todaySessionCount} ${todaySessionCount === 1 ? 'session' : 'sessions'} today`}
              </Text>
            ) : (
              <Text style={styles.snapshotRowEmpty}>None yet today</Text>
            )}
          </View>
          <Text style={styles.chevron}>{'›'}</Text>
        </Pressable>
      </View>

      {/* Recent sessions */}
      <Text style={styles.sectionHeading}>Recent sessions</Text>

      {recentSessions.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.emptyText}>
            No sessions yet. Head to the Sound tab to get started.
          </Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sessionScroll}
        >
          {recentSessions.map(session => (
            <View key={session.id} style={styles.sessionCard}>
              <Text style={styles.sessionDate}>{formatSessionDate(session.date)}</Text>
              <Text style={styles.sessionDuration}>{formatDuration(session.durationSeconds)}</Text>
              {session.sounds.length > 0 && (
                <Text style={styles.sessionSounds} numberOfLines={2}>
                  {session.sounds.map(formatSoundName).join(', ')}
                </Text>
              )}
            </View>
          ))}
        </ScrollView>
      )}

      {/* TFI check-in reminder */}
      {tfiCheckIn.show && (
        <Pressable
          style={styles.tfiCard}
          onPress={() =>
            router.push({
              pathname: '/(tabs)/progress/tfi-retest',
              params: { weekNumber: String(tfiCheckIn.weekNumber) },
            })
          }
        >
          <Text style={styles.tfiTitle}>{`Week ${tfiCheckIn.weekNumber} check-in`}</Text>
          <Text style={styles.tfiBody}>
            Time for your tinnitus questionnaire. It takes about 5 minutes and helps you track how things are changing.
          </Text>
          <Text style={styles.tfiCta}>Start check-in {'›'}</Text>
        </Pressable>
      )}

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

function makeStyles(
  colors: ReturnType<typeof useTheme>['colors'],
  typography: ReturnType<typeof useTheme>['typography'],
) {
  return StyleSheet.create({
    scroll: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      paddingHorizontal: Spacing.base,
      paddingTop: Spacing.xl,
    },

    // Greeting
    greetingSection: {
      marginBottom: Spacing.xl,
    },
    greetingText: {
      ...typography.display,
      color: colors.textPrimary,
    },
    greetingSubtitle: {
      ...typography.body,
      color: colors.textSecondary,
      marginTop: Spacing.xs,
    },

    // Cards (shared)
    card: {
      backgroundColor: colors.surface,
      borderRadius: Radius.card,
      padding: Spacing.base,
      marginBottom: Spacing.base,
      elevation: 0,
      shadowOpacity: 0,
    },

    // Streak
    streakRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      marginBottom: Spacing.sm,
    },
    streakNumbers: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: Spacing.xs,
    },
    streakCount: {
      fontSize: 32,
      fontWeight: '700',
      color: colors.textPrimary,
      lineHeight: 36,
    },
    streakLabel: {
      ...typography.body,
      color: colors.textSecondary,
    },
    streakNote: {
      ...typography.caption,
      color: colors.textSecondary,
      lineHeight: 18,
    },

    // Today snapshot
    snapshotCard: {
      backgroundColor: colors.surfaceVariant,
      borderRadius: Radius.card,
      padding: Spacing.base,
      marginBottom: Spacing.base,
      elevation: 0,
      shadowOpacity: 0,
    },
    snapshotTitle: {
      ...typography.micro,
      color: colors.deepTide,
      marginBottom: Spacing.md,
    },
    snapshotRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: Spacing.sm,
    },
    snapshotRowLeft: {
      flex: 1,
    },
    snapshotRowLabel: {
      ...typography.caption,
      color: colors.deepTide,
      fontWeight: '500',
      marginBottom: 2,
    },
    snapshotRowValue: {
      ...typography.body,
      color: colors.textPrimary,
    },
    snapshotRowEmpty: {
      ...typography.body,
      color: colors.textSecondary,
    },
    chevron: {
      fontSize: 22,
      color: colors.deepTide,
      marginLeft: Spacing.sm,
    },
    rowDivider: {
      height: 1,
      backgroundColor: colors.calmWave,
      opacity: 0.25,
    },

    // Section heading
    sectionHeading: {
      ...typography.heading2,
      color: colors.textPrimary,
      marginBottom: Spacing.md,
      marginTop: Spacing.xs,
    },

    // Recent sessions scroll
    sessionScroll: {
      paddingBottom: Spacing.base,
      gap: Spacing.md,
    },
    sessionCard: {
      backgroundColor: colors.surface,
      borderRadius: Radius.card,
      padding: Spacing.md,
      width: 140,
      elevation: 0,
      shadowOpacity: 0,
    },
    sessionDate: {
      ...typography.micro,
      color: colors.calmWave,
      marginBottom: Spacing.xs,
    },
    sessionDuration: {
      ...typography.heading2,
      color: colors.textPrimary,
      marginBottom: Spacing.xs,
    },
    sessionSounds: {
      ...typography.caption,
      color: colors.textSecondary,
      lineHeight: 16,
    },

    // Empty state
    emptyText: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: 'center',
      paddingVertical: Spacing.sm,
    },

    // TFI check-in
    tfiCard: {
      backgroundColor: colors.deepTide,
      borderRadius: Radius.card,
      padding: Spacing.base,
      marginTop: Spacing.sm,
      elevation: 0,
      shadowOpacity: 0,
    },
    tfiTitle: {
      ...typography.heading2,
      color: colors.white,
      marginBottom: Spacing.xs,
    },
    tfiBody: {
      ...typography.body,
      color: colors.white,
      opacity: 0.85,
      marginBottom: Spacing.md,
    },
    tfiCta: {
      ...typography.body,
      color: colors.calmWave,
      fontWeight: '600',
    },

    bottomSpacer: {
      height: Spacing.xxl,
    },
  });
}
