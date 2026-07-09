/**
 * 승리행렬 W — 후보 i가 j를 이긴 횟수. BT/PL 강도의 충분통계(설계서 §4·§4.1).
 *
 * 원칙(설계서): raw 정수 카운트만 담는다. ε 정규화는 추정 시점(bradleyTerry)에서만
 * 적용 — 원본을 보존해 이상치 정책을 나중에 바꿔도 되돌릴 수 있다.
 */
export type WinMatrix = Map<string, number>;

const SEP = '␟'; // 후보 id에 안 나오는 구분자
const key = (winner: string, loser: string) => `${winner}${SEP}${loser}`;

/** 한 번의 비교 결과(winner가 loser를 이김)를 누적. */
export function recordWin(W: WinMatrix, winner: string, loser: string): void {
	W.set(key(winner, loser), (W.get(key(winner, loser)) ?? 0) + 1);
}

/** i가 j를 이긴 횟수. */
export function winsOf(W: WinMatrix, i: string, j: string): number {
	return W.get(key(i, j)) ?? 0;
}

/**
 * 실제 비교 로그(sort 모드)를 폴딩. 각 원소는 {winnerId, loserId}.
 * 독립 관측이라 BT에 가장 정확한 입력.
 */
export function foldComparisons(
	W: WinMatrix,
	comparisons: ReadonlyArray<{ winnerId: string; loserId: string }>
): void {
	for (const c of comparisons) recordWin(W, c.winnerId, c.loserId);
}

/**
 * 완전 순위(1위→꼴찌)를 모든 상하 쌍의 승리로 폴딩(드래그 모드/근사용).
 * 주의: 추이성으로 얽혀 독립 관측이 아니므로 sort 모드에선 foldComparisons를 선호.
 */
export function foldRanking(W: WinMatrix, rankingBestFirst: readonly string[]): void {
	for (let i = 0; i < rankingBestFirst.length; i++) {
		for (let j = i + 1; j < rankingBestFirst.length; j++) {
			recordWin(W, rankingBestFirst[i], rankingBestFirst[j]);
		}
	}
}
