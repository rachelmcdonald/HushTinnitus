import { useRef, useCallback } from 'react';
import {
  ScrollView, View, Text, Pressable, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Ellipse, Circle } from 'react-native-svg';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Spacing } from '@/src/theme';

const DEEP_TIDE = '#0D4F5C';
const CALM_WAVE = '#5DCAA5';
const WHITE     = '#FFFFFF';

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
  const scrollRef = useRef<ScrollView>(null);

  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, [])
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        ref={scrollRef}
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
        <Text style={styles.heading}>Coming Soon — Premium Features</Text>
        <Text style={styles.subheading}>
          We're launching with all core features completely free. Premium
          features are currently in development and will be available in a
          future update.
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

        {/* Stay tuned — no purchase flow during the free launch period */}
        <Text style={styles.stayTuned}>Stay tuned for updates</Text>
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

  stayTuned: {
    fontSize: 16,
    fontWeight: '500',
    color: CALM_WAVE,
    textAlign: 'center',
    marginTop: 8,
  },
});
