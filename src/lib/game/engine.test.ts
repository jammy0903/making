import { describe, it, expect } from 'vitest';
import { getDeck } from './decks';
import {
	penaltyForRound,
	penaltyAddedAt,
	accumulated,
	computeResult,
	encodeChoices,
	decodeChoices,
	headlineTail,
	pickResultCard,
	type SideIndex
} from './engine';

const deck = getDeck('summer-winter')!; // 속성형(preference)
const person = getDeck('marriage')!; // 인물형(tolerance)
const scenario = getDeck('zombie')!; // 상황형(strategy)

describe('penaltyForRound', () => {
	it('1판은 맨몸(null)', () => {
		expect(penaltyForRound(deck, 0, 1)).toBeNull();
	});
	it('강도 = 판 번호: N판엔 강도-N 카드', () => {
		expect(penaltyForRound(deck, 0, 2)?.strength).toBe(2);
		expect(penaltyForRound(deck, 0, 10)?.strength).toBe(10);
		// 강도-N 카드 = penalties[N-2] (문구 내용과 무관하게 매핑만 검증)
		expect(penaltyForRound(deck, 0, 2)?.text).toBe(deck.a.penalties[0].text);
	});
});

describe('penaltyAddedAt / accumulated', () => {
	it('이번 판 페널티는 직전에 고른 내 편에 붙는다', () => {
		// 1판 여름(0) 선택 → 2판 시작 시 여름에 강도2(=penalties[0]) 붙음
		expect(penaltyAddedAt(deck, [0], 1)?.text).toBe(deck.a.penalties[0].text);
	});
	it('스위치해도 떠난 편 누적은 보존 + 강도는 판 번호 고정(리셋 없음)', () => {
		// 1·2·3판 = 여름·여름·겨울. 여름엔 강도2·3이 남고(보존),
		// 4판 시작 시 내 편(겨울)에 강도4가 붙는다(강도=판 번호, A-2).
		const [a, b] = accumulated(deck, [0, 0, 1]);
		expect(a.map((p) => p.strength)).toEqual([2, 3]);
		expect(b.map((p) => p.strength)).toEqual([4]);
	});
});

describe('computeResult', () => {
	it('끝까지 한 편만 버티면 그 편이 선호편·완주강도 10', () => {
		const r = computeResult(deck, Array(10).fill(0) as SideIndex[]);
		expect(r.pref).toBe(0);
		expect(r.switches).toBe(0);
		expect(r.holdMax[0]).toBe(10);
		expect(r.verdict).toContain('근본');
	});

	it('비용가중: 후반을 버틴 편이 초반만 버틴 편을 이긴다', () => {
		// 1~5판 여름(0), 6~10판 겨울(1). 겨울 버팀 강도 7·8·9·10 = 34 > 여름 2·3·4·5 = 14
		const choices = [0, 0, 0, 0, 0, 1, 1, 1, 1, 1] as SideIndex[];
		const r = computeResult(deck, choices);
		expect(r.score[1]).toBeGreaterThan(r.score[0]);
		expect(r.pref).toBe(1);
		expect(r.holdMax[1]).toBe(10);
	});

	it('1판 선택도 순수 취향 → 기본 가중치 1', () => {
		const r = computeResult(deck, [0] as SideIndex[]);
		expect(r.score).toEqual([1, 0]);
		expect(r.pref).toBe(0);
	});

	it('매 판 갈아타면 결정장애(indecisive) 유형', () => {
		// 스위치 4회↑ → 어느 쪽도 못 버틴 유형으로 판정
		const choices = [0, 1, 0, 1, 0, 1, 0, 1, 0, 1] as SideIndex[];
		const r = computeResult(deck, choices);
		expect(r.switches).toBe(9);
		expect(r.indecisive).toBe(true);
		expect(r.verdict).toContain('갈아탄');
	});
});

describe('상황형 전략 모드 (Phase 3)', () => {
	const oscillate = [0, 1, 0, 1, 0, 1, 0, 1, 0, 1] as SideIndex[]; // 스위치 9회

	it('preference 모드에선 잦은 스위치 = 결정장애(indecisive)', () => {
		const r = computeResult(deck, oscillate);
		expect(r.mode).toBe('preference');
		expect(r.indecisive).toBe(true);
		expect(r.adaptive).toBe(false);
	});

	it('strategy 모드(상황형)에선 잦은 스위치가 결정장애가 아니라 적응형(adaptive)', () => {
		const r = computeResult(scenario, oscillate);
		expect(r.mode).toBe('strategy');
		expect(r.switches).toBe(9);
		expect(r.indecisive).toBe(false); // ★ 상황형 스위치는 결정장애로 오판되지 않는다
		expect(r.adaptive).toBe(true);
		expect(r.verdict).toContain('적응형');
	});

	it('상황형에서 한 전략 고수 = 우직한 타입(적응형 아님)', () => {
		const r = computeResult(scenario, Array(10).fill(0) as SideIndex[]);
		expect(r.adaptive).toBe(false);
		expect(r.verdict).toContain('우직한');
	});
});

describe('유형 프레이밍 분기 (Phase 1)', () => {
	it('속성형은 취향 프레이밍(근본/버리는), 인물형은 관용 프레이밍(견디는)', () => {
		const solid = Array(10).fill(0) as SideIndex[]; // 스위치 0 → rooted
		expect(computeResult(deck, solid).verdict).toContain('근본');
		expect(computeResult(person, solid).verdict).toContain('견디고 사는');
	});

	it('headlineTail이 유형별로 다르다', () => {
		expect(headlineTail(deck)).toBe('못 버리는 사람'); // preference
		expect(headlineTail(person)).toBe('견디고 사는 사람'); // tolerance
	});

	it('같은 선택 시퀀스라도 유형이 다르면 결과 문안이 다르다', () => {
		const seq = [0, 0, 0, 0, 0, 1, 1, 1, 0, 0] as SideIndex[];
		expect(computeResult(deck, seq).verdict).not.toBe(computeResult(person, seq).verdict);
	});
});

describe('encodeChoices / decodeChoices', () => {
	it('10판 시퀀스를 왕복 인코딩', () => {
		const choices = [0, 1, 1, 0, 1, 0, 0, 1, 0, 1] as SideIndex[];
		const s = encodeChoices(choices);
		expect(s).toBe('0110100101');
		expect(decodeChoices(s)).toEqual(choices);
	});
	it('형식이 안 맞으면 null(완주 10판만 허용)', () => {
		expect(decodeChoices(null)).toBeNull();
		expect(decodeChoices('')).toBeNull();
		expect(decodeChoices('0110')).toBeNull(); // 길이 부족
		expect(decodeChoices('01101001012')).toBeNull(); // 길이 초과
		expect(decodeChoices('011010010x')).toBeNull(); // 잘못된 문자
	});
});

describe('pickResultCard (v3 캐릭터 카드 선택)', () => {
	const attention = getDeck('attention')!;

	it('resultCards 없는 덱(v2)은 null → 버틴깊이 폴백', () => {
		const seq = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] as SideIndex[];
		expect(pickResultCard(deck, computeResult(deck, seq))).toBeNull();
	});

	it('한 편 끝까지 버티면 그 편 극단 카드(강도 8+)', () => {
		const seq = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] as SideIndex[]; // 관종 완주
		const c = pickResultCard(attention, computeResult(attention, seq));
		expect(c).toBe(attention.resultCards!.a.extreme);
	});

	it('중반(강도 5~7)에 갈아타면 애매 카드', () => {
		// a로 6판 버티다(홀드 6) b로 전환 — pref=a, holdMax[a]=6 < 8 → 애매.
		const seq = [0, 0, 0, 0, 0, 0, 1, 1, 1, 1] as SideIndex[];
		const r = computeResult(attention, seq);
		const c = pickResultCard(attention, r);
		const side = r.pref === 0 ? attention.resultCards!.a : attention.resultCards!.b;
		expect(c).toBe(r.holdMax[r.pref] >= 8 ? side.extreme : side.mild);
	});
});
