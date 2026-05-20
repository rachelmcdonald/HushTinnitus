import { useState } from 'react';
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
import { Colors, Typography, Spacing, Radius, Border } from '@/src/theme';

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

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.warmSand,
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
    ...Typography.display,
    color: Colors.darkText,
  },
  body: {
    ...Typography.body,
    color: Colors.midGray,
  },

  // Alert card — coralLight background, warmCoral left border accent only
  alertCard: {
    backgroundColor: Colors.coralLight,
    borderRadius: Radius.card,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  alertBorder: {
    width: 4,
    backgroundColor: Colors.warmCoral,
  },
  alertContent: {
    flex: 1,
    padding: Spacing.base,
    gap: Spacing.xs,
  },
  alertLabel: {
    ...Typography.micro,
    color: Colors.warmCoral,
    marginBottom: Spacing.xs,
  },
  alertItem: {
    ...Typography.body,
    color: Colors.darkText,
  },
  alertFootnote: {
    ...Typography.caption,
    color: Colors.midGray,
    marginTop: Spacing.sm,
  },

  // Referral note card
  referralCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.card,
    padding: Spacing.base,
    gap: Spacing.sm,
  },
  referralHeading: {
    ...Typography.heading2,
    color: Colors.darkText,
  },
  referralSubheading: {
    ...Typography.caption,
    color: Colors.midGray,
  },
  referralTextBox: {
    backgroundColor: Colors.warmSand,
    borderRadius: Radius.chip,
    padding: Spacing.md,
    borderWidth: Border.width,
    borderColor: Colors.midGray + '40',
  },
  referralText: {
    ...Typography.body,
    color: Colors.darkText,
    lineHeight: 22,
  },
  copyButton: {
    borderWidth: Border.width * 2,
    borderColor: Colors.deepTide,
    borderRadius: Radius.chip,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  copyButtonCopied: {
    borderColor: Colors.calmWave,
    backgroundColor: Colors.tealLight,
  },
  copyButtonPressed: {
    opacity: 0.7,
  },
  copyLabel: {
    ...Typography.heading2,
    color: Colors.deepTide,
  },
  copyLabelCopied: {
    color: Colors.calmWave,
  },

  // Footer
  footer: {
    gap: Spacing.md,
  },
  reassurance: {
    ...Typography.caption,
    color: Colors.midGray,
    textAlign: 'center',
  },
  continueButton: {
    backgroundColor: Colors.deepTide,
    borderRadius: Radius.chip,
    paddingVertical: Spacing.base,
    alignItems: 'center',
  },
  continueButtonPressed: {
    opacity: 0.85,
  },
  continueLabel: {
    ...Typography.heading2,
    color: Colors.white,
  },
});
