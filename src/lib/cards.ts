// 카드 파생값 공용 헬퍼 (서버 SSR·클라 공용 — 순수 함수만)
import type { MemeCard } from '$lib/server/db';

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
