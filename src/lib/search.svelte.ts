// 홈 덱 검색어. 상단바(레이아웃 헤더)의 입력창과 홈 페이지의 필터가 공유한다.
// Svelte 5 룬: .svelte.ts 모듈에서 export한 $state는 앱 전역에서 반응형으로 공유됨.
export const search = $state({ q: '' });
