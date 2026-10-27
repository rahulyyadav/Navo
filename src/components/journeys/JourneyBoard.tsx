import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, LinearTransition, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { Text } from '@/components/Typography';
import { useReducedMotion } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';
import { optionDurationLabel, checkpointLabel, stageAttention, selectedOption, type JourneyLeg } from '@/services/journeys/types';
import { createThemedStyles } from '@/theme/create-styles';
import { HomePressable } from './HomeMotion';
import { useJourneyStyles } from './journey-styles';

const entrance = (delay = 0) => FadeInDown.duration(380).delay(delay).reduceMotion(ReduceMotion.System);
const relayout = LinearTransition.duration(220).reduceMotion(ReduceMotion.System);

function MovingPoint({ ratio, from, to, visible, preview }: {
    ratio: number;
    from: number;
    to: number;
    visible: boolean;
    preview: boolean;
}) {
    const styles = useStyles();
    const reduced = useReducedMotion();
    const progress = useSharedValue(ratio);
    useEffect(() => {
        if (preview && visible) {
            progress.value = 0;
            progress.value = withTiming(1, { duration: reduced ? 0 : 1700, reduceMotion: reduced ? ReduceMotion.Always : ReduceMotion.System });
        }
        else
            progress.value = withTiming(ratio, { duration: reduced ? 0 : 700, reduceMotion: reduced ? ReduceMotion.Always : ReduceMotion.System });
    }, [ratio, progress, reduced, preview, visible]);
    const style = useAnimatedStyle(() => {
        const t = progress.value;
        const x = from + (to - from) * (3 * t * t - 2 * t * t * t);
        return { transform: [{ translateX: x - 7 }, { translateY: 145 * t }], opacity: visible ? 1 : 0 };
    });
    return <Animated.View pointerEvents="none" style={[styles.marker, style]}/>;
}

function StageNode({ done, current, onPress, label, children }: {
    done: boolean;
    current: boolean;
    onPress: () => void;
    label: string;
    children: React.ReactNode;
}) {
    const styles = useStyles();
    const pulse = useSharedValue(current ? 1 : 0);
    useEffect(() => { pulse.value = withTiming(current ? 1 : 0, { duration: 500, reduceMotion: ReduceMotion.System }); }, [current, pulse]);
    const ring = useAnimatedStyle(() => ({ opacity: pulse.value * 0.45, transform: [{ scale: 1 + pulse.value * 0.12 }] }));
    return <HomePressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={[styles.node, done && styles.done, current && styles.current]}>
      {current ? <Animated.View pointerEvents="none" style={[styles.nodeRing, ring]}/> : null}
      {children}
    </HomePressable>;
}

export function JourneyBoard({ legs, selections, completed, previewIndex, liveRatio, onLeg }: {
    legs: JourneyLeg[];
    selections: Record<string, string>;
    completed: number;
    previewIndex: number | null;
    liveRatio: number | null;
    onLeg: (index: number) => void;
}) {
    const [width, setWidth] = useState(320);
    const styles = useStyles();
    const s = useJourneyStyles();
    const { palette } = useTheme();
    const reduced = useReducedMotion();
    const current = previewIndex ?? completed;
    return <View onLayout={event => setWidth(event.nativeEvent.layout.width)} style={{ marginVertical: 6 }}>
    {legs.map((leg, index) => {
            const left = index % 2 === 0;
            const x = left ? 48 : width - 48;
            const nextX = left ? width - 48 : 48;
            const option = selectedOption(leg, selections);
            const done = previewIndex === null && index < completed;
            return <Animated.View key={leg.id} entering={reduced ? undefined : entrance(Math.min(index * 55, 500))} layout={reduced ? undefined : relayout} style={{ minHeight: 230, paddingBottom: 112 }}>
        <View style={[styles.nodeRow, { left: left ? 0 : undefined, right: left ? undefined : 0, flexDirection: left ? 'row' : 'row-reverse' }]}>
          <StageNode done={done} current={index === current} onPress={() => onLeg(index)} label={`${checkpointLabel(leg.start)}. ${option.label}. ${optionDurationLabel(option)}. Tap for transport options.`}><Text style={[styles.number, done && styles.numberDone]}>{done ? '✓' : String(index + 1).padStart(2, '0')}</Text><View style={styles.vehicle}><Text style={s.pillText}>{option.mode === 'walk' ? '↗' : '→'}</Text></View></StageNode>
          <HomePressable accessibilityRole="button" accessibilityLabel={`Open stage ${index + 1} details`} onPress={() => onLeg(index)} style={{ flex: 1, minWidth: 0, gap: 8, alignItems: left ? 'flex-start' : 'flex-end' }}><Text numberOfLines={2} style={[s.cardTitle, { fontSize: 18, textAlign: left ? 'left' : 'right' }]}>{checkpointLabel(leg.start)}</Text><Text style={[s.small, styles.stageState]}>{done ? 'COMPLETED' : index === current ? 'CURRENT STAGE' : stageAttention(leg, selections) ? 'NEEDS REVIEW' : 'NEXT CHECKPOINT'}</Text><View style={[s.pill, { minHeight: 44, justifyContent: 'center', maxWidth: '100%' }]}><Text style={s.pillText}>{option.label} {leg.options.length > 1 ? '⌄' : '↗'}</Text></View></HomePressable>
        </View>
        <View pointerEvents="none" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 150 }}>
          <Svg width={width} height={150}><Path d={`M ${x} 0 C ${x} 75 ${nextX} 75 ${nextX} 150`} stroke={done ? palette.green : palette.border} strokeWidth={done ? 3 : 2.5} strokeDasharray={done ? undefined : '5 8'} fill="none" strokeLinecap="round"/></Svg>
          <MovingPoint ratio={previewIndex !== null ? 0.5 : liveRatio ?? 0} from={x} to={nextX} preview={previewIndex !== null} visible={index === current && (previewIndex !== null || liveRatio !== null)}/>
          <View style={styles.time}><Text style={[s.small, { color: palette.ink, textAlign: 'center' }]}>{optionDurationLabel(option)}</Text>{option.mode === 'flight' ? <Text style={[s.small, { textAlign: 'center' }]}>flying time only</Text> : null}</View>
        </View>
      </Animated.View>;
        })}
    {legs.length ? <View style={[styles.nodeRow, { position: 'relative', flexDirection: legs.length % 2 === 0 ? 'row' : 'row-reverse' }]}><View style={[styles.node, completed === legs.length && styles.done]}><Text style={[styles.number, completed === legs.length && styles.numberDone]}>⚑</Text></View><View style={{ flex: 1, gap: 5 }}><Text style={s.cardTitle}>{checkpointLabel(legs[legs.length - 1].end)}</Text><Text style={s.small}>JOURNEY FINISH</Text></View></View> : null}
  </View>;
}

const useStyles = createThemedStyles(t => { return StyleSheet.create({
    nodeRow: { position: 'relative', width: '100%', gap: 18, alignItems: 'center', paddingHorizontal: 8 },
    node: { width: 80, height: 80, borderRadius: 40, borderWidth: 2, borderColor: t.border, backgroundColor: t.surface, alignItems: 'center', justifyContent: 'center' },
    current: { borderColor: t.green, borderWidth: 3, backgroundColor: t.elevated },
    nodeRing: { position: 'absolute', top: -7, bottom: -7, left: -7, right: -7, borderRadius: 47, borderWidth: 2, borderColor: t.green },
    done: { backgroundColor: t.mint, borderColor: t.green },
    number: { color: t.ink, fontSize: 23, fontWeight: '700' },
    numberDone: { color: t.green },
    vehicle: { position: 'absolute', bottom: -8, right: -5, width: 36, height: 36, borderRadius: 18, backgroundColor: t.elevated, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: t.border },
    time: { position: 'absolute', alignSelf: 'center', top: 47, paddingHorizontal: 15, paddingVertical: 8, borderRadius: 999, backgroundColor: t.elevated, borderWidth: 1, borderColor: t.border },
    marker: { position: 'absolute', top: 0, left: 0, width: 14, height: 14, borderRadius: 7, backgroundColor: t.green, borderWidth: 2.5, borderColor: t.background, shadowColor: t.green, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.35, shadowRadius: 7, elevation: 3 },
    stageState: { letterSpacing: 1, fontWeight: '700', fontSize: 11 },
}); });
