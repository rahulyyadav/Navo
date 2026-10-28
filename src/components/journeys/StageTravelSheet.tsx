import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/Typography';
import { NepalMap } from '@/components/NepalMap';
import { useTheme } from '@/context/ThemeContext';
import { useReducedMotion } from '@/components/ui';
import { checkpointLabel, optionDurationLabel, invalidCheckpointName, pointDistanceM, type JourneyLeg, type JourneySource, type TravelOption } from '@/services/journeys/types';
import { JourneyButton } from './JourneyMotion';
import { HomePressable } from './HomeMotion';
import { useJourneyStyles } from './journey-styles';

/** Selection is confirmed only by the parent's authenticated persistence promise. */
export function StageTravelSheet({ leg, chosen, index, total, sources, provenance, completed, busy, error, saved, accepted, onClose, onChoose, onAccept, onOpenSource }: {
  provenance: 'curated' | 'researched'; leg: JourneyLeg; chosen: TravelOption; index: number; total: number; sources: JourneySource[];
  completed: boolean; busy: boolean; error: string; saved: string; accepted: boolean;
  onClose: () => void; onChoose: (id: string) => void; onAccept: () => void;
  onOpenSource: (url: string) => void;
}) {
  const base = useJourneyStyles();
  const s = { ...base, small: [base.small, { fontSize: 14, lineHeight: 21 }] };
  const { palette } = useTheme();
  const inset = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const [map, setMap] = useState(false);
  const [original, setOriginal] = useState(false);
  const [guidance, setGuidance] = useState(false);
  const malformed = invalidCheckpointName(leg.start.name) || invalidCheckpointName(leg.end.name);
  const mapped = !malformed && chosen.mode !== 'flight' && (chosen.mode === 'walk' ? leg.geometryKind === 'trail' : leg.geometryKind === 'road') && leg.geometry.length > 1 && !leg.geometry.some(p => p.coordinatesApproximate);
  const relevant = sources.filter(source => [...chosen.sourceIds, ...(chosen.verificationSourceIds ?? [])].includes(source.id));
  const coordinates = leg.geometry;
  const distance = mapped ? coordinates.slice(1).reduce((sum, point, i) => sum + pointDistanceM(coordinates[i], point), 0) : null;
  const lats = coordinates.map(p => p.latitude), lons = coordinates.map(p => p.longitude);
  return <Modal visible transparent animationType={reduced ? 'none' : 'slide'} onRequestClose={onClose}>
    <View style={[styles.scrim, { paddingTop: inset.top + 12 }]}>
      <Pressable accessibilityLabel="Dismiss stage details" accessibilityRole="button" disabled={busy} onPress={onClose} style={StyleSheet.absoluteFill}/>
      <View accessibilityViewIsModal onAccessibilityEscape={onClose} style={[styles.sheet, { backgroundColor: palette.background, borderColor: palette.border }]}>
        <View style={[styles.header, { borderBottomColor: palette.border }]}>
          <View style={{ flex: 1, gap: 6 }}><Text style={s.eyebrow}>TRAVEL BETWEEN CHECKPOINTS</Text><Text style={s.small}>Stage {index + 1} of {total} · {completed ? 'Completed' : 'Journey planning'}</Text></View>
          <JourneyButton label="Close" variant="quiet" disabled={busy} onPress={onClose}/>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, paddingBottom: Math.max(inset.bottom, 20), gap: 20 }}>
          <View accessibilityLiveRegion="polite" aria-live="polite">{busy ? <Text style={s.text}>Saving to your account…</Text> : error ? <Text style={s.error}>{error} Reconnect and reopen this journey to check the saved choice before retrying.</Text> : saved ? <Text style={[s.text, { color: palette.green }]}>{saved}</Text> : null}</View>
          <View style={{ gap: 8 }}><Text style={s.eyebrow}>FROM</Text><Text style={[s.cardTitle, styles.name]}>{checkpointLabel(leg.start)}</Text><Text style={s.eyebrow}>TO</Text><Text style={[s.cardTitle, styles.name]}>{checkpointLabel(leg.end)}</Text></View>
          {malformed ? <View style={s.card}><Text style={s.error}>This saved plan contains a description where a place name is required. Confirm the checkpoint and prepare the route again before using directions.</Text><JourneyButton label={original ? 'Hide original text' : 'Read original checkpoint text'} variant="quiet" onPress={() => setOriginal(!original)}/>{original ? <Text style={s.small}>{leg.start.name} → {leg.end.name}</Text> : null}</View> : null}
          <View style={[styles.summary, { borderColor: palette.border }]}>
            <Text style={s.eyebrow}>{chosen.mode === 'walk' ? 'WALKING STAGE' : chosen.mode === 'flight' ? 'FLIGHT CONNECTION' : 'ROAD CONNECTION'}</Text>
            <Text style={s.text}>{optionDurationLabel(chosen)}</Text>
            <Text style={s.small}>{chosen.durationRange ? (chosen.mode === 'walk' ? 'Source based walking range. Allow extra time for rest, terrain and changing conditions.' : 'Source based travel range. Confirm current service and allow time for waits and transfers.') : chosen.minutes === null ? (chosen.mode === 'walk' ? 'Ask a local guide for a walking estimate for your pace.' : 'Confirm travel time and availability with the operator.') : chosen.mode === 'walk' ? 'Estimated walking time. Allow extra time for rest and changing conditions.' : 'Estimated travel time only. Waiting and transfers are not included.'}</Text>
            {distance !== null ? <Text style={s.small}>{(distance / 1000).toFixed(1)} km along the mapped path.</Text> : null}
          </View>
          {mapped ? <><JourneyButton label={map ? 'Hide stage map' : 'View mapped stage'} variant="outline" onPress={() => setMap(!map)}/>{map ? <View style={{ height: 260, borderRadius: 16, overflow: 'hidden' }}><NepalMap hideCatalogue region={{ latitude: (Math.min(...lats) + Math.max(...lats)) / 2, longitude: (Math.min(...lons) + Math.max(...lons)) / 2, latitudeDelta: Math.max(.01, Math.max(...lats) - Math.min(...lats)) * 1.3, longitudeDelta: Math.max(.01, Math.max(...lons) - Math.min(...lons)) * 1.3 }} regionNonce={0} selectedId={null} onSelectTrek={() => undefined} myCoords={null} basemap="terrain" walkingRoutes={[{ id: leg.id, geometry: coordinates }]} walkingRouteId={leg.id} endpoints={{ start: coordinates[0], end: coordinates[coordinates.length - 1] }}/></View> : null}<Text style={s.small}>Mapped path, not confirmation of current access. No turn instructions are supplied for this stage.</Text></> : <Text style={s.small}>Planning reference · no mapped path available. See what to confirm below.</Text>}
          <View style={{ gap: 12 }}><Text style={s.eyebrow}>TRAVEL CHOICE</Text><Text style={s.small}>{completed ? 'Completed stage. Your recorded choice is kept.' : 'Tap an option to save it to your account. A connection is required.'}</Text>
            {leg.options.map(option => {
              const selected = chosen.id === option.id;
              const disabled = busy || completed || option.verification === 'closed-confirmed';
              return <HomePressable key={option.id} accessibilityRole="radio" aria-checked={selected} accessibilityLabel={`Select ${option.label}`} accessibilityState={{ checked: selected, disabled, busy }} disabled={disabled} onPress={() => onChoose(option.id)} style={[s.card, { borderRadius: 16 }, selected && { borderColor: palette.green, backgroundColor: palette.mint }]}>
                <View style={s.row}><View style={{ flex: 1, gap: 5 }}><Text style={s.cardTitle}>{option.label}</Text><Text style={s.small}>{option.costNprPerPerson ? `NPR ${option.costNprPerPerson.minimum.toLocaleString()}–${option.costNprPerPerson.maximum.toLocaleString()} / person · ` : 'Fare unconfirmed · '}{option.mode === 'walk' ? 'Walking' : option.mode === 'flight' ? 'Flying' : 'Road travel'} · {optionDurationLabel(option)}</Text></View><Text style={[s.text, { color: palette.green }]}>{selected ? '✓' : '○'}</Text></View>
                <Text style={s.small}>{option.note || 'No additional source-backed travel details are available. Confirm this connection locally.'}</Text>
                <Text style={s.small}>{option.verification === 'open-confirmed' ? 'Source reports access; check its date below.' : option.verification === 'closed-confirmed' ? 'Reported closed. This option cannot be selected.' : 'Current access unverified.'}</Text>
                {option.warning ? <Text style={s.error}>{option.warning}</Text> : null}
              </HomePressable>;
            })}
          </View>

          {chosen.requiresUserDecision && chosen.verification === 'unconfirmed' ? accepted ? <Text style={s.small}>You acknowledged this warning. This does not verify the route or transport service.</Text> : <><Text style={s.small}>Confirm access locally before departure. Acknowledgement records your decision; it does not resolve uncertainty.</Text><JourneyButton label="Acknowledge warning and keep choice" variant="outline" busy={busy} onPress={onAccept}/></> : null}
          <View style={{ gap: 8 }}><JourneyButton label={guidance ? 'Hide departure checklist' : 'What to confirm before departure'} variant="outline" onPress={() => setGuidance(!guidance)}/>{guidance ? <>
            <Text style={s.small}>{chosen.mode === 'walk' ? 'Ask a local guide about trail access, junctions, intermediate camps, terrain, rest stops and time at your pace.' : 'Confirm pickup location, road access, service availability, departure and transfer waiting times with the operator.'}</Text>
            <Text style={s.small}>{distance === null ? 'Distance is not supplied. ' : ''}Elevation and difficulty are not supplied for this stage.</Text>
            {chosen.mode !== 'walk' ? <Text style={s.small}>Fares and departure schedules are not verified.</Text> : null}
            {!mapped ? <Text style={s.small}>This plan has no navigable geometry for this stage. Get a mapped walking route or a locally verified track before following it; schematic coordinates are not directions.</Text> : null}
          </> : null}</View>
          <View style={{ gap: 10 }}><Text style={s.eyebrow}>SOURCE NOTES</Text><Text style={s.small}>{provenance === 'researched' ? 'AI-generated travel summary with linked references.' : 'Curated planning reference.'} Source inclusion does not establish official endorsement or current safety.</Text>
            {relevant.length ? relevant.map(source => <HomePressable key={source.id} accessibilityRole="link" accessibilityLabel={`Open source: ${source.title}`} onPress={() => onOpenSource(source.url)} style={[styles.source, { borderColor: palette.border }]}><Text style={s.link}>{source.title} ↗</Text><Text style={s.small}>Retrieved {Number.isFinite(Date.parse(source.checkedAt)) ? new Date(source.checkedAt).toLocaleDateString() : 'date unavailable'}{source.publishedAt ? ` · Published ${source.publishedAt.slice(0, 10)}` : ' · Publication date unavailable'}</Text></HomePressable>) : <Text style={s.small}>No source details are saved for this choice. Confirm it with a local guide or transport operator.</Text>}
          </View>
          <JourneyButton label="Done" variant="outline" disabled={busy} onPress={onClose}/>
        </ScrollView>
      </View>
    </View>
  </Modal>;
}
const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,.65)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '95%', width: '100%', maxWidth: 660, alignSelf: 'center', borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, overflow: 'hidden' },
  header: { padding: 16, flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 1 },
  name: { fontSize: 21, lineHeight: 28 },
  summary: { borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: 16, gap: 8 },
  source: { borderTopWidth: 1, paddingVertical: 8, minHeight: 48 },
});
