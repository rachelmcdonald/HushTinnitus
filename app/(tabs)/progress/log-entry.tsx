import { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet, Text, View, Pressable, ScrollView,
  TextInput, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Slider from '@react-native-community/slider';
import { usePreferences } from '@/src/context/PreferencesContext';
import { saveSymptomLog, updateSymptomLog, getSymptomLogById } from '@/src/storage/symptomLog';
import { SymptomLog, TriggerTag } from '@/src/types';
import ComingSoonModal from '@/src/components/ComingSoonModal';
import ComingSoonBadge from '@/src/components/ComingSoonBadge';
import { Colors, Spacing, Radius, Border } from '@/src/theme';
import { useTheme } from '@/src/context/ThemeContext';

// ─── Constants ────────────────────────────────────────────────────────────────

const TIME_OPTIONS: Array<{ value: SymptomLog['timeOfDay']; label: string }> = [
  { value: 'morning', label: 'Morning' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'evening', label: 'Evening' },
  { value: 'night', label: 'Night' },
];

const TRIGGER_TAGS: Array<{ value: TriggerTag; label: string }> = [
  { value: 'noise', label: 'Noise' },
  { value: 'stress', label: 'Stress' },
  { value: 'caffeine', label: 'Caffeine' },
  { value: 'alcohol', label: 'Alcohol' },
  { value: 'poor-sleep', label: 'Poor sleep' },
  { value: 'illness', label: 'Illness' },
  { value: 'other', label: 'Other' },
];

// ─── Slider with label ────────────────────────────────────────────────────────

function LabeledSlider({
  label,
  value,
  onChange,
  lowLabel,
  highLabel,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  lowLabel: string;
  highLabel: string;
}) {
  const { colors, typography } = useTheme();
  const slider = useMemo(() => makeSliderStyles(colors, typography), [colors, typography]);

  return (
    <View style={slider.container}>
      <View style={slider.labelRow}>
        <Text style={slider.label}>{label}</Text>
        <Text style={slider.value}>{value}</Text>
      </View>
      <Slider
        style={slider.track}
        minimumValue={1}
        maximumValue={10}
        step={1}
        value={value}
        onValueChange={(v) => onChange(Math.round(v))}
        minimumTrackTintColor={Colors.calmWave}
        maximumTrackTintColor={colors.textSecondary + '40'}
        thumbTintColor={Colors.deepTide}
        accessibilityLabel={label}
      />
      <View style={slider.anchors}>
        <Text style={slider.anchor}>{lowLabel}</Text>
        <Text style={slider.anchor}>{highLabel}</Text>
      </View>
    </View>
  );
}

function makeSliderStyles(
  colors: ReturnType<typeof useTheme>['colors'],
  typography: ReturnType<typeof useTheme>['typography'],
) {
  return StyleSheet.create({
    container: { gap: Spacing.xs },
    labelRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
    },
    label: { ...typography.heading2, color: colors.textPrimary },
    value: { fontSize: 24, fontWeight: '400', color: Colors.deepTide },
    track: { width: '100%', height: 40 },
    anchors: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.xs,
      marginTop: -Spacing.xs,
    },
    anchor: { ...typography.caption, color: colors.textSecondary },
  });
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function LogEntryScreen() {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);

  const { preferences } = usePreferences();
  const isPremium = preferences?.isPremium ?? false;
  const params = useLocalSearchParams<{ existingId?: string }>();
  const existingId = params.existingId;
  const isEditing = !!existingId;

  const [timeOfDay, setTimeOfDay] = useState<SymptomLog['timeOfDay'] | null>(null);
  const [loudness, setLoudness] = useState(5);
  const [distress, setDistress] = useState(5);
  const [notes, setNotes] = useState('');
  const [triggers, setTriggers] = useState<TriggerTag[]>([]);
  const [upgradeVisible, setUpgradeVisible] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!existingId || Platform.OS === 'web') return;
    const existing = getSymptomLogById(existingId);
    if (existing) {
      setTimeOfDay(existing.timeOfDay);
      setLoudness(existing.loudness);
      setDistress(existing.distress);
      setNotes(existing.notes);
      setTriggers(existing.triggers);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleTrigger(tag: TriggerTag) {
    setTriggers((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  function handleSave() {
    if (!timeOfDay) {
      Alert.alert('Time of day required', 'Please select when you are logging this entry.');
      return;
    }
    if (Platform.OS !== 'web') {
      if (isEditing && existingId) {
        updateSymptomLog(existingId, { timeOfDay, loudness, distress, notes: notes.trim(), triggers });
      } else {
        saveSymptomLog({
          date: new Date().toISOString(),
          timeOfDay,
          loudness,
          distress,
          notes: notes.trim(),
          triggers,
        });
      }
    }
    setSaved(true);
  }

  if (saved) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.savedHeader}>
            <View style={styles.savedBadge}>
              <Text style={styles.savedBadgeText}>{isEditing ? 'Entry updated' : 'Entry saved'}</Text>
            </View>
            <Text style={styles.savedTitle}>{isEditing ? 'Updated' : 'Logged'}</Text>
            <Text style={styles.savedSub}>
              {isEditing
                ? 'Your changes have been saved privately on this device.'
                : 'Your symptom log has been saved privately on this device.'}
            </Text>
          </View>
          <View style={styles.savedSummary}>
            <View style={styles.savedRow}>
              <Text style={styles.savedRowLabel}>Time of day</Text>
              <Text style={styles.savedRowValue}>{timeOfDay}</Text>
            </View>
            <View style={styles.savedRow}>
              <Text style={styles.savedRowLabel}>Loudness</Text>
              <Text style={styles.savedRowValue}>{loudness} / 10</Text>
            </View>
            <View style={styles.savedRow}>
              <Text style={styles.savedRowLabel}>Distress</Text>
              <Text style={styles.savedRowValue}>{distress} / 10</Text>
            </View>
            {triggers.length > 0 && (
              <View style={styles.savedRow}>
                <Text style={styles.savedRowLabel}>Triggers</Text>
                <Text style={styles.savedRowValue}>{triggers.join(', ')}</Text>
              </View>
            )}
            {notes.trim().length > 0 && (
              <View style={[styles.savedRow, styles.savedRowStacked]}>
                <Text style={styles.savedRowLabel}>Notes</Text>
                <Text style={styles.savedRowNote}>{notes.trim()}</Text>
              </View>
            )}
          </View>
          <Pressable
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed]}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Done"
          >
            <Text style={styles.primaryBtnLabel}>Done</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.topBar}>
          <Pressable
            style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Back to Progress"
          >
            <Text style={styles.backLabel}>← Progress</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.title}>
              {isEditing ? "Edit today's entry" : "Log today's symptoms"}
            </Text>
            <Text style={styles.subtitle}>
              How are you feeling? Your log is stored privately on this device.
            </Text>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Time of day</Text>
            <View style={styles.timeGrid}>
              {TIME_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value}
                  style={[
                    styles.timeChip,
                    timeOfDay === opt.value && styles.timeChipSelected,
                  ]}
                  onPress={() => setTimeOfDay(opt.value)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: timeOfDay === opt.value }}
                  accessibilityLabel={opt.label}
                >
                  <Text
                    style={[
                      styles.timeChipLabel,
                      timeOfDay === opt.value && styles.timeChipLabelSelected,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <LabeledSlider
              label="Perceived loudness"
              value={loudness}
              onChange={setLoudness}
              lowLabel="Barely audible"
              highLabel="Very loud"
            />
          </View>

          <View style={styles.fieldGroup}>
            <LabeledSlider
              label="Perceived distress"
              value={distress}
              onChange={setDistress}
              lowLabel="Not bothered"
              highLabel="Extremely bothered"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Notes <Text style={styles.optional}>(optional)</Text></Text>
            <TextInput
              style={styles.notesInput}
              multiline
              value={notes}
              onChangeText={setNotes}
              placeholder="Anything worth noting about today…"
              placeholderTextColor={colors.textSecondary + '80'}
              textAlignVertical="top"
              accessibilityLabel="Notes"
            />
          </View>

          <View style={styles.fieldGroup}>
            <View style={styles.triggerHeader}>
              <Text style={styles.fieldLabel}>Triggers</Text>
              {!isPremium && (
                <Pressable
                  onPress={() => setUpgradeVisible(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Trigger tagging — coming soon. Tap for details."
                >
                  <ComingSoonBadge />
                </Pressable>
              )}
            </View>
            {isPremium ? (
              <>
                <Text style={styles.triggerHint}>
                  Tag anything that may have affected your tinnitus today.
                </Text>
                <View style={styles.tagGrid}>
                  {TRIGGER_TAGS.map((t) => (
                    <Pressable
                      key={t.value}
                      style={[
                        styles.tagChip,
                        triggers.includes(t.value) && styles.tagChipSelected,
                      ]}
                      onPress={() => toggleTrigger(t.value)}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: triggers.includes(t.value) }}
                      accessibilityLabel={t.label}
                    >
                      <Text
                        style={[
                          styles.tagChipLabel,
                          triggers.includes(t.value) && styles.tagChipLabelSelected,
                        ]}
                      >
                        {t.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : (
              <Pressable
                style={styles.triggerLocked}
                onPress={() => setUpgradeVisible(true)}
                accessibilityRole="button"
                accessibilityLabel="Trigger tagging — coming soon. Tap for details."
              >
                <Text style={styles.triggerLockedText}>
                  Tag triggers like noise, stress, and sleep quality — coming in a future update.
                </Text>
                <Text style={styles.triggerLockedCTA}>Tap for details →</Text>
              </Pressable>
            )}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              !timeOfDay && styles.primaryBtnDisabled,
              pressed && timeOfDay && styles.primaryBtnPressed,
            ]}
            onPress={handleSave}
            disabled={!timeOfDay}
            accessibilityRole="button"
            accessibilityLabel="Save log entry"
            accessibilityState={{ disabled: !timeOfDay }}
          >
            <Text
              style={[
                styles.primaryBtnLabel,
                !timeOfDay && styles.primaryBtnLabelDisabled,
              ]}
            >
              Save entry
            </Text>
          </Pressable>
          {!timeOfDay && (
            <Text style={styles.saveHint}>Select a time of day to save.</Text>
          )}
        </View>
      </KeyboardAvoidingView>

      <ComingSoonModal
        visible={upgradeVisible}
        onClose={() => setUpgradeVisible(false)}
        featureName="Trigger Tagging"
        description="Tag potential triggers (noise, stress, caffeine, alcohol, poor sleep, illness) alongside your daily log entries to identify patterns in what makes your tinnitus worse."
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
    topBar: {
      paddingHorizontal: Spacing.xl,
      paddingTop: Spacing.md,
      paddingBottom: Spacing.sm,
      borderBottomWidth: Border.width,
      borderBottomColor: Colors.calmWave + '33',
    },
    backBtn: { alignSelf: 'flex-start' },
    backBtnPressed: { opacity: 0.6 },
    backLabel: { ...typography.body, color: Colors.deepTide },
    scroll: {
      flexGrow: 1,
      paddingHorizontal: Spacing.xl,
      paddingTop: Spacing.lg,
      paddingBottom: Spacing.xl,
      gap: Spacing.xl,
    },
    header: { gap: Spacing.xs },
    title:    { ...typography.heading1, color: colors.textPrimary },
    subtitle: { ...typography.body, color: colors.textSecondary },

    fieldGroup: { gap: Spacing.sm },
    fieldLabel: { ...typography.heading2, color: colors.textPrimary },
    optional:   { ...typography.caption, color: colors.textSecondary, fontWeight: '400' as const },

    // Time of day
    timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    timeChip: {
      borderWidth: Border.width * 2,
      borderColor: colors.textSecondary + '40',
      borderRadius: Radius.chip,
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.base,
      backgroundColor: colors.background,
    },
    timeChipSelected: {
      backgroundColor: Colors.deepTide,
      borderColor: Colors.deepTide,
    },
    timeChipLabel:         { ...typography.body, color: colors.textSecondary },
    timeChipLabelSelected: { color: Colors.white },

    // Notes
    notesInput: {
      borderWidth: 1.5,
      borderColor: colors.textSecondary + '40',
      borderRadius: Radius.card,
      padding: Spacing.md,
      backgroundColor: colors.surfaceVariant,
      ...typography.body,
      color: colors.textPrimary,
      lineHeight: 24,
      minHeight: 80,
      textAlignVertical: 'top',
    },

    // Trigger tags
    triggerHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    triggerHint: { ...typography.caption, color: colors.textSecondary },
    tagGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    tagChip: {
      borderWidth: Border.width * 2,
      borderColor: colors.textSecondary + '40',
      borderRadius: Radius.chip,
      paddingVertical: Spacing.xs,
      paddingHorizontal: Spacing.md,
      backgroundColor: colors.background,
    },
    tagChipSelected: { backgroundColor: Colors.calmWave, borderColor: Colors.calmWave },
    tagChipLabel:         { ...typography.body, color: colors.textSecondary },
    tagChipLabelSelected: { color: Colors.white },
    triggerLocked: {
      backgroundColor: colors.surfaceVariant,
      borderRadius: Radius.card,
      padding: Spacing.md,
      gap: Spacing.xs,
      borderWidth: 1,
      borderColor: Colors.deepTide + '30',
    },
    triggerLockedText: { ...typography.body, color: colors.textSecondary, lineHeight: 22 },
    triggerLockedCTA:  { ...typography.caption, color: Colors.deepTide, fontWeight: '500' as const },

    // Footer
    footer: {
      paddingHorizontal: Spacing.xl,
      paddingBottom: Spacing.xl,
      paddingTop: Spacing.md,
      gap: Spacing.xs,
      borderTopWidth: Border.width,
      borderTopColor: Colors.calmWave + '33',
      backgroundColor: colors.background,
    },
    primaryBtn: {
      backgroundColor: Colors.deepTide,
      borderRadius: Radius.chip,
      paddingVertical: Spacing.base,
      alignItems: 'center',
    },
    primaryBtnDisabled:      { backgroundColor: colors.textSecondary + '40' },
    primaryBtnPressed:       { opacity: 0.85 },
    primaryBtnLabel:         { ...typography.heading2, color: Colors.white },
    primaryBtnLabelDisabled: { color: colors.textSecondary },
    saveHint: {
      ...typography.caption,
      color: colors.textSecondary,
      textAlign: 'center',
      fontStyle: 'italic',
    },

    // Saved confirmation
    savedHeader: { gap: Spacing.md },
    savedBadge: {
      alignSelf: 'flex-start',
      backgroundColor: colors.surfaceVariant,
      borderRadius: Radius.chip,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs,
    },
    savedBadgeText: { ...typography.micro, color: Colors.deepTide },
    savedTitle:     { ...typography.display, color: colors.textPrimary },
    savedSub:       { ...typography.body, color: colors.textSecondary },
    savedSummary: {
      backgroundColor: colors.surface,
      borderRadius: Radius.card,
      padding: Spacing.base,
      gap: Spacing.sm,
      borderWidth: Border.width,
      borderColor: Colors.calmWave + '33',
    },
    savedRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    savedRowStacked: { flexDirection: 'column', gap: Spacing.xs },
    savedRowLabel:   { ...typography.caption, color: colors.textSecondary, textTransform: 'capitalize' },
    savedRowValue:   { ...typography.body, color: colors.textPrimary, fontWeight: '500' as const },
    savedRowNote:    { ...typography.body, color: colors.textPrimary, lineHeight: 22 },
  });
}
