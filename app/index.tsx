import { Redirect } from 'expo-router';

// Always show the animated launch screen first.
// launch.tsx reads preferences and navigates to the correct destination
// (home tab for returning users, onboarding for new users) after the
// animation completes.
export default function Index() {
  return <Redirect href="/launch" />;
}
