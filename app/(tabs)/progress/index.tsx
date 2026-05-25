import { useState, useCallback } from 'react';
import {
  StyleSheet, Text, View, Pressable, ScrollView,
  Platform, Alert, useWindowDimensions, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import Svg, { Polyline, Circle, Line as SvgLine } from 'react-native-svg';
import { usePreferences } from '@/src/context/PreferencesContext';
import {
  getLogsForPeriod, getRecentLogs, getSessionStats, getTriggerStats,
  getTodayLogs, groupLogsByDay, TriggerStat, SessionStats,
} from '@/src/storage/symptomLog';
import { getAllAssessments } from '@/src/storage/tfi';
import { TFIAssessment, SymptomLog } from '@/src/types';
import { Colors, TFISeverityColors, Typography, Spacing, Radius, Border } from '@/src/theme';
import PremiumGate from '@/src/components/PremiumGate';

// ─── Grade helpers ────────────────────────────────────────────────────────────

const GRADE_LABELS: Record<TFIAssessment['grade'], string> = {
  'not-significant': 'Not significant',
  small: 'Small',
  moderate: 'Moderate',
  big: 'Big',
  'very-big': 'Very big',
};

function gradeColors(grade: TFIAssessment['grade']) {
  const map: Record<TFIAssessment['grade'], { background: string; text: string }> = {
    'not-significant': TFISeverityColors.notSignificant,
    small: TFISeverityColors.small,
    moderate: TFISeverityColors.moderate,
    big: TFISeverityColors.big,
    'very-big': TFISeverityColors.veryBig,
  };
  return map[grade];
}

// ─── SVG Charts ───────────────────────────────────────────────────────────────

type ChartSeries = { values: number[]; color: string };

function SymptomLineChart({
  chartWidth,
  series,
  maxValue = 10,
}: {
  chartWidth: number;
  series: ChartSeries[];
  maxValue?: number;
}) {
  const height = 100;
  const padX = 8;
  const padY = 10;
  const w = chartWidth - padX * 2;
  const h = height - padY * 2;
  const n = series[0]?.values.length ?? 0;
  if (n < 2) return null;

  function toPoints(values: number[]) {
    return values
      .map((v, i) => {
        const x = padX + (i / (n - 1)) * w;
        const y = padY + h - (v / maxValue) * h;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }

  function endPoint(values: number[]) {
    const x = padX + w;
    const y = padY + h - (values[n - 1] / maxValue) * h;
    return { x, y };
  }

  return (
    <Svg width={chartWidth} height={height}>
      {/* Gridlines at 0, 5, 10 */}
      {[0, 5, maxValue].map((v) => {
        const y = padY + h - (v / maxValue) * h;
        return (
          <SvgLine
            key={v}
            x1={padX} y1={y} x2={padX + w} y2={y}
            stroke={Colors.midGray + '20'}
            strokeWidth={1}
          />
        );
      })}
      {series.map((s, si) => {
        const pts = toPoints(s.values);
        const { x, y } = endPoint(s.values);
        return (
          <Svg key={si}>
            <Polyline
              points={pts}
              fill="none"
              stroke={s.color}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Circle cx={x} cy={y} r={4} fill={s.color} />
          </Svg>
        );
      })}
    </Svg>
  );
}

function TFITrendChart({
  chartWidth,
  assessments,
}: {
  chartWidth: number;
  assessments: TFIAssessment[];
}) {
  const height = 110;
  const padX = 8;
  const padY = 14;
  const w = chartWidth - padX * 2;
  const h = height - padY * 2;
  const n = assessments.length;
  if (n < 2) return null;

  const pts = assessments.map((a, i) => {
    const x = padX + (i / (n - 1)) * w;
    const y = padY + h - (a.totalScore / 100) * h;
    return { x, y, score: a.totalScore };
  });

  const polyline = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  // MCID reference: baseline score - 13
  const mcidTarget = Math.max(0, assessments[0].totalScore - 13);
  const mcidY = padY + h - (mcidTarget / 100) * h;

  return (
    <Svg width={chartWidth} height={height}>
      {/* MCID dotted line */}
      <SvgLine
        x1={padX} y1={mcidY} x2={padX + w} y2={mcidY}
        stroke={Colors.calmWave}
        strokeWidth={1.5}
        strokeDasharray="5,4"
      />
      {/* Trend line */}
      <Polyline
        points={polyline}
        fill="none"
        stroke={Colors.deepTide}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Dots with score */}
      {pts.map((p, i) => (
        <Svg key={i}>
          <Circle cx={p.x} cy={p.y} r={6} fill={Colors.deepTide} />
          <Circle cx={p.x} cy={p.y} r={3} fill={Colors.white} />
        </Svg>
      ))}
    </Svg>
  );
}

// ─── PDF export ───────────────────────────────────────────────────────────────

function buildPDFHtml(assessments: TFIAssessment[], logs: SymptomLog[]): string {
  const dateStr = new Date().toLocaleDateString('en-AU', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  const gradeLabel = (g: TFIAssessment['grade']) => GRADE_LABELS[g] ?? g;
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });

  const tfiRows = assessments.map((a) => `
    <tr>
      <td>${formatDate(a.date)}</td>
      <td>${Math.round(a.totalScore)}</td>
      <td>${gradeLabel(a.grade)}</td>
      <td>${a.isBaseline ? 'Baseline' : `Week ${a.weekNumber}`}</td>
    </tr>`).join('');

  const logRows = logs.map((l) => `
    <tr>
      <td>${formatDate(l.date)}</td>
      <td>${l.timeOfDay}</td>
      <td>${l.loudness}</td>
      <td>${l.distress}</td>
      <td>${l.triggers.join(', ') || '—'}</td>
      <td>${l.notes || '—'}</td>
    </tr>`).join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  body{font-family:-apple-system,Arial,sans-serif;padding:24px;color:#1A2B2B;font-size:12px;}
  h1{color:#0D4F5C;font-size:18px;margin-bottom:2px;}
  .sub{color:#666;font-size:10px;margin-bottom:18px;}
  h2{color:#0D4F5C;font-size:13px;border-bottom:1px solid #E1F5EE;padding-bottom:4px;margin-top:20px;}
  table{width:100%;border-collapse:collapse;margin-top:8px;}
  th{background:#0D4F5C;color:#fff;padding:6px 8px;text-align:left;font-size:10px;}
  td{padding:5px 8px;border-bottom:1px solid #E1F5EE;font-size:10px;}
  .disc{font-size:9px;color:#666;margin-top:24px;padding-top:10px;border-top:1px solid #eee;line-height:1.5;}
</style>
</head>
<body>
  <h1>Hush Tinnitus — Clinician Report</h1>
  <div class="sub">Exported ${dateStr} · Self-management app, not a medical device</div>

  <h2>TFI Assessment History</h2>
  ${assessments.length === 0
    ? '<p style="color:#666;font-size:10px;">No assessments recorded.</p>'
    : `<table><tr><th>Date</th><th>Score /100</th><th>Grade</th><th>Time point</th></tr>${tfiRows}</table>`}

  <h2>Symptom Log (Last 30 Days)</h2>
  ${logs.length === 0
    ? '<p style="color:#666;font-size:10px;">No log entries recorded.</p>'
    : `<table><tr><th>Date</th><th>Time</th><th>Loudness /10</th><th>Distress /10</th><th>Triggers</th><th>Notes</th></tr>${logRows}</table>`}

  <div class="disc">
    Hush Tinnitus provides self-management tools and educational content for people living
    with tinnitus. It is not a medical device and is not intended to diagnose, treat, cure,
    or prevent tinnitus or any medical condition. All data is self-reported. Always consult
    a qualified healthcare professional — including a GP, audiologist, or ENT specialist —
    before making changes to how you manage your tinnitus.
  </div>
</body>
</html>`;
}

async function sharePDF(assessments: TFIAssessment[], logs: SymptomLog[]): Promise<void> {
  let Print: typeof import('expo-print');
  let Sharing: typeof import('expo-sharing');
  try {
    Print = await import('expo-print');
    Sharing = await import('expo-sharing');
  } catch {
    Alert.alert(
      'PDF export unavailable',
      'PDF export requires an updated build. Install the latest version and try again.'
    );
    return;
  }
  const html = buildPDFHtml(assessments, logs);
  const { uri } = await Print.printToFileAsync({ html });
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, { UTI: 'com.adobe.pdf', mimeType: 'application/pdf' });
  } else {
    Alert.alert('PDF saved', uri);
  }
}

// ─── Retest prompt logic ──────────────────────────────────────────────────────

function getRetestWeek(
  assessments: TFIAssessment[],
  lastTFIDate: string | null
): 4 | 8 | null {
  if (!lastTFIDate || assessments.length === 0) return null;
  const daysSince = Math.floor(
    (Date.now() - new Date(lastTFIDate).getTime()) / (1000 * 60 * 60 * 24)
  );
  const hasWeek4 = assessments.some((a) => a.weekNumber === 4);
  const hasWeek8 = assessments.some((a) => a.weekNumber === 8);
  if (daysSince >= 56 && hasWeek4 && !hasWeek8) return 8;
  if (daysSince >= 28 && !hasWeek4) return 4;
  return null;
}

// ─── Section label ────────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return <Text style={styles.sectionLabel}>{label}</Text>;
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ProgressScreen() {
  const { preferences } = usePreferences();
  const isPremium = preferences?.isPremium ?? false;
  const { width } = useWindowDimensions();
  const chartWidth = width - 2 * Spacing.xl - 2 * Spacing.base;

  const [assessments, setAssessments] = useState<TFIAssessment[]>([]);
  const [chartData, setChartData] = useState<{ loudness: number[]; distress: number[] }>({
    loudness: [], distress: [],
  });
  const [triggerStats, setTriggerStats] = useState<TriggerStat[]>([]);
  const [sessionStats, setSessionStats] = useState<SessionStats>({ totalSessions: 0, totalMinutes: 0 });
  const [todayEntry, setTodayEntry] = useState<SymptomLog | null>(null);
  const [exportLoading, setExportLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS === 'web') return;
      const all = getAllAssessments();
      setAssessments(all);

      const logs30 = getLogsForPeriod(30);
      const grouped = groupLogsByDay(logs30);
      setChartData({
        loudness: grouped.map((d) => d.loudness),
        distress: grouped.map((d) => d.distress),
      });

      setTriggerStats(getTriggerStats());
      setSessionStats(getSessionStats());

      // Most recent log for today (getTodayLogs returns DESC order)
      const todayLogs = getTodayLogs();
      setTodayEntry(todayLogs[0] ?? null);
    }, [])
  );

  const latestAssessment = assessments.length > 0 ? assessments[assessments.length - 1] : null;
  const retestWeek = getRetestWeek(assessments, preferences?.lastTFIDate ?? null);

  async function handleExport() {
    setExportLoading(true);
    try {
      const logs = getRecentLogs(30);
      await sharePDF(assessments, logs);
    } catch {
      Alert.alert('Export failed', 'Could not generate the report. Please try again.');
    } finally {
      setExportLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Progress</Text>
          <Text style={styles.subtitle}>
            Track your symptoms, therapy activity, and TFI scores over time.
          </Text>
        </View>

        {/* ── Log today ─────────────────────────────────────────────────────── */}
        <SectionLabel label="TODAY" />
        {todayEntry ? (
          <Pressable
            style={({ pressed }) => [styles.logCard, styles.logCardLogged, pressed && styles.logCardPressed]}
            onPress={() =>
              router.push({
                pathname: '/progress/log-entry' as any,
                params: { existingId: todayEntry.id },
              })
            }
            accessibilityRole="button"
            accessibilityLabel="Edit today's symptom log entry"
          >
            <View style={styles.logCardLeft}>
              <View style={styles.logCardTitleRow}>
                <Text style={styles.logCardCheckmark}>✓</Text>
                <Text style={styles.logCardTitleLogged}>Today's symptoms logged</Text>
              </View>
              <Text style={styles.logCardSummary}>
                {todayEntry.timeOfDay} · Loudness {todayEntry.loudness}/10 · Distress {todayEntry.distress}/10
              </Text>
            </View>
            <View style={[styles.logCardBadge, styles.logCardBadgeDone]}>
              <Text style={[styles.logCardBadgeText, styles.logCardBadgeTextDone]}>Edit entry</Text>
            </View>
          </Pressable>
        ) : (
          <Pressable
            style={({ pressed }) => [styles.logCard, pressed && styles.logCardPressed]}
            onPress={() => router.push('/progress/log-entry' as any)}
            accessibilityRole="button"
            accessibilityLabel="Log today's symptoms"
          >
            <View style={styles.logCardLeft}>
              <Text style={styles.logCardTitle}>Log today's symptoms</Text>
              <Text style={styles.logCardSub}>Loudness, distress, time of day, and notes.</Text>
            </View>
            <View style={styles.logCardBadge}>
              <Text style={styles.logCardBadgeText}>Log now</Text>
            </View>
          </Pressable>
        )}

        {/* ── Session stats ─────────────────────────────────────────────────── */}
        <SectionLabel label="ACTIVITY" />
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{sessionStats.totalSessions}</Text>
            <Text style={styles.statLabel}>Sound sessions</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{sessionStats.totalMinutes}</Text>
            <Text style={styles.statLabel}>Total minutes</Text>
          </View>
        </View>

        {/* ── Latest TFI ────────────────────────────────────────────────────── */}
        <SectionLabel label="TFI SCORE" />
        {latestAssessment ? (
          <View style={styles.tfiCard}>
            <View style={styles.tfiCardRow}>
              <View>
                <Text style={styles.tfiScore}>{Math.round(latestAssessment.totalScore)}</Text>
                <Text style={styles.tfiScoreOf}>out of 100</Text>
              </View>
              <View style={[styles.gradeBadge, { backgroundColor: gradeColors(latestAssessment.grade).background }]}>
                <Text style={[styles.gradeBadgeText, { color: gradeColors(latestAssessment.grade).text }]}>
                  {GRADE_LABELS[latestAssessment.grade]}
                </Text>
              </View>
            </View>
            <Text style={styles.tfiDate}>
              {latestAssessment.isBaseline ? 'Baseline' : `Week ${latestAssessment.weekNumber}`}
              {' · '}
              {new Date(latestAssessment.date).toLocaleDateString('en-AU', {
                day: 'numeric', month: 'short', year: 'numeric',
              })}
            </Text>

            {/* Retest prompt */}
            {retestWeek && (
              <View style={styles.retestPrompt}>
                <Text style={styles.retestText}>
                  Your week {retestWeek} TFI check-in is ready. It takes about 4 minutes.
                </Text>
                <Pressable
                  style={({ pressed }) => [styles.retestBtn, pressed && styles.retestBtnPressed]}
                  onPress={() =>
                    router.push({
                      pathname: '/progress/tfi-retest' as any,
                      params: { weekNumber: String(retestWeek) },
                    })
                  }
                  accessibilityRole="button"
                  accessibilityLabel={`Start week ${retestWeek} TFI retest`}
                >
                  <Text style={styles.retestBtnLabel}>Retake TFI — Week {retestWeek}</Text>
                </Pressable>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.tfiEmptyCard}>
            <Text style={styles.tfiEmptyTitle}>TFI not yet completed</Text>
            <Text style={styles.tfiEmptyBody}>
              Complete the Tinnitus Functional Index during onboarding to see your score here.
            </Text>
          </View>
        )}

        {/* ── 30-day symptom chart (Premium) ────────────────────────────────── */}
        <SectionLabel label="30-DAY TREND" />
        <PremiumGate isPremium={isPremium} featureName="30-day symptom trend">
          <View style={styles.chartCard}>
            <Text style={styles.chartCardTitle}>Loudness &amp; distress</Text>
            {chartData.loudness.length >= 2 ? (
              <>
                <SymptomLineChart
                  chartWidth={chartWidth}
                  series={[
                    { values: chartData.loudness, color: Colors.warmCoral },
                    { values: chartData.distress, color: Colors.deepTide },
                  ]}
                />
                <View style={styles.chartLegend}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: Colors.warmCoral }]} />
                    <Text style={styles.legendLabel}>Loudness</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: Colors.deepTide }]} />
                    <Text style={styles.legendLabel}>Distress</Text>
                  </View>
                  <Text style={styles.legendScale}>Scale 0–10</Text>
                </View>
              </>
            ) : (
              <Text style={styles.chartEmpty}>
                Log at least 2 days of symptoms to see your trend here.
              </Text>
            )}
          </View>
        </PremiumGate>

        {/* ── TFI trend (Premium) ───────────────────────────────────────────── */}
        <SectionLabel label="TFI PROGRESS" />
        <PremiumGate isPremium={isPremium} featureName="TFI trend chart">
          <View style={styles.chartCard}>
            <Text style={styles.chartCardTitle}>TFI score over time</Text>
            {assessments.length >= 2 ? (
              <>
                <TFITrendChart chartWidth={chartWidth} assessments={assessments} />
                <View style={styles.tfiTrendLabels}>
                  {assessments.map((a) => (
                    <Text key={a.id} style={styles.tfiTrendLabel}>
                      {a.isBaseline ? 'Baseline' : `Wk ${a.weekNumber}`}
                      {'\n'}
                      <Text style={styles.tfiTrendScore}>{Math.round(a.totalScore)}</Text>
                    </Text>
                  ))}
                </View>
                <View style={styles.mcidNote}>
                  <View style={[styles.legendDot, { backgroundColor: Colors.calmWave }]} />
                  <Text style={styles.mcidNoteText}>
                    Dotted line = MCID target (13-point improvement considered clinically meaningful)
                  </Text>
                </View>
                {/* Highlight if MCID achieved */}
                {assessments.length >= 2 &&
                  assessments[0].totalScore - assessments[assessments.length - 1].totalScore >= 13 && (
                    <View style={styles.mcidAchieved}>
                      <Text style={styles.mcidAchievedText}>
                        You've achieved a clinically meaningful improvement — a reduction of{' '}
                        {Math.round(assessments[0].totalScore - assessments[assessments.length - 1].totalScore)}{' '}
                        points.
                      </Text>
                    </View>
                  )}
              </>
            ) : (
              <Text style={styles.chartEmpty}>
                Complete a week 4 or week 8 retest to see your TFI progress here.
              </Text>
            )}
          </View>
        </PremiumGate>

        {/* ── Trigger patterns (Premium) ────────────────────────────────────── */}
        <SectionLabel label="TRIGGER PATTERNS" />
        <PremiumGate isPremium={isPremium} featureName="Trigger pattern analysis">
          <View style={styles.chartCard}>
            <Text style={styles.chartCardTitle}>Average distress by trigger</Text>
            {triggerStats.length > 0 ? (
              <View style={styles.triggerList}>
                {triggerStats.map((s) => (
                  <View key={s.tag} style={styles.triggerRow}>
                    <Text style={styles.triggerTag}>{s.tag}</Text>
                    <View style={styles.triggerBarTrack}>
                      <View
                        style={[
                          styles.triggerBarFill,
                          { width: `${(s.avgDistress / 10) * 100}%` as any },
                        ]}
                      />
                    </View>
                    <Text style={styles.triggerValue}>{s.avgDistress}</Text>
                    <Text style={styles.triggerCount}>({s.count}×)</Text>
                  </View>
                ))}
                <Text style={styles.triggerNote}>
                  Average distress (0–10) across all logged entries that include each trigger.
                </Text>
              </View>
            ) : (
              <Text style={styles.chartEmpty}>
                Add trigger tags when logging symptoms to see patterns here.
              </Text>
            )}
          </View>
        </PremiumGate>

        {/* ── Clinician PDF export (Premium) ────────────────────────────────── */}
        <SectionLabel label="EXPORT" />
        <PremiumGate isPremium={isPremium} featureName="Clinician PDF export">
          <View style={styles.exportCard}>
            <Text style={styles.exportTitle}>Clinician report</Text>
            <Text style={styles.exportBody}>
              Generate a PDF of your TFI history and symptom log — ready to share
              with your GP, audiologist, or ENT specialist.
            </Text>
            <Pressable
              style={({ pressed }) => [
                styles.exportBtn,
                exportLoading && styles.exportBtnLoading,
                pressed && !exportLoading && styles.exportBtnPressed,
              ]}
              onPress={handleExport}
              disabled={exportLoading}
              accessibilityRole="button"
              accessibilityLabel="Export clinician PDF report"
            >
              {exportLoading ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <Text style={styles.exportBtnLabel}>Export as PDF</Text>
              )}
            </Pressable>
          </View>
        </PremiumGate>

        <Text style={styles.footerDisclaimer}>
          All data is stored privately on this device. Nothing is shared without your consent.
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
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },
  header: { gap: Spacing.xs, marginBottom: Spacing.sm },
  title: { ...Typography.display, color: Colors.darkText },
  subtitle: { ...Typography.body, color: Colors.midGray },

  sectionLabel: {
    ...Typography.micro,
    color: Colors.midGray,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },

  // Log today
  logCard: {
    backgroundColor: Colors.deepTide,
    borderRadius: Radius.card,
    padding: Spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  logCardPressed: { opacity: 0.9 },
  logCardLeft: { flex: 1, gap: 2 },
  logCardTitle: { ...Typography.heading2, color: Colors.white },
  logCardSub: { ...Typography.caption, color: Colors.white + 'BB' },
  logCardLogged: {
    backgroundColor: Colors.white,
    borderWidth: Border.width * 2,
    borderColor: Colors.calmWave,
  },
  logCardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  logCardCheckmark: { ...Typography.body, color: Colors.calmWave, fontWeight: '600' as const },
  logCardTitleLogged: { ...Typography.heading2, color: Colors.darkText },
  logCardSummary: { ...Typography.caption, color: Colors.midGray },
  logCardBadge: {
    backgroundColor: Colors.calmWave,
    borderRadius: Radius.chip,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  logCardBadgeDone: { backgroundColor: Colors.tealLight },
  logCardBadgeText: { ...Typography.micro, color: Colors.white },
  logCardBadgeTextDone: { color: Colors.deepTide },

  // Stats
  statsRow: { flexDirection: 'row', gap: Spacing.md },
  statCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: Radius.card,
    padding: Spacing.base,
    alignItems: 'center',
    gap: Spacing.xs,
    borderWidth: Border.width,
    borderColor: Colors.midGray + '20',
  },
  statValue: { fontSize: 28, fontWeight: '400', color: Colors.deepTide },
  statLabel: { ...Typography.caption, color: Colors.midGray, textAlign: 'center' },

  // TFI card
  tfiCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.card,
    padding: Spacing.base,
    gap: Spacing.md,
    borderWidth: Border.width,
    borderColor: Colors.midGray + '20',
  },
  tfiCardRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  tfiScore: { fontSize: 40, fontWeight: '400', color: Colors.deepTide, lineHeight: 44 },
  tfiScoreOf: { ...Typography.caption, color: Colors.midGray },
  gradeBadge: {
    borderRadius: Radius.chip,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    alignSelf: 'flex-end',
  },
  gradeBadgeText: { ...Typography.micro },
  tfiDate: { ...Typography.caption, color: Colors.midGray },
  tfiEmptyCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.card,
    padding: Spacing.base,
    gap: Spacing.xs,
    borderWidth: Border.width,
    borderColor: Colors.midGray + '20',
    opacity: 0.7,
  },
  tfiEmptyTitle: { ...Typography.heading2, color: Colors.midGray },
  tfiEmptyBody: { ...Typography.body, color: Colors.midGray },

  // Retest prompt
  retestPrompt: {
    backgroundColor: Colors.tealLight,
    borderRadius: Radius.chip,
    padding: Spacing.md,
    gap: Spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: Colors.calmWave,
  },
  retestText: { ...Typography.body, color: Colors.darkText, lineHeight: 22 },
  retestBtn: {
    backgroundColor: Colors.deepTide,
    borderRadius: Radius.chip,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  retestBtnPressed: { opacity: 0.85 },
  retestBtnLabel: { ...Typography.heading2, color: Colors.white },

  // Chart cards (shared)
  chartCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.card,
    padding: Spacing.base,
    gap: Spacing.md,
    borderWidth: Border.width,
    borderColor: Colors.midGray + '20',
  },
  chartCardTitle: { ...Typography.heading2, color: Colors.darkText },
  chartEmpty: {
    ...Typography.body,
    color: Colors.midGray,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: Spacing.xl,
  },

  // Chart legend
  chartLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flexWrap: 'wrap',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { ...Typography.caption, color: Colors.midGray },
  legendScale: { ...Typography.caption, color: Colors.midGray, marginLeft: 'auto' as any },

  // TFI trend labels
  tfiTrendLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xs,
  },
  tfiTrendLabel: { ...Typography.caption, color: Colors.midGray, textAlign: 'center' },
  tfiTrendScore: { ...Typography.body, color: Colors.deepTide, fontWeight: '500' as const },
  mcidNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
    marginTop: -Spacing.xs,
  },
  mcidNoteText: { ...Typography.caption, color: Colors.midGray, flex: 1, lineHeight: 18 },
  mcidAchieved: {
    backgroundColor: Colors.tealLight,
    borderRadius: Radius.chip,
    padding: Spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.calmWave,
  },
  mcidAchievedText: { ...Typography.body, color: Colors.deepTide, lineHeight: 22 },

  // Trigger patterns
  triggerList: { gap: Spacing.sm },
  triggerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  triggerTag: {
    ...Typography.caption,
    color: Colors.darkText,
    width: 72,
    textTransform: 'capitalize',
  },
  triggerBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.midGray + '25',
    borderRadius: 3,
    overflow: 'hidden',
  },
  triggerBarFill: {
    height: '100%',
    backgroundColor: Colors.warmCoral,
    borderRadius: 3,
  },
  triggerValue: { ...Typography.caption, color: Colors.darkText, width: 24, textAlign: 'right' },
  triggerCount: { ...Typography.caption, color: Colors.midGray, width: 32 },
  triggerNote: {
    ...Typography.caption,
    color: Colors.midGray,
    fontStyle: 'italic',
    lineHeight: 18,
    marginTop: Spacing.xs,
  },

  // Export
  exportCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.card,
    padding: Spacing.base,
    gap: Spacing.md,
    borderWidth: Border.width,
    borderColor: Colors.midGray + '20',
  },
  exportTitle: { ...Typography.heading2, color: Colors.darkText },
  exportBody: { ...Typography.body, color: Colors.midGray, lineHeight: 22 },
  exportBtn: {
    backgroundColor: Colors.deepTide,
    borderRadius: Radius.chip,
    paddingVertical: Spacing.base,
    alignItems: 'center',
  },
  exportBtnLoading: { opacity: 0.7 },
  exportBtnPressed: { opacity: 0.85 },
  exportBtnLabel: { ...Typography.heading2, color: Colors.white },

  footerDisclaimer: {
    ...Typography.caption,
    color: Colors.midGray,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: Spacing.md,
  },
});
