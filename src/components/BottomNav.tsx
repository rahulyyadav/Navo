import { useEffect, useState, type ComponentProps } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';
import { Tabs } from 'expo-router';
import type { BlurViewProps } from 'expo-blur';
import { BottomBackdrop } from '@/components/BottomBackdrop';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { TabIcon } from '@/components/TabIcon';
import { useTheme } from '@/context/ThemeContext';
import { HomePressable } from '@/components/journeys/HomeMotion';

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];
const visibleTabs = ['discover', 'journeys', 'profile'];

function NavigationIcon({ name, active }: { name: string; active: boolean }) {
  const { scheme } = useTheme();
  const color = active ? scheme === 'dark' ? '#111111' : '#FFFFFF' : scheme === 'dark' ? '#77777E' : '#858B90';
  if (name === 'discover') {
    return <Svg width={22} height={22} viewBox="0 0 24 24" fill={active ? color : 'none'} stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <Path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/>
    </Svg>;
  }
  return <TabIcon name={name === 'journeys' ? 'route' : 'person'} color={color} size={22}/>;
}

function NavigationItem({ name, accessibilityLabel, testID, active, onPress, onLongPress }: {
  name: string;
  accessibilityLabel: string;
  testID?: string;
  active: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const selected = useSharedValue(active ? 1 : 0);
  useEffect(() => {
    selected.value = withSpring(active ? 1 : 0, { damping: 20, stiffness: 290, mass: .65, reduceMotion: ReduceMotion.System });
  }, [active, selected]);
  const motion = useAnimatedStyle(() => ({
    transform: [{ translateY: -selected.value }, { scale: .96 + selected.value * .08 }],
  }));
  const selectedIcon = useAnimatedStyle(() => ({ opacity: Math.max(0, Math.min(1, selected.value)) }));
  const unselectedIcon = useAnimatedStyle(() => ({ opacity: 1 - Math.max(0, Math.min(1, selected.value)) }));
  return <HomePressable
    accessibilityRole="tab"
    accessibilityState={{ selected: active }}
    aria-selected={active}
    accessibilityLabel={accessibilityLabel}
    testID={testID}
    onPress={onPress}
    onLongPress={onLongPress}
    style={styles.button}
  >
    <Animated.View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.icon, motion]}>
      <Animated.View style={[styles.glyph, unselectedIcon]}><NavigationIcon name={name} active={false}/></Animated.View>
      <Animated.View style={[styles.glyph, selectedIcon]}><NavigationIcon name={name} active/></Animated.View>
    </Animated.View>
  </HomePressable>;
}

export function BottomNav({ state, descriptors, emitter, navigateToTab, blurTarget }: TabBarProps & { blurTarget?: BlurViewProps['blurTarget'] }) {
  const { scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardOpen(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardOpen(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  const bottomGap = Math.max(insets.bottom - 8, 10);
  if (keyboardOpen) return null;

  return <View pointerEvents="box-none" style={[styles.dock, {
    bottom: bottomGap,
    paddingLeft: Math.max(insets.left, 24),
    paddingRight: Math.max(insets.right, 24),
  }]}>
    <BottomBackdrop bottomGap={bottomGap} blurTarget={blurTarget}/>
    <View style={[styles.bar, scheme === 'dark' && styles.lightBar]}>
      {state.routes.filter(route => visibleTabs.includes(route.name)).map(route => {
        const active = state.routes[state.index].key === route.key;
        const { options } = descriptors[route.key];
        const label = options.title ?? route.name;
        return <NavigationItem
          key={route.key}
          name={route.name}
          accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
          testID={options.tabBarButtonTestID}
          active={active}
          onPress={() => {
            const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!active && !event.defaultPrevented) navigateToTab(route.key);
          }}
          onLongPress={() => emitter.emit({ type: 'tabLongPress', target: route.key })}
        />;
      })}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  dock: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  bar: {
    width: 244, maxWidth: '100%', height: 58, paddingHorizontal: 10,
    flexDirection: 'row', alignItems: 'center', borderRadius: 999,
    backgroundColor: '#111314', borderWidth: 1, borderColor: '#25282A',
    shadowColor: '#101713', shadowOffset: { width: 0, height: 5 },
    shadowOpacity: .16, shadowRadius: 12, elevation: 7,
  },
  lightBar: { backgroundColor: '#FFFFFF', borderColor: '#E5E5E7', shadowColor: '#000000', shadowOpacity: .3 },
  button: { flex: 1, height: 56, minWidth: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 28 },
  icon: { width: 26, height: 26 },
  glyph: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center' },
});
