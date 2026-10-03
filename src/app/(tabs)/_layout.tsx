import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TabIcon, type IconName } from '@/components/TabIcon';
import { colors } from '@/theme/tokens';

const TAB_ACTIVE = colors.lime;
const TAB_INACTIVE = 'rgba(255,255,255,0.40)';

function icon(name: IconName) {
  return function TabBarIcon({ focused }: { focused: boolean }) {
    return (
      <View style={styles.iconWrap}>
        <TabIcon color={focused ? TAB_ACTIVE : TAB_INACTIVE} name={name} size={23} />
        {focused ? <View style={styles.dot} /> : null}
      </View>
    );
  };
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.night },
        tabBarActiveTintColor: TAB_ACTIVE,
        tabBarInactiveTintColor: TAB_INACTIVE,
        tabBarLabelStyle: styles.label,
        tabBarStyle: [styles.bar, { height: 62 + Math.max(insets.bottom, 10), paddingBottom: Math.max(insets.bottom, 10) }],
      }}
    >
      <Tabs.Screen name="discover" options={{ tabBarIcon: icon('compass'), title: 'Discover' }} />
      <Tabs.Screen name="map" options={{ tabBarIcon: icon('map'), title: 'Map' }} />
      <Tabs.Screen name="groups" options={{ tabBarIcon: icon('group'), title: 'Groups' }} />
      <Tabs.Screen name="profile" options={{ tabBarIcon: icon('person'), title: 'Profile' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: 'rgba(8,13,18,0.96)',
    borderTopColor: 'rgba(255,255,255,0.08)',
    borderTopWidth: 1,
    paddingTop: 8,
  },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.4 },
  iconWrap: { alignItems: 'center', gap: 4, height: 30, justifyContent: 'center' },
  dot: { backgroundColor: colors.lime, borderRadius: 2, height: 3, width: 3 },
});
