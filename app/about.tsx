import { StyleSheet, Text, View, Pressable, ScrollView, Image } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

const MICHAEL_PHOTO = require('@/assets/images/michael.jpg');
const RACHEL_PHOTO = require('@/assets/images/rachel.jpg');

// ─── Shared sub-components ────────────────────────────────────────────────────

function Divider() {
  return <View style={styles.divider} />;
}

function RoleBadge({ label }: { label: string }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
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

        {/* ── Page header ── */}
        <View style={styles.header}>
          <Text style={styles.pageTitle}>About Hush Tinnitus</Text>
          <Text style={styles.pageSubtitle}>
            Built independently. Grounded in clinical experience.
          </Text>
        </View>

        {/* ── Why We Created This App ── */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Why We Created This App</Text>
          <Text style={styles.body}>
            We created this app because tinnitus support often feels fragmented,
            overwhelming, or inaccessible.
          </Text>
          <Text style={styles.body}>
            Over the years, working with many patients struggling not only with tinnitus
            itself, but with the anxiety, frustration, sleep difficulties, and sense of
            helplessness that can come with it — one thing became clear: how little
            practical day-to-day support people often had outside of appointments.
          </Text>
          <Text style={styles.body}>
            We wanted to build something calmer, simpler, and more genuinely useful —
            something people could actually return to in everyday life.
          </Text>
        </View>

        <Divider />

        {/* ── Meet Michael ── */}
        <View style={styles.section}>
          <View style={styles.personHeader}>
            <Image
              source={MICHAEL_PHOTO}
              style={styles.photo}
              accessibilityLabel="Photo of Michael"
            />
            <Text style={styles.personName}>Michael</Text>
            <Text style={styles.credentials1}>
              BSc Audiology · 11 years clinical experience
            </Text>
            <Text style={styles.credentials2}>
              NHS Scotland · Perth, Western Australia
            </Text>
            <RoleBadge label="Audiologist & Co-founder" />
          </View>
          <Text style={styles.body}>
            I trained and worked within the National Health Service in Scotland for
            around eight years, progressing into a Senior and Specialist Audiologist role
            working in Bone Conduction Hearing Implants and Vestibular Assessment
            services.
          </Text>
          <Text style={styles.body}>
            After moving to Perth, I continued working across private audiology,
            government-funded services, and specialist implant care — including work with
            the Ear Science Institute Australia in Bone Conduction and Cochlear Implant
            services.
          </Text>
        </View>

        <Divider />

        {/* ── Meet Rachel ── */}
        <View style={styles.section}>
          <View style={styles.personHeader}>
            <Image
              source={RACHEL_PHOTO}
              style={styles.photo}
              accessibilityLabel="Photo of Rachel"
            />
            <Text style={styles.personName}>Rachel</Text>
            <RoleBadge label="Developer" />
          </View>
          <Text style={styles.body}>
            Rachel is the software developer who brought the app to life — leading the
            development, design, functionality, and overall user experience. A huge part
            of this project was making sure it didn't feel cold, corporate, or clinical.
          </Text>
        </View>

        <Divider />

        {/* ── Closing ── */}
        <View style={styles.section}>
          <Text style={[styles.body, styles.closing]}>
            This app wasn't created by a large healthcare company or a marketing team.
            It was built independently by the two of us — combining clinical experience
            with thoughtful design and development — because we believed people deserved
            something better.
          </Text>
          <Text style={[styles.body, styles.closing]}>
            We hope it helps you feel more informed, more in control, and a little less
            alone.
          </Text>
        </View>

        {/* ── Medical disclaimer ── */}
        <View style={styles.disclaimerCard}>
          <Text style={styles.disclaimerTitle}>Medical Disclaimer</Text>
          <Text style={styles.disclaimerText}>
            Hush Tinnitus provides self-management tools and educational content for
            people living with tinnitus. It is not a medical device and is not intended
            to diagnose, treat, cure, or prevent tinnitus or any medical condition.
            Always consult a qualified healthcare professional — including a GP,
            audiologist, or ENT specialist — before making changes to how you manage
            your tinnitus. If your tinnitus started suddenly, is pulsatile, or is heard
            only in one ear, seek medical advice promptly.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F1EB' },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    gap: 24,
  },

  backBtn: { alignSelf: 'flex-start', paddingVertical: 8, paddingRight: 8 },
  backBtnPressed: { opacity: 0.6 },
  backLabel: { fontSize: 14, color: '#0D4F5C' },

  header: { alignItems: 'center', gap: 6 },
  pageTitle: {
    fontSize: 20,
    fontWeight: '500' as const,
    color: '#0D4F5C',
    textAlign: 'center',
  },
  pageSubtitle: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },

  divider: {
    height: 0.5,
    backgroundColor: '#5DCAA54D',
  },

  section: { gap: 12 },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: '#0D4F5C',
  },
  body: {
    fontSize: 14,
    color: '#1A2B2B',
    lineHeight: 22,
  },
  closing: { fontStyle: 'italic' },

  // Person header block (centred)
  personHeader: {
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  photo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#5DCAA5',
  },
  photoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E1F5EE',
    borderWidth: 3,
    borderColor: '#5DCAA5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoInitial: {
    fontSize: 28,
    fontWeight: '500' as const,
    color: '#0D4F5C',
  },
  personName: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: '#0D4F5C',
    textAlign: 'center',
  },
  credentials1: {
    fontSize: 12,
    color: '#5DCAA5',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  credentials2: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
  },

  // Role badge
  badge: {
    backgroundColor: '#E1F5EE',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 2,
  },
  badgeText: {
    fontSize: 12,
    color: '#085041',
  },

  // Values
  valueRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  checkmark: {
    fontSize: 14,
    color: '#5DCAA5',
    lineHeight: 22,
  },
  valueText: {
    fontSize: 14,
    color: '#1A2B2B',
    lineHeight: 22,
    flex: 1,
  },

  // Disclaimer
  disclaimerCard: {
    backgroundColor: '#F5F1EB',
    borderRadius: 8,
    padding: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: '#5DCAA533',
  },
  disclaimerTitle: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#666666',
  },
  disclaimerText: {
    fontSize: 11,
    color: '#666666',
    lineHeight: 17,
  },
});
