import { Fragment, type ComponentProps } from 'react';
import { useEffect, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { TabIcon } from '@/components/TabIcon';

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

function NavigationIcon({ name, active }: { name: string; active: boolean }) {
  const color = active ? '#10180E' : '#FFFFFF';
  if (name === 'discover' || name === 'profile') {
    return <Svg width={25} height={25} viewBox="0 0 24 24" fill={color}>
      {name === 'discover'
        ? <Path d="M10.1 3.6a3 3 0 0 1 3.8 0l6.1 5a3 3 0 0 1 1.1 2.3V19a2 2 0 0 1-2 2H4.9a2 2 0 0 1-2-2v-8.1A3 3 0 0 1 4 8.6ZM9 17.5a.8.8 0 0 0 0 1.6h6a.8.8 0 0 0 0-1.6Z" />
        : <Path d="M12 2a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9ZM7.3 12a7.4 7.4 0 0 0-3.8 6.5v1A2.5 2.5 0 0 0 6 22h12a2.5 2.5 0 0 0 2.5-2.5v-1a7.4 7.4 0 0 0-3.8-6.5A7 7 0 0 1 12 13.8 7 7 0 0 1 7.3 12Z" />}
    </Svg>;
  }
  if (name === 'ai') return <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"><Path d="M19.5 13.5v3a3 3 0 0 1-3 3H9l-4.5 2v-5.1a7.5 7.5 0 1 1 9-12.4M18 2l1.2 3.8L23 7l-3.8 1.2L18 12l-1.2-3.8L13 7l3.8-1.2Z" /></Svg>;
  return <TabIcon name="compass" color={color} size={26} />;
}

export function BottomNav({ state, descriptors, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardOpen(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardOpen(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  if (keyboardOpen) return null;

  return <View pointerEvents="box-none" style={[styles.dock, { paddingBottom: Math.max(insets.bottom, 12), paddingLeft: Math.max(insets.left, 20), paddingRight: Math.max(insets.right, 20) }]}>
    <View pointerEvents="box-none" style={styles.bar}>
      <View pointerEvents="none" style={styles.middleBackdrop} />
      {state.routes.filter(route => route.name !== 'groups').map((route, index) => {
        const active = state.routes[state.index].key === route.key;
        const { options } = descriptors[route.key];
        return <Fragment key={route.key}>
          {index === 2 && <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.chevrons}>
            <Svg width={46} height={24} viewBox="0 0 46 24" fill="none" stroke="#FFFFFF" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <Path opacity={0.25} d="m5 6 6 6-6 6" />
              <Path opacity={0.5} d="m19 6 6 6-6 6" />
              <Path opacity={0.95} d="m33 6 6 6-6 6" />
            </Svg>
          </View>}
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={options.tabBarAccessibilityLabel ?? options.title ?? route.name}
            testID={options.tabBarButtonTestID}
            onPress={() => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!active && !event.defaultPrevented) navigation.navigate(route.name, route.params);
            }}
            onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
            style={({ pressed }) => [styles.button, width < 360 && styles.compactButton, active && styles.active, pressed && styles.pressed]}
          >
            <NavigationIcon name={route.name} active={active} />
          </Pressable>
        </Fragment>;
      })}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  dock: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingTop: 8, backgroundColor: 'transparent' },
  bar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    alignSelf: 'center', width: '100%', maxWidth: 440, paddingHorizontal: 4, backgroundColor: 'transparent',
  },
  button: {
    width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(154,185,210,0.32)',
  },
  middleBackdrop: { position: 'absolute', left: '22%', right: '22%', top: -7, bottom: -7, borderRadius: 40, backgroundColor: 'rgba(63,96,125,0.36)' },
  compactButton: { width: 48, height: 48, borderRadius: 24 },
  active: { backgroundColor: '#E4FF89' },
  pressed: { opacity: 0.75, transform: [{ scale: 0.96 }] },
  chevrons: { width: 46, alignItems: 'center' },
});
