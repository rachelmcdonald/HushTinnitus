import { useMemo } from 'react';
import { StyleSheet, Text, View, Pressable, Linking, Alert } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, Radius, Border } from '@/src/theme';
import { useTheme } from '@/src/context/ThemeContext';
import ScrollWithIndicator from '@/src/components/ScrollWithIndicator';

// ─── Citation data ────────────────────────────────────────────────────────────

type Citation = {
  id: string;
  authors: string;
  year: number;
  title: string;
  journal: string;
  details: string;
  relevance: string;
  url: string | null;
  urlLabel: string;
};

type CitationGroup = {
  groupTitle: string;
  citations: Citation[];
};

const CITATION_GROUPS: CitationGroup[] = [
  {
    groupTitle: 'Sound therapy & habituation',
    citations: [
      {
        id: 'jastreboff-1990',
        authors: 'Jastreboff PJ',
        year: 1990,
        title:
          'Phantom auditory perception (tinnitus): mechanisms of generation and perception',
        journal: 'Neuroscience Research',
        details: '8(4), 221–254',
        relevance:
          'Established the neurophysiological model of tinnitus underpinning habituation-based approaches and tinnitus retraining therapy (TRT).',
        url: 'https://pubmed.ncbi.nlm.nih.gov/2175622/',
        urlLabel: 'PubMed',
      },
      {
        id: 'okamoto-2010',
        authors: 'Okamoto H, Stracke H, Stoll W, Pantev C',
        year: 2010,
        title:
          'Listening to tailor-made notched music reduces tinnitus loudness and tinnitus-related auditory cortex activity',
        journal: 'Proceedings of the National Academy of Sciences',
        details: '107(3), 1207–1210',
        relevance:
          'Provided experimental support for notched sound therapy — the basis for the notched therapy feature in this app.',
        url: 'https://doi.org/10.1073/pnas.0911268107',
        urlLabel: 'doi.org',
      },
    ],
  },
  {
    groupTitle: 'CBT & relaxation',
    citations: [
      {
        id: 'henry-wilson-2001',
        authors: 'Henry JL, Wilson PH',
        year: 2001,
        title: 'The Psychological Management of Chronic Tinnitus',
        journal: 'Allyn & Bacon',
        details: 'Book publication',
        relevance:
          'A foundational text describing cognitive behavioural therapy approaches to tinnitus management.',
        url: 'https://scholar.google.com/scholar?q=Henry+Wilson+Psychological+Management+Chronic+Tinnitus+2001',
        urlLabel: 'Google Scholar',
      },
      {
        id: 'jasper-2014',
        authors: 'Jasper K, Weise C, Conrad I, Andersson G, Hiller W, Kleinstäuber M',
        year: 2014,
        title:
          'Internet-based guided self-help versus group cognitive behavioral therapy for chronic tinnitus',
        journal: 'Psychotherapy and Psychosomatics',
        details: '83(4), 234–246',
        relevance:
          'Demonstrated the efficacy of mindfulness-based cognitive therapy and self-guided CBT for tinnitus — the basis for CBT-informed tools in this app.',
        url: 'https://doi.org/10.1159/000360705',
        urlLabel: 'doi.org',
      },
      {
        id: 'erlandsson-1991',
        authors: 'Erlandsson SI, Hallberg LRM, Axelsson A',
        year: 1991,
        title:
          'Psychological and audiological correlates of perceived tinnitus severity',
        journal: 'Audiology',
        details: '30(4), 203–216',
        relevance:
          'Examined psychological factors — including progressive muscle relaxation responses — in tinnitus severity, supporting relaxation-based interventions.',
        url: 'https://pubmed.ncbi.nlm.nih.gov/1910818/',
        urlLabel: 'PubMed',
      },
    ],
  },
  {
    groupTitle: 'Sleep & clinical guidelines',
    citations: [
      {
        id: 'lasisi-2018',
        authors: 'Lasisi AO, Gureje O',
        year: 2018,
        title: 'Sleep disorder in patients with tinnitus',
        journal: 'Journal of Laryngology and Otology',
        details: '132(6), 490–494',
        relevance:
          'Quantified the bidirectional relationship between tinnitus and sleep disturbance, supporting targeted sleep hygiene in tinnitus self-management.',
        url: 'https://doi.org/10.1017/S0022215118000671',
        urlLabel: 'doi.org',
      },
      {
        id: 'nice-2020',
        authors: 'National Institute for Health and Care Excellence',
        year: 2020,
        title: 'Tinnitus: Assessment and Management',
        journal: 'NICE guideline NG155',
        details: 'UK clinical guideline',
        relevance:
          'The current UK gold-standard clinical guideline for tinnitus assessment and management, informing the overall approach of this app.',
        url: 'https://www.nice.org.uk/guidance/ng155',
        urlLabel: 'nice.org.uk',
      },
    ],
  },
];

// ─── Components ───────────────────────────────────────────────────────────────

function BackButton() {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);
  return (
    <Pressable
      style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
      onPress={() => {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/(tabs)');
        }
      }}
      accessibilityRole="button"
      accessibilityLabel="Back to Learn"
    >
      <Text style={styles.backLabel}>← Learn</Text>
    </Pressable>
  );
}

async function openUrl(url: string | null, label: string) {
  if (!url) return;
  try {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Could not open link', `Visit ${label} to access this reference.`);
    }
  } catch {
    Alert.alert('Could not open link', `Visit ${label} to access this reference.`);
  }
}

function CitationCard({ citation }: { citation: Citation }) {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);
  return (
    <View style={styles.card}>
      <View style={styles.cardMeta}>
        <Text style={styles.cardAuthors}>{citation.authors}</Text>
        <Text style={styles.cardYear}>{citation.year}</Text>
      </View>
      <Text style={styles.cardTitle}>{citation.title}</Text>
      <Text style={styles.cardJournal}>
        <Text style={styles.cardJournalItalic}>{citation.journal}</Text>
        {citation.details ? `. ${citation.details}.` : '.'}
      </Text>
      <Text style={styles.cardRelevance}>{citation.relevance}</Text>
      {citation.url && (
        <Pressable
          style={({ pressed }) => [styles.linkBtn, pressed && styles.linkBtnPressed]}
          onPress={() => openUrl(citation.url, citation.urlLabel)}
          accessibilityRole="link"
          accessibilityLabel={`View source for ${citation.title}`}
        >
          <Text style={styles.linkBtnText}>View source — {citation.urlLabel}</Text>
          <Text style={styles.linkBtnArrow}> ↗</Text>
        </Pressable>
      )}
    </View>
  );
}

function GroupSection({ group }: { group: CitationGroup }) {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);
  return (
    <View style={styles.group}>
      <View style={styles.groupHeader}>
        <Text style={styles.groupTitle}>{group.groupTitle}</Text>
        <Text style={styles.groupCount}>
          {group.citations.length} {group.citations.length === 1 ? 'reference' : 'references'}
        </Text>
      </View>
      {group.citations.map((c) => (
        <CitationCard key={c.id} citation={c} />
      ))}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function EvidenceCitationsScreen() {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);

  const total = CITATION_GROUPS.reduce((n, g) => n + g.citations.length, 0);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollWithIndicator
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <BackButton />

        <View style={styles.header}>
          <Text style={styles.title}>Evidence citations</Text>
          <Text style={styles.lead}>
            Hush Tinnitus is grounded in {total} peer-reviewed sources. Each
            feature and recommendation in the app has a corresponding evidence
            base listed here.
          </Text>
          <View style={styles.disclaimer}>
            <Text style={styles.disclaimerText}>
              Links open in your browser. Internet access is required to view
              external sources.
            </Text>
          </View>
        </View>

        {CITATION_GROUPS.map((group) => (
          <GroupSection key={group.groupTitle} group={group} />
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            This app does not claim to diagnose, treat, or cure any medical
            condition. The references above describe the approaches on which
            its self-management tools are based. Always consult a qualified
            healthcare professional for clinical assessment.
          </Text>
        </View>
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

    backBtn:        { alignSelf: 'flex-start', paddingVertical: Spacing.sm, paddingRight: Spacing.sm },
    backBtnPressed: { opacity: 0.6 },
    backLabel:      { ...typography.body, color: colors.headingAccent },

    header: { gap: Spacing.md },
    title:  { ...typography.display, color: colors.textPrimary },
    lead:   { ...typography.body, color: colors.textSecondary, lineHeight: 24 },
    disclaimer: {
      backgroundColor: colors.surfaceVariant,
      borderRadius: Radius.chip,
      padding: Spacing.sm,
    },
    disclaimerText: { ...typography.caption, color: colors.headingAccent },

    group: { gap: Spacing.sm },
    groupHeader: {
      flexDirection: 'column',
      paddingHorizontal: Spacing.xs,
    },
    groupTitle: { ...typography.heading1, color: colors.headingAccent },
    groupCount: { fontSize: 12, color: colors.textSecondary, marginBottom: 8 },

    card: {
      backgroundColor: colors.surface,
      borderRadius: Radius.card,
      padding: Spacing.base,
      gap: Spacing.sm,
      borderTopWidth: 3,
      borderTopColor: Colors.calmWave,
    },
    cardMeta: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: Spacing.sm,
    },
    cardAuthors: {
      ...typography.caption,
      color: colors.textSecondary,
      flex: 1,
      lineHeight: 18,
    },
    cardYear: {
      ...typography.caption,
      color: colors.headingAccent,
      fontWeight: '600',
      flexShrink: 0,
    },
    cardTitle: {
      ...typography.heading2,
      color: colors.textPrimary,
      lineHeight: 22,
    },
    cardJournal: {
      ...typography.caption,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    cardJournalItalic: { fontStyle: 'italic' },
    cardRelevance: {
      ...typography.caption,
      color: colors.textPrimary,
      lineHeight: 18,
      borderTopWidth: Border.width,
      borderTopColor: Colors.calmWave + '33',
      paddingTop: Spacing.sm,
    },

    linkBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      backgroundColor: colors.surfaceVariant,
      borderRadius: Radius.chip,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs,
    },
    linkBtnPressed: { opacity: 0.7 },
    linkBtnText:    { ...typography.micro, color: colors.headingAccent },
    linkBtnArrow:   { ...typography.micro, color: colors.headingAccent },

    footer: {
      borderTopWidth: Border.width,
      borderTopColor: Colors.calmWave + '33',
      paddingTop: Spacing.md,
    },
    footerText: {
      ...typography.caption,
      color: colors.textSecondary,
      textAlign: 'center',
      fontStyle: 'italic',
      lineHeight: 18,
    },
  });
}
