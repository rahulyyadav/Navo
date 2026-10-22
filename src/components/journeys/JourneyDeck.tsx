import { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeInDown, ReduceMotion, runOnJS, useAnimatedProps, useAnimatedStyle, useSharedValue, withRepeat, withSpring, withTiming, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { Text } from '@/components/Typography';
import { useReducedMotion } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';
import { createThemedStyles } from '@/theme/create-styles';
import { tapHaptic } from '@/services/tap-haptics';
import type { PersonalJourney } from '@/services/journeys/types';

const entrance = (delay = 0) => FadeInDown.duration(380).delay(delay).reduceMotion(ReduceMotion.System);
const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

/** Profile-card palette: the glow travels in these colors. */
const ROUTE_COLORS = ['#4D8B9B', '#704C9A', '#BC009F'] as const;
const GLOW_PEAK = '#D33BC0';

function PulseDot({ color, style }: { color: string; style?: object }) {
    const s = useStyles();
    const reduced = useReducedMotion();
    const pulse = useSharedValue(0);
    useEffect(() => {
        if (reduced)
            return;
        pulse.value = withRepeat(withTiming(1, { duration: 1900, reduceMotion: ReduceMotion.System }), -1, false);
    }, [reduced, pulse]);
    const ring = useAnimatedStyle(() => ({ transform: [{ scale: 1 + pulse.value * 1.15 }], opacity: 0.55 * (1 - pulse.value) }));
    return <View pointerEvents="none" style={[s.dotWrap, style]}>
    <Animated.View style={[s.dotRing, { borderColor: color }, ring]}/>
    <View style={[s.dotCore, { backgroundColor: color }]}/>
  </View>;
}

type Pt = { x: number; y: number };

/** Winding trail shape as fractions of the map box — schematic, not geography. */
const WAYPOINTS = (w: number, h: number): Pt[] => [
    { x: w * 0.08, y: h * 0.84 },
    { x: w * 0.22, y: h * 0.56 },
    { x: w * 0.37, y: h * 0.72 },
    { x: w * 0.52, y: h * 0.42 },
    { x: w * 0.65, y: h * 0.55 },
    { x: w * 0.80, y: h * 0.32 },
    { x: w * 0.91, y: h * 0.20 },
];

/** Catmull-Rom smoothed cubic path through the waypoints. */
function curvePath(pts: Pt[]) {
    const r = (n: number) => Math.round(n * 10) / 10;
    let d = `M ${r(pts[0].x)} ${r(pts[0].y)}`;
    for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i - 1] ?? pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] ?? p2;
        const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
        const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
        d += ` C ${r(c1.x)} ${r(c1.y)}, ${r(c2.x)} ${r(c2.y)}, ${r(p2.x)} ${r(p2.y)}`;
    }
    return d;
}

/** Evaluate a point at fraction t (0..1) along the same curve. */
function curvePoint(pts: Pt[], t: number): Pt {
    const n = pts.length - 1;
    const f = Math.min(Math.max(t, 0), 1) * n;
    const i = Math.min(Math.floor(f), n - 1);
    const u = f - i;
    const p0 = pts[i - 1] ?? pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] ?? p2;
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    const v = 1 - u;
    return {
        x: v * v * v * p1.x + 3 * v * v * u * c1.x + 3 * v * u * u * c2.x + u * u * u * p2.x,
        y: v * v * v * p1.y + 3 * v * v * u * c1.y + 3 * v * u * u * c2.y + u * u * u * p2.y,
    };
}

/** Schematic you-are-here → destination line with a slow looping glow in the profile-card theme. */
function RouteGlow({ id, end, here, progress, finished, compact }: {
    id: string;
    end: string;
    here: string;
    progress: number;
    finished: boolean;
    compact?: boolean;
}) {
    const s = useStyles();
    const { palette } = useTheme();
    const reduced = useReducedMotion();
    const [size, setSize] = useState(0);
    const comet = useSharedValue(0.5);
    useEffect(() => {
        if (reduced)
            return;
        comet.value = withRepeat(withTiming(1, { duration: 2800, easing: Easing.inOut(Easing.quad), reduceMotion: ReduceMotion.System }), -1, true);
    }, [reduced, comet]);
    const cometProps = useAnimatedProps(() => ({ gradientTransform: `translate(${(comet.value - 0.5) * 1.1} 0)` }));
    const h = compact ? 150 : 230;
    const pts = size ? WAYPOINTS(size, h) : null;
    const path = pts ? curvePath(pts) : '';
    const dots = pts ? [0.16, 0.37, 0.58, 0.79].map(t => curvePoint(pts, t)) : [];
    const user = pts && !finished ? curvePoint(pts, progress) : null;
    const endPt = pts ? pts[pts.length - 1] : null;
    const startPt = pts ? pts[0] : null;
    return <View style={[s.map, { height: h }]} onLayout={event => setSize(Math.round(event.nativeEvent.layout.width))}>
    {pts && path ? <>
      <Svg width={size} height={h} pointerEvents="none">
        <Defs>
          <LinearGradient id={`route-${id}`} x1="0" y1="1" x2="1" y2="0">
            <Stop offset="0" stopColor={ROUTE_COLORS[0]}/>
            <Stop offset="0.45" stopColor={ROUTE_COLORS[1]}/>
            <Stop offset="1" stopColor={ROUTE_COLORS[2]}/>
          </LinearGradient>
          <AnimatedLinearGradient id={`comet-${id}`} x1="0" y1="0" x2="1" y2="0" animatedProps={cometProps}>
            <Stop offset="0" stopColor={GLOW_PEAK} stopOpacity="0"/>
            <Stop offset="0.5" stopColor={GLOW_PEAK} stopOpacity="1"/>
            <Stop offset="1" stopColor={GLOW_PEAK} stopOpacity="0"/>
          </AnimatedLinearGradient>
        </Defs>
        <Path d={path} stroke={palette.border} strokeWidth={2} strokeDasharray="3 8" fill="none" strokeLinecap="round"/>
        <Path d={path} stroke={`url(#route-${id})`} strokeWidth={2.5} fill="none" strokeLinecap="round"/>
        <Path d={path} stroke={`url(#comet-${id})`} strokeWidth={9} fill="none" strokeLinecap="round" opacity={0.22}/>
        <Path d={path} stroke={`url(#comet-${id})`} strokeWidth={3} fill="none" strokeLinecap="round"/>
        {dots.map((d, i) => <Circle key={i} cx={d.x} cy={d.y} r={2.6} fill={palette.muted} opacity={0.55}/>)}
      </Svg>
      {startPt ? <View pointerEvents="none" style={[s.startDot, { left: startPt.x - 5, top: startPt.y - 5 }]}/> : null}
      {endPt ? <View pointerEvents="none" style={[s.destDot, { left: endPt.x - 7, top: endPt.y - 7 }]}>
        <View style={[s.destDot, s.destRing, { borderColor: GLOW_PEAK }]}/>
        <View style={s.destCore}/>
      </View> : null}
      {user ? <>
        <PulseDot color={palette.green} style={{ left: user.x - 7, top: user.y - 7 }}/>
        <View pointerEvents="none" style={[s.userPill, { left: Math.max(2, Math.min(user.x - 46, size - 94)), top: Math.max(2, user.y - 48) }]}>
          <Text style={s.userEyebrow}>YOU ARE HERE</Text>
          <Text style={s.userName} numberOfLines={1}>{here}</Text>
        </View>
      </> : null}
      <View pointerEvents="none" style={[s.mapLabel, { right: 2, top: 0, alignItems: 'flex-end' }]}>
        <Text style={s.mapEyebrow}>DESTINATION</Text>
        <Text style={[s.mapName, { textAlign: 'right' }]} numberOfLines={1}>{end}</Text>
      </View>
    </> : null}
  </View>;
}

export function JourneyCardFace({ journey: j, activeId, compact }: {
    journey: PersonalJourney;
    activeId: string | null;
    compact?: boolean;
}) {
    const s = useStyles();
    const stages = [...j.approach, ...j.template.legs];
    const legs = stages.length;
    const end = j.template.destination.name || stages[stages.length - 1]?.end.name || j.template.title;
    const done = Math.min(j.completed, legs);
    const here = done >= legs ? end : done === 0 ? j.preferences.origin.name : stages[done].start.name;
    const label = j.phase === 'completed' ? 'COMPLETED' : activeId === j.id ? 'CURRENT JOURNEY' : 'SAVED JOURNEY';
    return <View style={s.face}>
    <Text style={s.eyebrow}>{label}</Text>
    <Text style={s.title} numberOfLines={2}>{j.template.title}</Text>
    <Text style={s.meta}>{j.completed} of {legs} stages complete</Text>
    <RouteGlow id={j.id} end={end} here={here} progress={legs ? done / legs : 0} finished={done >= legs} compact={compact}/>
    <Text style={s.openLink}>Open journey →</Text>
  </View>;
}

function DeckCard({ journey, activeId, index, dx, dy, panHandlers, isTop, onOpen }: {
    journey: PersonalJourney;
    activeId: string | null;
    index: number;
    dx: SharedValue<number>;
    dy: SharedValue<number>;
    panHandlers: object;
    isTop: boolean;
    onOpen: () => void;
}) {
    const slot = useSharedValue(index);
    useEffect(() => { slot.value = withSpring(index, { damping: 19, stiffness: 190, reduceMotion: ReduceMotion.System }); }, [index, slot]);
    const stackStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: slot.value * 16 }, { scale: 1 - slot.value * 0.04 }],
        opacity: 1 - Math.max(0, slot.value - 1) * 0.4,
    }));
    const flyStyle = useAnimatedStyle(() => ({ transform: [{ translateX: dx.value }, { translateY: dy.value }, { rotate: `${dx.value * 0.045}deg` }] }));
    return <Animated.View entering={entrance(60 + index * 90)} style={[StyleSheet.absoluteFill, { zIndex: 20 - index }]}>
    <Animated.View style={[stackStyle, { flex: 1 }]}>
      <Animated.View style={[isTop ? flyStyle : undefined, { flex: 1 }]} {...panHandlers}>
        <Pressable disabled={!isTop} onPress={onOpen} style={{ flex: 1 }}>
          <JourneyCardFace journey={journey} activeId={activeId}/>
        </Pressable>
      </Animated.View>
    </Animated.View>
  </Animated.View>;
}

/** Deck-of-cards journey browser: tap the front card to open it, slide it away to bring the next one forward. */
export function JourneyDeck({ journeys, activeId, onOpen }: {
    journeys: PersonalJourney[];
    activeId: string | null;
    onOpen: (journey: PersonalJourney) => void;
}) {
    const s = useStyles();
    const [order, setOrder] = useState(() => journeys.map(j => j.id));
    const [prevJourneys, setPrevJourneys] = useState(journeys);
    const byId = useMemo(() => new Map(journeys.map(j => [j.id, j])), [journeys]);
    if (prevJourneys !== journeys) {
        setPrevJourneys(journeys);
        const present = new Set(journeys.map(j => j.id));
        setOrder(current => {
            const kept = current.filter(id => present.has(id));
            const added = journeys.filter(j => !current.includes(j.id)).map(j => j.id);
            return added.length === 0 && kept.length === current.length ? current : [...kept, ...added];
        });
    }
    const dx = useSharedValue(0), dy = useSharedValue(0);
    const moved = useRef(false);
    const orderRef = useRef(order);
    const openRef = useRef(onOpen);
    useEffect(() => {
        orderRef.current = order;
        openRef.current = onOpen;
    });
    const rotateRef = useRef(() => {
        setOrder(current => current.length > 1 ? [...current.slice(1), current[0]] : current);
        dx.value = 0;
        dy.value = 0;
        moved.current = false;
    });
    const [responder, setResponder] = useState<ReturnType<typeof PanResponder.create> | null>(null);
    useEffect(() => {
        setResponder(PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy),
        onPanResponderGrant: () => { moved.current = false; },
        onPanResponderMove: (_, g) => {
            if (Math.abs(g.dx) > 6)
                moved.current = true;
            dx.value = g.dx;
            dy.value = g.dy * 0.3;
        },
        onPanResponderRelease: (_, g) => {
            if (orderRef.current.length > 1 && (Math.abs(g.dx) > 110 || Math.abs(g.vx) > 0.45)) {
                const dir = Math.sign(g.dx) || 1;
                dy.value = withTiming(40, { duration: 240 });
                dx.value = withTiming(dir * 520, { duration: 240, reduceMotion: ReduceMotion.System }, finished => {
                    if (finished)
                        runOnJS(rotateRef.current)();
                });
            }
            else {
                dx.value = withSpring(0, { damping: 18, stiffness: 240, reduceMotion: ReduceMotion.System });
                dy.value = withSpring(0, { damping: 18, stiffness: 240 });
                moved.current = false;
            }
        },
        onPanResponderTerminate: () => {
            dx.value = withSpring(0, { damping: 18, stiffness: 240 });
            dy.value = withSpring(0, { damping: 18, stiffness: 240 });
            moved.current = false;
        },
        }));
    }, [dx, dy]);
    return <View style={s.deck}>
    {order.slice(0, 3).map((id, index) => {
            const journey = byId.get(id);
            if (!journey)
                return null;
            return <DeckCard key={id} journey={journey} activeId={activeId} index={index} dx={dx} dy={dy} isTop={index === 0} panHandlers={index === 0 && responder ? responder.panHandlers : {}} onOpen={() => { tapHaptic(); onOpen(journey); }}/>;
        })}
  </View>;
}

const useStyles = createThemedStyles(t => StyleSheet.create({
    deck: { height: 580 },
    face: { flex: 1, backgroundColor: t.elevated, borderWidth: 1, borderColor: t.border, borderRadius: 28, padding: 20, gap: 5, shadowColor: '#101713', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.12, shadowRadius: 24, elevation: 6 },
    eyebrow: { color: t.green, fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
    title: { color: t.ink, fontSize: 24, lineHeight: 30, fontWeight: '800', letterSpacing: -0.8 },
    meta: { color: t.muted, fontSize: 12, lineHeight: 18 },
    openLink: { color: t.green, fontSize: 14, fontWeight: '700', paddingVertical: 2 },
    map: { flex: 1, marginTop: 6 },
    mapLabel: { position: 'absolute', maxWidth: '46%', gap: 1 },
    mapEyebrow: { color: t.muted, fontSize: 9, fontWeight: '700', letterSpacing: 1.4 },
    mapName: { color: t.ink, fontSize: 12, fontWeight: '600' },
    userPill: { position: 'absolute', width: 92, alignItems: 'center', backgroundColor: t.elevated, borderRadius: 9, borderWidth: 1, borderColor: t.border, paddingVertical: 3, paddingHorizontal: 6, shadowColor: '#101713', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 3 },
    userEyebrow: { color: t.green, fontSize: 7.5, fontWeight: '700', letterSpacing: 1.1 },
    userName: { color: t.ink, fontSize: 11, fontWeight: '600' },
    startDot: { position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: t.green, borderWidth: 2, borderColor: t.elevated },
    dotWrap: { position: 'absolute', width: 14, height: 14, alignItems: 'center', justifyContent: 'center' },
    dotRing: { position: 'absolute', width: 22, height: 22, borderRadius: 11, borderWidth: 1.6 },
    dotCore: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: t.elevated },
    destDot: { position: 'absolute', width: 14, height: 14, alignItems: 'center', justifyContent: 'center' },
    destRing: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.4, opacity: 0.6 },
    destCore: { width: 13, height: 13, borderRadius: 7, backgroundColor: GLOW_PEAK, borderWidth: 2.5, borderColor: t.elevated },
}));
