import { useEffect, useRef, useState } from 'react';
import { Linking, View } from 'react-native';
import { Text } from './Typography';
import { Button, Card, Notice, SectionTitle } from './ui';
import { fetchTrailPlaces, type TrailPlace } from '@/services/trail/places';
import type { Coordinate } from '@/services/places/types';
import type { WalkingRoute } from '@/services/routing/types';
import { colors } from '@/theme/tokens';
export function TrailGuide({ route, onPlaces, onFocus }: {route: WalkingRoute; onPlaces:(places:TrailPlace[])=>void; onFocus:(point:Coordinate)=>void}) {
  const [places,setPlaces]=useState<TrailPlace[]>([]), [busy,setBusy]=useState(false), [loaded,setLoaded]=useState(false), [error,setError]=useState(''), [steps,setSteps]=useState(8);
  const pending=useRef<AbortController|null>(null);
  useEffect(()=>{ onPlaces([]); return ()=>pending.current?.abort(); },[onPlaces]);
  async function load() {
    if(pending.current)return;
    const controller=new AbortController();pending.current=controller;setBusy(true);setError('');
    try {const items=await fetchTrailPlaces(route.geometry,controller.signal);if(!controller.signal.aborted){setPlaces(items);onPlaces(items);setLoaded(true);}}
    catch {if(!controller.signal.aborted)setError('Could not load mapped stops. Your walking route is still available. Retry when connected.');}
    finally {pending.current=null;if(!controller.signal.aborted)setBusy(false);}
  }
  return <>
    <Card><SectionTitle title="Along your trail" /><Text style={{color:colors.muted,lineHeight:22,marginVertical:12}}>Find mapped rest options, water, toilets, viewpoints and cautions within 300 m of this route. Nearby does not guarantee a walkable detour. The route area is sent to OpenStreetMap’s Overpass service when you load stops.</Text>
      <Button label={loaded?'Refresh mapped stops':'Find stops & viewpoints'} busy={busy} disabled={busy} onPress={()=>void load()} />
      <Notice message={error} />
      {loaded && <Text style={{color:colors.muted,lineHeight:22,marginVertical:12}}>{places.length ? `${places.length} mapped places nearby.` : 'No mapped facilities returned. Carry what you need; the map may be incomplete.'} Danger coverage is incomplete. No warning on this map is not evidence that an area is safe.</Text>}
      {places.map(p=><View key={p.id} style={{marginTop:16,gap:6}}><Text style={{color:p.kind==='Mapped caution'?colors.danger:colors.lime,fontSize:13}}>{p.kind} · {Math.round(p.offsetM)} m from route</Text><Button label={p.name} variant="outline" onPress={()=>onFocus(p)} /><Text style={{color:colors.muted,lineHeight:21}}>{p.detail}</Text><Button label="View map source" variant="quiet" onPress={()=>void Linking.openURL(p.source).catch(()=>setError('Could not open the map source.'))} /></View>)}
    </Card>
    <Card><SectionTitle title="Your route, step by step" /><Text style={{color:colors.muted,lineHeight:22,marginVertical:10}}>Tap a step to locate it on the map. Follow signs and actual trail conditions where they differ from mapped directions.</Text>
      {route.instructions.slice(0,steps).map((step,index)=><Button key={index} variant="outline" label={`${index+1}. ${step.text} · ${Math.round(step.distanceM)} m`} onPress={()=>onFocus(step.coordinate)} />)}
      {!route.instructions.length && <Text style={{color:colors.muted}}>This route has no turn instructions. Use the route line and local signs.</Text>}
      {route.instructions.length>steps && <Button variant="quiet" label={`Show next ${Math.min(8,route.instructions.length-steps)} steps`} onPress={()=>setSteps(v=>v+8)} />}
    </Card>
  </>;
}
