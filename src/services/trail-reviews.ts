export const conditionLabels = {muddy:'Muddy',wet:'Wet',snow:'Snow',crowded:'Crowded',quiet:'Quiet',bugs:'Bugs',obstructed:'Obstructed'} as const;
export type TrailCondition = keyof typeof conditionLabels;
export type TrailReview = {id:string;rating:number;text:string;visitedOn:string;conditions:TrailCondition[];authorName:string;updatedAt:string;status:'published'|'pending'|'rejected'};
export type ReviewFeed = {reviews:TrailReview[];mine:TrailReview|null;limit:number};
function object(v:unknown):v is Record<string,unknown> { return Boolean(v)&&typeof v==='object'&&!Array.isArray(v); }
function date(v:unknown):v is string { return typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v; }
function review(v:unknown):v is TrailReview {
  return object(v)&&typeof v.id==='string'&&/^[a-f0-9]{64}$/.test(v.id)&&typeof v.rating==='number'&&Number.isInteger(v.rating)&&v.rating>=1&&v.rating<=5&&typeof v.text==='string'&&v.text.trim().length>=10&&v.text.length<=1500&&date(v.visitedOn)&&typeof v.authorName==='string'&&v.authorName.length<=100&&typeof v.updatedAt==='string'&&Number.isFinite(Date.parse(v.updatedAt))&&['published','pending','rejected'].includes(String(v.status))&&Array.isArray(v.conditions)&&v.conditions.length<=7&&v.conditions.every(c=>typeof c==='string'&&Object.hasOwn(conditionLabels,c));
}
export function decodeReviewFeed(value:unknown):ReviewFeed {
  if (!object(value)||value.limit!==20||!Array.isArray(value.reviews)||value.reviews.length>20||!value.reviews.every(r=>review(r)&&r.status==='published')||(value.mine!==null&&!review(value.mine))) throw new Error('Trail feedback could not be read. Please retry.');
  return value as ReviewFeed;
}
export function reviewDraftError(rating:number,text:string,visitedOn:string,today:string) {
  if (!Number.isInteger(rating)||rating<1||rating>5) return 'Choose a rating from 1 to 5.';
  if (text.trim().length<10||text.trim().length>1500) return 'Write between 10 and 1,500 characters about your hike.';
  if (!date(visitedOn)||visitedOn>today) return 'Enter a valid visit date up to today (YYYY-MM-DD).';
  return '';
}

export function findReviews(reviews:TrailReview[],query:string,condition:TrailCondition|'all'='all') {
  const normalize=(value:string)=>value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const words=normalize(query.trim()).split(/\s+/).filter(Boolean);
  return reviews.filter(item=>item.status==='published'&&(condition==='all'||item.conditions.includes(condition))&&words.every(word=>normalize(`${item.authorName} ${item.text} ${item.conditions.map(c=>conditionLabels[c]).join(' ')}`).includes(word)));
}
export function visibleReviewSummary(reviews:TrailReview[]) {
  const published=reviews.filter(item=>item.status==='published');
  return {count:published.length,average:published.length?published.reduce((n,r)=>n+r.rating,0)/published.length:null};
}
