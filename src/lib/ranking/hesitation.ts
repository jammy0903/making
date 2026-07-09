/**
 * 망설임(반응시간) 측정 — 순수 계산부.
 *
 * 원칙: 로그에는 항상 **원본 ms**를 보존한다(가공·클램프 없음).
 * 이상치 처리(AFK 등)는 오직 표시 단계인 summarize()에서만 적용한다.
 * → 나중에 이상치 정책을 바꿔도(클램프→IQR 제외 등) 원본이 남아 되돌릴 수 있다.
 * 또한 크로스유저 통계(5-6)가 원본을 그대로 재활용한다.
 */

/** 한 번의 비교 기록. ms 는 순수 반응시간(performance.now 차) — 절대 클램프하지 않음. */
export interface CompareLog {
	winnerId: string;
	loserId: string;
	winnerName: string;
	loserName: string;
	ms: number;
}

/** 표시용 한 대결. ms 는 클램프가 적용된 표시값. */
export interface Duel {
	winnerName: string;
	loserName: string;
	ms: number;
	seconds: string; // "11.2"
}

/**
 * 결과 화면·공유 카드용 요약.
 * UI(v1)는 mostAgonized·instant 둘만 쓰지만, total/mean 도 미리 계산해 둔다.
 * 계산은 공짜이고, §1-B 공유 카드에서 "평균 확신도" 등을 A/B로 붙일 때 자리가 이미 있다.
 */
export interface HesitationSummary {
	count: number;
	mostAgonized: Duel | null;
	instant: Duel | null;
	totalMs: number; // 원본 합(클램프 전)
	meanMs: number; // 원본 평균
	clampMs: number; // 적용된 표시 상한
}

/** AFK 등으로 부풀려진 단일 비교가 "최고 고뇌"를 먹지 않도록 하는 표시 상한. */
export const DEFAULT_CLAMP_MS = 30_000;

export function formatSeconds(ms: number): string {
	return (ms / 1000).toFixed(1);
}

export function summarize(
	log: readonly CompareLog[],
	clampMs: number = DEFAULT_CLAMP_MS
): HesitationSummary {
	const count = log.length;
	if (count === 0) {
		return { count: 0, mostAgonized: null, instant: null, totalMs: 0, meanMs: 0, clampMs };
	}

	const clamp = (ms: number) => Math.min(ms, clampMs);
	const toDuel = (e: CompareLog): Duel => {
		const ms = clamp(e.ms);
		return { winnerName: e.winnerName, loserName: e.loserName, ms, seconds: formatSeconds(ms) };
	};

	let hi = log[0]; // 최고 고뇌(클램프 후 값 기준)
	let lo = log[0]; // 0초컷(원본 최소)
	let totalMs = 0;
	for (const e of log) {
		totalMs += e.ms; // 원본 합
		if (clamp(e.ms) > clamp(hi.ms)) hi = e;
		if (e.ms < lo.ms) lo = e;
	}

	return {
		count,
		mostAgonized: toDuel(hi),
		instant: toDuel(lo),
		totalMs,
		meanMs: totalMs / count,
		clampMs
	};
}
