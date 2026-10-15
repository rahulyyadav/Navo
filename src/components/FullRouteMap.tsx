import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from './Typography';
import { NepalMap, type NepalMapProps } from './NepalMap';
import { Button, Chip, Notice } from './ui';
import type { WalkingRoute } from '@/services/routing/types';
import { colors, radius } from '@/theme/tokens';

/** Map gets the remaining screen height; details never consume the entire map. */
export function FullRouteMap({map, route, title, subtitle, status, onClose, actionLabel, onAction}: {
  map:NepalMapProps;route:WalkingRoute;title:string;subtitle:string;status?:string;
  onClose:()=>void;actionLabel:string;onAction:()=>void;
}) {
  const inset=useSafeAreaInsets();
  const [expanded,setExpanded]=useState(false),[index,setIndex]=useState<number|null>(null),[layer,setLayer]=useState<'terrain'|'streets'>('terrain'),[nonce,setNonce]=useState(0),[following,setFollowing]=useState(Boolean(map.followUser));
  const step=index===null?null:route.instructions[index];
  const focus=step?{...step.coordinate,label:`Step ${index!+1}: ${step.text}`}:null;
  return <View style={[styles.page,{paddingTop:inset.top,paddingBottom:inset.bottom}]}>
    <View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="Back to trip details" onPress={onClose} style={styles.back}><Text style={styles.backText}>←</Text></Pressable><View style={styles.heading}><Text numberOfLines={2} style={styles.title}>{title}</Text><Text style={styles.caption}>{subtitle}</Text></View></View>
    <View style={styles.map}><NepalMap {...map} basemap={layer} focusPoint={focus} region={step?{...step.coordinate,latitudeDelta:.006,longitudeDelta:.006}:map.region} regionNonce={map.regionNonce+nonce} followUser={index===null&&following} />
      <View style={styles.controls}><Chip selected={false} label={layer==='terrain'?'Street map':'Terrain map'} onPress={()=>setLayer(v=>v==='terrain'?'streets':'terrain')} /><Chip selected={index===null&&!following} label="Whole route" onPress={()=>{setFollowing(false);setIndex(null);setNonce(v=>v+1);}} />{map.myCoords&&<Chip selected={following} label="Follow me" onPress={()=>{setIndex(null);setFollowing(true);setNonce(v=>v+1);}} />}</View>
    </View>
    <View style={[styles.panel,expanded&&styles.expanded]}>
      <Pressable accessibilityRole="button" accessibilityLabel={expanded?'Collapse route directions':'Expand route directions'} accessibilityState={{expanded}} onPress={()=>setExpanded(v=>!v)} style={styles.panelHeading}><View style={styles.heading}><Text style={styles.title}>{(route.distanceM/1000).toFixed(2)} km · {route.instructions.length} steps</Text><Text style={styles.caption}>{step?`Step ${index!+1} · ${step.text}`:'Route directions & trip details'}</Text></View><Text style={styles.backText}>{expanded?'⌄':'⌃'}</Text></Pressable>
      {expanded&&<ScrollView style={styles.details} contentContainerStyle={{gap:8,paddingBottom:12}}><Notice message={status ?? ""} tone="info" />{route.instructions.map((item,i)=><Pressable key={i} accessibilityRole="button" accessibilityLabel={`Show step ${i+1}: ${item.text}`} onPress={()=>{setFollowing(false);setIndex(i);setNonce(v=>v+1);setExpanded(false);}} style={[styles.step,index===i&&styles.selected]}><Text style={styles.number}>{i+1}</Text><View style={styles.heading}><Text style={styles.direction}>{item.text}</Text><Text style={styles.caption}>{item.distanceM>=1000?`${(item.distanceM/1000).toFixed(1)} km`:`${Math.round(item.distanceM)} m`}</Text></View></Pressable>)}{!route.instructions.length&&<Text style={styles.caption}>No turn instructions are available for this route.</Text>}<Text style={styles.caption}>Mapped directions may differ from actual trail conditions. Check local signs and access.</Text></ScrollView>}
      {!expanded&&status&&<Text numberOfLines={2} style={styles.caption}>{status}</Text>}
      <Button label={actionLabel} onPress={onAction} />
    </View>
  </View>;
}
const styles=StyleSheet.create({
 page:{flex:1,backgroundColor:colors.navy},header:{flexDirection:'row',gap:12,alignItems:'center',padding:12},heading:{flex:1,gap:4},back:{height:44,width:44,borderRadius:22,backgroundColor:colors.surfaceSoft,alignItems:'center',justifyContent:'center'},backText:{color:colors.lime,fontSize:26},title:{color:colors.ink,fontSize:17,lineHeight:23,fontWeight:'700'},caption:{color:colors.muted,fontSize:13,lineHeight:19},map:{flex:1,minHeight:120},controls:{position:'absolute',top:12,left:12,right:60,flexDirection:'row',flexWrap:'wrap',gap:8,padding:6,borderRadius:radius.md,backgroundColor:colors.navy},panel:{padding:16,gap:10,borderTopLeftRadius:radius.lg,borderTopRightRadius:radius.lg,backgroundColor:colors.navy},expanded:{maxHeight:'48%'},panelHeading:{minHeight:48,flexDirection:'row',alignItems:'center',gap:10},details:{flexShrink:1},step:{minHeight:64,padding:12,flexDirection:'row',gap:12,alignItems:'center',backgroundColor:colors.surfaceSoft,borderRadius:radius.md,borderWidth:1,borderColor:colors.line},selected:{borderColor:colors.lime},number:{color:colors.lime,fontWeight:'700',fontSize:18},direction:{color:colors.ink,fontSize:15,lineHeight:21},
});
