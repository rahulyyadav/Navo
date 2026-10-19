import { useMemo, useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@/components/Typography';
import { Backdrop, Badge, Button, Card, Chip, Field, Heading } from '@/components/ui';
import { treks, trekMeta } from '@/data/treks';
import { discoverTreks } from '@/services/trail-discovery';
import { usePageLayout } from '@/hooks/usePageLayout';
import { colors } from '@/theme/tokens';

export default function TrailDiscoveryScreen() {
  const {page}=usePageLayout();
  const [query,setQuery]=useState(''),[region,setRegion]=useState('All regions'),[difficulty,setDifficulty]=useState('Any difficulty');
  const results=useMemo(()=>discoverTreks(treks,query,region,difficulty),[query,region,difficulty]);
  function reset(){setQuery('');setRegion('All regions');setDifficulty('Any difficulty');}
  return <Backdrop><ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={[styles.page,page]}>
    <Heading title="Find your next trail." subtitle="Explore Nepal’s trek overviews, then build a walking plan for your chosen destination." />
    <Button label="Search hikes & places across Nepal" onPress={()=>router.push('/trek-plan')} />
    <Field label="Search trek overviews" placeholder="Trek, region or a stop along the way…" value={query} onChangeText={setQuery} maxLength={150} autoCorrect={false} />
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterStrip}>{['All regions',...new Set(treks.map(t=>t.region))].map(value=><Chip key={value} label={value} selected={region===value} onPress={()=>setRegion(value)} />)}</ScrollView>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterStrip}>{['Any difficulty','Moderate','Challenging','Strenuous'].map(value=><Chip key={value} label={value} selected={difficulty===value} onPress={()=>setDifficulty(value)} />)}</ScrollView>
    <Text accessibilityLiveRegion="polite" style={styles.copy}>{results.length} of {treks.length} trek overviews · Planning references</Text>
    <Text style={styles.copy}>Approximate planning references. Review a walking route or trusted GPX before navigating.</Text>
    {!results.length&&<Card><Text style={styles.title}>No matching overview</Text><Text style={styles.copy}>Try another region or search for your destination in the walking planner.</Text><Button label="Clear filters" variant="outline" onPress={reset} /></Card>}
    {results.map(trek=><Card key={trek.id}>
      <Image source={trek.image} accessibilityLabel={`${trek.name}, ${trek.region}`} style={styles.photo} resizeMode="cover" />
      <View style={styles.filters}><Badge label={trek.region} tone="info" /><Badge label={trek.difficulty} tone="lime" /></View>
      <Text style={styles.title}>{trek.name}</Text><Text style={styles.copy}>{trekMeta(trek)} · {trek.maxElevation.toLocaleString()} m high point</Text><Text style={styles.copy}>{trek.summary}</Text>
      <Button label={`Explore ${trek.name}`} variant="outline" onPress={()=>router.push({pathname:'/trek/[id]',params:{id:trek.id}})} />
    </Card>)}
  </ScrollView></Backdrop>;
}
const styles=StyleSheet.create({page:{paddingTop:20,paddingBottom:40,gap:16},filters:{flexDirection:'row',flexWrap:'wrap',gap:8},filterStrip:{flexDirection:'row',gap:8},photo:{width:'100%',height:210,borderRadius:20},title:{color:colors.ink,fontSize:22,lineHeight:28,fontWeight:'700'},copy:{color:colors.muted,fontSize:15,lineHeight:23}});
