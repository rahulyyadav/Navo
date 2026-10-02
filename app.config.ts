import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const plugins = [...(config.plugins ?? [])];
  // The JS Firebase SDK does not require native Google service files.
  // Register the native Google callback only when a real iOS OAuth ID is supplied.
  if (iosClientId?.endsWith('.apps.googleusercontent.com')) {
    plugins.push(['@react-native-google-signin/google-signin', { iosUrlScheme: iosClientId.split('.').reverse().join('.') }]);
  }
  return { ...config, name: config.name ?? 'Navo', slug: config.slug ?? 'navo', plugins };
};
