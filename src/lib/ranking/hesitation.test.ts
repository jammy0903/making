import { describe, it, expect } from 'vitest';
import { summarize, formatSeconds, DEFAULT_CLAMP_MS, type CompareLog } from './hesitation';

const mk = (winnerName: string, loserName: string, ms: number): CompareLog => ({
	winnerId: winnerName,
	loserId: loserName,
	winnerName,
	loserName,
	ms
});

describe('formatSeconds', () => {
	it('ms를 소수 첫째 자리 초로 포맷', () => {
		expect(formatSeconds(11234)).toBe('11.2');
		expect(formatSeconds(400)).toBe('0.4');
		expect(formatSeconds(0)).toBe('0.0');
	});
});

describe('summarize', () => {
	it('빈 로그: 모두 null/0', () => {
		const s = summarize([]);
		expect(s.count).toBe(0);
		expect(s.mostAgonized).toBeNull();
		expect(s.instant).toBeNull();
		expect(s.totalMs).toBe(0);
		expect(s.meanMs).toBe(0);
	});

	it('단일 로그: 최고=최저=동일', () => {
		const s = summarize([mk('A', 'B', 5000)]);
		expect(s.count).toBe(1);
		expect(s.mostAgonized?.winnerName).toBe('A');
		expect(s.instant?.winnerName).toBe('A');
		expect(s.mostAgonized?.seconds).toBe('5.0');
	});

	it('최고 고뇌 / 0초컷을 정확히 고른다', () => {
		const s = summarize([mk('A', 'B', 11200), mk('C', 'D', 400), mk('E', 'F', 3000)]);
		expect(s.mostAgonized?.winnerName).toBe('A');
		expect(s.mostAgonized?.seconds).toBe('11.2');
		expect(s.instant?.winnerName).toBe('C');
		expect(s.instant?.seconds).toBe('0.4');
	});

	it('total/mean 은 원본 기준(클램프 전)으로 계산', () => {
		const s = summarize([mk('A', 'B', 1000), mk('C', 'D', 3000)]);
		expect(s.totalMs).toBe(4000);
		expect(s.meanMs).toBe(2000);
	});

	it('클램프는 표시(Duel)에만, 원본 total 은 보존', () => {
		// 45초(AFK 의심) + 정상 11.2초
		const s = summarize([mk('AFK', 'X', 45000), mk('A', 'B', 11200)], DEFAULT_CLAMP_MS);
		// 표시값은 30초로 상한
		expect(s.mostAgonized?.winnerName).toBe('AFK');
		expect(s.mostAgonized?.ms).toBe(DEFAULT_CLAMP_MS);
		expect(s.mostAgonized?.seconds).toBe('30.0');
		// 원본 합은 클램프되지 않음
		expect(s.totalMs).toBe(56200);
	});

	it('undo 정합: push → pop(마지막 제거) → 재선택 push 시 현재 로그만 반영', () => {
		const base = [mk('A', 'B', 2000), mk('C', 'D', 8000)];
		// 마지막(C,D 8초)을 undo 로 pop
		const afterUndo = base.slice(0, -1);
		expect(summarize(afterUndo).count).toBe(1);
		expect(summarize(afterUndo).mostAgonized?.winnerName).toBe('A');
		// 되돌린 뒤 다른 선택을 다시 함(D,C 500ms) → 이전 8초 기록은 사라지고 없어야 함
		const rechosen = [...afterUndo, mk('D', 'C', 500)];
		const s = summarize(rechosen);
		expect(s.count).toBe(2);
		expect(s.mostAgonized?.winnerName).toBe('A'); // 2초 (8초는 사라짐)
		expect(s.instant?.winnerName).toBe('D'); // 0.5초
		expect(s.totalMs).toBe(2500);
	});
});
