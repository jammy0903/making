/**
 * "그런데이제" 게임 엔진 — 무-AI 결정론(docs/game-design.md §A). UI 없이 순수 계산만.
 *
 * 규칙 요약:
 * - 10판. 사이드 0=a, 1=b. `choices[i]` = i판(0-based)에 고른 사이드.
 * - 1판(i=0): 맨몸, 순수 취향. 2판부터 판 시작 시 **직전에 고른 내 편**에 그 판 강도(=판 번호) 페널티가 붙는다.
 * - 강도 = 판 번호(A-2). 반대편은 안 건드림, 누적 리셋 없음(페널티-온리).
 */
import { TYPE_CONFIG, type Deck, type Penalty, type ResultFraming } from './decks';

export const ROUNDS = 10;
export type SideIndex = 0 | 1;

function side(deck: Deck, s: SideIndex) {
	return s === 0 ? deck.a : deck.b;
}

/** roundNum(1-based)에 `s`편에 붙는 페널티. 1판은 null(맨몸). */
export function penaltyForRound(deck: Deck, s: SideIndex, roundNum: number): Penalty | null {
	if (roundNum < 2) return null;
	return side(deck, s).penalties[roundNum - 2] ?? null;
}

/** i판(0-based)의 "내 편"에 붙는 이번 판 페널티. i=0이면 null. */
export function penaltyAddedAt(deck: Deck, choices: SideIndex[], i: number): Penalty | null {
	if (i < 1) return null;
	const mine = choices[i - 1];
	return penaltyForRound(deck, mine, i + 1);
}

/**
 * 결정할 판(= choices.length)까지 각 사이드에 쌓인 페널티 목록.
 * 이번 판의 새 페널티는 "내 편"에 이미 붙은 상태로 포함된다(플레이어가 보고 결정).
 */
export function accumulated(deck: Deck, choices: SideIndex[]): [Penalty[], Penalty[]] {
	const roundIndex = choices.length; // 결정할 판(0-based)
	const acc: [Penalty[], Penalty[]] = [[], []];
	for (let i = 1; i <= roundIndex; i++) {
		const mine = choices[i - 1];
		const p = penaltyForRound(deck, mine, i + 1);
		if (p) acc[mine].push(p);
	}
	return acc;
}

/** 선택 시퀀스를 URL 안전 문자열로(공유·비교용). 0/1 문자열. */
export function encodeChoices(choices: SideIndex[]): string {
	return choices.map((c) => (c === 0 ? '0' : '1')).join('');
}

/** 공유 문자열 → 완주(10판) 선택 시퀀스. 형식이 안 맞으면 null. */
export function decodeChoices(s: string | null | undefined): SideIndex[] | null {
	if (!s || !/^[01]{10}$/.test(s)) return null;
	return s.split('').map((ch) => (ch === '1' ? 1 : 0) as SideIndex);
}

export interface RoundResult {
	pref: SideIndex;
	burned: SideIndex;
	/** 선호편에서 "버팀"으로 감수한 페널티(강도 내림차순) */
	enduredPref: Penalty[];
	/** 편별 완주 강도 = 그 편을 지키며 버틴 최고 강도(안 버틴 편 0) */
	holdMax: [number, number];
	/** 편별 비용가중 감수 점수 */
	score: [number, number];
	switches: number;
	/** 매 판 갈아타 어느 쪽도 못 버틴 유형(자문: 오실레이션 별도 결과) */
	indecisive: boolean;
	/** 결과 카드 하단 한 줄(손절 시점별 말투) */
	verdict: string;
}

/**
 * 결과 계산(§A-5): 비용가중 감수 강도로 선호편 판정 + 버틴 깊이 대조.
 * `choices`는 길이 10 가정.
 */
export function computeResult(deck: Deck, choices: SideIndex[]): RoundResult {
	const score: [number, number] = [0, 0];
	const holdMax: [number, number] = [0, 0];
	const enduredBySide: [Penalty[], Penalty[]] = [[], []];
	let switches = 0;

	// 1판(맨몸)도 순수 취향 정보 → 기본 가중치 1(자문 A-5: 1판 정보 살리기).
	if (choices.length > 0) score[choices[0]] += 1;

	for (let i = 1; i < choices.length; i++) {
		const roundNum = i + 1;
		if (choices[i] === choices[i - 1]) {
			// 버팀 — 직전 편 유지
			const s = choices[i];
			score[s] += roundNum;
			if (roundNum > holdMax[s]) holdMax[s] = roundNum;
			const p = penaltyForRound(deck, s, roundNum);
			if (p) enduredBySide[s].push(p);
		} else {
			switches++;
		}
	}

	// 매 판 갈아탄 유형: 어느 쪽도 제대로 못 버팀(자문 A-4).
	const indecisive = switches >= 4;

	let pref: SideIndex;
	if (score[0] > score[1]) pref = 0;
	else if (score[1] > score[0]) pref = 1;
	else pref = choices[choices.length - 1]; // 동점 → 마지막 판 타이브레이크(방어적 폴백)
	const burned: SideIndex = pref === 0 ? 1 : 0;

	const enduredPref = [...enduredBySide[pref]].sort((a, b) => b.strength - a.strength);

	return {
		pref,
		burned,
		enduredPref,
		holdMax,
		score,
		switches,
		indecisive,
		verdict: verdictLine(deck, pref, burned, holdMax, switches, indecisive)
	};
}

/**
 * 결과 문안을 유형 프레이밍(§9)별로 갈래친다. 상태는 4가지로 공통:
 * indecisive / rooted(스위치 0) / shallow(버린 편 얕음) / leaned(버린 편도 갔지만 기욺).
 * `strategy`(상황형)는 스위치=재계산이라 문구가 잠정적 — Phase 3에서 결과 로직과 함께 확정.
 */
interface VerdictStrings {
	indecisive: string;
	rooted: (pref: string) => string;
	shallow: (burned: string) => string;
	leaned: (pref: string, burned: string) => string;
}

const FRAMING_VERDICTS: Record<ResultFraming, VerdictStrings> = {
	preference: {
		indecisive: '한 쪽에 정착 못 하고 계속 갈아탄 유형.',
		rooted: (p) => `아무것도 못 흔든 ${p} 근본.`,
		shallow: (b) => `${b}엔 애초에 정이 없었네.`,
		leaned: (p, b) => `${b}도 여기까진 갔지만, 결국 ${p} 쪽으로 마음이 기울었네.`
	},
	tolerance: {
		indecisive: '누구랑도 오래 못 버티고 갈아탄 유형.',
		rooted: (p) => `${p}이면 뭐든 견디고 사는 사람.`,
		shallow: (b) => `${b}은 진작에 못 견뎠네.`,
		leaned: (p, b) => `${b}도 꽤 견뎠지만, 결국 ${p} 쪽을 안고 가기로 했네.`
	},
	desire: {
		indecisive: '이것도 저것도 못 놓고 계속 갈아탄 유형.',
		rooted: (p) => `끝까지 ${p}을 원한 사람.`,
		shallow: (b) => `${b}은 별로 안 당겼네.`,
		leaned: (p, b) => `${b}도 탐났지만, 결국 ${p}을 원했네.`
	},
	values: {
		indecisive: '어느 가치도 못 정하고 계속 갈아탄 유형.',
		rooted: (p) => `${p}을 끝까지 지킨 사람.`,
		shallow: (b) => `${b}은 애초에 우선순위가 아니었네.`,
		leaned: (p, b) => `${b}도 고민됐지만, 결국 ${p}이 더 중요했네.`
	},
	strategy: {
		indecisive: '상황마다 판단이 갈린 유형.',
		rooted: (p) => `끝까지 ${p}으로 밀어붙인 타입.`,
		shallow: (b) => `${b}은 금방 접었네.`,
		leaned: (p, b) => `${b}도 시도했지만, 결국 ${p} 쪽으로 갔네.`
	}
};

/** 결과 헤드라인 꼬리(§9 결과 프레이밍). "그래도 <편> ___" 뒤에 붙는다. */
const FRAMING_HEADLINE_TAIL: Record<ResultFraming, string> = {
	preference: '못 버리는 사람',
	tolerance: '견디고 사는 사람',
	desire: '원하는 사람',
	values: '지키는 사람',
	strategy: '밀어붙이는 타입'
};

export function headlineTail(deck: Deck): string {
	return FRAMING_HEADLINE_TAIL[TYPE_CONFIG[deck.type].framing];
}

function verdictLine(
	deck: Deck,
	pref: SideIndex,
	burned: SideIndex,
	holdMax: [number, number],
	switches: number,
	indecisive: boolean
): string {
	const prefName = side(deck, pref).name;
	const burnedName = side(deck, burned).name;
	const v = FRAMING_VERDICTS[TYPE_CONFIG[deck.type].framing];
	if (indecisive) return v.indecisive;
	if (switches === 0) return v.rooted(prefName);
	if (holdMax[burned] <= 3) return v.shallow(burnedName);
	return v.leaned(prefName, burnedName);
}
