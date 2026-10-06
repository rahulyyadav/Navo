import { forwardRef } from 'react';
import { Text as NativeText, TextInput as NativeInput, StyleSheet, type TextProps, type TextInputProps, type StyleProp, type TextStyle } from 'react-native';

export const satoshiFonts = {
  SatoshiRegular: require('../../assets/fonts/Satoshi-Regular.otf'),
  SatoshiMedium: require('../../assets/fonts/Satoshi-Medium.otf'),
  SatoshiBold: require('../../assets/fonts/Satoshi-Bold.otf'),
  SatoshiBlack: require('../../assets/fonts/Satoshi-Black.otf'),
  SatoshiItalic: require('../../assets/fonts/Satoshi-Italic.otf'),
};

function typography(style: StyleProp<TextStyle>) {
  const flat = StyleSheet.flatten(style) || {};
  const weight = Number(flat.fontWeight) || (flat.fontWeight === 'bold' ? 700 : 400);
  const fontFamily = flat.fontFamily || (flat.fontStyle === 'italic' ? 'SatoshiItalic' : weight >= 800 ? 'SatoshiBlack' : weight >= 600 ? 'SatoshiBold' : weight >= 500 ? 'SatoshiMedium' : 'SatoshiRegular');
  return [style, { fontFamily, fontWeight: 'normal' as const, fontStyle: 'normal' as const }];
}

export const Text = forwardRef<NativeText, TextProps>(({ style, ...props }, ref) => <NativeText {...props} ref={ref} style={typography(style)} />);
Text.displayName = 'Text';
export type TextInputHandle = NativeInput;
export const TextInput = forwardRef<NativeInput, TextInputProps>(({ style, ...props }, ref) => <NativeInput {...props} ref={ref} style={typography(style)} />);
TextInput.displayName = 'TextInput';
