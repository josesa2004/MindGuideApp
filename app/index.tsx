import { Redirect } from 'expo-router';

// Root entry point — _layout.tsx will redirect to /(tabs)/home if already
// authenticated, otherwise this lands on the login screen.
export default function Index() {
  return <Redirect href="/login" />;
}
