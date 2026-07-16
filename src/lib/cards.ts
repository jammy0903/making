// 카드 파생값 공용 헬퍼 (서버 SSR·클라 공용 — 순수 함수만)
import type { MemeCard, MediaItem } from '$lib/server/db';
import { m as t } from '$lib/paraglide/messages'; // 함수 파라미터 m과 충돌 피하려 t로 alias

// 표시할 미디어 목록: media 배열 우선, 없으면 photo_url/video_url 폴백(하위호환)
export function gallery(m: MemeCard): MediaItem[] {
  if (m.media && m.media.length) return m.media;
  const out: MediaItem[] = [];
  if (m.photoUrl) out.push({ type: 'image', url: m.photoUrl });
  if (m.videoUrl) out.push({ type: 'video', url: m.videoUrl });
  return out;
}
// 유튜브 링크 → 영상 ID / 썸네일 / 임베드 URL. 유튜브가 아니면 null/''.
// (관리자가 동영상을 파일 업로드 대신 유튜브 링크로 넣을 수 있음 — 그땐 <video> 대신 썸네일·임베드로 렌더)
export function ytId(url: string): string | null {
  const m = String(url || '').match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
}
export function ytThumb(url: string): string {
  const id = ytId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : '';
}
export function ytEmbed(url: string): string {
  const id = ytId(url);
  return id ? `https://www.youtube.com/embed/${id}` : '';
}

// 카드 썸네일용 대표 이미지(없으면 빈 문자열)
export function coverImage(m: MemeCard): string {
  if (m.photoUrl) return m.photoUrl;
  const img = (m.media || []).find((x) => x.type === 'image');
  return img ? img.url : '';
}

// steady여도 사진이 최근에 새로 올라왔으면 "새로올라온" 탭에 노출
const RECENT_PHOTO_DAYS = 14;
function hasRecentPhoto(c: MemeCard) {
  if (!c.photoUpdatedAt) return false;
  return Date.now() - new Date(c.photoUpdatedAt).getTime() <= RECENT_PHOTO_DAYS * 86400000;
}
export function newCards(cards: MemeCard[]) {
  return cards
    .filter((c) => c.status === 'new' || hasRecentPhoto(c))
    .sort((a, b) => {
      const at = a.photoUpdatedAt ? new Date(a.photoUpdatedAt).getTime() : 0;
      const bt = b.photoUpdatedAt ? new Date(b.photoUpdatedAt).getTime() : 0;
      return bt - at; // 사진 새로 올라온 순 우선, 그 외는 기존(생성일 desc) 순서 유지
    });
}
export function steadyCards(cards: MemeCard[]) {
  return cards.filter((c) => c.status === 'steady').sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity));
}
export function deadCards(cards: MemeCard[]) {
  return cards
    .filter((c) => c.status === 'dead')
    .sort((a, b) => new Date(b.died || 0).getTime() - new Date(a.died || 0).getTime());
}
// 태그 표시: 항상 앞에 # 하나(이미 있으면 중복 안 붙임, 없으면 붙임). 필터/링크 값은 원본 사용.
export function displayTag(t: string) {
  return '#' + String(t || '').replace(/^#+/, '');
}
export function tagText(m: MemeCard) {
  return (m.tags || []).map(displayTag).join(' ');
}

// 사전 검색 — 이름/설명/분류/태그를 공백 제거·소문자로 비교. 이름 일치 우선.
const norm = (s: string) => (s || '').toLowerCase().replace(/\s+/g, '');
export function searchCards(cards: MemeCard[], q: string) {
  const n = norm(q);
  if (!n) return [];
  const hit = cards.filter((c) =>
    norm([c.name, c.desc, c.cat, ...(c.tags || [])].join(' ')).includes(n)
  );
  return hit.sort((a, b) => (norm(a.name).includes(n) ? 0 : 1) - (norm(b.name).includes(n) ? 0 : 1));
}

// 상태 라벨 (검색 결과에서 밈이 어느 구역인지)
export function statusLabel(m: MemeCard) {
  return m.status === 'new' ? t.status_new() : m.status === 'dead' ? t.status_dead() : t.status_steady();
}
export function metaNew(m: MemeCard) {
  const age = m.days === 0 ? t.meta_added_today() : t.meta_added_days({ days: m.days });
  return `${age} · ${t.meta_comments({ count: m.commentCount })}`;
}
export function metaSteady(m: MemeCard) {
  const src = m.rankSources ? t.meta_sources({ count: m.rankSources }) : t.meta_await();
  return `${src} · ${t.meta_registered_months({ months: m.months })}`;
}
export function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return t.time_now();
  if (min < 60) return t.time_min({ n: min });
  const hr = Math.floor(min / 60);
  if (hr < 24) return t.time_hour({ n: hr });
  return t.time_day({ n: Math.floor(hr / 24) });
}
