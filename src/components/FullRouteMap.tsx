import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from './Typography';
import { NepalMap, type NepalMapProps } from './NepalMap';
import { Button, Chip, Notice } from './ui';
import { RouteProgressStrip } from './RouteProgressStrip';
import { basemapOptions, satelliteAttribution, satelliteTiles } from '@/services/map-providers';
import { maneuverFractions } from '@/services/routing/progress';
import type { WalkingRoute } from '@/services/routing/types';
import { RouteSketch } from './trekking/RouteSketch';
import { colors, radius } from '@/theme/tokens';

/** Map gets the remaining screen height; details never consume the entire map. */
export function FullRouteMap({map, route, title, subtitle, status, offline = false, progress, remainingLabel, onClose, actionLabel, onAction, sessionAction, onEnd}: {
  map:NepalMapProps;route:WalkingRoute;title:string;subtitle:string;status?:string;offline?:boolean;
  /** Matched position along the planned line, 0-1, or null while GPS is uncertain. Omit to hide the strip. */
  progress?: number | null;remainingLabel?:string;
  onClose:()=>void;actionLabel:string;onAction:()=>void;
  sessionAction?:{label:string;onPress:()=>void};onEnd?:()=>void;
}) {
  const inset=useSafeAreaInsets();
  const [expanded,setExpanded]=useState(false),[index,setIndex]=useState<number|null>(null),[layer,setLayer]=useState<NepalMapProps['basemap']>('terrain'),[nonce,setNonce]=useState(0),[following,setFollowing]=useState(Boolean(map.followUser));
  const layers=useMemo(()=>basemapOptions(satelliteTiles,satelliteAttribution),[]);
  const marks=useMemo(()=>maneuverFractions(route),[route]);
  const step=index===null?null:route.instructions[index];
  const focus=step?{...step.coordinate,label:`Step ${index!+1}: ${step.text}`}:null;
  return <View style={[styles.page,{paddingTop:inset.top,paddingBottom:inset.bottom}]}>
    <View style={styles.header}><Pressable accessibilityLabel="Back to trip details" accessibilityRole="button" hitSlop={10} onPress={onClose} style={styles.back}><Text style={styles.backText}>←</Text></Pressable><View style={styles.heading}><Text numberOfLines={2} style={styles.title}>{title}</Text><Text numberOfLines={1} style={styles.caption}>{subtitle}</Text></View></View>
    {!offline && <ScrollView style={styles.layerScroll} contentContainerStyle={styles.layerRow} horizontal keyboardShouldPersistTaps="handled" showsHorizontalScrollIndicator={false}>
      {layers.map(option=><Chip key={option.id} label={option.label} selected={layer===option.id} onPress={()=>setLayer(option.id)} />)}
    </ScrollView>}
    <View style={styles.map}>{offline ? <RouteSketch fill segments={[route.geometry]} position={map.myCoords ?? null} /> : <NepalMap {...map} basemap={layer} focusPoint={focus} region={step?{...step.coordinate,latitudeDelta:.006,longitudeDelta:.006}:map.region} regionNonce={map.regionNonce+nonce} followUser={index===null&&following} />}
      {!offline && <View style={styles.controls}><Chip selected={index===null&&!following} label="Whole route" onPress={()=>{setFollowing(false);setIndex(null);setNonce(v=>v+1);}} />{map.myCoords&&<Chip selected={following} label="Follow me" onPress={()=>{setIndex(null);setFollowing(true);setNonce(v=>v+1);}} />}</View>}
    </View>
    <View style={[styles.panel,expanded&&styles.expanded]}>
      {offline && <Text accessibilityRole="alert" style={styles.caption}>Offline overview · saved route only. Terrain tiles and recalculation need internet.</Text>}
      {progress!==undefined&&<RouteProgressStrip marks={marks} ratio={progress} remainingLabel={remainingLabel ?? `${(route.distanceM/1000).toFixed(2)} km planned`} />}
      <Pressable accessibilityRole="button" accessibilityLabel={expanded?'Collapse route directions':'Expand route directions'} accessibilityState={{expanded}} onPress={()=>setExpanded(v=>!v)} style={styles.panelHeading}><View style={styles.heading}><Text style={styles.title}>{(route.distanceM/1000).toFixed(2)} km · {route.instructions.length} steps{route.ascentM!==null?` · +${Math.round(route.ascentM).toLocaleString('en-US')} m climb`:''}</Text><Text style={styles.caption}>{step?`Step ${index!+1} · ${step.text}`:'Route directions & trip details'}</Text></View><Text style={styles.backText}>{expanded?'⌄':'⌃'}</Text></Pressable>
      {expanded&&<ScrollView style={styles.details} contentContainerStyle={{gap:8,paddingBottom:12}}><Notice message={status ?? ""} tone="info" />{route.instructions.map((item,i)=><Pressable key={i} accessibilityRole="button" accessibilityLabel={`${offline ? "Read" : "Show"} step ${i+1}: ${item.text}`} onPress={()=>{setFollowing(false);setIndex(i);setNonce(v=>v+1);setExpanded(false);}} style={[styles.step,index===i&&styles.selected]}><Text style={styles.number}>{i+1}</Text><View style={styles.heading}><Text style={styles.direction}>{item.text}</Text><Text style={styles.caption}>{item.distanceM>=1000?`${(item.distanceM/1000).toFixed(1)} km`:`${Math.round(item.distanceM)} m`}</Text></View></Pressable>)}{!route.instructions.length&&<Text style={styles.caption}>No turn instructions are available for this route.</Text>}<Text style={styles.caption}>Mapped directions may differ from actual trail conditions. Check local signs and access.</Text></ScrollView>}
      {!expanded&&status&&<Text numberOfLines={2} style={styles.caption}>{status}</Text>}
      {sessionAction && <View style={styles.sessionControls}><View style={styles.heading}><Button label={sessionAction.label} onPress={sessionAction.onPress} /></View>{onEnd && <View style={styles.heading}><Button label="End trek" variant="outline" onPress={onEnd} /></View>}</View>}
      <Button label={actionLabel} variant={sessionAction ? "quiet" : "primary"} onPress={onAction} />
    </View>
  </View>;
}
const styles=StyleSheet.create({
 sessionControls:{flexDirection:'row',gap:10},
 page:{flex:1,backgroundColor:colors.navy},header:{flexDirection:'row',gap:12,alignItems:'center',padding:12},heading:{flex:1,gap:4},back:{height:52,width:52,borderRadius:26,backgroundColor:colors.surfaceSoft,alignItems:'center',justifyContent:'center'},backText:{color:colors.lime,fontSize:26},title:{color:colors.ink,fontSize:17,lineHeight:23,fontWeight:'700'},caption:{color:colors.muted,fontSize:13,lineHeight:19},layerScroll:{flexGrow:0},layerRow:{alignItems:'flex-start',gap:8,paddingHorizontal:12,paddingVertical:4},map:{flex:1,minHeight:120},controls:{position:'absolute',top:12,right:12,flexDirection:'row',flexWrap:'wrap',gap:8,padding:6,borderRadius:radius.md,backgroundColor:'rgba(8,13,18,0.86)'},panel:{padding:16,gap:12,borderTopLeftRadius:radius.lg,borderTopRightRadius:radius.lg,backgroundColor:colors.navy},expanded:{maxHeight:'48%'},panelHeading:{minHeight:56,flexDirection:'row',alignItems:'center',gap:10},details:{flexShrink:1},step:{minHeight:64,padding:12,flexDirection:'row',gap:12,alignItems:'center',backgroundColor:colors.surfaceSoft,borderRadius:radius.md,borderWidth:1,borderColor:colors.line},selected:{borderColor:colors.lime},number:{color:colors.lime,fontWeight:'700',fontSize:18},direction:{color:colors.ink,fontSize:15,lineHeight:21},
});
