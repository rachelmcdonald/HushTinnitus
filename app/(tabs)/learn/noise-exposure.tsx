import { useMemo } from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, Radius } from '@/src/theme';
import { useTheme } from '@/src/context/ThemeContext';

// ─── dB reference data ────────────────────────────────────────────────────────

type NoiseEntry = {
  label: string;
  db: number;
};

const NOISE_LEVELS: NoiseEntry[] = [
  { label: 'Whisper', db: 30 },
  { label: 'Quiet library', db: 40 },
  { label: 'Normal conversation', db: 60 },
  { label: 'City traffic (inside vehicle)', db: 70 },
  { label: 'Busy restaurant', db: 75 },
  { label: 'Vacuum cleaner', db: 80 },
  { label: 'Heavy traffic / busy street', db: 85 },
  { label: 'Motorcycle engine', db: 90 },
  { label: 'Power tools', db: 95 },
  { label: 'Chainsaw', db: 100 },
  { label: 'Live concert / club music', db: 110 },
  { label: 'Emergency siren (nearby)', db: 115 },
];

const MAX_DB = 120;

function barColor(db: number): string {
  if (db >= 100) return Colors.warmCoral;
  if (db >= 85)  return '#D4824A';
  if (db >= 70)  return Colors.softGold;
  return Colors.calmWave;
}

function riskLabel(db: number): string | null {
  if (db >= 100) return '⚠ Protect';
  if (db >= 85)  return '! Caution';
  return null;
}

// ─── Components ───────────────────────────────────────────────────────────────

function BackButton() {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);
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

function ThresholdCard({
  color,
  label,
  range,
  description,
}: {
  color: string;
  label: string;
  range: string;
  description: string;
}) {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);
  return (
    <View style={[styles.thresholdCard, { borderLeftColor: color }]}>
      <View style={styles.thresholdHeader}>
        <Text style={[styles.thresholdLabel, { color }]}>{label}</Text>
        <Text style={styles.thresholdRange}>{range}</Text>
      </View>
      <Text style={styles.thresholdDesc}>{description}</Text>
    </View>
  );
}

function ChartRow({ entry }: { entry: NoiseEntry }) {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);

  const pct = Math.min(entry.db / MAX_DB, 1);
  const color = barColor(entry.db);
  const risk = riskLabel(entry.db);

  return (
    <View style={styles.chartRow}>
      <Text style={styles.chartLabel} numberOfLines={1}>
        {entry.label}
      </Text>

      <View style={styles.barTrack}>
        <View
          style={[
            styles.barFill,
            {
              width: `${pct * 100}%` as any,
              backgroundColor: color,
            },
          ]}
        />
        <View
          style={[
            styles.thresholdLine,
            { left: `${(85 / MAX_DB) * 100}%` as any },
          ]}
        />
      </View>

      <Text style={[styles.dbValue, { color }]}>{entry.db}</Text>

      <View style={styles.riskBadgeSlot}>
        {risk && (
          <View style={[styles.riskBadge, { backgroundColor: color + '20' }]}>
            <Text style={[styles.riskBadgeText, { color }]}>{risk}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function NoiseExposureScreen() {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <BackButton />

        <View style={styles.header}>
          <Text style={styles.title}>Noise exposure guide</Text>
          <Text style={styles.lead}>
            Loud noise is one of the most common contributors to changes in hearing.
            Understanding sound levels helps you make informed decisions about
            when hearing protection is worthwhile.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Exposure thresholds</Text>
          <View style={styles.thresholdCards}>
            <ThresholdCard
              color={Colors.calmWave}
              label="Generally safe"
              range="Below 70 dB"
              description="Most everyday sounds at these levels pose no hearing risk with typical exposure."
            />
            <ThresholdCard
              color={Colors.softGold}
              label="Awareness"
              range="70–84 dB"
              description="Extended exposure to sound in this range can cause auditory fatigue over time."
            />
            <ThresholdCard
              color={'#D4824A'}
              label="Protection recommended"
              range="85–99 dB"
              description="Hearing protection is recommended for extended exposure at these levels. This is the NIOSH / EU occupational health threshold."
            />
            <ThresholdCard
              color={Colors.warmCoral}
              label="Protection strongly advised"
              range="100 dB and above"
              description="Prolonged exposure at these levels poses a real risk to hearing. Use protection and keep exposure short."
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Common sound levels</Text>

          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Colors.calmWave }]} />
              <Text style={styles.legendText}>Safe</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Colors.softGold }]} />
              <Text style={styles.legendText}>Caution</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#D4824A' }]} />
              <Text style={styles.legendText}>Protect</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Colors.warmCoral }]} />
              <Text style={styles.legendText}>High risk</Text>
            </View>
          </View>

          <View style={styles.chart}>
            {NOISE_LEVELS.map((entry) => (
              <ChartRow key={entry.label} entry={entry} />
            ))}
          </View>

          <Text style={styles.chartNote}>
            The vertical line on each bar marks the 85 dB hearing protection
            threshold. Values shown are approximate typical levels and will vary
            with distance and conditions.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Practical hearing protection</Text>

          <View style={styles.recCard}>
            <Text style={styles.recHeading}>Foam earplugs</Text>
            <Text style={styles.recBody}>
              Widely available, inexpensive, and effective. Suitable for concerts,
              power tools, and motorcycling. SNR rating of 25–35 dB is typical.
              Roll, insert, and hold until expanded.
            </Text>
          </View>

          <View style={styles.recCard}>
            <Text style={styles.recHeading}>Earmuffs (over-ear protectors)</Text>
            <Text style={styles.recBody}>
              Good for sustained noise (lawnmowing, workshop use). Can be worn
              over earplugs for very high-noise environments. Convenient to take
              on and off.
            </Text>
          </View>

          <View style={styles.recCard}>
            <Text style={styles.recHeading}>High-fidelity earplugs</Text>
            <Text style={styles.recBody}>
              Designed for music events — they reduce volume evenly across
              frequencies so the sound stays clear. Recommended over standard
              foam for concerts where audio quality matters.
            </Text>
          </View>

          <View style={styles.recCard}>
            <Text style={styles.recHeading}>Custom-moulded hearing protection</Text>
            <Text style={styles.recBody}>
              Made by an audiologist from impressions of your ear canal. The best
              fit and most comfortable option for regular or professional use —
              musicians, construction workers, or anyone with frequent exposure.
            </Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoHeading}>Tinnitus and noise exposure</Text>
          <Text style={styles.infoBody}>
            Exposure to loud sound does not directly cause tinnitus in a
            single event for most people, but cumulative exposure is a
            well-recognised contributing factor. If you already have tinnitus,
            protecting your hearing from further stress on the auditory system
            is a practical part of long-term management.
          </Text>
          <Text style={styles.infoBody}>
            If your tinnitus changes noticeably after a noise event, rest in a
            quiet environment with gentle sound enrichment and allow time for
            recovery. If symptoms persist or worsen, speak with your GP or
            audiologist.
          </Text>
        </View>

        <Text style={styles.footer}>
          dB values are approximate. For clinical hearing assessment, see a
          qualified audiologist.
        </Text>
      </ScrollView>
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

    backBtn:        { alignSelf: 'flex-start', paddingVertical: Spacing.sm, paddingRight: Spacing.sm },
    backBtnPressed: { opacity: 0.6 },
    backLabel:      { ...typography.body, color: Colors.deepTide },

    header: { gap: Spacing.md },
    title:  { ...typography.display, color: colors.textPrimary },
    lead:   { ...typography.body, color: colors.textSecondary, lineHeight: 24 },

    section:        { gap: Spacing.md },
    sectionHeading: { ...typography.heading1, color: Colors.deepTide },

    // Threshold cards
    thresholdCards: { gap: Spacing.sm },
    thresholdCard: {
      backgroundColor: colors.surface,
      borderRadius: Radius.card,
      padding: Spacing.md,
      gap: 4,
      borderLeftWidth: 3,
    },
    thresholdHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    thresholdLabel:  { ...typography.heading2 },
    thresholdRange:  { ...typography.caption, color: colors.textSecondary },
    thresholdDesc:   { ...typography.caption, color: colors.textSecondary, lineHeight: 18 },

    // Legend
    legend:     { flexDirection: 'row', gap: Spacing.base, flexWrap: 'wrap' },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
    legendDot:  { width: 10, height: 10, borderRadius: 5 },
    legendText: { ...typography.caption, color: colors.textSecondary },

    // Chart
    chart: {
      backgroundColor: colors.surface,
      borderRadius: Radius.card,
      padding: Spacing.base,
      gap: Spacing.md,
    },
    chartRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      minHeight: 32,
    },
    chartLabel: {
      ...typography.caption,
      color: colors.textPrimary,
      width: 120,
      flexShrink: 0,
    },
    barTrack: {
      flex: 1,
      height: 14,
      backgroundColor: colors.textSecondary + '20',
      borderRadius: 7,
      overflow: 'visible',
      position: 'relative',
    },
    barFill: {
      height: '100%',
      borderRadius: 7,
      minWidth: 4,
    },
    thresholdLine: {
      position: 'absolute',
      top: -3,
      bottom: -3,
      width: 1.5,
      backgroundColor: colors.textSecondary + '80',
    },
    dbValue: {
      ...typography.caption,
      fontWeight: '600',
      width: 28,
      textAlign: 'right',
      flexShrink: 0,
    },
    riskBadgeSlot: { width: 64, flexShrink: 0 },
    riskBadge: {
      borderRadius: 4,
      paddingHorizontal: Spacing.xs,
      paddingVertical: 2,
      alignSelf: 'flex-start',
    },
    riskBadgeText: { ...typography.micro, fontSize: 9 },
    chartNote: {
      ...typography.caption,
      color: colors.textSecondary,
      fontStyle: 'italic',
      lineHeight: 18,
    },

    // Recommendation cards
    recCard: {
      backgroundColor: colors.surface,
      borderRadius: Radius.card,
      padding: Spacing.base,
      gap: 6,
    },
    recHeading: { ...typography.heading2, color: Colors.deepTide },
    recBody:    { ...typography.body, color: colors.textPrimary, lineHeight: 22 },

    // Tinnitus info card
    infoCard: {
      backgroundColor: colors.surfaceVariant,
      borderRadius: Radius.card,
      padding: Spacing.base,
      gap: Spacing.md,
      borderLeftWidth: 3,
      borderLeftColor: Colors.calmWave,
    },
    infoHeading: { ...typography.heading2, color: Colors.deepTide },
    infoBody:    { ...typography.body, color: colors.textPrimary, lineHeight: 24 },

    footer: {
      ...typography.caption,
      color: colors.textSecondary,
      textAlign: 'center',
      fontStyle: 'italic',
    },
  });
}
