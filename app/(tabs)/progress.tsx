import PlaceholderScreen from '@/src/components/PlaceholderScreen';
import { Colors } from '@/src/theme';

export default function ProgressScreen() {
  return (
    <PlaceholderScreen
      title="Progress"
      description="Daily symptom log, TFI history and trend, trigger pattern analysis, clinician PDF export."
      accentColor={Colors.softGold}
    />
  );
}
