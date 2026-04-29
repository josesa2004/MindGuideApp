import * as Speech from 'expo-speech';
import { useAuthStore } from '../store/authStore';

export function useSpeech() {
  const accessibilityMode = useAuthStore((s) => s.accessibilityMode);
  const isBlind = accessibilityMode === 1;

  const speak = (text: string, options?: Speech.SpeechOptions) => {
    if (!isBlind) return;
    Speech.stop();
    Speech.speak(text, { language: 'pt-PT', rate: 0.95, ...options });
  };

  const stop = () => Speech.stop();

  return { speak, stop, isBlind };
}
