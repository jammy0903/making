import { describe, it, expect } from 'vitest';
import { getDeck } from './decks';
import { penaltyForRound, penaltyAddedAt, accumulated, computeResult, type SideIndex } from './engine';

const deck = getDeck('summer-winter')!;

describe('penaltyForRound', () => {
	it('1판은 맨몸(null)', () => {
		expect(penaltyForRound(deck, 0, 1)).toBeNull();
	});
	it('강도 = 판 번호: N판엔 강도-N 카드', () => {
		expect(penaltyForRound(deck, 0, 2)?.strength).toBe(2);
		expect(penaltyForRound(deck, 0, 10)?.strength).toBe(10);
		expect(penaltyForRound(deck, 0, 2)?.text).toBe('에어컨 없어도');
	});
});

describe('penaltyAddedAt / accumulated', () => {
	it('이번 판 페널티는 직전에 고른 내 편에 붙는다', () => {
		// 1판 여름(0) 선택 → 2판 시작 시 여름에 강도2 붙음
		expect(penaltyAddedAt(deck, [0], 1)?.text).toBe('에어컨 없어도');
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

	it('동점이면 마지막 판으로 타이브레이크', () => {
		// 매 판 번갈아 → 버팀 0회, score 0-0 → 마지막(10판·index9) 선택이 선호편
		const choices = [0, 1, 0, 1, 0, 1, 0, 1, 0, 1] as SideIndex[];
		const r = computeResult(deck, choices);
		expect(r.score).toEqual([0, 0]);
		expect(r.pref).toBe(choices[9]);
	});
});
