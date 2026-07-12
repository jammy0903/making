/**
 * 덱별 플레이 통계 집계(공개 통계 페이지 + 필요 시 관리자 공용).
 * plays 는 RLS로 anon SELECT 불가 → 반드시 서버에서 service_role(getAdminDb)로 집계하고
 * 숫자만 내려준다(원본 행 미노출, 자문 B-5 데이터윤리 부합). 규모 커지면 RPC group by로 이관.
 */
import { DECKS } from '$lib/game/decks';
import { getAdminDb } from './adminDb';

export interface DeckStat {
	id: string;
	title: string;
	icon: string;
	nameA: string;
	nameB: string;
	plays: number;
	firstA: number; // 1판(맨몸) 순수취향 A 선택 수
	firstB: number;
	prefA: number; // 최종 선호편 A
	prefB: number;
	avgDepthA: number; // A를 선호한 플레이의 평균 버틴 깊이(강도)
	avgDepthB: number;
	loyalRate: number; // 한 번도 안 갈아탄 비율(%)
	avgSwitches: number; // 평균 갈아탐 횟수
	rounds: number[]; // 라운드별 A 선택 수(index0 = 1판)
	roundsTotal: number[]; // 라운드별 응답 수(가변 길이 대비)
}

export interface DeckStatsResult {
	deckStats: DeckStat[];
	totalPlays: number;
	activeDecks: number;
	totalDecks: number;
}

/** 내부 누적기 — DeckStat로 마감하기 전 합계를 들고 있는다. */
interface DeckAcc extends DeckStat {
	depthSumA: number;
	depthSumB: number;
	switchSum: number;
	loyal: number; // 전환 0회 플레이 수
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);

/** DB 미설정이면 빈 통계. 성공하면 덱별 집계 + 요약치. */
export async function loadDeckStats(): Promise<DeckStatsResult> {
	const empty: DeckStatsResult = {
		deckStats: [],
		totalPlays: 0,
		activeDecks: 0,
		totalDecks: DECKS.length
	};
	const db = getAdminDb();
	if (!db) return empty;

	const { data: plays } = await db
		.from('plays')
		.select('deck_id,pref_side,depth_a,depth_b,choices');

	const byDeck = new Map<string, DeckAcc>();
	for (const d of DECKS) {
		byDeck.set(d.id, {
			id: d.id,
			title: d.title,
			icon: d.icon,
			nameA: d.a.name,
			nameB: d.b.name,
			plays: 0,
			firstA: 0,
			firstB: 0,
			prefA: 0,
			prefB: 0,
			avgDepthA: 0,
			avgDepthB: 0,
			loyalRate: 0,
			avgSwitches: 0,
			rounds: [],
			roundsTotal: [],
			depthSumA: 0,
			depthSumB: 0,
			switchSum: 0,
			loyal: 0
		});
	}
	for (const p of plays ?? []) {
		const s = byDeck.get(p.deck_id);
		if (!s) continue;
		s.plays++;
		const choices: number[] = Array.isArray(p.choices) ? p.choices : [];
		// 1판 순수취향
		if (choices[0] === 0) s.firstA++;
		else if (choices[0] === 1) s.firstB++;
		// 최종 선호편 + 선호편 기준 버틴 깊이
		if (p.pref_side === 0) {
			s.prefA++;
			s.depthSumA += p.depth_a ?? 0;
		} else if (p.pref_side === 1) {
			s.prefB++;
			s.depthSumB += p.depth_b ?? 0;
		}
		// 라운드별 A 선택 수(가변 길이 → 나온 판까지만) + 갈아탐
		let switches = 0;
		for (let i = 0; i < choices.length; i++) {
			s.roundsTotal[i] = (s.roundsTotal[i] ?? 0) + 1;
			s.rounds[i] = (s.rounds[i] ?? 0) + (choices[i] === 0 ? 1 : 0);
			if (i > 0 && choices[i] !== choices[i - 1]) switches++;
		}
		s.switchSum += switches;
		if (switches === 0 && choices.length > 0) s.loyal++;
	}
	for (const s of byDeck.values()) {
		s.avgDepthA = s.prefA ? round1(s.depthSumA / s.prefA) : 0;
		s.avgDepthB = s.prefB ? round1(s.depthSumB / s.prefB) : 0;
		s.avgSwitches = s.plays ? round1(s.switchSum / s.plays) : 0;
		s.loyalRate = s.plays ? pct(s.loyal, s.plays) : 0;
	}

	// DeckAcc → DeckStat(누적 필드 제거)로 마감, 플레이순 정렬.
	const deckStats: DeckStat[] = [...byDeck.values()]
		.sort((a, b) => b.plays - a.plays)
		.map(({ depthSumA, depthSumB, switchSum, loyal, ...rest }) => rest);

	return {
		deckStats,
		totalPlays: deckStats.reduce((n, s) => n + s.plays, 0),
		activeDecks: deckStats.filter((s) => s.plays > 0).length,
		totalDecks: DECKS.length
	};
}
