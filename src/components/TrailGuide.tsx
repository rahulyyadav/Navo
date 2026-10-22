import { useEffect, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { Text } from './Typography';
import { Button, Card, Notice, SectionTitle } from './ui';
import { fetchTrailPlaceSnapshot, type TrailPlace, type TrailPlaceSnapshot } from '@/services/trail/places';
import type { Coordinate } from '@/services/places/types';
import type { WalkingRoute } from '@/services/routing/types';
import { colors, radius, space } from '@/theme/tokens';
export function TrailGuide({ route, onPlaces, onFocus }: {route: WalkingRoute; onPlaces:(places:TrailPlace[])=>void; onFocus:(point:Coordinate,label:string)=>void}) {
  const [places,setPlaces]=useState<TrailPlace[]>([]), [busy,setBusy]=useState(false), [loaded,setLoaded]=useState(false), [error,setError]=useState(''), [steps,setSteps]=useState(8), [selectedStep,setSelectedStep]=useState<number|null>(null);
  const pending=useRef<AbortController|null>(null);
  const [snapshot,setSnapshot]=useState<TrailPlaceSnapshot|null>(null);
  useEffect(()=>{ onPlaces([]); return ()=>pending.current?.abort(); },[onPlaces]);
  async function load() {
    if(pending.current)return;
    const controller=new AbortController();pending.current=controller;setBusy(true);setError('');
    try {const result=await fetchTrailPlaceSnapshot(route.geometry,controller.signal,loaded);if(!controller.signal.aborted){setSnapshot(result);setPlaces(result.places);onPlaces(result.places);setLoaded(true);}}
    catch (failure) {if(!controller.signal.aborted)setError(failure instanceof Error ? failure.message : 'Could not load mapped stops. Your walking route is still available.');}
    finally {pending.current=null;if(!controller.signal.aborted)setBusy(false);}
  }
  return <>
    <Card><SectionTitle title="Along your trail" /><Text style={{color:colors.muted,lineHeight:22,marginVertical:12}}>Find mapped rest options, water, toilets, viewpoints and cautions within 300 m of this route. Nearby does not guarantee a walkable detour. The route area is sent to OpenStreetMap’s Overpass service when you load stops.</Text>
      <Button label={loaded?'Refresh mapped stops':'Find stops & viewpoints'} busy={busy} disabled={busy} onPress={()=>void load()} />
      <Notice message={error} />
      {snapshot&&<Notice tone={snapshot.stale?'warning':'info'} message={`${snapshot.stale?'Provider unavailable · showing previously fetched map data':'Map data fetched'} ${new Date(snapshot.fetchedAt).toLocaleString()}. This is not a live check of facilities or hazards.`} />}
      {loaded && <Text style={{color:colors.muted,lineHeight:22,marginVertical:12}}>{places.length ? `${places.length} mapped places nearby.` : 'No mapped facilities returned. Carry what you need; the map may be incomplete.'} Danger coverage is incomplete. No warning on this map is not evidence that an area is safe.</Text>}
      {places.map(p=><View key={p.id} style={{marginTop:16,gap:6}}><Text style={{color:p.kind==='Mapped caution'?colors.danger:colors.lime,fontSize:13}}>{p.kind} · {Math.round(p.offsetM)} m from route</Text><Button label={p.name} variant="outline" onPress={()=>onFocus(p,p.name)} /><Text style={{color:colors.muted,lineHeight:21}}>{p.detail}</Text><Button label="View map source" variant="quiet" onPress={()=>void Linking.openURL(p.source).catch(()=>setError('Could not open the map source.'))} /></View>)}
    </Card>
    <Card><SectionTitle title="Your route, step by step" /><Text style={{color:colors.muted,lineHeight:22,marginVertical:10}}>Tap a step to locate it on the map. Follow signs and actual trail conditions where they differ from mapped directions.</Text>
      <View style={styles.steps}>{route.instructions.slice(0,steps).map((step,index)=><Pressable key={index} accessibilityRole="button" accessibilityLabel={`Step ${index+1}: ${step.text}, ${Math.round(step.distanceM)} metres. Show on map`} accessibilityState={{selected:selectedStep===index}} onPress={()=>{setSelectedStep(index);onFocus(step.coordinate,`Step ${index+1}: ${step.text}`);}} style={({pressed})=>[styles.step,selectedStep===index&&styles.selected,pressed&&styles.pressed]}><View style={styles.number}><Text style={styles.numberText}>{index+1}</Text></View><View style={styles.stepText}><Text style={styles.direction}>{step.text}</Text><Text style={styles.distance}>{step.distanceM>=1000?`${(step.distanceM/1000).toFixed(1)} km`:`${Math.round(step.distanceM)} m`} · {selectedStep===index?'Selected on map':'Show on map'}</Text></View><Text style={styles.arrow}>↗</Text></Pressable>)}</View>
      {!route.instructions.length && <Text style={{color:colors.muted}}>This route has no turn instructions. Use the route line and local signs.</Text>}
      {route.instructions.length>steps && <Button variant="quiet" label={`Show next ${Math.min(8,route.instructions.length-steps)} steps`} onPress={()=>setSteps(v=>v+8)} />}
    </Card>
  </>;
}

const styles=StyleSheet.create({
  steps:{gap:space.sm},
  step:{minHeight:76,flexDirection:'row',alignItems:'center',gap:12,padding:14,borderRadius:radius.md,backgroundColor:colors.surfaceSoft,borderWidth:1,borderColor:colors.line},
  selected:{borderColor:colors.lime,backgroundColor:colors.navy},
  pressed:{opacity:.75},
  number:{width:32,height:32,borderRadius:16,backgroundColor:colors.lime,alignItems:'center',justifyContent:'center'},
  numberText:{color:colors.onAccent,fontWeight:'700',fontSize:14},
  stepText:{flex:1,gap:4},direction:{color:colors.ink,fontSize:16,lineHeight:22,fontWeight:'600'},
  distance:{color:colors.muted,fontSize:13,lineHeight:19},arrow:{color:colors.lime,fontSize:22},
});
