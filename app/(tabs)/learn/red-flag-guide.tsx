import { useState, useMemo } from 'react';
import { StyleSheet, Text, View, Pressable, Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { Colors, Spacing, Radius, Border } from '@/src/theme';
import { useTheme } from '@/src/context/ThemeContext';
import ScrollWithIndicator from '@/src/components/ScrollWithIndicator';

// ─── Referral text ────────────────────────────────────────────────────────────
//
// Exact wording follows Section 8.3 of the spec. No clinical language that
// implies diagnosis or alarm. The user can customise before sharing.

const REFERRAL_TEXT = `Dear Doctor,

I have been experiencing tinnitus (a persistent sound in my ears) and would like to discuss some symptoms that I understand are worth a prompt medical check-in.

One or more of the following applies to my situation:
• My tinnitus started suddenly within the last 72 hours
• My tinnitus pulses or beats in time with my heartbeat
• I can only hear the tinnitus in one ear
• I have noticed a change in my hearing alongside the tinnitus
• I have episodes of rotational vertigo (a spinning sensation) alongside my tinnitus

I would welcome a hearing assessment and, if appropriate, a referral to an audiologist or ENT specialist for further evaluation.

Thank you for your time.`;

// ─── Red flag conditions from Section 8.4 ────────────────────────────────────

type Condition = {
  id: string;
  heading: string;
  description: string;
  whyItMatters: string;
  recommendedAction: string;
};

const CONDITIONS: Condition[] = [
  {
    id: 'sudden-onset',
    heading: 'Tinnitus that started suddenly',
    description:
      'Tinnitus that appeared abruptly within the last 72 hours — especially if there was no obvious cause such as a loud noise event.',
    whyItMatters:
      'Sudden-onset tinnitus can occasionally be associated with a sudden change in hearing that is worth assessing promptly. The sooner an audiologist or ENT specialist takes a look, the better the information you will have about what is happening.',
    recommendedAction:
      'See your GP within 24–48 hours and mention that the tinnitus started suddenly. Your GP can arrange an urgent hearing assessment if needed.',
  },
  {
    id: 'pulsatile',
    heading: 'Tinnitus that pulses or beats',
    description:
      'A rhythmic sound that pulses or beats in time with your heartbeat rather than a steady tone, hiss, or ringing.',
    whyItMatters:
      'Pulsatile tinnitus sometimes has a vascular or circulatory origin that a doctor can assess. In most cases there is a straightforward explanation, but it is worth discussing with a healthcare professional to understand what is causing it.',
    recommendedAction:
      'Mention it to your GP at your next appointment, or sooner if you are concerned. Describe the pulsing or beating character of the sound and note whether it matches your heartbeat.',
  },
  {
    id: 'unilateral',
    heading: 'Tinnitus heard in one ear only',
    description:
      'Tinnitus that is clearly one-sided — heard only in the left ear or only in the right ear, particularly if this is new or has changed recently.',
    whyItMatters:
      'One-sided tinnitus is worth discussing with a doctor or audiologist so that your hearing can be assessed on both sides and any asymmetry noted. This is a routine check, not a reason for concern.',
    recommendedAction:
      'Mention it to your GP, particularly if you have not previously had a hearing assessment. They may refer you to an audiologist for a full evaluation.',
  },
  {
    id: 'hearing-loss',
    heading: 'Tinnitus with a sudden change in hearing',
    description:
      'Tinnitus that appeared alongside a noticeable and sudden reduction in hearing ability in one or both ears.',
    whyItMatters:
      'A combined sudden change in hearing and tinnitus is worth a prompt assessment. An audiologist or ENT specialist can determine the nature and extent of any hearing change and discuss the options available.',
    recommendedAction:
      'See your GP promptly — ideally within a few days — and describe both the tinnitus and the hearing change together.',
  },
  {
    id: 'rotational-vertigo',
    heading: 'Rotational Vertigo',
    description:
      'Rotational vertigo — a strong sensation that you or the room around you is spinning — can sometimes occur alongside tinnitus.',
    whyItMatters:
      'When vertigo and tinnitus appear together, particularly if the vertigo comes in episodes lasting minutes to hours, this combination can be associated with conditions affecting the inner ear that are worth discussing with a GP or ENT specialist.',
    recommendedAction:
      'If you experience sudden or severe rotational vertigo alongside your tinnitus, it is worth seeking a professional assessment.',
  },
];

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

function ConditionCard({ condition }: { condition: Condition }) {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.condCard}>
      {/* Accent border is warm coral — used only as a 3px left border, never as background */}
      <View style={styles.condAccent} />

      <View style={styles.condContent}>
        <Pressable
          style={styles.condHeader}
          onPress={() => setExpanded(!expanded)}
          accessibilityRole="button"
          accessibilityLabel={`${condition.heading}. Tap to ${expanded ? 'collapse' : 'expand'}`}
        >
          <Text style={styles.condHeading}>{condition.heading}</Text>
          <Text style={styles.condChevron}>{expanded ? '∧' : '∨'}</Text>
        </Pressable>

        <Text style={styles.condDescription}>{condition.description}</Text>

        {expanded && (
          <>
            <View style={styles.condDivider} />
            <Text style={styles.condSectionLabel}>Why it's worth checking</Text>
            <Text style={styles.condBody}>{condition.whyItMatters}</Text>
            <View style={styles.condActionBox}>
              <Text style={styles.condActionLabel}>Recommended action</Text>
              <Text style={styles.condBody}>{condition.recommendedAction}</Text>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function RedFlagGuideScreen() {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);
  const [copied, setCopied] = useState(false);

  async function handleCopyReferral() {
    try {
      await Clipboard.setStringAsync(REFERRAL_TEXT);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      Alert.alert('Could not copy', 'Please copy the referral text manually.');
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollWithIndicator
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <BackButton />

        <View style={styles.header}>
          <Text style={styles.title}>Red flag guide</Text>
          <Text style={styles.lead}>
            Most tinnitus is not associated with any serious underlying condition.
            There are a small number of situations, however, where it is worth
            getting a prompt assessment from your GP or an ENT specialist. This
            guide explains what to watch for and what to do.
          </Text>
        </View>

        {/* Reassurance banner */}
        <View style={styles.reassurance}>
          <Text style={styles.reassuranceText}>
            If none of these conditions apply to you, there is no cause for
            concern. The tools in this app are designed to support you in
            managing tinnitus as part of everyday life.
          </Text>
        </View>

        {/* Condition cards */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>
            Symptoms worth discussing with a doctor
          </Text>
          {CONDITIONS.map((c) => (
            <ConditionCard key={c.id} condition={c} />
          ))}
        </View>

        {/* Referral text section */}
        <View style={styles.referralSection}>
          <Text style={styles.sectionHeading}>GP referral note</Text>
          <Text style={styles.referralIntro}>
            If any of the conditions above apply, you can copy the following
            text to share with your GP or their receptionist when booking an
            appointment.
          </Text>
          <View style={styles.referralCard}>
            <Text style={styles.referralLabel}>Referral note — tap to copy</Text>
            <Text style={styles.referralText} selectable>
              {REFERRAL_TEXT}
            </Text>
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.copyBtn,
              copied && styles.copyBtnCopied,
              pressed && !copied && styles.copyBtnPressed,
            ]}
            onPress={handleCopyReferral}
            accessibilityRole="button"
            accessibilityLabel={copied ? 'Copied to clipboard' : 'Copy referral text to clipboard'}
          >
            <Text style={[styles.copyBtnLabel, copied && styles.copyBtnLabelCopied]}>
              {copied ? 'Copied ✓' : 'Copy referral text'}
            </Text>
          </Pressable>
        </View>

        {/* Disclaimer per Section 8.3 */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerHeading}>Important note</Text>
          <Text style={styles.disclaimerText}>
            Hush Tinnitus provides self-management tools and educational content
            for people living with tinnitus. It is not a medical device and is not
            intended to diagnose, treat, cure, or prevent tinnitus or any medical
            condition. Always consult a qualified healthcare professional —
            including a GP, audiologist, or ENT specialist — before making changes
            to how you manage your tinnitus. If your tinnitus started suddenly, is
            pulsatile, or is heard only in one ear, seek medical advice promptly.
          </Text>
        </View>

        <Text style={styles.footer}>
          This guide reflects general information based on current clinical
          guidelines. It is not a substitute for professional medical advice.
        </Text>
      </ScrollWithIndicator>
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

    backBtn: { alignSelf: 'flex-start', paddingVertical: Spacing.sm },
    backBtnPressed: { opacity: 0.6 },
    backLabel: { ...typography.body, color: colors.headingAccent },

    header: { gap: Spacing.md },
    title: { ...typography.display, color: colors.textPrimary },
    lead: { ...typography.body, color: colors.textSecondary, lineHeight: 24 },

    // Reassurance banner — warm, neutral colours
    reassurance: {
      backgroundColor: colors.surfaceVariant,
      borderRadius: Radius.card,
      padding: Spacing.base,
      borderLeftWidth: 3,
      borderLeftColor: Colors.calmWave,
    },
    reassuranceText: { ...typography.body, color: colors.headingAccent, lineHeight: 24 },

    section: { gap: Spacing.sm },
    sectionHeading: { ...typography.heading1, color: colors.headingAccent },

    // Condition card — surface background, coral LEFT BORDER communicates red-flag nature
    condCard: {
      backgroundColor: colors.surface,
      borderRadius: Radius.card,
      flexDirection: 'row',
      overflow: 'hidden',
    },
    condAccent: {
      width: 4,
      backgroundColor: Colors.warmCoral,  // accent only, not background
    },
    condContent: {
      flex: 1,
      padding: Spacing.base,
      gap: Spacing.sm,
    },
    condHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: Spacing.sm,
    },
    condHeading: { ...typography.heading2, color: colors.textPrimary, flex: 1 },
    condChevron: { ...typography.body, color: colors.textSecondary, lineHeight: 22 },
    condDescription: { ...typography.body, color: colors.textPrimary, lineHeight: 24 },
    condDivider: {
      height: Border.width,
      backgroundColor: Colors.warmCoral + '30',
    },
    condSectionLabel: { ...typography.micro, color: Colors.warmCoral },
    condBody: { ...typography.body, color: colors.textPrimary, lineHeight: 24 },
    condActionBox: {
      backgroundColor: colors.background + 'BB',
      borderRadius: Radius.chip,
      padding: Spacing.md,
      gap: Spacing.xs,
    },
    condActionLabel: { ...typography.micro, color: colors.headingAccent },

    // Referral section
    referralSection: { gap: Spacing.md },
    referralIntro: { ...typography.body, color: colors.textSecondary, lineHeight: 24 },
    referralCard: {
      backgroundColor: colors.surface,
      borderRadius: Radius.card,
      padding: Spacing.base,
      gap: Spacing.sm,
      borderWidth: Border.width,
      borderColor: Colors.calmWave + '33',
    },
    referralLabel: { ...typography.micro, color: colors.textSecondary },
    referralText: {
      ...typography.body,
      color: colors.textPrimary,
      lineHeight: 24,
      fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    copyBtn: {
      borderWidth: Border.width * 2,
      borderColor: Colors.deepTide,
      borderRadius: Radius.chip,
      paddingVertical: Spacing.sm,
      alignItems: 'center',
    },
    copyBtnCopied: {
      borderColor: Colors.calmWave,
      backgroundColor: colors.surfaceVariant,
    },
    copyBtnPressed: { opacity: 0.7 },
    copyBtnLabel: { ...typography.heading2, color: colors.headingAccent },
    copyBtnLabelCopied: { color: Colors.calmWave },

    // Disclaimer — exact Section 8.3 wording
    disclaimer: {
      backgroundColor: colors.surface,
      borderRadius: Radius.card,
      padding: Spacing.base,
      gap: Spacing.sm,
      borderWidth: Border.width,
      borderColor: Colors.calmWave + '33',
    },
    disclaimerHeading: { ...typography.heading2, color: colors.textPrimary },
    disclaimerText: {
      ...typography.caption,
      color: colors.textSecondary,
      lineHeight: 20,
    },

    footer: {
      ...typography.caption,
      color: colors.textSecondary,
      textAlign: 'center',
      fontStyle: 'italic',
    },
  });
}
