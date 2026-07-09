import { describe, it, expect } from 'vitest';
import { EloRanker, defaultEloTarget } from './eloRanker';

interface Item {
	id: string;
	rank: number; // 진짜 실력(클수록 강함)
}

const mk = (n: number): Item[] =>
	Array.from({ length: n }, (_, i) => ({ id: `c${i}`, rank: i }));

/** 진짜 실력 오라클로 세션을 끝까지 플레이(항상 rank 큰 쪽이 승). */
function playByOracle(ranker: EloRanker<Item>): Item[] {
	let pair = ranker.next();
	let guard = 0;
	while (pair) {
		if (guard++ > 100_000) throw new Error('세션이 끝나지 않음(무한루프)');
		const winner = pair.a.rank > pair.b.rank ? pair.a : pair.b;
		ranker.answer(winner);
		pair = ranker.next();
	}
	const r = ranker.result();
	if (!r) throw new Error('완료 후 result 가 null');
	return r;
}

describe('defaultEloTarget', () => {
	it('N≤1 은 0, 그 외 후보당 ~(log₂N+1)판 = N·(⌈log₂N⌉+1)/2', () => {
		expect(defaultEloTarget(0)).toBe(0);
		expect(defaultEloTarget(1)).toBe(0);
		expect(defaultEloTarget(2)).toBe(2); // rounds=2 → ceil(2*2/2)
		expect(defaultEloTarget(4)).toBe(6); // rounds=3 → ceil(4*3/2)
		expect(defaultEloTarget(10)).toBe(25); // rounds=5 → ceil(10*5/2)
		expect(defaultEloTarget(16)).toBe(40); // rounds=5 → ceil(16*5/2)
	});
});

describe('EloRanker — 순위 복원(충분한 비교 시)', () => {
	for (const n of [4, 6, 8]) {
		it(`N=${n}: 일관된 오라클이면 진짜 순위를 복원`, () => {
			// 수렴 보장을 위해 목표를 넉넉히(후보당 ~20판) 준다.
			const ranker = new EloRanker(mk(n), { seed: 1, targetComparisons: n * 20 });
			const result = playByOracle(ranker);
			expect(result.map((x) => x.rank)).toEqual(
				[...Array(n).keys()].reverse() // n-1, n-2, …, 0 (강한 순)
			);
		});
	}
});

describe('EloRanker — 기본(가벼운) 목표에서도 순위 품질 유지', () => {
	// 기본 목표는 N·log₂N 보다 낮지만, 일관된 오라클이면 순위 상관이 높아야 한다.
	for (const n of [8, 10]) {
		it(`N=${n}: 기본 목표로도 스피어만 발-거리(어긋난 총량)가 작다`, () => {
			const ranker = new EloRanker(mk(n), { seed: 5 }); // 기본 목표(가벼움)
			const result = playByOracle(ranker);
			// 진짜 순위: rank 큰 순(강→약). result 는 그 순서에 가까워야 한다.
			const truthOrder = [...Array(n).keys()].reverse(); // [n-1, …, 0]
			let footrule = 0;
			result.forEach((item, pos) => {
				footrule += Math.abs(truthOrder.indexOf(item.rank) - pos);
			});
			// 완전 무작위면 ≈ n²/3. 여기선 그 1/4 미만이어야(충분히 정확).
			expect(footrule).toBeLessThan((n * n) / 4);
			expect(result[0].rank).toBe(n - 1); // 최소한 1위는 맞힌다
		});
	}
});

describe('EloRanker — 완료·형태', () => {
	it('기본 목표로 완료되고 모든 후보를 빠짐없이 1회씩 순위에 담는다', () => {
		const items = mk(8);
		const ranker = new EloRanker(items, { seed: 7 });
		const result = playByOracle(ranker);
		expect(result).toHaveLength(8);
		expect(new Set(result.map((x) => x.id)).size).toBe(8); // 중복 없음
	});

	it('progress: done 이 뒤집히고 asked 는 목표(상한)를 넘지 않는다', () => {
		const ranker = new EloRanker(mk(4), { seed: 1 });
		const target = ranker.progress().estimatedTotal;
		expect(ranker.progress().done).toBe(false);
		playByOracle(ranker);
		const p = ranker.progress();
		expect(p.done).toBe(true);
		expect(p.asked).toBeGreaterThanOrEqual(3); // 최소 N-1
		expect(p.asked).toBeLessThanOrEqual(target); // 조기 종료로 상한 이하
	});

	it('N≤1 은 비교 없이 즉시 완료', () => {
		expect(new EloRanker(mk(1)).result()).toHaveLength(1);
		expect(new EloRanker(mk(0)).result()).toHaveLength(0);
	});
});

describe('EloRanker — 확신도 조기 종료(§5-5 되먹임)', () => {
	function playConf(ranker: EloRanker<Item>, confidence: number): number {
		let p = ranker.next();
		let asked = 0;
		while (p) {
			ranker.answer(p.a.rank > p.b.rank ? p.a : p.b, confidence);
			asked++;
			p = ranker.next();
		}
		return asked;
	}

	it('확신(빠른 선택)이 높으면 중립보다 더 적은 비교로 끝난다', () => {
		const n = 12;
		const confident = playConf(new EloRanker(mk(n), { seed: 1 }), 1);
		const neutral = playConf(new EloRanker(mk(n), { seed: 1 }), 0.5);
		expect(confident).toBeLessThan(neutral);
	});

	it('조기 종료해도 일관된 오라클이면 1위는 맞고 상한 이하', () => {
		const n = 10;
		const ranker = new EloRanker(mk(n), { seed: 2 });
		const target = ranker.progress().estimatedTotal;
		const asked = playConf(ranker, 1);
		expect(asked).toBeLessThanOrEqual(target);
		expect(ranker.result()![0].rank).toBe(n - 1);
	});

	it('confidenceSaving:0 이면 반응시간 무관, 항상 목표까지 간다', () => {
		const n = 8;
		const ranker = new EloRanker(mk(n), { seed: 1, confidenceSaving: 0 });
		const target = ranker.progress().estimatedTotal;
		const asked = playConf(ranker, 1);
		expect(asked).toBe(target);
	});
});

describe('EloRanker — 계약/방어', () => {
	it('answer 는 현재 쌍에 없는 winner 를 거부', () => {
		const items = mk(4);
		const ranker = new EloRanker(items, { seed: 1 });
		ranker.next();
		const outsider: Item = { id: 'x', rank: 99 };
		expect(() => ranker.answer(outsider)).toThrow();
	});

	it('next 없이 answer 하면 예외', () => {
		const ranker = new EloRanker(mk(4), { seed: 1 });
		expect(() => ranker.answer(mk(4)[0])).toThrow();
	});

	it('적응형 매치업이라도 모든 후보가 최소 1회는 비교된다', () => {
		const items = mk(6);
		const ranker = new EloRanker(items, { seed: 3 });
		const seen = new Set<string>();
		let pair = ranker.next();
		while (pair) {
			seen.add(pair.a.id);
			seen.add(pair.b.id);
			ranker.answer(pair.a);
			pair = ranker.next();
		}
		expect(seen.size).toBe(6);
	});
});

describe('EloRanker — undo', () => {
	it('undo 는 asked 를 되돌리고 같은 쌍을 다시 물을 수 있게 한다', () => {
		const ranker = new EloRanker(mk(4), { seed: 1 });
		const p1 = ranker.next()!;
		ranker.answer(p1.a);
		expect(ranker.progress().asked).toBe(1);
		expect(ranker.canUndo()).toBe(true);
		ranker.undo();
		expect(ranker.progress().asked).toBe(0);
		expect(ranker.canUndo()).toBe(false);
		// undo 후에도 정상 진행 가능
		const p2 = ranker.next()!;
		ranker.answer(p2.b);
		expect(ranker.progress().asked).toBe(1);
	});
});

describe('EloRanker — 다운스트림 노출', () => {
	it('comparisons() 길이는 asked 와 같고, standings() 는 레이팅 내림차순', () => {
		const items = mk(5);
		const ranker = new EloRanker(items, { seed: 2, targetComparisons: 40 });
		playByOracle(ranker);
		expect(ranker.comparisons()).toHaveLength(ranker.progress().asked);
		const st = ranker.standings();
		for (let i = 1; i < st.length; i++) {
			expect(st[i - 1].rating).toBeGreaterThanOrEqual(st[i].rating);
		}
		// 승자(높은 rank)가 위에 오는지 대략 확인
		expect(st[0].item.rank).toBe(4);
	});
});
