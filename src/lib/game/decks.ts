/**
 * "그런데이제" 콘텐츠 덱 (하드코딩 MVP).
 * 정본 스펙: docs/game-design.md §C · §E-1. 출처: balance-game-plan §4.1·4.2, game-design §C-5.
 *
 * 페널티는 강도 2~10 (9장). 1판은 맨몸(페널티 없음) — A-2: "N판엔 강도-N 카드".
 * 강도 곡선은 3막 구조(자문 B-4): 2~3막 가벼운 웃음 / 4~7 현실적 트레이드오프 / 8~10 인생 결단.
 * 나중에 Supabase `decks` 테이블 로드로 교체(§E-1). 지금은 정적 데이터.
 */

export interface Penalty {
	/** 붙는 판 번호 = 강도 (2~10) */
	strength: number;
	/** "그런데 이제 ___" 뒤에 붙는 짧은 조건. 설명 말고 조건만(예: "히터 없음", "외투 1개뿐") */
	text: string;
}

export interface Side {
	name: string;
	emoji: string;
	/** 강도 2~10 순서대로 9장 */
	penalties: Penalty[];
}

export interface Deck {
	id: string;
	title: string;
	icon: string;
	a: Side;
	b: Side;
}

/** 강도 2~10 텍스트 배열을 Penalty[]로 (인덱스 0 = 강도 2) */
function pens(texts: string[]): Penalty[] {
	return texts.map((text, i) => ({ strength: i + 2, text }));
}

export const DECKS: Deck[] = [
	{
		id: 'summer-winter',
		title: '여름 vs 겨울',
		icon: '🌡️',
		a: {
			name: '여름',
			emoji: '🌞',
			// 조건만 던지고 나머진 상상하게. 여름의 본질을 강도순으로 극대화.
			penalties: pens([
				'선풍기 1대뿐',
				'매일 열대야',
				'에어컨 없음',
				'모기장 없음',
				'하루종일 땀범벅',
				'온몸에 땀띠',
				'습도 90% 찜통',
				'사계절 내내 40도',
				'평생 여름만'
			])
		},
		b: {
			name: '겨울',
			emoji: '❄️',
			// 겨울의 본질을 강도순으로 극대화. 여름과 대칭.
			penalties: pens([
				'외투 1개뿐',
				'매일 손발 시림',
				'히터 없음',
				'이불 밖 금지',
				'손 트고 입술 갈라짐',
				'매일 빙판길',
				'손발 동상',
				'사계절 내내 영하 20도',
				'평생 겨울만'
			])
		}
	},
	{
		id: 'marriage',
		title: '결혼한다면? 얼굴천재 vs 개그천재',
		icon: '💍',
		a: {
			name: '얼굴천재',
			emoji: '🤩',
			// 1막 가벼운 웃음 · 2막 현실 트레이드오프 · 3막 인생 결단
			penalties: pens([
				'코골이에 이갈이 풀세트여도',
				'거울 앞을 못 지나쳐 매번 1시간 늦어도',
				'데이트마다 본인 셀카 200장 찍느라 넌 뒷전이어도',
				'분위기 잡다 갑자기 배 아프다며 매번 뛰쳐나가도',
				'화장실 문 안 닫고 큰일 보며 말 걸어도',
				'월급 전부 피부과·옷에 쓰고 생활비는 네가 다 내도',
				'전 애인 20명이 아직 연락 오고 답장도 해도',
				'시어머니가 열쇠 들고 예고 없이 들이닥쳐도',
				'평생 잘생겼지만 평생 철은 안 들어도'
			])
		},
		b: {
			name: '개그천재',
			emoji: '😆',
			penalties: pens([
				'같이 찍은 사진마다 너만 잘 나와도',
				'진지한 얘기마다 5초에 한 번 드립쳐도',
				'중요한 순간마다 방귀로 분위기 깨도',
				'프러포즈도 개그로 해서 감동이 0이어도',
				'친구들이 "왜 하필 쟤?"를 매번 물어봐도',
				'집에선 안 웃기고 밖에서만 인싸여도',
				'예능 스케줄로 신혼집을 자주 비워도',
				'장모님 앞에서까지 드립치다 미움받아도',
				'평생 안 잘생겼어도'
			])
		}
	}
];

export function getDeck(id: string): Deck | undefined {
	return DECKS.find((d) => d.id === id);
}
