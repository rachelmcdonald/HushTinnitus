import { StyleSheet, Text, View, Pressable, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius, Border } from '@/src/theme';

// ─── Circular photo placeholder ───────────────────────────────────────────────

function PhotoPlaceholder() {
  return <View style={styles.photo} />;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function AboutScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Back navigation */}
        <Pressable
          style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back to Learn"
        >
          <Text style={styles.backLabel}>← Learn</Text>
        </Pressable>

        <Text style={styles.screenTitle}>About Hush Tinnitus</Text>

        {/* Section 1 — The Audiologist */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>The Audiologist</Text>
          <PhotoPlaceholder />
          <Text style={styles.personName}>[Audiologist name] — Registered Audiologist</Text>
          <Text style={styles.body}>
            As someone who has worked with tinnitus patients for [X] years, I saw
            firsthand the gap between what clinical evidence supports and what people
            could actually access day to day. Most patients left the clinic with a
            leaflet and a long waiting list. That's not good enough.
          </Text>
          <Text style={styles.body}>
            Hush Tinnitus was built to bridge that gap — to put evidence-based tinnitus
            self-management in everyone's pocket, not just those who can afford extended
            private care.
          </Text>
        </View>

        {/* Section 2 — The Developer */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>The Developer</Text>
          <PhotoPlaceholder />
          <Text style={styles.personName}>[Developer name] — Software Engineer</Text>
          <Text style={styles.body}>
            Built the technical foundations of Hush Tinnitus using React Native and
            Expo, with AI-assisted development using Anthropic's Claude Code. Every
            feature was designed to the audiologist's clinical specification, ensuring
            the technical implementation remains evidence-aligned from the ground up.
          </Text>
        </View>

        {/* Section 3 — Our Values */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Our Values</Text>
          <View style={styles.valuesList}>
            {[
              'Evidence-based, not wellness-washing',
              'Ethically priced — core features free forever',
              'Built for sufferers, not for profit',
            ].map((value) => (
              <View key={value} style={styles.bulletRow}>
                <View style={styles.bullet} />
                <Text style={styles.bulletText}>{value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Section 4 — Our Mission */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Our Mission</Text>
          <Text style={styles.body}>
            Tinnitus affects roughly one in seven people, yet the current landscape of
            support is fragmented: apps with expensive paywalls that gate the most basic
            features, tools that lack clinical grounding, and no background audio support.
            Meanwhile, waiting lists mean most patients go months without structured
            guidance.
          </Text>
          <Text style={styles.body}>
            Hush Tinnitus exists to change that. We believe the core tools — sound
            therapy, guided breathing, mindfulness, and education — should be accessible
            to everyone. Premium features help sustain the app, but never at the expense
            of the people who need it most.
          </Text>
        </View>

        {/* Medical disclaimer */}
        <View style={styles.disclaimerCard}>
          <Text style={styles.disclaimerTitle}>Medical Disclaimer</Text>
          <Text style={styles.disclaimerText}>
            Hush Tinnitus is not a medical device and does not provide medical advice,
            diagnosis, or treatment. All content is for educational and self-management
            purposes only. If you experience sudden hearing loss, pulsatile tinnitus,
            or tinnitus in one ear only, seek prompt medical assessment. Always consult
            a qualified audiologist or physician for personalised advice. The app's
            content is based on published evidence but does not replace professional
            clinical judgement.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.warmSand },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
    gap: Spacing.xl,
  },

  backBtn: { alignSelf: 'flex-start', paddingVertical: Spacing.sm },
  backBtnPressed: { opacity: 0.6 },
  backLabel: { ...Typography.body, color: Colors.deepTide },

  screenTitle: {
    fontSize: 20,
    fontWeight: '500' as const,
    color: Colors.deepTide,
    letterSpacing: -0.2,
  },

  section: {
    gap: Spacing.md,
    paddingBottom: Spacing.base,
    borderBottomWidth: Border.width,
    borderBottomColor: Colors.calmWave + '33',
  },
  sectionTitle: { ...Typography.heading1, color: Colors.deepTide },

  photo: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.tealLight,
    borderWidth: 2,
    borderColor: Colors.calmWave + '60',
  },
  personName: { ...Typography.heading2, color: Colors.darkText },
  body: { ...Typography.body, color: Colors.midGray, lineHeight: 24 },

  valuesList: { gap: Spacing.sm },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.calmWave,
    marginTop: 8,
    flexShrink: 0,
  },
  bulletText: { ...Typography.body, color: Colors.darkText, flex: 1, lineHeight: 24 },

  disclaimerCard: {
    backgroundColor: Colors.tealLight,
    borderRadius: Radius.card,
    padding: Spacing.base,
    gap: Spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: Colors.calmWave,
  },
  disclaimerTitle: { ...Typography.micro, color: Colors.deepTide },
  disclaimerText: {
    ...Typography.caption,
    color: Colors.midGray,
    lineHeight: 20,
  },
});
