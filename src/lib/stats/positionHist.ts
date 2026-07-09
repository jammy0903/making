/**
 * 위치 히스토그램 H — 후보 i 가 순위 position(0=1위)에 몇 번 놓였나(설계서 §4·§4.1).
 *
 * W(승리행렬)와 함께 유계 충분통계. 여기서 "몇 %가 X를 1위로"·정규화 평균순위(avg_norm)가
 * 파생된다. 후보 수가 플레이마다 다를 수 있어(사용자 생성 주제) position 은 0..N−1 원본으로
 * 저장하고, 비교는 정규화(avg_norm∈[0,1])로 한다 — 설계서 정규화 원칙.
 */
export type PositionHist = Map<string, number[]>; // id → [pos0 count, pos1 count, ...] 길이 N

/** 완전 순위(1위→꼴찌) 하나를 H 에 폴딩. */
export function foldPosition(H: PositionHist, rankingBestFirst: readonly string[]): void {
	const n = rankingBestFirst.length;
	for (let pos = 0; pos < n; pos++) {
		const id = rankingBestFirst[pos];
		let row = H.get(id);
		if (!row || row.length < n) {
			// N 이 커진 경우(더 많은 후보의 주제) 행을 확장하며 기존 카운트 보존
			const grown = new Array<number>(n).fill(0);
			if (row) for (let k = 0; k < row.length; k++) grown[k] = row[k];
			row = grown;
			H.set(id, row);
		}
		row[pos] += 1;
	}
}

/** 후보 i 가 1위(pos 0)로 뽑힌 횟수. */
export function firstPlaceCount(H: PositionHist, id: string): number {
	return H.get(id)?.[0] ?? 0;
}

/** 후보 i 가 등장한 총 순위 수(= 행 합). 0 이면 관측 없음. */
export function appearances(H: PositionHist, id: string): number {
	const row = H.get(id);
	if (!row) return 0;
	let s = 0;
	for (const c of row) s += c;
	return s;
}

/** 후보 i 가 1위로 뽑힌 비율(0..1). 관측 없으면 0. */
export function firstPlaceRate(H: PositionHist, id: string): number {
	const total = appearances(H, id);
	return total === 0 ? 0 : firstPlaceCount(H, id) / total;
}

/**
 * 정규화 평균순위 avg_norm ∈ [0,1]. 0=항상 1위, 1=항상 꼴찌.
 * pos 를 (N−1)로 나눠 후보 수가 다른 주제·플레이 간 비교 가능하게 한다.
 * 관측 없거나 N=1 이면 NaN 대신 null.
 */
export function avgNorm(H: PositionHist, id: string): number | null {
	const row = H.get(id);
	if (!row) return null;
	const n = row.length;
	if (n <= 1) return null;
	let weighted = 0;
	let total = 0;
	for (let pos = 0; pos < n; pos++) {
		weighted += (pos / (n - 1)) * row[pos];
		total += row[pos];
	}
	return total === 0 ? null : weighted / total;
}
