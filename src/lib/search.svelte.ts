// 홈 덱 검색·필터 상태. 상단바(레이아웃 헤더)의 입력창·유형칩과 홈 페이지의 필터가 공유한다.
// Svelte 5 룬: .svelte.ts 모듈에서 export한 $state는 앱 전역에서 반응형으로 공유됨.
import type { DeckType } from '$lib/game/decks';

// q: 검색어, type: 선택된 유형 필터(null = 전체).
export const search = $state<{ q: string; type: DeckType | null }>({ q: '', type: null });
