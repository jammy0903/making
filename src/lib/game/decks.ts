/**
 * "그런데이제" 콘텐츠 덱 (하드코딩 MVP).
 * 정본 스펙: docs/game-design.md §C · §E-1. 출처: balance-game-plan §4.1·4.2, game-design §C-5.
 *
 * 페널티는 강도 2~10 (9장). 1판은 맨몸(페널티 없음) — A-2: "N판엔 강도-N 카드".
 * 나중에 Supabase `decks` 테이블 로드로 교체(§E-1). 지금은 정적 데이터.
 */

export interface Penalty {
	/** 붙는 판 번호 = 강도 (2~10) */
	strength: number;
	/** "그런데 이제 ___" 뒤에 붙어 "~해도/~이어도"로 끝나는 문구 */
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
			penalties: pens([
				'에어컨 없어도',
				'지하철 만원 30분 서서 가야 해도',
				'옆자리 상사가 하루종일 창문 열어놔도',
				'취업 면접이 다 여름 낮 2시여도',
				'40도 폭염에 습도 90%여도',
				'애인이 나 대신 겨울을 좋아해도',
				'월급 30% 삭감이어도',
				'계약 조건이 "여름에만 일해야 함"이어도',
				'평생 여름만, 겨울은 다신 못 봐도'
			])
		},
		b: {
			name: '겨울',
			emoji: '❄️',
			penalties: pens([
				'히터 고장이어도',
				'폭설로 출근 3시간이어도',
				'감기 2주에 목소리 안 나와도',
				'연말 지출 폭탄이어도',
				'이별 통보를 크리스마스에 받아도',
				'시험 당일 폭설로 시험장 못 가도',
				'손발 동상이어도',
				'계약 조건이 "겨울에만 일해야 함"이어도',
				'평생 겨울만, 여름은 다신 못 봐도'
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
			penalties: pens([
				'데이트마다 본인 셀카 200장 찍느라 넌 뒷전이어도',
				'거울 앞을 못 지나쳐 매번 1시간 늦어도',
				'코골이에 이갈이 풀세트여도',
				'화장실 문 안 닫고 큰일 보며 말 걸어도',
				'분위기 잡다 갑자기 배 아프다며 매번 뛰쳐나가도',
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
				'친구들이 "왜 하필 쟤?"를 매번 물어봐도',
				'진지한 얘기마다 5초에 한 번 드립쳐도',
				'프러포즈도 개그로 해서 감동이 0이어도',
				'중요한 순간마다 방귀로 분위기 깨도',
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
