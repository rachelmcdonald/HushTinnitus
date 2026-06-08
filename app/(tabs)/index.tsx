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
import Svg, { Path, Ellipse, Circle } from 'react-native-svg';
import { Spacing, Radius } from '@/src/theme';
import { useTheme } from '@/src/context/ThemeContext';
import { getTodayLogs } from '@/src/storage/symptomLog';
import { getRecentSessions } from '@/src/storage/soundSessions';
import { getPreferences } from '@/src/storage/preferences';
import { getDb } from '@/src/storage/database';
import type { SoundSession, SymptomLog } from '@/src/types';

// ─── daily support messages ───────────────────────────────────────────────────

const DAILY_MESSAGES = [
  // 1 — breathing: 4-7-8
  "When tinnitus feels particularly noticeable, slow breathing can help your nervous system settle. Try breathing in for four counts, holding for seven, and out for eight. Even two or three rounds can interrupt a cycle of tension and bring your focus back to the present.",
  // 2 — breathing: box
  "Box breathing is a simple grounding technique you can use anywhere. Breathe in for four counts, hold for four, breathe out for four, and hold for four before the next breath. Many people find that a few cycles help quiet a tinnitus-focused mind.",
  // 3 — breathing: diaphragmatic
  "When you're stressed, breathing tends to become shallow and fast — which can heighten awareness of any physical sensation, including tinnitus. Practising slow, deep breathing from the belly sends a calming signal to the brain and can help settle the nervous system.",
  // 4 — sound awareness: enrichment
  "Your brain is remarkably good at learning to filter sound to the background — it does this automatically with traffic noise, humming appliances, and countless other sounds each day. With consistent sound enrichment, many people find that tinnitus gradually becomes easier to live alongside.",
  // 5 — sound awareness: background sound
  "Background sound can help shift your brain's attention away from tinnitus by reducing the contrast between the sound and your surrounding environment. Nature sounds, soft music, or a gentle fan all provide a helpful layer of enrichment — experiment to find what feels most natural for you.",
  // 6 — sleep: background sound
  "If tinnitus feels more noticeable at bedtime, it's often because the room is very quiet. A low level of background sound — like white noise, soft rain, or ocean waves — can bridge that quiet gap and help settle the mind as you wind down.",
  // 7 — sleep: wind-down routine
  "A consistent wind-down routine signals to your brain that sleep is coming. Dimming lights 30 to 60 minutes before bed, stepping away from screens, and doing something calm like reading or gentle stretching can help quiet both the mind and body.",
  // 8 — sleep: mental imagery
  "Some people find that gentle mental imagery at bedtime helps shift attention away from tinnitus. Imagine a calm, familiar place in detail — the sounds, the air, the light. It gives your mind something absorbing to settle into as you drift off.",
  // 9 — sleep: frustration cycle
  "Worrying about sleep can sometimes make it harder. If you're lying awake feeling frustrated, it's okay to get up briefly, do something quiet and unstimulating, then return when you feel drowsy. This approach can help break a cycle of sleep-related anxiety.",
  // 10 — CBT: habituation
  "A common thought pattern is 'I'll never get used to this.' But tinnitus habituation is a real and well-documented process. Many people find that, over months, their brain simply stops treating the sound as important or threatening. Today is part of that gradual journey.",
  // 11 — CBT: attention
  "Attention can amplify how intrusive a sound feels. Gently redirecting your focus — toward a task, a conversation, or your surroundings — can help tinnitus recede into the background. It's a skill that gets more natural with practice over time.",
  // 12 — CBT: fuller picture
  "Try noticing a tinnitus-focused thought, then asking: what else is true right now? Often there are neutral or good things happening alongside the difficult ones. This isn't about dismissing the hard stuff — it's about giving your brain a fuller, more balanced picture.",
  // 13 — CBT: emotional layer
  "The emotional response to tinnitus — frustration, worry, sadness — is completely valid and understandable. Research shows that it's often this emotional layer, rather than the sound itself, that drives daily distress. Working on the response is one of the most effective self-management tools available.",
  // 14 — CBT: testing thoughts
  "If you catch yourself thinking 'I can't concentrate because of the tinnitus', try testing that thought gently: are there times when you've focused well despite it being present? Building a catalogue of those moments is evidence that you have more capacity than tinnitus-focused thinking often suggests.",
  // 15 — hearing protection: prevention
  "Protecting your hearing from loud environments is a practical way to look after your ears long term. Keeping a pair of foam earplugs in your bag means you're always ready for concerts, power tools, or noisy restaurants without needing to scramble at the last moment.",
  // 16 — hearing protection: recovery
  "After noisy environments, giving your ears some quiet time helps them recover. If you notice tinnitus is more prominent after loud sound exposure, that's a useful signal — your auditory system is asking for a rest.",
  // 17 — mindfulness: body scan
  "A short body scan is a grounding practice worth trying today. Starting at your feet, notice any tension or sensation in each part of your body and simply acknowledge it without trying to change it. This can help you feel more settled and less focused on any one sensation.",
  // 18 — mindfulness: relationship with sound
  "Mindfulness isn't about achieving silence or making tinnitus disappear — it's about changing your relationship with the sound. Observing it with curiosity rather than resistance, even briefly, can shift how much mental space it takes up.",
  // 19 — mindfulness: sound widening
  "Try this today: spend two minutes sitting quietly and notice five things you can hear — not just tinnitus, but all the sounds in your environment. This gentle expansion of sound awareness can help tinnitus become one sound among many, rather than the only one.",
  // 20 — difficult days: self-compassion
  "Some days with tinnitus are genuinely harder than others, and that's okay. Being kind to yourself on difficult days — rather than frustrated with yourself — is not giving up. It's an important part of long-term coping.",
  // 21 — difficult days: stress loop
  "Stress and tinnitus often interact — stress can make tinnitus feel more prominent, and a prominent tinnitus can cause stress. Finding even small ways to ease your stress load — a walk, a warm drink, a short break outside — can have a positive ripple effect on how the day feels.",
  // 22 — difficult days: routine
  "On particularly difficult days, staying close to your normal routine can help. Structure gives the brain a sense of predictability and control, which can ease the emotional weight of a challenging day without requiring a big effort.",
  // 23 — difficult days: acceptance
  "Acceptance in the context of tinnitus doesn't mean liking it — it means not spending energy fighting the fact that it's there. Letting the sound exist without urgency or resistance, even briefly, can make the day significantly lighter.",
  // 24 — small wins: engagement
  "If you stayed present and engaged today despite tinnitus being in the background, that's worth acknowledging. Building that capacity is exactly what supports long-term tinnitus management, and every day you practise it counts.",
  // 25 — small wins: consistency
  "Every check-in you complete — logging your symptoms, doing a breathing practice, listening to a sound session — is an act of looking after yourself. Small, consistent actions add up to real change over weeks and months.",
  // 26 — social: noise management
  "Social environments can sometimes feel tiring when you're managing tinnitus. Choosing quieter venues when possible and positioning yourself away from louder areas can make social situations more comfortable without drawing attention to your needs.",
  // 27 — social: sharing with others
  "You don't have to explain tinnitus to everyone — but having at least one person who understands can make a real difference. Many people find that simply telling someone close to them brings a sense of being seen and supported.",
  // 28 — concentration: sound enrichment
  "If tinnitus is making it harder to focus, low-level background sound can help by providing a layer of enrichment that reduces the contrast between tinnitus and silence. Try instrumental music or ambient nature sounds rather than anything with lyrics.",
  // 29 — concentration: time blocks
  "Breaking tasks into shorter focused blocks — like 25 minutes of work followed by a 5-minute break — can help on days when tinnitus is more distracting. It reduces the mental load of sustained concentration and gives you regular moments to reset.",
  // 30 — mindfulness: noticing good
  "Today is a good day to notice what's going right — a moment of calm, a pleasant sound, a task completed, a conversation enjoyed. Deliberately noticing the positive, alongside the hard, helps build a more balanced picture of life with tinnitus over time.",
];

function getDailyMessage(): string {
  const dayIndex = Math.floor(Date.now() / 86400000);
  return DAILY_MESSAGES[dayIndex % DAILY_MESSAGES.length];
}

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

function shouldShowCRESTCheckIn(prefs: ReturnType<typeof getPreferences>): { show: boolean; weekNumber: number } {
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

  const dailyMessage = useMemo(() => getDailyMessage(), []);

  const [greeting, setGreeting] = useState(getGreeting);
  const [streak, setStreak] = useState(0);
  const [todayEntry, setTodayEntry] = useState<SymptomLog | null>(null);
  const [todaySessionCount, setTodaySessionCount] = useState(0);
  const [recentSessions, setRecentSessions] = useState<SoundSession[]>([]);
  const [crestCheckIn, setCrestCheckIn] = useState<{ show: boolean; weekNumber: number }>({
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

      setCrestCheckIn(shouldShowCRESTCheckIn(getPreferences()));
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
          <Svg viewBox="0 0 48 48" width={38} height={38} fill="none">
            <Ellipse cx="24" cy="40" rx="18" ry="5.5" stroke={colors.calmWave} strokeWidth="2" opacity={0.3} fill="none"/>
            <Ellipse cx="24" cy="40" rx="12" ry="3.5" stroke={colors.calmWave} strokeWidth="2.2" opacity={0.55} fill="none"/>
            <Ellipse cx="24" cy="40" rx="6" ry="2" stroke={colors.calmWave} strokeWidth="2.5" opacity={0.9} fill="none"/>
            <Circle cx="24" cy="30" r="4" fill={colors.calmWave}/>
            <Circle cx="24" cy="20" r="3" fill={colors.calmWave} opacity={0.75}/>
            <Circle cx="24" cy="12" r="2" fill={colors.calmWave} opacity={0.5}/>
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

      {/* Daily support card */}
      <View style={styles.dailyCard}>
        <View style={styles.dailyHeader}>
          <Text style={styles.dailyHeading}>Today's Support</Text>
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z" fill="#5DCAA5"/>
          </Svg>
        </View>
        <Text style={styles.dailyMessage}>{dailyMessage}</Text>
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

      {/* CREST check-in reminder */}
      {crestCheckIn.show && (
        <Pressable
          style={styles.crestCard}
          onPress={() =>
            router.push({
              pathname: '/(tabs)/progress/crest-retest',
              params: { weekNumber: String(crestCheckIn.weekNumber) },
            })
          }
        >
          <Text style={styles.crestTitle}>{`Week ${crestCheckIn.weekNumber} check-in`}</Text>
          <Text style={styles.crestBody}>
            Time for your CREST check-in. It takes about 4 minutes and helps you track how things are changing.
          </Text>
          <Text style={styles.crestCta}>Start check-in {'›'}</Text>
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
      alignItems: 'center',
      gap: Spacing.sm,
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

    // CREST check-in
    crestCard: {
      backgroundColor: colors.deepTide,
      borderRadius: Radius.card,
      padding: Spacing.base,
      marginTop: Spacing.sm,
      elevation: 0,
      shadowOpacity: 0,
    },
    crestTitle: {
      ...typography.heading2,
      color: colors.white,
      marginBottom: Spacing.xs,
    },
    crestBody: {
      ...typography.body,
      color: colors.white,
      opacity: 0.85,
      marginBottom: Spacing.md,
    },
    crestCta: {
      ...typography.body,
      color: colors.calmWave,
      fontWeight: '600',
    },

    // Daily support
    dailyCard: {
      backgroundColor: '#E1F5EE',
      borderRadius: 12,
      padding: 16,
      marginBottom: Spacing.base,
    },
    dailyHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: Spacing.sm,
    },
    dailyHeading: {
      fontSize: 13,
      fontWeight: '500',
      color: '#0D4F5C',
    },
    dailyMessage: {
      fontSize: 14,
      lineHeight: 14 * 1.6,
      color: '#1A2B2B',
    },

    bottomSpacer: {
      height: Spacing.xxl,
    },
  });
}
