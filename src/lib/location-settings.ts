import { Linking, Platform } from "react-native";
/** Native settings links are not supported by browser builds. */
export async function openLocationSettings(): Promise<string | null> {
  if (Platform.OS === "web")
    return "Open your browser’s site permissions, allow location for Navo, then retry GPS.";
  try {
    await Linking.openSettings();
    return null;
  } catch {
    return "Open Navo’s location permission in your device settings, then retry GPS.";
  }
}
