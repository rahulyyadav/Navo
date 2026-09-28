import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';

let player: AudioPlayer | null = null;
let pulseTimer: ReturnType<typeof setInterval> | null = null;

// iOS caps app-controlled volume at the user's hardware level, so "full volume"
// means: route to the speaker, ignore the silent switch, and take over other audio.
export async function armLoudAudio() {
  await setAudioModeAsync({
    playsInSilentMode: true,
    interruptionMode: 'doNotMix',
    allowsRecording: false,
    shouldPlayInBackground: false,
  });
}

export async function startAlarm() {
  await armLoudAudio();
  if (!player) {
    player = createAudioPlayer(require('../../assets/navo-siren.wav'));
    player.loop = true;
  }
  player.volume = 1;
  player.seekTo(0);
  player.play();
  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
  if (pulseTimer) clearInterval(pulseTimer);
  pulseTimer = setInterval(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => undefined);
  }, 700);
}

export async function stopAlarm() {
  if (pulseTimer) { clearInterval(pulseTimer); pulseTimer = null; }
  if (!player) return;
  player.pause();
  player.seekTo(0);
}

export async function releaseAlarm() {
  await stopAlarm();
  player?.remove();
  player = null;
}
