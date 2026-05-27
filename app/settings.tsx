import { useMemo } from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Spacing, Radius, Border } from '@/src/theme';
import { useTheme } from '@/src/context/ThemeContext';
import { usePreferences } from '@/src/context/PreferencesContext';
import type { UserPreferences } from '@/src/types';

// ─── Selector component ───────────────────────────────────────────────────────

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

// ─── Screen ───────────────────────────────────────────────────────────────────

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

export default function SettingsScreen() {
  const { colors, typography } = useTheme();
  const { preferences, updatePreferences } = usePreferences();

  const styles = useMemo(() => makeStyles(colors), [colors]);

  const darkMode = preferences?.darkMode ?? 'system';
  const textSize = preferences?.textSize ?? 'medium';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Back */}
        <Pressable
          style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Text style={styles.backLabel}>← Back</Text>
        </Pressable>

        <Text style={styles.title}>Settings</Text>

        {/* Appearance section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Appearance</Text>

          <View style={styles.row}>
            <View style={styles.rowLabel}>
              <Text style={styles.rowTitle}>Dark mode</Text>
              <Text style={styles.rowDesc}>
                System follows your device setting.
              </Text>
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
              <Text style={styles.rowDesc}>
                Scales all text across the app.
              </Text>
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

        {/* Preview */}
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
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    scroll: {
      flexGrow: 1,
      paddingHorizontal: Spacing.xl,
      paddingTop: Spacing.md,
      paddingBottom: Spacing.xl,
      gap: Spacing.xl,
    },

    backBtn: { alignSelf: 'flex-start', paddingVertical: Spacing.sm, paddingRight: Spacing.sm },
    backBtnPressed: { opacity: 0.6 },
    backLabel: { fontSize: 14, color: colors.deepTide },

    title: { fontSize: 28, fontWeight: '400', color: colors.textPrimary, letterSpacing: -0.56 },

    section: {
      backgroundColor: colors.surface,
      borderRadius: Radius.card,
      padding: Spacing.base,
      gap: Spacing.base,
    },
    sectionHeading: {
      fontSize: 11,
      fontWeight: '500',
      textTransform: 'uppercase',
      letterSpacing: 0.55,
      color: colors.deepTide,
    },

    row: { gap: Spacing.sm },
    rowLabel: { gap: 2 },
    rowTitle: { fontSize: 14, fontWeight: '500', color: colors.textPrimary },
    rowDesc: { fontSize: 12, color: colors.textSecondary, lineHeight: 18 },

    divider: { height: Border.width, backgroundColor: colors.calmWave + '30' },

    previewCard: {
      backgroundColor: colors.surfaceVariant,
      borderRadius: Radius.card,
      padding: Spacing.base,
      gap: Spacing.sm,
    },
    previewLabel: {
      fontSize: 11,
      fontWeight: '500',
      textTransform: 'uppercase',
      letterSpacing: 0.55,
      color: colors.deepTide,
    },
    previewDisplay: { color: colors.textPrimary },
    previewBody: { color: colors.textSecondary, lineHeight: 22 },
  });
}
