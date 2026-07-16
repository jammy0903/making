// 카드 파생값 공용 헬퍼 (서버 SSR·클라 공용 — 순수 함수만)
import type { MemeCard, MediaItem } from '$lib/server/db';

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

export function newCards(cards: MemeCard[]) {
  return cards.filter((c) => c.status === 'new');
}
export function steadyCards(cards: MemeCard[]) {
  return cards.filter((c) => c.status === 'steady').sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity));
}
export function deadCards(cards: MemeCard[]) {
  return cards
    .filter((c) => c.status === 'dead')
    .sort((a, b) => new Date(b.died || 0).getTime() - new Date(a.died || 0).getTime());
}
export function tagText(m: MemeCard) {
  return (m.tags || []).join(' ');
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
  return m.status === 'new' ? '새 밈' : m.status === 'dead' ? '† 부고' : '스테디';
}
export function metaNew(m: MemeCard) {
  const age = m.days === 0 ? '오늘 등록' : `${m.days}일 전 등록`;
  return `${age} · 댓글 ${m.commentCount}개`;
}
export function metaSteady(m: MemeCard) {
  const src = m.rankSources ? `${m.rankSources}개 소스 측정` : '측정 대기';
  return `${src} · 등록 ${m.months}개월 전`;
}
export function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return '방금 전';
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  return `${Math.floor(hr / 24)}일 전`;
}
