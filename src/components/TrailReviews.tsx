import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useCloud } from '@/context/CloudContext';
import { useNavo } from '@/context/NavoContext';
import { nepalToday } from '@/services/day-hike';
import { conditionLabels, decodeReviewFeed, findReviews, visibleReviewSummary, reviewDraftError, type ReviewFeed, type TrailCondition } from '@/services/trail-reviews';
import { Badge, Button, Card, Chip, Field, Notice, SectionTitle } from './treks/ReviewUI';
import { Text } from './Typography';
import { createThemedStyles } from '@/theme/create-styles';

export function TrailReviews({trekId}:{trekId:string}) {
  const styles = useStyles();
  const {userId,isSignedIn}=useNavo();
  if(!isSignedIn) return <Card><SectionTitle title="Hikers’ reviews & conditions" /><Text style={styles.copy}>Sign in to read and share Navo hikers’ experiences. Visit dates and condition reports help you prepare for your own trip.</Text><Button label="Sign in for trail reviews" variant="outline" onPress={()=>router.push('/login')} /></Card>;
  return <ReviewPanel key={`${userId}:${trekId}`} trekId={trekId} />;
}
function ReviewPanel({trekId}:{trekId:string}) {
  const styles = useStyles();
  const {ready,api,retry,error:connectionError}=useCloud();
  const [feed,setFeed]=useState<ReviewFeed|null>(null),[error,setError]=useState(''),[message,setMessage]=useState('');
  const [attempt,setAttempt]=useState(0),[loading,setLoading]=useState(false),[busy,setBusy]=useState(false);
  const [editing,setEditing]=useState(false),[rating,setRating]=useState(0),[text,setText]=useState(''),[visitedOn,setVisitedOn]=useState(nepalToday),[conditions,setConditions]=useState<TrailCondition[]>([]);
  const [query,setQuery]=useState(''),[filter,setFilter]=useState<TrailCondition|'all'>('all');
  const visible=useMemo(()=>findReviews(feed?.reviews??[],query,filter),[feed,query,filter]);
  const summary=useMemo(()=>visibleReviewSummary(feed?.reviews??[]),[feed]);
  const [deleting,setDeleting]=useState(false),[reportId,setReportId]=useState('');
  const lock=useRef(false),alive=useRef(true);
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
  useEffect(()=>{
    let active=true;
    if(!ready) return;
    void Promise.resolve().then(async()=>{
      if(!active)return;
      setLoading(true);setFeed(null);setError('');
      try {const value=decodeReviewFeed(await api<unknown>(`/routes/${trekId}/reviews`,undefined,'GET'));if(active)setFeed(value);}
      catch(failure){if(active)setError(failure instanceof Error?failure.message:'Could not load trail feedback.');}
      finally{if(active)setLoading(false);}
    });
    return()=>{active=false;};
  },[ready,api,trekId,attempt]);
  async function act(action:()=>Promise<void>) {
    if(lock.current)return;lock.current=true;setBusy(true);setError('');setMessage('');
    try {await action();if(alive.current)setAttempt(v=>v+1);}
    catch(failure){if(alive.current)setError(failure instanceof Error?failure.message:'Could not save. Your text is retained.');}
    finally{lock.current=false;if(alive.current)setBusy(false);}
  }
  function edit() {
    const own=feed?.mine;setRating(own?.rating??0);setText(own?.text??'');setVisitedOn(own?.visitedOn??nepalToday());setConditions(own?.conditions??[]);setEditing(true);setMessage('');
  }
  return <Card><SectionTitle title="Hikers’ reviews & conditions" />
    <Text style={styles.copy}>First-hand experiences, dated by visit. Conditions can change; reports do not establish that a route is safe or open.</Text>
    <Notice message={error} /><Notice message={message} tone="info" />
    {!ready ? <><Text style={styles.copy}>Connect your account to read and share trail feedback. Your saved plans remain available.</Text><Notice message={connectionError} /><Button label="Retry reviews connection" variant="outline" onPress={retry} /></> : <>
      {loading&&<Text style={styles.copy}>Loading trail feedback…</Text>}
      <Button label="Refresh reviews" variant="quiet" disabled={busy||loading} onPress={()=>setAttempt(v=>v+1)} />
      {feed&&<>
        <Text style={styles.copy}>{feed.reviews.length ? `Latest ${feed.reviews.length} published reviews` : 'No published reviews yet. Share your experience after your hike.'}</Text>
        {feed.mine&&<><Badge label={`YOUR REVIEW · ${feed.mine.status.toUpperCase()}`} tone={feed.mine.status==='published'?'lime':'warning'} /><Text style={styles.copy}>{feed.mine.rating}/5 · Visited {feed.mine.visitedOn}{feed.mine.status==='pending'?' · Awaiting moderation. Edits return to review.':''}</Text></>}
        {!editing&&<Button label={feed.mine?'Edit my review':'Write a review'} variant="outline" disabled={busy} onPress={edit} />}
      </>}
      {editing&&<>
        <Text style={styles.copy}>Rating</Text><View style={styles.row}>{[1,2,3,4,5].map(value=><Chip key={value} label={`${value} ★`} selected={rating===value} onPress={()=>{if(!busy)setRating(value);}} />)}</View>
        <Field label="Visit date · YYYY-MM-DD" value={visitedOn} editable={!busy} onChangeText={setVisitedOn} maxLength={10} />
        <Field label="Your hiking experience" hint={`${text.length}/1500 characters`} value={text} onChangeText={setText} editable={!busy} maxLength={1500} multiline style={{minHeight:110,textAlignVertical:'top'}} />
        <Text style={styles.copy}>Conditions you experienced (optional)</Text><View style={styles.row}>{(Object.keys(conditionLabels) as TrailCondition[]).map(value=><Chip key={value} label={conditionLabels[value]} selected={conditions.includes(value)} onPress={()=>{if(!busy)setConditions(items=>items.includes(value)?items.filter(i=>i!==value):[...items,value]);}} />)}</View>
        <Text style={styles.copy}>Your display name, visit date and review will be shared with other Navo users after moderation. Keep private contact details and precise personal locations out of your text.</Text>
        <Button label="Submit for review" busy={busy} disabled={busy} onPress={()=>{const problem=reviewDraftError(rating,text,visitedOn,nepalToday());if(problem){setError(problem);return;}void act(async()=>{await api(`/routes/${trekId}/reviews/mine`,{rating,text:text.trim(),visitedOn,conditions},'PUT');if(alive.current){setEditing(false);setMessage('Submitted for moderation. It will appear to other hikers after approval.');}});}} />
        <Button label="Cancel editing" variant="quiet" disabled={busy} onPress={()=>setEditing(false)} />
      </>}
      {feed?.mine&&!editing&&<Button label="Remove my review" variant="quiet" disabled={busy} onPress={()=>setDeleting(true)} />}
      {deleting&&<><Text style={styles.copy}>Remove your review from this trail?</Text><Button label="Confirm removal" variant="danger" busy={busy} disabled={busy} onPress={()=>void act(async()=>{await api(`/routes/${trekId}/reviews/mine`,undefined,'DELETE');if(alive.current){setDeleting(false);setMessage('Your review was removed.');}})} /><Button label="Keep my review" variant="quiet" disabled={busy} onPress={()=>setDeleting(false)} /></>}
      {Boolean(feed?.reviews.length)&&<>
        <Text style={styles.title}>{summary.average?.toFixed(1)}/5 across these {summary.count} reviews</Text>
        <Field label="Search these reviews" value={query} onChangeText={setQuery} maxLength={150} placeholder="Conditions, experience or hiker…" />
        <View style={styles.row}><Chip label="All conditions" selected={filter==='all'} onPress={()=>setFilter('all')} />{(Object.keys(conditionLabels) as TrailCondition[]).map(c=><Chip key={c} label={conditionLabels[c]} selected={filter===c} onPress={()=>setFilter(c)} />)}</View>
        {!visible.length&&<Text style={styles.copy}>No reviews match these filters.</Text>}
      </>}
      {visible.map(item=><View key={item.id} style={styles.review}>
        <Text style={styles.title}>{item.rating}/5 · {item.authorName}</Text><Text style={styles.copy}>Visited {item.visitedOn}</Text><Text style={styles.copy}>{item.text}</Text>
        {item.conditions.length>0&&<Text style={styles.copy}>{item.conditions.map(c=>conditionLabels[c]).join(' · ')}</Text>}
        {item.id!==feed?.mine?.id&&<Button label="Report review" variant="quiet" disabled={busy} onPress={()=>setReportId(item.id)} />}
        {reportId===item.id&&<><Text style={styles.copy}>Why are you reporting this review?</Text><View style={styles.row}>{(['spam','abuse','inaccurate','off-topic'] as const).map(reason=><Chip key={reason} label={reason} selected={false} onPress={()=>{if(!busy)void act(async()=>{await api(`/routes/${trekId}/reviews/${item.id}/report`,{reason});if(alive.current){setReportId('');setMessage('Report received for moderation.');}});}} />)}</View><Button label="Cancel report" variant="quiet" disabled={busy} onPress={()=>setReportId('')} /></>}
      </View>)}
    </>}
  </Card>;
}
const useStyles=createThemedStyles(t => StyleSheet.create({row:{flexDirection:'row',flexWrap:'wrap',gap:8},copy:{color:t.secondaryText,fontSize:14,lineHeight:22},title:{color:t.ink,fontSize:16,fontWeight:'700'},review:{gap:8,paddingVertical:14,borderTopWidth:1,borderTopColor:t.border}}));
