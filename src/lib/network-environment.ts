import Constants from 'expo-constants';
import { Platform } from 'react-native';
export const networkEnvironment = () => ({ platform: Platform.OS, development: typeof __DEV__ !== 'undefined' && __DEV__, expoHost: Constants.expoConfig?.hostUri });
