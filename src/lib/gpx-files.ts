import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";
import { MAX_GPX_BYTES } from "@/services/routes/gpx";

/** Browser cancel events are not consistently returned by Expo DocumentPicker. */
function pickWebFile(): Promise<globalThis.File | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".gpx,application/gpx+xml";
    input.style.display = "none";
    let settled = false;
    let focusTimer: ReturnType<typeof setTimeout> | undefined;
    const cleanup = () => {
      clearTimeout(timeout);
      clearTimeout(focusTimer);
      window.removeEventListener("focus", focus);
      input.remove();
    };
    const finish = (file: globalThis.File | null) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(file);
    };
    const focus = () => {
      focusTimer = setTimeout(() => finish(input.files?.[0] ?? null), 300);
    };
    const timeout = setTimeout(() => finish(null), 300000);
    input.onchange = () => finish(input.files?.[0] ?? null);
    input.addEventListener("cancel", () => finish(null));
    window.addEventListener("focus", focus);
    document.body.appendChild(input);
    try {
      input.click();
    } catch {
      settled = true;
      cleanup();
      reject(
        new Error("Your browser could not open the file picker. Try again."),
      );
    }
  });
}
export async function pickGPX(): Promise<string | null> {
  if (Platform.OS === "web") {
    const file = await pickWebFile();
    if (!file) return null;
    if (!/\.gpx$/i.test(file.name))
      throw new Error("Choose a file ending in .gpx.");
    if (file.size > MAX_GPX_BYTES)
      throw new Error("Choose a GPX file smaller than 2 MB.");
    return file.text();
  }
  const result = await DocumentPicker.getDocumentAsync({
    type: "*/*",
    multiple: false,
    copyToCacheDirectory: true,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  const file = new File(asset.uri);
  try {
    if (!/\.gpx$/i.test(asset.name))
      throw new Error("Choose a file ending in .gpx.");
    if ((asset.size ?? file.size) > MAX_GPX_BYTES)
      throw new Error("Choose a GPX file smaller than 2 MB.");
    return await file.text();
  } finally {
    try {
      if (file.exists && file.uri.startsWith(Paths.cache.uri)) file.delete();
    } catch {
      /* Cache cleanup must not turn a successful import into a failed one. */
    }
  }
}
export async function shareGPX(xml: string) {
  if (Platform.OS === "web") {
    const url = URL.createObjectURL(
      new Blob([xml], { type: "application/gpx+xml" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "navo-route.gpx";
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    return;
  }
  if (!(await Sharing.isAvailableAsync()))
    throw new Error("File sharing is unavailable on this device.");
  const file = new File(Paths.cache, `navo-route-${Date.now()}.gpx`);
  try {
    file.create();
    file.write(xml);
    await Sharing.shareAsync(file.uri, {
      mimeType: "application/gpx+xml",
      UTI: "public.xml",
    });
  } finally {
    try {
      if (file.exists) file.delete();
    } catch {
      /* Temporary app cache is also managed by the OS. */
    }
  }
}
