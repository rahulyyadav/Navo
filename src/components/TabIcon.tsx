import Svg, { Circle, Path, type SvgProps } from 'react-native-svg';

type IconName = 'compass' | 'map' | 'group' | 'person' | 'siren' | 'plus' | 'pin' | 'route';

const PATHS: Record<IconName, React.ReactNode> = {
  compass: (
    <>
      <Circle cx={12} cy={12} r={8.6} />
      <Path d="M15.4 8.6 13.4 13.4 8.6 15.4 10.6 10.6Z" />
    </>
  ),
  map: (
    <>
      <Path d="M9 4.4 3.6 6.8v12.8L9 17.2l6 2.4 5.4-2.4V4.4L15 6.8Z" />
      <Path d="M9 4.4v12.8M15 6.8v12.8" />
    </>
  ),
  group: (
    <>
      <Circle cx={9.2} cy={8.4} r={3.1} />
      <Path d="M3.4 19.2c0-3.2 2.6-5.4 5.8-5.4s5.8 2.2 5.8 5.4" />
      <Circle cx={17.4} cy={9.6} r={2.2} />
      <Path d="M16.2 14.2c2.6.2 4.4 2.1 4.4 5" />
    </>
  ),
  person: (
    <>
      <Circle cx={12} cy={8.2} r={3.6} />
      <Path d="M4.8 20c0-3.8 3.2-6.4 7.2-6.4s7.2 2.6 7.2 6.4" />
    </>
  ),
  siren: (
    <>
      <Path d="M6.4 17.4V12a5.6 5.6 0 0 1 11.2 0v5.4" />
      <Path d="M4.4 17.4h15.2M12 3.4v1.8M4.8 6.2l1.3 1.3M19.2 6.2l-1.3 1.3M3.6 20.6h16.8" />
    </>
  ),
  plus: <Path d="M12 5.2v13.6M5.2 12h13.6" />,
  pin: (
    <>
      <Path d="M12 21s6.6-5.6 6.6-10.4A6.6 6.6 0 0 0 5.4 10.6C5.4 15.4 12 21 12 21Z" />
      <Circle cx={12} cy={10.4} r={2.4} />
    </>
  ),
  route: (
    <>
      <Circle cx={6} cy={18} r={2.6} />
      <Circle cx={18} cy={6} r={2.6} />
      <Path d="M8.6 18h5.2a3.4 3.4 0 0 0 0-6.8h-3.6a3.4 3.4 0 0 1 0-6.8h5.2" />
    </>
  ),
};

export function TabIcon({ name, color, size = 24, ...rest }: { name: IconName; color: string; size?: number } & Omit<SvgProps, 'children'>) {
  return (
    <Svg fill="none" height={size} stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} viewBox="0 0 24 24" width={size} {...rest}>
      {PATHS[name]}
    </Svg>
  );
}

export type { IconName };
