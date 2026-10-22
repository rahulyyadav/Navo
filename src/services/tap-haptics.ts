import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

let lastTap = 0;

/** A brief, native tap response; feedback never delays or blocks the action. */
export function tapHaptic() {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;
  const now = Date.now();
  if (now - lastTap < 70) return;
  lastTap = now;
  const feedback = Platform.OS === 'android'
    ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Virtual_Key)
    : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
  void feedback.catch(() => undefined);
}
