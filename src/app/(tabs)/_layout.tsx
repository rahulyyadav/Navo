import { useCallback, useRef, useState, type PropsWithChildren, type RefObject } from 'react';
import { Platform, View } from 'react-native';
import { Tabs, useFocusEffect } from 'expo-router';
import { BlurTargetView } from 'expo-blur';

import { BottomNav } from '@/components/BottomNav';
import { useTheme } from '@/context/ThemeContext';

// Android needs an explicit target containing the active screen, excluding the dock.
function BlurScreen({ children, onTarget }: PropsWithChildren<{ onTarget: (target: RefObject<View | null>) => void }>) {
  const target = useRef<View | null>(null);
  useFocusEffect(useCallback(() => { onTarget(target); }, [onTarget]));
  return <BlurTargetView ref={target} style={{ flex: 1 }}>{children}</BlurTargetView>;
}

export default function TabsLayout() {
  const { palette } = useTheme();
  const [blurTarget, setBlurTarget] = useState<RefObject<View | null>>();
  return (
    <Tabs
      tabBar={props => <BottomNav {...props} blurTarget={blurTarget} />}
      screenLayout={Platform.OS === 'android' ? ({ children }) => <BlurScreen onTarget={setBlurTarget}>{children}</BlurScreen> : undefined}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: palette.background },
      }}
    >
      <Tabs.Screen name="discover" options={{ title: 'Home' }} />
      <Tabs.Screen name="journeys" options={{ title: 'Journeys' }} />
      <Tabs.Screen name="ai" options={{ title: 'Ask Navo', href: null }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
