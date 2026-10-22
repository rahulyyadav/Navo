import { useMemo, useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@/components/Typography';
import { Backdrop, Badge, Button, Card, Chip } from '@/components/ui';
import { PlaceSearch } from '@/components/PlaceSearch';
import { treks, trekMeta } from '@/data/treks';
import { discoverTreks } from '@/services/trail-discovery';
import { usePageLayout } from '@/hooks/usePageLayout';
import { colors } from '@/theme/tokens';

export default function TrailDiscoveryScreen() {
  const {page}=usePageLayout();
  const [query,setQuery]=useState(''),[region,setRegion]=useState('All regions'),[difficulty,setDifficulty]=useState('Any difficulty');
  const [filtersOpen,setFiltersOpen]=useState(false);
  const results=useMemo(()=>discoverTreks(treks,query,region,difficulty),[query,region,difficulty]);
  function reset(){setQuery('');setRegion('All regions');setDifficulty('Any difficulty');}
  return <Backdrop><ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={[styles.page,page]}>
    <Text style={styles.title} accessibilityRole="header">Find your next hike.</Text>
    <PlaceSearch label="Search trails & places" query={query} onQueryChange={setQuery} browse={false} onSelect={place=>router.push({pathname:'/trek-plan',params:{destination:JSON.stringify(place)}})} />
    <Button label={filtersOpen?'Hide overview filters':`Filter trek overviews${region!=='All regions'||difficulty!=='Any difficulty'?' · active':''}`} variant="quiet" onPress={()=>setFiltersOpen(value=>!value)} />
    {filtersOpen&&<View style={styles.filters}>
      {['All regions',...new Set(treks.map(t=>t.region))].map(value=><Chip key={value} label={value} selected={region===value} onPress={()=>setRegion(value)} />)}
      {['Any difficulty','Moderate','Challenging','Strenuous'].map(value=><Chip key={value} label={value} selected={difficulty===value} onPress={()=>setDifficulty(value)} />)}
    </View>}
    <Text accessibilityLiveRegion="polite" style={styles.copy}>{results.length} trek overview{results.length===1?'':'s'} · planning references, not verified tracks</Text>
    {!results.length&&<Card><Text style={styles.title}>No matching trek overview</Text><Text style={styles.copy}>Select a mapped place above to build a walking route. Place results are independent of the overview filters.</Text>{(region!=='All regions'||difficulty!=='Any difficulty')&&<Button label="Clear overview filters" variant="outline" onPress={()=>{setRegion('All regions');setDifficulty('Any difficulty');}} />}<Button label="Clear search" variant="quiet" onPress={reset} /></Card>}
    {results.map(trek=><Card key={trek.id}>
      <Image source={trek.image} accessibilityLabel={`${trek.name}, ${trek.region}`} style={styles.photo} resizeMode="cover" />
      <View style={styles.filters}><Badge label={trek.region} tone="info" /><Badge label={trek.difficulty} tone="lime" /></View>
      <Text style={styles.title}>{trek.name}</Text><Text style={styles.copy}>{trekMeta(trek)} · {trek.maxElevation.toLocaleString()} m high point</Text><Text style={styles.copy}>{trek.summary}</Text>
      <Button label={`Explore ${trek.name}`} variant="outline" onPress={()=>router.push({pathname:'/trek/[id]',params:{id:trek.id}})} />
    </Card>)}
  </ScrollView></Backdrop>;
}
const styles=StyleSheet.create({page:{paddingTop:20,paddingBottom:40,gap:16},filters:{flexDirection:'row',flexWrap:'wrap',gap:8},filterStrip:{flexDirection:'row',gap:8},photo:{width:'100%',height:210,borderRadius:20},title:{color:colors.ink,fontSize:22,lineHeight:28,fontWeight:'700'},copy:{color:colors.muted,fontSize:15,lineHeight:23}});
