/**
 * Bradley–Terry / Plackett–Luce 강도 θ 추정 + 순위 희귀도(설계서 §4·§4.1).
 *
 * - 입력은 승리행렬 W(충분통계). 원본 순위는 필요 없다.
 * - θ 는 W 에서 MM(Zermelo) 반복으로 추정. 스케일 불변이라 Σθ=1 로 고정.
 * - ε 가상 승패로 정규화: 한 번도 안 진 후보가 있어도 MLE 가 발산하지 않게
 *   (Ford 존재조건 = 가우시안/Jeffreys prior 하의 MAP). W 원본은 ε 없이 저장하고
 *   ε 는 추정 시점에만 더한다 — 원본 보존 원칙(설계서 §4.1).
 */
import { winsOf, type WinMatrix } from './winMatrix';

export interface StrengthOptions {
	/** 각 쌍에 더할 가상 승·패 수. Ford 발산 방지. 기본 0.5(Jeffreys). */
	epsilon?: number;
	/** 최대 반복 횟수. 기본 500. */
	maxIter?: number;
	/** 수렴 판정: θ 최대 변화가 이 값 미만이면 종료. 기본 1e-10. */
	tol?: number;
}

/**
 * 승리행렬 W 에서 BT/PL 강도 θ 를 추정. Σθ=1 로 정규화한 Map 을 반환.
 *
 * MM 갱신(Hunter 2004): θ_i ← Σ_j(w_ij+ε) / Σ_j (n_ij+2ε)/(θ_i+θ_j),
 *   n_ij = w_ij + w_ji. ε 덕분에 비교 그래프가 완전연결 → 해가 항상 존재.
 */
export function estimateStrengths(
	ids: readonly string[],
	W: WinMatrix,
	opts: StrengthOptions = {}
): Map<string, number> {
	const eps = opts.epsilon ?? 0.5;
	const maxIter = opts.maxIter ?? 500;
	const tol = opts.tol ?? 1e-10;
	const n = ids.length;

	const theta = new Map<string, number>();
	if (n === 0) return theta;
	if (n === 1) return theta.set(ids[0], 1);

	// 초기값: 균등. 인덱스 배열로 다뤄 반복 비용을 O(N²)로 유지.
	let cur = new Array<number>(n).fill(1 / n);

	// 후보 i 의 (정규화) 총 승수 W_i = Σ_j(w_ij+ε) 는 반복 내내 불변 → 선계산.
	const wins = new Array<number>(n).fill(0);
	for (let i = 0; i < n; i++) {
		let s = 0;
		for (let j = 0; j < n; j++) {
			if (i === j) continue;
			s += winsOf(W, ids[i], ids[j]) + eps;
		}
		wins[i] = s;
	}
	// 쌍 대결 총수 n_ij+2ε 도 대칭이라 선계산(상삼각만).
	const games: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
	for (let i = 0; i < n; i++) {
		for (let j = i + 1; j < n; j++) {
			const g = winsOf(W, ids[i], ids[j]) + winsOf(W, ids[j], ids[i]) + 2 * eps;
			games[i][j] = g;
			games[j][i] = g;
		}
	}

	for (let iter = 0; iter < maxIter; iter++) {
		const next = new Array<number>(n);
		for (let i = 0; i < n; i++) {
			let den = 0;
			for (let j = 0; j < n; j++) {
				if (i === j) continue;
				den += games[i][j] / (cur[i] + cur[j]);
			}
			next[i] = wins[i] / den;
		}
		// 스케일 고정: Σθ=1
		let sum = 0;
		for (let i = 0; i < n; i++) sum += next[i];
		let maxDelta = 0;
		for (let i = 0; i < n; i++) {
			next[i] /= sum;
			const d = Math.abs(next[i] - cur[i]);
			if (d > maxDelta) maxDelta = d;
		}
		cur = next;
		if (maxDelta < tol) break;
	}

	for (let i = 0; i < n; i++) theta.set(ids[i], cur[i]);
	return theta;
}

/**
 * 관측 순위(1위→꼴찌)의 Plackett–Luce 로그확률. 희귀도의 기본 척도.
 * logP(π) = Σ_k [ log θ_{π(k)} − log Σ_{j≥k} θ_{π(j)} ]. 값이 낮을수록 희귀.
 *
 * 주의: PL 은 IIA 가정이라 비이행(순환) 취향엔 근사(설계서 §4.1·§10).
 * 백분위("상위 3%")는 이 logP 를 모집단 t-digest 에 넣어 산출(인프라 단계).
 */
export function rankingLogProb(
	rankingBestFirst: readonly string[],
	theta: ReadonlyMap<string, number>
): number {
	let denom = 0;
	for (const id of rankingBestFirst) denom += theta.get(id) ?? 0;

	let logP = 0;
	// 마지막 원소는 θ/θ=1 → log0 기여이므로 N−1 까지만.
	for (let k = 0; k < rankingBestFirst.length - 1; k++) {
		const t = theta.get(rankingBestFirst[k]) ?? 0;
		logP += Math.log(t) - Math.log(denom);
		denom -= t; // 고른 항목을 남은 후보 풀에서 제거
	}
	return logP;
}
