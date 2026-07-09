import { describe, it, expect } from 'vitest';
import { analyzeConsistency, type Comparison } from './consistency';

const cmp = (winnerId: string, loserId: string): Comparison => ({ winnerId, loserId });

describe('analyzeConsistency', () => {
	it('완전 이행적이면 100점, 순환·번복 없음', () => {
		// A>B, B>C, A>C (이행적)
		const r = analyzeConsistency([cmp('A', 'B'), cmp('B', 'C'), cmp('A', 'C')]);
		expect(r.score).toBe(100);
		expect(r.cycles).toHaveLength(0);
		expect(r.flipFlops).toBe(0);
		expect(r.comparedPairs).toBe(3);
		expect(r.contradictions).toBe(0);
	});

	it('가위바위보(A>B>C>A) 3-순환 1개 탐지', () => {
		const r = analyzeConsistency([cmp('A', 'B'), cmp('B', 'C'), cmp('C', 'A')]);
		expect(r.cycles).toHaveLength(1);
		expect(new Set(r.cycles[0].ids)).toEqual(new Set(['A', 'B', 'C']));
		expect(r.contradictions).toBe(3); // 세 쌍 모두 순환에 얽힘
		expect(r.score).toBe(0); // 3쌍 전부 모순
	});

	it('번복(같은 쌍 양방향)을 flipFlop 으로 집계', () => {
		const r = analyzeConsistency([cmp('A', 'B'), cmp('B', 'A')]);
		expect(r.flipFlops).toBe(1);
		expect(r.comparedPairs).toBe(1);
		expect(r.contradictions).toBe(1);
		expect(r.score).toBe(0);
	});

	it('우세 방향이 있으면 소수 번복이 있어도 방향은 다수결', () => {
		// A가 B를 2번, B가 A를 1번 → 우세 A>B, 하지만 번복 쌍
		const r = analyzeConsistency([cmp('A', 'B'), cmp('A', 'B'), cmp('B', 'A'), cmp('B', 'C'), cmp('A', 'C')]);
		expect(r.flipFlops).toBe(1); // A-B 쌍
		expect(r.cycles).toHaveLength(0); // 우세방향 A>B,B>C,A>C = 이행적
		expect(r.comparedPairs).toBe(3);
		expect(r.contradictions).toBe(1); // A-B 번복만
		expect(r.score).toBe(67); // (3-1)/3
	});

	it('이름 매핑을 순환 표시에 채운다', () => {
		const names: Record<string, string> = { A: '신라면', B: '진라면', C: '너구리' };
		const r = analyzeConsistency([cmp('A', 'B'), cmp('B', 'C'), cmp('C', 'A')], (id) => names[id]);
		expect(new Set(r.cycles[0].names)).toEqual(new Set(['신라면', '진라면', '너구리']));
	});

	it('빈 입력은 100점', () => {
		const r = analyzeConsistency([]);
		expect(r.score).toBe(100);
		expect(r.comparedPairs).toBe(0);
	});

	it('4개 순환 안 겹치게: A>B>C>A + D는 전부 짐 → 순환 1개', () => {
		const r = analyzeConsistency([
			cmp('A', 'B'), cmp('B', 'C'), cmp('C', 'A'),
			cmp('A', 'D'), cmp('B', 'D'), cmp('C', 'D')
		]);
		expect(r.cycles).toHaveLength(1);
		expect(r.comparedPairs).toBe(6);
		expect(r.contradictions).toBe(3); // A-B,B-C,C-A
		expect(r.score).toBe(50); // (6-3)/6
	});
});
