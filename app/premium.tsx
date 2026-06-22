import { useState, useCallback } from 'react';
import {
  ScrollView, View, Text, Pressable, Alert, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Ellipse, Circle } from 'react-native-svg';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, Radius } from '@/src/theme';

const DEEP_TIDE = '#0D4F5C';
const CALM_WAVE = '#5DCAA5';
const WHITE     = '#FFFFFF';
const GRAY      = '#666666';

const FEATURES = [
  '3-source sound mixer',
  'Per-ear volume balance',
  'Full relaxation library',
  'CBT thought journal',
  'Trigger tagging and pattern analysis',
  'CREST progress trend chart',
  'Clinician PDF export',
  'Progress dashboard',
];

export default function PremiumScreen() {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('annual');

  const handleSubscribe = useCallback(() => {
    Alert.alert(
      'Payment processing coming soon',
      'In-app purchases will be available in the next update. Thank you for your patience.',
      [{ text: 'OK' }],
    );
  }, []);

  const handleRestore = useCallback(() => {
    Alert.alert(
      'Restore purchases',
      'No previous purchases found on this device.',
      [{ text: 'OK' }],
    );
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Close */}
        <Pressable
          style={({ pressed }) => [styles.closeBtn, pressed && styles.closeBtnPressed]}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <Ionicons name="close" size={24} color={WHITE} />
        </Pressable>

        {/* Logo mark — drops and ripple icon */}
        <View style={styles.logoWrap}>
          <Svg viewBox="0 0 48 48" width={80} height={80} fill="none" accessibilityLabel="Hush Tinnitus logo">
            <Ellipse cx="24" cy="40" rx="18" ry="5.5" stroke="#5DCAA5" strokeWidth="2" opacity={0.3} fill="none"/>
            <Ellipse cx="24" cy="40" rx="12" ry="3.5" stroke="#5DCAA5" strokeWidth="2.2" opacity={0.55} fill="none"/>
            <Ellipse cx="24" cy="40" rx="6" ry="2" stroke="#5DCAA5" strokeWidth="2.5" opacity={0.9} fill="none"/>
            <Circle cx="24" cy="30" r="4" fill="#5DCAA5"/>
            <Circle cx="24" cy="20" r="3" fill="#5DCAA5" opacity={0.75}/>
            <Circle cx="24" cy="12" r="2" fill="#5DCAA5" opacity={0.5}/>
          </Svg>
        </View>

        {/* Headings */}
        <Text style={styles.heading}>Unlock Hush Premium</Text>
        <Text style={styles.subheading}>
          Support independent development and unlock the full app
        </Text>

        {/* Feature list */}
        <View style={styles.featureList}>
          {FEATURES.map((f) => (
            <View key={f} style={styles.featureRow}>
              <Ionicons name="checkmark" size={16} color={CALM_WAVE} />
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
        </View>

        {/* Pricing cards */}
        <View style={styles.plansRow}>
          {/* Monthly */}
          <Pressable
            style={[styles.planCard, selectedPlan === 'monthly' && styles.planCardSelected]}
            onPress={() => setSelectedPlan('monthly')}
            accessibilityRole="radio"
            accessibilityState={{ selected: selectedPlan === 'monthly' }}
            accessibilityLabel="Monthly plan, AU$8.99 per month"
          >
            <Text style={styles.planLabel}>Monthly</Text>
            <Text style={styles.planPrice}>AU$8.99</Text>
            <Text style={styles.planPer}>per month</Text>
          </Pressable>

          {/* Annual — recommended */}
          <Pressable
            style={[
              styles.planCard,
              styles.planCardAnnual,
              selectedPlan === 'annual' && styles.planCardSelected,
            ]}
            onPress={() => setSelectedPlan('annual')}
            accessibilityRole="radio"
            accessibilityState={{ selected: selectedPlan === 'annual' }}
            accessibilityLabel="Annual plan, AU$59.99 per year, save 44 percent"
          >
            <View style={styles.saveBadge}>
              <Text style={styles.saveBadgeText}>Save 44%</Text>
            </View>
            <Text style={styles.planLabel}>Annual</Text>
            <Text style={styles.planPrice}>AU$59.99</Text>
            <Text style={styles.planPer}>per year</Text>
          </Pressable>
        </View>

        {/* Subscribe */}
        <Pressable
          style={({ pressed }) => [styles.subscribeBtn, pressed && styles.subscribeBtnPressed]}
          onPress={handleSubscribe}
          accessibilityRole="button"
          accessibilityLabel="Get Premium"
        >
          <Text style={styles.subscribeBtnLabel}>Get Premium</Text>
        </Pressable>

        {/* Fine print */}
        <Text style={styles.finePrint}>
          Cancel anytime · Secure payment · No hidden fees
        </Text>

        {/* Restore */}
        <Pressable
          style={({ pressed }) => [styles.restoreBtn, pressed && styles.restoreBtnPressed]}
          onPress={handleRestore}
          accessibilityRole="button"
          accessibilityLabel="Restore purchases"
        >
          <Text style={styles.restoreText}>Restore purchases</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: DEEP_TIDE,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 48,
    alignItems: 'center',
    gap: 20,
  },

  closeBtn: {
    alignSelf: 'flex-end',
    padding: Spacing.sm,
    marginRight: -Spacing.sm,
  },
  closeBtnPressed: { opacity: 0.6 },

  logoWrap: {
    alignItems: 'center',
    marginTop: Spacing.sm,
    marginBottom: 16,
  },

  heading: {
    fontSize: 20,
    fontWeight: '500',
    color: WHITE,
    textAlign: 'center',
    letterSpacing: -0.3,
    marginTop: -4,
  },
  subheading: {
    fontSize: 14,
    color: CALM_WAVE,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 8,
    marginTop: -8,
  },

  featureList: {
    alignSelf: 'stretch',
    gap: 10,
    paddingHorizontal: 4,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureText: {
    fontSize: 14,
    color: WHITE,
    flex: 1,
    lineHeight: 20,
  },

  plansRow: {
    flexDirection: 'row',
    gap: 12,
    alignSelf: 'stretch',
    paddingTop: 16,      // room for the absolute-positioned badge
    alignItems: 'flex-end',
  },

  planCard: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: CALM_WAVE + '50',
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  planCardAnnual: {
    paddingTop: 20,
    paddingBottom: 18,
  },
  planCardSelected: {
    borderColor: CALM_WAVE,
    backgroundColor: 'rgba(93,202,165,0.12)',
  },

  saveBadge: {
    position: 'absolute',
    top: -14,
    alignSelf: 'center',
    backgroundColor: CALM_WAVE,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  saveBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: DEEP_TIDE,
  },

  planLabel: {
    fontSize: 11,
    color: CALM_WAVE,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  planPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: WHITE,
    marginTop: 2,
  },
  planPer: {
    fontSize: 11,
    color: GRAY,
  },

  subscribeBtn: {
    alignSelf: 'stretch',
    backgroundColor: CALM_WAVE,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  subscribeBtnPressed: { opacity: 0.85 },
  subscribeBtnLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: DEEP_TIDE,
  },

  finePrint: {
    fontSize: 11,
    color: GRAY,
    textAlign: 'center',
    marginTop: -8,
  },

  restoreBtn: {
    paddingVertical: 8,
    marginTop: 4,
  },
  restoreBtnPressed: { opacity: 0.6 },
  restoreText: {
    fontSize: 13,
    color: GRAY,
    textAlign: 'center',
  },
});
