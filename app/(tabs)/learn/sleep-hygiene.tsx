import { useState, useEffect, useMemo, useCallback } from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Platform } from 'react-native';
import { getDb } from '@/src/storage/database';
import { Colors, Typography, Spacing, Radius, Border } from '@/src/theme';

// ─── Checklist data ───────────────────────────────────────────────────────────
//
// Each item is tagged with the SymptomLog triggers it is most relevant to.
// Items are sorted so the most relevant ones (matching the user's logged
// triggers) appear first. If no trigger data is available the default order
// is used.

type Trigger = 'poor-sleep' | 'stress' | 'caffeine' | 'alcohol' | 'noise' | 'illness';

type CheckItem = {
  id: string;
  text: string;
  detail: string;
  triggers: Trigger[];
};

const CHECKLIST: CheckItem[] = [
  {
    id: 'consistent-timing',
    text: 'Go to bed and wake up at the same time each day',
    detail:
      'A consistent schedule strengthens your body clock and improves overall sleep quality over time.',
    triggers: ['poor-sleep', 'stress'],
  },
  {
    id: 'sound-enrichment-night',
    text: 'Use gentle sound enrichment at night',
    detail:
      'A soft background sound prevents silence from making tinnitus more noticeable when you are trying to fall asleep.',
    triggers: ['poor-sleep', 'noise'],
  },
  {
    id: 'limit-caffeine',
    text: 'Avoid caffeine after 2 pm',
    detail:
      'Caffeine has a half-life of around 5–6 hours. Afternoon coffee can still be active in your system at bedtime.',
    triggers: ['caffeine', 'poor-sleep'],
  },
  {
    id: 'limit-alcohol',
    text: 'Avoid alcohol before bed',
    detail:
      'Alcohol disrupts REM sleep and can increase tinnitus perception during the night as it metabolises.',
    triggers: ['alcohol', 'poor-sleep'],
  },
  {
    id: 'no-screens',
    text: 'Avoid screens for 30–60 minutes before bed',
    detail:
      'Blue light from screens delays melatonin release, which can make it harder to fall asleep.',
    triggers: ['poor-sleep', 'stress'],
  },
  {
    id: 'wind-down-routine',
    text: 'Build a calm wind-down routine before sleep',
    detail:
      'A consistent pre-sleep routine — breathing exercises, light reading, or PMR — signals to your body that sleep is coming.',
    triggers: ['stress', 'poor-sleep'],
  },
  {
    id: 'cool-dark-room',
    text: 'Keep your bedroom cool, dark, and comfortable',
    detail:
      'A lower room temperature supports the body temperature drop that initiates sleep. Darkness aids melatonin production.',
    triggers: ['poor-sleep'],
  },
  {
    id: 'bed-for-sleep-only',
    text: 'Use your bed only for sleep',
    detail:
      'Avoiding prolonged wakefulness in bed reinforces the mental connection between your bed and sleep.',
    triggers: ['poor-sleep'],
  },
  {
    id: 'limit-fluids',
    text: 'Limit fluid intake in the 2 hours before bed',
    detail:
      'Reducing night waking for bathroom visits helps maintain sleep continuity.',
    triggers: ['poor-sleep'],
  },
  {
    id: 'no-late-exercise',
    text: 'Avoid vigorous exercise within 2–3 hours of bedtime',
    detail:
      'Intense exercise raises body temperature and cortisol, which can delay sleep onset.',
    triggers: ['poor-sleep', 'stress'],
  },
  {
    id: 'if-awake-use-sound',
    text: 'If tinnitus wakes you, use sound enrichment — do not engage with the sound',
    detail:
      'Directing attention toward tinnitus while awake can strengthen the attentional loop. Sound enrichment gently redirects the brain away from the signal.',
    triggers: ['poor-sleep', 'noise'],
  },
];

// ─── Hook: load / persist check state + personalise order ────────────────────

function useSleepHygiene() {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [triggerCounts, setTriggerCounts] = useState<Record<string, number>>({});

  // Load saved check state and recent trigger counts on mount
  useEffect(() => {
    if (Platform.OS === 'web') return;
    try {
      const db = getDb();

      // Checked items
      const checkRows = db.getAllSync<{ id: string }>(
        'SELECT id FROM sleep_hygiene_checks WHERE checked = 1'
      );
      setChecked(new Set(checkRows.map((r) => r.id)));

      // Trigger counts from last 30 days of symptom log
      try {
        const logRows = db.getAllSync<{ triggersJson: string }>(
          `SELECT triggersJson FROM symptom_log
           WHERE date >= date('now', '-30 days')
           LIMIT 200`
        );
        const counts: Record<string, number> = {};
        for (const row of logRows) {
          try {
            const triggers: string[] = JSON.parse(row.triggersJson);
            for (const t of triggers) {
              counts[t] = (counts[t] || 0) + 1;
            }
          } catch {}
        }
        setTriggerCounts(counts);
      } catch {
        // symptom_log may be empty or Phase 6 not yet started — safe to ignore
      }
    } catch {}
  }, []);

  const toggleItem = useCallback(
    (id: string) => {
      const nowChecked = !checked.has(id);
      setChecked((prev) => {
        const next = new Set(prev);
        nowChecked ? next.add(id) : next.delete(id);
        return next;
      });
      if (Platform.OS !== 'web') {
        try {
          getDb().runSync(
            `INSERT OR REPLACE INTO sleep_hygiene_checks (id, checked, updatedAt)
             VALUES (?, ?, ?)`,
            [id, nowChecked ? 1 : 0, new Date().toISOString()]
          );
        } catch {}
      }
    },
    [checked]
  );

  // Sort: highest trigger-relevance score first (unchecked items before
  // checked within the same score band so actionable items stay visible)
  const sortedItems = useMemo(() => {
    const hasPersonalisation = Object.keys(triggerCounts).length > 0;
    if (!hasPersonalisation) return CHECKLIST;
    return [...CHECKLIST].sort((a, b) => {
      const scoreA = a.triggers.reduce((s, t) => s + (triggerCounts[t] || 0), 0);
      const scoreB = b.triggers.reduce((s, t) => s + (triggerCounts[t] || 0), 0);
      if (scoreB !== scoreA) return scoreB - scoreA;
      // Same score: unchecked before checked
      const aChk = checked.has(a.id) ? 1 : 0;
      const bChk = checked.has(b.id) ? 1 : 0;
      return aChk - bChk;
    });
  }, [triggerCounts, checked]);

  const isPersonalised = Object.keys(triggerCounts).length > 0;
  const completedCount = CHECKLIST.filter((i) => checked.has(i.id)).length;

  return { sortedItems, checked, toggleItem, isPersonalised, completedCount };
}

// ─── Components ───────────────────────────────────────────────────────────────

function BackButton() {
  return (
    <Pressable
      style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
      onPress={() => router.back()}
      accessibilityRole="button"
      accessibilityLabel="Back to Learn"
    >
      <Text style={styles.backLabel}>← Learn</Text>
    </Pressable>
  );
}

function ChecklistItemRow({
  item,
  isChecked,
  onToggle,
}: {
  item: CheckItem;
  isChecked: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.checkRow,
        isChecked && styles.checkRowDone,
        pressed && styles.checkRowPressed,
      ]}
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: isChecked }}
      accessibilityLabel={item.text}
    >
      {/* Checkbox */}
      <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
        {isChecked && <Text style={styles.checkmark}>✓</Text>}
      </View>

      {/* Text */}
      <View style={styles.checkBody}>
        <Text style={[styles.checkText, isChecked && styles.checkTextDone]}>
          {item.text}
        </Text>
        <Text style={styles.checkDetail}>{item.detail}</Text>
      </View>
    </Pressable>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SleepHygieneScreen() {
  const { sortedItems, checked, toggleItem, isPersonalised, completedCount } =
    useSleepHygiene();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <BackButton />

        <View style={styles.header}>
          <Text style={styles.title}>Sleep hygiene</Text>
          <Text style={styles.lead}>
            Poor sleep and tinnitus have a bidirectional relationship — each can
            worsen the other. These evidence-based habits support sleep quality
            and help reduce tinnitus's impact at night.
          </Text>
        </View>

        {/* Progress bar */}
        <View style={styles.progressCard}>
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>
              {completedCount} of {CHECKLIST.length} habits checked
            </Text>
            <Text style={styles.progressPct}>
              {Math.round((completedCount / CHECKLIST.length) * 100)}%
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${(completedCount / CHECKLIST.length) * 100}%` as any,
                },
              ]}
            />
          </View>
          {isPersonalised && (
            <Text style={styles.personalisedNote}>
              ✦ Order personalised based on your logged symptom triggers
            </Text>
          )}
        </View>

        {/* Checklist */}
        <View style={styles.checklist}>
          {sortedItems.map((item) => (
            <ChecklistItemRow
              key={item.id}
              item={item}
              isChecked={checked.has(item.id)}
              onToggle={() => toggleItem(item.id)}
            />
          ))}
        </View>

        {/* Citation */}
        <View style={styles.citation}>
          <Text style={styles.citationLabel}>Evidence citation</Text>
          <Text style={styles.citationText}>
            Lasisi AO et al. (2018). Sleep disorder in patients with tinnitus.{' '}
            <Text style={styles.citationItalic}>
              Journal of Laryngology and Otology
            </Text>
            , 132(6), 490–494.
          </Text>
          <Text style={styles.citationNote}>
            This study examined the relationship between tinnitus and sleep
            disturbance, supporting the importance of targeted sleep hygiene in
            tinnitus self-management.
          </Text>
        </View>

        <Text style={styles.footer}>
          Tap any item to mark it as part of your routine. Your progress is
          saved on this device.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.warmSand },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
    gap: Spacing.xl,
  },

  backBtn: { alignSelf: 'flex-start', paddingVertical: Spacing.sm, paddingRight: Spacing.sm },
  backBtnPressed: { opacity: 0.6 },
  backLabel: { ...Typography.body, color: Colors.deepTide },

  header: { gap: Spacing.md },
  title: { ...Typography.display, color: Colors.darkText },
  lead: { ...Typography.body, color: Colors.midGray, lineHeight: 24 },

  // Progress card
  progressCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.card,
    padding: Spacing.base,
    gap: Spacing.sm,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: { ...Typography.body, color: Colors.darkText },
  progressPct: { ...Typography.heading2, color: Colors.deepTide },
  progressTrack: {
    height: 6,
    backgroundColor: Colors.midGray + '25',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.calmWave,
    borderRadius: 3,
  },
  personalisedNote: {
    ...Typography.caption,
    color: Colors.deepTide,
    fontStyle: 'italic',
  },

  // Checklist
  checklist: { gap: Spacing.sm },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.white,
    borderRadius: Radius.card,
    padding: Spacing.base,
    gap: Spacing.md,
    borderWidth: Border.width,
    borderColor: Colors.transparent,
  },
  checkRowDone: {
    backgroundColor: Colors.tealLight,
    borderColor: Colors.calmWave + '50',
  },
  checkRowPressed: { opacity: 0.8 },

  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.midGray + '60',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: Colors.calmWave,
    borderColor: Colors.calmWave,
  },
  checkmark: { color: Colors.white, fontSize: 13, fontWeight: '700' },

  checkBody: { flex: 1, gap: 4 },
  checkText: { ...Typography.body, color: Colors.darkText, lineHeight: 22 },
  checkTextDone: { color: Colors.deepTide },
  checkDetail: { ...Typography.caption, color: Colors.midGray, lineHeight: 18 },

  // Citation
  citation: {
    backgroundColor: Colors.tealLight,
    borderRadius: Radius.card,
    padding: Spacing.base,
    gap: Spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: Colors.calmWave,
  },
  citationLabel: { ...Typography.micro, color: Colors.deepTide },
  citationText: { ...Typography.caption, color: Colors.darkText, lineHeight: 20 },
  citationItalic: { fontStyle: 'italic' },
  citationNote: { ...Typography.caption, color: Colors.midGray, lineHeight: 18 },

  footer: {
    ...Typography.caption,
    color: Colors.midGray,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
