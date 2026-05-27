import { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Spacing, Radius, Border } from '@/src/theme';
import { useTheme } from '@/src/context/ThemeContext';

type Params = {
  suddenOnset: string;
  pulsatile: string;
  unilateral: string;
};

function buildConcerns(
  suddenOnset: boolean,
  pulsatile: boolean,
  unilateral: boolean
): string[] {
  const concerns: string[] = [];
  if (suddenOnset)
    concerns.push('my tinnitus started suddenly within the last 72 hours');
  if (pulsatile)
    concerns.push('my tinnitus pulses or beats in time with my heartbeat');
  if (unilateral)
    concerns.push('I can only hear the tinnitus in one ear');
  return concerns;
}

function buildReferralNote(
  suddenOnset: boolean,
  pulsatile: boolean,
  unilateral: boolean
): string {
  const concerns = buildConcerns(suddenOnset, pulsatile, unilateral);
  const concernsText =
    concerns.length > 0
      ? `I have some specific concerns I would like to discuss:\n${concerns.map((c) => `• ${c}`).join('\n')}\n\n`
      : '';

  return (
    `Dear Doctor,\n\n` +
    `I have been experiencing tinnitus (a persistent sound in my ears) and would appreciate the opportunity to discuss it with you.\n\n` +
    concernsText +
    `I would welcome a hearing assessment and, if appropriate, a referral to an audiologist or ENT specialist for further evaluation.\n\n` +
    `Thank you for your time.`
  );
}

export default function UrgentReferralScreen() {
  const params = useLocalSearchParams<Params>();
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);

  const suddenOnset = params.suddenOnset === 'true';
  const pulsatile = params.pulsatile === 'true';
  const unilateral = params.unilateral === 'true';

  const concerns = buildConcerns(suddenOnset, pulsatile, unilateral);
  const referralNote = buildReferralNote(suddenOnset, pulsatile, unilateral);

  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await Clipboard.setStringAsync(referralNote);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  }

  function handleContinue() {
    router.push('/onboarding/tfi-intro');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>
            We recommend speaking with a doctor
          </Text>
          <Text style={styles.body}>
            Based on your answers, it's worth getting your tinnitus checked by
            a GP or ENT specialist soon. This is a precaution — it doesn't
            mean anything is seriously wrong.
          </Text>
        </View>

        {/* Concern summary — coral light bg, warm coral left border accent only */}
        <View style={styles.alertCard}>
          <View style={styles.alertBorder} />
          <View style={styles.alertContent}>
            <Text style={styles.alertLabel}>Your answers flagged</Text>
            {concerns.map((concern, i) => (
              <Text key={i} style={styles.alertItem}>
                · {concern}
              </Text>
            ))}
            <Text style={styles.alertFootnote}>
              An audiologist or ENT specialist can assess these and rule out
              any underlying causes.
            </Text>
          </View>
        </View>

        {/* Referral note */}
        <View style={styles.referralCard}>
          <Text style={styles.referralHeading}>Referral note</Text>
          <Text style={styles.referralSubheading}>
            Copy this to share with your doctor or receptionist.
          </Text>
          <View style={styles.referralTextBox}>
            <Text style={styles.referralText} selectable>
              {referralNote}
            </Text>
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.copyButton,
              copied && styles.copyButtonCopied,
              pressed && !copied && styles.copyButtonPressed,
            ]}
            onPress={handleCopy}
            accessibilityRole="button"
            accessibilityLabel={copied ? 'Copied to clipboard' : 'Copy referral note to clipboard'}
          >
            <Text
              style={[styles.copyLabel, copied && styles.copyLabelCopied]}
            >
              {copied ? 'Copied ✓' : 'Copy to clipboard'}
            </Text>
          </Pressable>
        </View>

        {/* Dismiss */}
        <View style={styles.footer}>
          <Text style={styles.reassurance}>
            You can access all features right now. This app supports tinnitus
            self-management — it is not a substitute for medical advice.
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.continueButton,
              pressed && styles.continueButtonPressed,
            ]}
            onPress={handleContinue}
            accessibilityRole="button"
            accessibilityLabel="Continue to app"
          >
            <Text style={styles.continueLabel}>Continue</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(
  colors: ReturnType<typeof useTheme>['colors'],
  typography: ReturnType<typeof useTheme>['typography'],
) {
  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scroll: {
      flexGrow: 1,
      paddingHorizontal: Spacing.xl,
      paddingTop: Spacing.huge,
      paddingBottom: Spacing.xl,
      gap: Spacing.xl,
    },

    // Header
    header: {
      gap: Spacing.sm,
    },
    title: {
      ...typography.display,
      color: colors.textPrimary,
    },
    body: {
      ...typography.body,
      color: colors.textSecondary,
    },

    // Alert card — coralLight background, warmCoral left border accent only
    alertCard: {
      backgroundColor: colors.coralLight,
      borderRadius: Radius.card,
      flexDirection: 'row',
      overflow: 'hidden',
    },
    alertBorder: {
      width: 4,
      backgroundColor: colors.warmCoral,
    },
    alertContent: {
      flex: 1,
      padding: Spacing.base,
      gap: Spacing.xs,
    },
    alertLabel: {
      ...typography.micro,
      color: colors.warmCoral,
      marginBottom: Spacing.xs,
    },
    alertItem: {
      ...typography.body,
      color: colors.textPrimary,
    },
    alertFootnote: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: Spacing.sm,
    },

    // Referral note card
    referralCard: {
      backgroundColor: colors.surface,
      borderRadius: Radius.card,
      padding: Spacing.base,
      gap: Spacing.sm,
    },
    referralHeading: {
      ...typography.heading2,
      color: colors.textPrimary,
    },
    referralSubheading: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    referralTextBox: {
      backgroundColor: colors.background,
      borderRadius: Radius.chip,
      padding: Spacing.md,
      borderWidth: Border.width,
      borderColor: colors.textSecondary + '40',
    },
    referralText: {
      ...typography.body,
      color: colors.textPrimary,
      lineHeight: 22,
    },
    copyButton: {
      borderWidth: Border.width * 2,
      borderColor: colors.deepTide,
      borderRadius: Radius.chip,
      paddingVertical: Spacing.sm,
      alignItems: 'center',
    },
    copyButtonCopied: {
      borderColor: colors.calmWave,
      backgroundColor: colors.surfaceVariant,
    },
    copyButtonPressed: {
      opacity: 0.7,
    },
    copyLabel: {
      ...typography.heading2,
      color: colors.deepTide,
    },
    copyLabelCopied: {
      color: colors.calmWave,
    },

    // Footer
    footer: {
      gap: Spacing.md,
    },
    reassurance: {
      ...typography.caption,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    continueButton: {
      backgroundColor: colors.deepTide,
      borderRadius: Radius.chip,
      paddingVertical: Spacing.base,
      alignItems: 'center',
    },
    continueButtonPressed: {
      opacity: 0.85,
    },
    continueLabel: {
      ...typography.heading2,
      color: colors.white,
    },
  });
}
