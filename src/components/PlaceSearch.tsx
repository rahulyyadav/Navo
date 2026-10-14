import { hikingReferences, nepalHikingPlaces } from '@/services/places/hiking-references';
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { Text } from "@/components/Typography";
import { Button, Chip, Field } from "@/components/ui";
import { searchPlaces } from "@/services/places/search";
import type { Coordinate, Place } from "@/services/places/types";
import { colors, radius, space } from "@/theme/tokens";
export function PlaceSearch({
  label = "Search places",
  onSelect,
  near,
  recent = [],
  autoFocus = false,
}: {
  label?: string;
  onSelect: (place: Place) => void;
  near?: Coordinate;
  recent?: Place[];
  autoFocus?: boolean;
}) {
  const [region, setRegion] = useState('Kathmandu Valley');
  const [browseCount, setBrowseCount] = useState(5);
  const [query, setQuery] = useState(""),
    [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{
    query: string;
    items: Place[];
    busy: boolean;
    error: string;
  }>({ query: "", items: [], busy: false, error: "" });
  useEffect(() => {
    if (!query.trim()) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setResult({ query, items: [], busy: true, error: "" });
      void searchPlaces(query, { near, signal: controller.signal })
        .then((items) => {
          if (!controller.signal.aborted)
            setResult({ query, items, busy: false, error: "" });
        })
        .catch(() => {
          if (!controller.signal.aborted)
            setResult({
              query,
              items: [],
              busy: false,
              error: "Couldn’t search places. Check your connection and retry.",
            });
        });
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, attempt, near]);
  const local = hikingReferences(query, near);
  const regional = nepalHikingPlaces.filter(p => region === 'Across Nepal' || p.region === region);
  const visible = query.trim()
    ? result.query === query ? result.items.length ? result.items : local : local
    : regional.slice(0, browseCount);

  return (
    <View style={{ gap: space.sm }}>
      <Field
        label={label}
        value={query}
        onChangeText={setQuery}
        placeholder="Kathmandu, Pokhara, a trail or landmark…"
        autoCorrect={false}
        autoFocus={autoFocus}
        maxLength={100}
      />
      {Boolean(query.trim()) && (result.busy || result.query !== query) && (
        <ActivityIndicator
          accessibilityLabel="Searching places"
          color={colors.lime}
        />
      )}
      {!query.trim() && <>
        <Text style={{color:colors.ink,fontSize:18,fontWeight:'700'}}>Find your next hike</Text>
        <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{['Kathmandu Valley','Pokhara','Across Nepal'].map(name=><Chip key={name} label={name} selected={region===name} onPress={()=>{setRegion(name);setBrowseCount(5);}} />)}</View>
        <Text style={{color:colors.muted,lineHeight:21}}>Choose a mapped destination, then set your start. Search above for other places across Nepal.</Text>
        {recent.length>0 && <Button label={`Recent: ${recent[0].name}`} variant="quiet" onPress={()=>onSelect(recent[0])} />}
      </>}
      {visible.map((p) => (
        <Pressable
          key={p.id}
          accessibilityRole="button"
          accessibilityLabel={`Select ${p.fullName}`}
          onPress={() => {
            setQuery("");
            onSelect(p);
          }}
          style={({ pressed }) => ({
            padding: space.md,
            borderRadius: radius.md,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.line,
            opacity: pressed ? 0.75 : 1,
            minHeight: 64,
          })}
        >
          <Text style={{ color: colors.ink, fontSize: 16, fontWeight: "700" }}>
            {p.name}
          </Text>
          <Text
            style={{
              color: colors.muted,
              fontSize: 14,
              lineHeight: 21,
              marginTop: 4,
            }}
          >
            {p.type === 'peak' ? 'Mountain / hill · ' : ''}{p.fullName}
            {p.provider === 'osm-reference' ? ' · mapped landmark reference' : ''}
            {p.distanceM === undefined
              ? ""
              : ` · ${(p.distanceM / 1000).toFixed(1)} km away`}
          </Text>
        </Pressable>
      ))}
      {!query.trim() && regional.length>browseCount && <Button label="Show more destinations" variant="quiet" onPress={()=>setBrowseCount(v=>v+5)} />}
      {Boolean(query.trim()) &&
        result.query === query &&
        !result.busy &&
        !visible.length &&
        !result.error && (
          <Text style={{ color: colors.muted }}>
            No places found. Try a nearby settlement or a fuller name.
          </Text>
        )}
      {Boolean(query.trim()) &&
        result.query === query &&
        Boolean(result.error) && (
          <>
            <Text accessibilityRole="alert" style={{ color: colors.danger }}>
              {result.error}
            </Text>
            <Button
              label="Retry place search"
              variant="outline"
              onPress={() => setAttempt((n) => n + 1)}
            />
          </>
        )}
      {Boolean(query.trim()) && (
        <Text style={{ color: colors.muted, fontSize: 12 }}>
          Place search: Photon · OpenStreetMap contributors
        </Text>
      )}
    </View>
  );
}
