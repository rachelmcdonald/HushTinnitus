import { StyleSheet, Text, View, Pressable, SafeAreaView, ScrollView } from 'react-native';
import { useAudioPlayback } from '@/src/hooks/useAudioPlayback';
import { NoiseType } from '@/src/audio/AudioEngine';
import { Colors, Typography, Spacing, Radius, Border } from '@/src/theme';

// ─── Sound definitions ────────────────────────────────────────────────────────

type SoundDefinition = {
  id: NoiseType;
  name: string;
  description: string;
};

const NOISE_SOUNDS: SoundDefinition[] = [
  {
    id: 'white',
    name: 'White noise',
    description: 'Constant broadband sound with equal energy at every frequency. Effective for masking environmental sounds.',
  },
  {
    id: 'pink',
    name: 'Pink noise',
    description: 'Softer and warmer than white noise, with more energy in lower frequencies. Often described as soothing.',
  },
  {
    id: 'brown',
    name: 'Brown noise',
    description: 'Deep, low-rumble sound modelled on Brownian motion. Gentler on the ears for extended listening sessions.',
  },
];

// ─── Now playing banner ───────────────────────────────────────────────────────

function NowPlayingBanner({ name }: { name: string }) {
  return (
    <View style={banner.container}>
      <View style={banner.dot} />
      <Text style={banner.text}>Now playing — {name}</Text>
    </View>
  );
}

const banner = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.deepTide,
    borderRadius: Radius.chip,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.calmWave,
  },
  text: {
    ...Typography.caption,
    color: Colors.white,
  },
});

// ─── Sound card ───────────────────────────────────────────────────────────────

type SoundCardProps = {
  sound: SoundDefinition;
  isActive: boolean;
  onPress: () => void;
};

function SoundCard({ sound, isActive, onPress }: SoundCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        card.container,
        isActive && card.containerActive,
        pressed && !isActive && card.containerPressed,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${sound.name}${isActive ? ', currently playing, tap to stop' : ', tap to play'}`}
      accessibilityState={{ selected: isActive }}
    >
      <View style={card.content}>
        <Text style={[card.name, isActive && card.nameActive]}>
          {sound.name}
        </Text>
        <Text style={[card.description, isActive && card.descriptionActive]}>
          {sound.description}
        </Text>
      </View>

      <View style={[card.iconWell, isActive && card.iconWellActive]}>
        {isActive ? (
          // Stop icon — two vertical bars
          <View style={card.stopIcon}>
            <View style={[card.stopBar, card.stopBarActive]} />
            <View style={[card.stopBar, card.stopBarActive]} />
          </View>
        ) : (
          // Play icon — triangle
          <View style={card.playTriangle} />
        )}
      </View>
    </Pressable>
  );
}

const card = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderRadius: Radius.card,
    padding: Spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  containerActive: {
    backgroundColor: Colors.deepTide,
  },
  containerPressed: {
    opacity: 0.85,
  },
  content: {
    flex: 1,
    gap: 4,
  },
  name: {
    ...Typography.heading2,
    color: Colors.darkText,
  },
  nameActive: {
    color: Colors.white,
  },
  description: {
    ...Typography.body,
    color: Colors.midGray,
  },
  descriptionActive: {
    color: Colors.calmWave,
  },

  // Play/stop icon well
  iconWell: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.tealLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconWellActive: {
    backgroundColor: Colors.calmWave + '30',
  },

  // Play icon — triangle drawn with borders
  playTriangle: {
    width: 0,
    height: 0,
    borderTopWidth: 7,
    borderBottomWidth: 7,
    borderLeftWidth: 12,
    borderTopColor: Colors.transparent,
    borderBottomColor: Colors.transparent,
    borderLeftColor: Colors.deepTide,
    marginLeft: 3, // optical centre adjustment
  },

  // Stop icon — two vertical bars
  stopIcon: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  stopBar: {
    width: 3,
    height: 14,
    borderRadius: 2,
    backgroundColor: Colors.midGray,
  },
  stopBarActive: {
    backgroundColor: Colors.calmWave,
  },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function SoundScreen() {
  const { currentNoise, isPlaying, toggle } = useAudioPlayback();

  const activeSound = NOISE_SOUNDS.find((s) => s.id === currentNoise);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Sound</Text>
          {isPlaying && activeSound && (
            <NowPlayingBanner name={activeSound.name} />
          )}
        </View>

        {/* Background noise section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Background noise</Text>
          <View style={styles.cardList}>
            {NOISE_SOUNDS.map((sound) => (
              <SoundCard
                key={sound.id}
                sound={sound}
                isActive={currentNoise === sound.id}
                onPress={() => toggle(sound.id)}
              />
            ))}
          </View>
        </View>

        {/* Placeholder rows for future sound types */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Nature sounds</Text>
          <View style={[styles.comingSoon]}>
            <Text style={styles.comingSoonText}>
              Rain, ocean, stream, forest and more — coming in Phase 3
            </Text>
          </View>
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
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
    gap: Spacing.xl,
  },

  // Header
  header: {
    gap: Spacing.md,
  },
  title: {
    ...Typography.display,
    color: Colors.darkText,
  },

  // Sections
  section: {
    gap: Spacing.md,
  },
  sectionLabel: {
    ...Typography.micro,
    color: Colors.midGray,
  },
  cardList: {
    gap: Spacing.sm,
  },

  // Coming soon placeholder
  comingSoon: {
    backgroundColor: Colors.white,
    borderRadius: Radius.card,
    padding: Spacing.base,
    borderWidth: Border.width,
    borderColor: Colors.midGray + '40',
    borderStyle: 'dashed',
  },
  comingSoonText: {
    ...Typography.body,
    color: Colors.midGray,
    textAlign: 'center',
  },
});
