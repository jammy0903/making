/**
 * 취향 일관성 / 비이행성(순환) 탐지 (설계서 §5-2, growth-plan §5-2).
 *
 * "A>B, B>C 인데 C>A" 같은 순환(가위바위보)이나 같은 쌍을 번갈아 고른 번복은
 * 오류가 아니라 **콘텐츠**다: "취향 일관성 87점 — 모순 3개 발견".
 *
 * Elo 엔진(§5-1)은 인접 경계쌍을 반복해 물으므로 같은 쌍이 여러 번 비교될 수 있고,
 * 병합정렬과 달리 모순되는 쌍도 실제로 관측된다 → 순환/번복이 데이터에 드러난다.
 * (순수 계산부. DB·화면과 무관, 단위 테스트 가능.)
 */

export interface Comparison {
	winnerId: string;
	loserId: string;
}

/** 3-순환 한 개: a>b, b>c, c>a. 이름은 표시용(있으면 채움). */
export interface Cycle {
	ids: [string, string, string];
	names: [string, string, string];
}

export interface ConsistencySummary {
	/** 방향이 한 번이라도 관측된(비교된) 서로 다른 쌍의 수 */
	comparedPairs: number;
	/** 양방향 승리가 모두 있는 쌍의 수(우유부단하게 번갈아 고른 쌍) */
	flipFlops: number;
	/** 3-순환(가위바위보) 목록 */
	cycles: Cycle[];
	/** 모순에 얽힌 서로 다른 쌍의 수(번복 쌍 ∪ 순환에 포함된 쌍) */
	contradictions: number;
	/** 0~100 일관성 점수 = 모순 없는 쌍 비율 */
	score: number;
}

const SEP = '␟'; // id 에 안 나오는 구분자
const pairKey = (x: string, y: string) => (x < y ? `${x}${SEP}${y}` : `${y}${SEP}${x}`);

/**
 * 비교 로그에서 일관성 요약을 계산한다.
 * @param comparisons 승자→패자 관측 목록(중복·모순 포함 가능)
 * @param nameOf 표시용 id→이름 (없으면 id 를 이름으로)
 */
export function analyzeConsistency(
	comparisons: readonly Comparison[],
	nameOf: (id: string) => string = (id) => id
): ConsistencySummary {
	// 방향별 승수 집계
	const wins = new Map<string, number>(); // key: `${winner}${SEP}${loser}`
	const nodes = new Set<string>();
	for (const c of comparisons) {
		const k = `${c.winnerId}${SEP}${c.loserId}`;
		wins.set(k, (wins.get(k) ?? 0) + 1);
		nodes.add(c.winnerId);
		nodes.add(c.loserId);
	}
	const winsOf = (a: string, b: string) => wins.get(`${a}${SEP}${b}`) ?? 0;

	// 쌍별 방향/번복 판정 + 우세 방향으로 유향 그래프 구성
	const out = new Map<string, Set<string>>(); // a → {a가 이긴 b들}(우세 기준)
	const addEdge = (a: string, b: string) => {
		let s = out.get(a);
		if (!s) out.set(a, (s = new Set()));
		s.add(b);
	};
	const inconsistentPairs = new Set<string>(); // 모순(번복/순환)에 얽힌 쌍
	let comparedPairs = 0;
	let flipFlops = 0;

	const ids = [...nodes];
	for (let i = 0; i < ids.length; i++) {
		for (let j = i + 1; j < ids.length; j++) {
			const a = ids[i];
			const b = ids[j];
			const ab = winsOf(a, b);
			const ba = winsOf(b, a);
			if (ab === 0 && ba === 0) continue; // 비교 안 된 쌍
			comparedPairs++;
			if (ab > 0 && ba > 0) {
				flipFlops++;
				inconsistentPairs.add(pairKey(a, b));
			}
			// 우세 방향으로 엣지(동률이면 방향 불명 → 그래프에 안 넣음)
			if (ab > ba) addEdge(a, b);
			else if (ba > ab) addEdge(b, a);
		}
	}

	// 3-순환 탐지: a→b, b→c, c→a. 정렬 키로 중복 제거.
	const cycles: Cycle[] = [];
	const seen = new Set<string>();
	for (const a of nodes) {
		const oa = out.get(a);
		if (!oa) continue;
		for (const b of oa) {
			const ob = out.get(b);
			if (!ob) continue;
			for (const c of ob) {
				if (out.get(c)?.has(a)) {
					const key = [a, b, c].slice().sort().join(SEP);
					if (seen.has(key)) continue;
					seen.add(key);
					cycles.push({
						ids: [a, b, c],
						names: [nameOf(a), nameOf(b), nameOf(c)]
					});
					inconsistentPairs.add(pairKey(a, b));
					inconsistentPairs.add(pairKey(b, c));
					inconsistentPairs.add(pairKey(c, a));
				}
			}
		}
	}

	const contradictions = inconsistentPairs.size;
	const score =
		comparedPairs === 0
			? 100
			: Math.round((100 * (comparedPairs - contradictions)) / comparedPairs);

	return { comparedPairs, flipFlops, cycles, contradictions, score };
}
