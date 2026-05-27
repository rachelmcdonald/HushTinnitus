import { useMemo } from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { G, Rect, Text as SvgText, Line, Polygon, Path } from 'react-native-svg';
import { Spacing, Radius, Border } from '@/src/theme';
import { useTheme } from '@/src/context/ThemeContext';

// ─── Loop diagram ─────────────────────────────────────────────────────────────
//
// Shows the self-reinforcing cycle in a vertical flow with a dashed return
// arrow on the right side connecting Node 4 back to Node 2 (Attention).
//
//   ┌──────────────────┐
//   │  Tinnitus sound   │
//   └────────┬─────────┘
//            ↓
//   ┌──────────────────┐          ↑
//   │    Attention      │ ←── (dashed return)
//   └────────┬─────────┘          │
//            ↓                    │
//   ┌──────────────────┐          │
//   │  Threat response  │          │
//   └────────┬─────────┘          │
//            ↓                    │
//   ┌──────────────────┐          │
//   │ Amplified percep. │──────────┘
//   └──────────────────┘

// Use a fixed viewBox so Android canvas size is always predictable.
// The SVG element gets an explicit pixel width derived from the window.
const WINDOW_W = Dimensions.get('window').width;
const SVG_PADDING = Spacing.xl * 2 + Spacing.base * 2; // scroll + card padding

const D_W = 280;         // SVG viewBox width
const NODE_W = 194;      // node rectangle width
const NODE_H = 48;       // node rectangle height
const NODE_X = (D_W - NODE_W) / 2;  // 43 — left edge of nodes
const GAP = 30;          // vertical gap between nodes
const STEP = NODE_H + GAP;           // 78 — distance between node tops

// Y-positions of each node's top edge
const N0_Y = 0;
const N1_Y = STEP;       // 78
const N2_Y = STEP * 2;   // 156
const N3_Y = STEP * 3;   // 234

const MID_X = D_W / 2;  // 140 — horizontal centre
const RIGHT_EDGE = NODE_X + NODE_W;  // 237

// Total height with a little padding at the bottom
const D_H = N3_Y + NODE_H + 16;  // 298

// Pixel dimensions for the SVG element — explicit values prevent Android from
// misinterpreting "100%" as a huge number when computing the canvas allocation.
const SVG_PX_W = Math.min(WINDOW_W - SVG_PADDING, D_W);
const SVG_PX_H = Math.round(SVG_PX_W * (D_H / D_W));

// ─── Downward arrowhead (tip pointing down) ───────────────────────────────────
//   tip at (cx, yTip)
function DownArrow({ cx, yTip, arrowColor }: { cx: number; yTip: number; arrowColor: string }) {
  return (
    <>
      <Line
        x1={cx}
        y1={yTip - GAP}
        x2={cx}
        y2={yTip - 10}
        stroke={arrowColor}
        strokeWidth={2}
      />
      <Polygon
        points={`${cx - 6},${yTip - 10} ${cx + 6},${yTip - 10} ${cx},${yTip}`}
        fill={arrowColor}
      />
    </>
  );
}

function LoopDiagram() {
  const { colors } = useTheme();

  // Colors moved inside component for theme reactivity
  const NODE_FILL = colors.calmWave;
  const NODE_TEXT = colors.deepTide;
  const ARROW_COL = colors.deepTide;

  const diagramStyles = useMemo(() => StyleSheet.create({
    container: {
      backgroundColor: colors.surfaceVariant,
      borderRadius: Radius.card,
      padding: Spacing.base,
      alignItems: 'center',
    },
    svgWrapper: {
      width: SVG_PX_W,
      height: SVG_PX_H,
      overflow: 'hidden',
    },
  }), [colors]);

  const nodes = [
    'Tinnitus sound',
    'Attention',
    'Threat response',
    'Amplified perception',
  ];

  const nodeYs = [N0_Y, N1_Y, N2_Y, N3_Y];

  // Return arrow path (right side, dashed):
  // Right-centre of Node 3 → bend right → go up → bend left → right-centre of Node 1
  const n3MidY = N3_Y + NODE_H / 2;   // 258
  const n1MidY = N1_Y + NODE_H / 2;   // 102
  const bendX = D_W - 8;              // 272

  const returnPath = `M ${RIGHT_EDGE},${n3MidY} L ${bendX},${n3MidY} L ${bendX},${n1MidY} L ${RIGHT_EDGE + 8},${n1MidY}`;

  return (
    <View style={diagramStyles.container}>
      <View style={diagramStyles.svgWrapper}>
        <Svg
          width={SVG_PX_W}
          height={SVG_PX_H}
          viewBox={`0 0 ${D_W} ${D_H}`}
          preserveAspectRatio="xMidYMid meet"
          accessibilityLabel="The tinnitus neurological loop diagram"
        >
        {/* ── Nodes ── */}
        {nodes.map((label, i) => (
          <G key={`node-${i}`}>
            <Rect
              x={NODE_X}
              y={nodeYs[i]}
              width={NODE_W}
              height={NODE_H}
              rx={8}
              fill={NODE_FILL}
            />
            <SvgText
              x={MID_X}
              y={nodeYs[i] + NODE_H / 2 + 5}
              textAnchor="middle"
              fill={NODE_TEXT}
              fontSize={13}
              fontWeight="600"
            >
              {label}
            </SvgText>
          </G>
        ))}

        {/* ── Downward arrows (0→1, 1→2, 2→3) ── */}
        {[N1_Y, N2_Y, N3_Y].map((yTip) => (
          <DownArrow key={`arr-${yTip}`} cx={MID_X} yTip={yTip} arrowColor={ARROW_COL} />
        ))}

        {/* ── Return arrow: Amplified perception → Attention (dashed) ── */}
        <Path
          d={returnPath}
          stroke={ARROW_COL}
          strokeWidth={2}
          strokeDasharray="5,4"
          fill="none"
        />
        {/* Arrowhead pointing left at Node 1 right edge */}
        <Polygon
          points={`${RIGHT_EDGE},${n1MidY} ${RIGHT_EDGE + 11},${n1MidY - 6} ${RIGHT_EDGE + 11},${n1MidY + 6}`}
          fill={ARROW_COL}
        />

        {/* ── "cycle" label on the return arrow (right side, rotated) ── */}
        <SvgText
          x={bendX + 4}
          y={(n3MidY + n1MidY) / 2}
          textAnchor="middle"
          fill={colors.textSecondary}
          fontSize={9}
          transform={`rotate(90, ${bendX + 4}, ${(n3MidY + n1MidY) / 2})`}
        >
          cycle repeats
        </SvgText>
        </Svg>
      </View>
    </View>
  );
}

// ─── Reusable content components ─────────────────────────────────────────────

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

function Body({ children }: { children: React.ReactNode }) {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);
  return <Text style={styles.body}>{children}</Text>;
}

function NodeExplanation({
  label,
  children,
}: {
  label: string;
  children: string;
}) {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);

  return (
    <View style={styles.nodeRow}>
      <View style={styles.nodeBadge}>
        <Text style={styles.nodeBadgeText}>{label}</Text>
      </View>
      <Text style={[styles.body, styles.nodeBody]}>{children}</Text>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function NeurologicalLoopScreen() {
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
          <Text style={styles.title}>The neurological loop</Text>
          <Text style={styles.lead}>
            Tinnitus does not travel in a straight line from ear to brain. It
            passes through systems that determine how loud, intrusive, or
            distressing it feels — and those systems can be influenced.
          </Text>
        </View>

        {/* Diagram */}
        <LoopDiagram />

        {/* Node-by-node explanation */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>How the loop works</Text>

          <NodeExplanation label="Tinnitus sound">
            The auditory system generates the tinnitus signal and passes it
            onward for processing. At this stage the signal has no emotional
            meaning — that comes from what happens next.
          </NodeExplanation>

          <NodeExplanation label="Attention">
            If the brain has previously identified the sound as significant, it
            directs attentional resources toward it. The more attention focused
            on any signal, the more prominent it becomes in conscious
            experience. Monitoring for tinnitus amplifies it.
          </NodeExplanation>

          <NodeExplanation label="Threat response">
            The limbic system — the brain's emotional processing centre —
            assesses whether the signal requires action. When tinnitus has been
            associated with worry, poor sleep, or distress, the limbic system
            classifies it as a threat and triggers a stress response: elevated
            arousal, heightened sensitivity, and increased vigilance.
          </NodeExplanation>

          <NodeExplanation label="Amplified perception">
            The heightened arousal state makes the sound seem louder and harder
            to ignore. This sends the signal back through the attention system —
            the dashed arrow in the diagram — reinforcing the cycle.
          </NodeExplanation>
        </View>

        {/* Why this matters */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Why this matters</Text>
          <Body>
            This loop is not a flaw. It is the brain doing exactly what it is
            built to do: monitoring for potential threats and keeping you
            informed. The challenge is that the system can mistakenly classify
            tinnitus as a threat that requires constant attention.
          </Body>
          <Body>
            The loop also runs in reverse. When the brain learns — through
            experience and practice — that the tinnitus signal is safe and
            unimportant, the limbic response fades. Attention is no longer
            redirected to the sound. Over time, the signal loses its
            prominence. This is the mechanism behind habituation.
          </Body>
        </View>

        {/* What helps */}
        <View style={styles.highlightCard}>
          <Text style={styles.highlightHeading}>Interrupting the cycle</Text>
          <Text style={styles.highlightBody}>
            Sound enrichment reduces silence — one of the main conditions that
            drives the attention loop. Relaxation techniques reduce the arousal
            state that makes the sound feel threatening. Psychoeducation (like
            this section) helps the brain reclassify the signal as non-threatening.
            These approaches work on the loop at different entry points.
          </Text>
        </View>

        {/* Evidence note */}
        <View style={styles.citation}>
          <Text style={styles.citationLabel}>Evidence note</Text>
          <Text style={styles.citationText}>
            Jastreboff PJ (1990). Phantom auditory perception (tinnitus):
            mechanisms of generation and perception.{' '}
            <Text style={styles.citationItalic}>Neuroscience Research</Text>,
            8(4), 221–254.
          </Text>
          <Text style={styles.citationNote}>
            The neurophysiological model describes how the limbic and autonomic
            nervous systems interact with tinnitus perception, forming the
            theoretical basis for habituation-focused approaches.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            This content is for educational purposes. It is not a substitute
            for advice from a qualified healthcare professional.
          </Text>
        </View>
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

    backBtn: { alignSelf: 'flex-start', paddingVertical: Spacing.sm, paddingRight: Spacing.sm },
    backBtnPressed: { opacity: 0.6 },
    backLabel: { ...typography.body, color: colors.deepTide },

    header: { gap: Spacing.md },
    title: { ...typography.display, color: colors.textPrimary },
    lead: { ...typography.body, color: colors.textSecondary, lineHeight: 24 },

    section: { gap: Spacing.md },
    sectionHeading: { ...typography.heading1, color: colors.deepTide },
    body: { ...typography.body, color: colors.textPrimary, lineHeight: 24 },

    // Node explanation rows
    nodeRow: { gap: Spacing.sm },
    nodeBadge: {
      alignSelf: 'flex-start',
      backgroundColor: colors.calmWave,
      borderRadius: Radius.chip,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs,
    },
    nodeBadgeText: { ...typography.micro, color: colors.deepTide },
    nodeBody: { paddingLeft: Spacing.xs },

    // Highlight card
    highlightCard: {
      backgroundColor: colors.background,
      borderRadius: Radius.card,
      padding: Spacing.base,
      gap: Spacing.sm,
      borderLeftWidth: 3,
      borderLeftColor: colors.calmWave,
    },
    highlightHeading: { ...typography.heading2, color: colors.deepTide },
    highlightBody: { ...typography.body, color: colors.textPrimary, lineHeight: 24 },

    // Citation
    citation: {
      backgroundColor: colors.surfaceVariant,
      borderRadius: Radius.card,
      padding: Spacing.base,
      gap: Spacing.sm,
      borderLeftWidth: 3,
      borderLeftColor: colors.calmWave,
    },
    citationLabel: { ...typography.micro, color: colors.deepTide },
    citationText: { ...typography.caption, color: colors.textPrimary, lineHeight: 20 },
    citationItalic: { fontStyle: 'italic' },
    citationNote: { ...typography.caption, color: colors.textSecondary, lineHeight: 18 },

    footer: {
      borderTopWidth: Border.width,
      borderTopColor: colors.calmWave + '33',
      paddingTop: Spacing.md,
    },
    footerText: {
      ...typography.caption,
      color: colors.textSecondary,
      textAlign: 'center',
      fontStyle: 'italic',
    },
  });
}
