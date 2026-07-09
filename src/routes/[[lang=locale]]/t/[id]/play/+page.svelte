<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/state';
	import { getTopic } from '$lib/storage';
	import type { Candidate, Topic, RankMode } from '$lib/domain';
	import { EloRanker, confidenceFromReactionMs } from '$lib/ranking/eloRanker';
	import type { Pair } from '$lib/ranking/types';
	import { summarize, type CompareLog } from '$lib/ranking/hesitation';
	import { analyzeConsistency } from '$lib/ranking/consistency';
	import RankBoard from '$lib/components/RankBoard.svelte';
	import RankResult from '$lib/components/RankResult.svelte';
	import { useT, getLocale, localePath } from '$lib/i18n';

	const t = useT();
	const dateLocale = { ko: 'ko-KR', en: 'en-US', zh: 'zh-CN' }[getLocale()];

	let topic = $state<Topic | undefined>(undefined);
	let loaded = $state(false);
	let mode = $state<RankMode>('sort');

	// 순위 월드컵(비교) 상태
	// pair 는 $state.raw 로 둔다: $state 의 깊은 프록시가 후보 객체를 감싸면
	// 엔진 내부 원본과 참조(===)가 달라져 answer() 가 실패하기 때문.
	let ranker: EloRanker<Candidate> | null = null;
	let pair = $state.raw<Pair<Candidate> | null>(null);
	let asked = $state(0);
	let estTotal = $state(0);
	let canUndo = $state(false);
	let picking = $state<string | null>(null); // 선택 애니메이션 중인 후보 id

	// 완료된 순위(두 모드 공통)
	let ranking = $state.raw<Candidate[] | null>(null);
	let today = $state(''); // PDF 헤더 날짜(클라이언트에서 설정)

	// 망설임(반응시간) 측정 — sort 모드 전용. 로그엔 원본 ms 만 저장(가공 X).
	let pairShownAt = 0; // 현재 쌍이 화면에 뜬 시각(performance.now)
	let compareLog = $state.raw<CompareLog[]>([]);
	const hesitation = $derived(summarize(compareLog));
	// 취향 일관성/순환(§5-2). 이름은 현재 주제 후보에서 조회.
	const nameById = $derived(new Map((topic?.candidates ?? []).map((c) => [c.id, c.name])));
	const consistency = $derived(analyzeConsistency(compareLog, (id) => nameById.get(id) ?? id));

	// 자리비움(AFK): 한 대결을 2분간 안 고르면 타이머를 멈추고 오버레이 표시.
	// 자리비운 시간이 망설임으로 잘못 잡히지 않게, 복귀 시 시계를 재시작한다.
	const AFK_MS = 120_000; // 2분 무응답 → 자리비움
	// 고른 카드 강조 애니메이션 지속(ms). 모션 최소화 설정이면 짧게.
	const PICK_ANIM_MS = 900;
	const PICK_ANIM_REDUCED_MS = 150;
	// 랭킹 초기 순서 셔플 시드 상한(정수) + 생성 헬퍼
	const SEED_MAX = 1e9;
	const randomSeed = () => Math.floor(Math.random() * SEED_MAX);
	let away = $state(false);
	let awayTimer: ReturnType<typeof setTimeout> | null = null;

	function clearAwayTimer() {
		if (awayTimer) {
			clearTimeout(awayTimer);
			awayTimer = null;
		}
	}
	function armAwayTimer() {
		clearAwayTimer();
		awayTimer = setTimeout(() => (away = true), AFK_MS);
	}
	function resume() {
		away = false;
		pairShownAt = performance.now(); // 자리비운 시간은 측정에서 제외(시계 재시작)
		armAwayTimer();
	}
	onDestroy(clearAwayTimer);

	const ratio = $derived(estTotal > 0 ? Math.min(asked / estTotal, 1) : 0);

	onMount(() => {
		today = new Date().toLocaleDateString(dateLocale);
		const tp = getTopic(page.params.id!, getLocale());
		topic = tp;
		loaded = true;
		if (!tp) return;
		const q = page.url.searchParams.get('mode');
		mode = q === 'drag' ? 'drag' : 'sort';

		if (mode === 'sort') {
			ranker = new EloRanker(tp.candidates, { seed: randomSeed() });
			refresh();
		}
		// drag 모드는 RankBoard 가 자체 상태를 관리
	});

	function refresh() {
		if (!ranker) return;
		const p = ranker.progress();
		asked = p.asked;
		estTotal = p.estimatedTotal;
		canUndo = ranker.canUndo();
		ranking = ranker.result();
		pair = ranker.next();
		// 새 쌍이 뜬 시각을 기록 → pick() 진입 시각과의 차가 순수 반응시간
		if (pair) {
			pairShownAt = performance.now();
			armAwayTimer(); // 무응답 2분이면 자리비움
		} else {
			clearAwayTimer();
		}
	}

	function reducedMotion() {
		return typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
	}

	function pick(c: Candidate) {
		if (picking || away) return; // 애니 중·자리비움 중 선택 방지(= 로그 이중 집계 방지)
		clearAwayTimer(); // 골랐으니 자리비움 타이머 해제
		// 반응시간은 애니(setTimeout) 지연 전, 진입 즉시 확정. 원본 ms 그대로 저장.
		// 빠른 선택 = 확신 → Elo 갱신을 크게 + 목표 비교 횟수를 줄인다(§5-5).
		let confidence = 0.5;
		if (pair && pairShownAt) {
			const ms = performance.now() - pairShownAt;
			confidence = confidenceFromReactionMs(ms);
			const other = pair.a.id === c.id ? pair.b : pair.a;
			compareLog = [
				...compareLog,
				{
					winnerId: c.id,
					loserId: other.id,
					winnerName: c.name,
					loserName: other.name,
					ms
				}
			];
		}
		picking = c.id;
		// 고른 카드를 약 1초간 강조(커짐)한 뒤 다음 비교로 진행
		const delay = reducedMotion() ? PICK_ANIM_REDUCED_MS : PICK_ANIM_MS;
		setTimeout(() => {
			ranker?.answer(c, confidence);
			picking = null;
			refresh();
		}, delay);
	}
	function undo() {
		// ranker 가 실제로 되돌린 경우에만 로그도 pop → "undo 횟수 = pop 횟수" 정합 보장
		if (!ranker?.canUndo()) return;
		ranker.undo();
		compareLog = compareLog.slice(0, -1);
		refresh();
	}

	function restart() {
		ranking = null;
		compareLog = [];
		away = false;
		clearAwayTimer();
		if (mode === 'sort' && topic) {
			ranker = new EloRanker(topic.candidates, { seed: randomSeed() });
			refresh();
		}
		// drag 모드는 RankBoard 가 새로 마운트되며 초기화됨
	}

</script>

{#if !loaded}
	<p class="muted">{t('topic.loading')}</p>
{:else if !topic}
	<div class="empty">{t('topic.notFound')} <a href={localePath(getLocale(), "/")}>{t("nav.home")}</a></div>
{:else if ranking}
	<!-- ===== 결과 (화면 + PDF 렌더링은 RankResult 로 분리) ===== -->
	<RankResult {topic} {ranking} {hesitation} {consistency} {today} onRestart={restart} />
{:else if mode === 'sort'}
	<!-- ===== 순위 월드컵(비교) ===== -->
	<div style="display:flex; align-items:center; justify-content:space-between; margin:8px 0 6px">
		<span class="muted" style="font-size:13px">{t('play.progress', { asked, est: estTotal })}</span>
		<button class="btn" style="padding:6px 12px" onclick={undo} disabled={!canUndo || away}
			>{t('play.undo')}</button
		>
	</div>
	<div
		style="height:16px; background:var(--soft); border:3px solid var(--ink); overflow:hidden; margin-bottom:20px"
	>
		<div
			style="height:100%; width:{ratio *
				100}%; background:var(--accent); transition:width .12s steps(6)"
		></div>
	</div>

	{#if pair}
		<p style="text-align:center; margin:0 0 4px" class="muted">{t('play.pickHigher')}</p>
		<p style="text-align:center; margin:0 0 16px; font-size:12px" class="muted">
			{t('play.timeLimit')}
		</p>
		<div style="display:grid; grid-template-columns:1fr 1fr; gap:12px">
			{#each [pair.a, pair.b] as c (c.id)}
				<button
					class="card compare-card"
					class:picked={picking === c.id}
					class:dim={(picking !== null && picking !== c.id) || away}
					onclick={() => pick(c)}
					disabled={picking !== null || away}
					style="padding:16px; display:flex; flex-direction:column; align-items:center; gap:12px; cursor:pointer"
				>
					{#if c.image}
						<img
							src={c.image}
							alt=""
							style="width:100%; aspect-ratio:1; border-radius:0; object-fit:cover"
						/>
					{:else}
						<div
							style="width:100%; aspect-ratio:1; border-radius:0; background:var(--bg); display:grid; place-items:center; font-size:40px"
						>
							{c.name.slice(0, 1)}
						</div>
					{/if}
					<strong style="font-size:17px; text-align:center">{c.name}</strong>
				</button>
			{/each}
		</div>
		{#if away}
			<!-- 자리비움 오버레이: 타이머 정지, 복귀 시 시계 재시작 -->
			<div class="away-overlay" role="alertdialog" aria-label={t('play.away.title')}>
				<p style="font-size:16px; margin:0 0 14px; text-align:center">{t('play.away.title')}</p>
				<button class="btn btn-primary" onclick={resume}>{t('play.away.resume')}</button>
			</div>
		{/if}
	{/if}
{:else}
	<!-- ===== 직접 순위(순위판 + 후보풀 드래그앤드롭) ===== -->
	<RankBoard candidates={topic.candidates} onComplete={(r) => (ranking = r)} />
{/if}

<style>
	/* 비교 카드 선택 피드백: 누르면 약 1초간 커지며 강조 */
	.compare-card {
		transition:
			transform 0.18s steps(3),
			border-color 0.1s steps(2),
			box-shadow 0.1s steps(2),
			opacity 0.15s ease;
		will-change: transform;
	}
	.compare-card.picked {
		transform: scale(1.06);
		border-color: var(--accent);
		box-shadow: 6px 6px 0 var(--accent);
	}
	.compare-card.dim {
		opacity: 0.45;
		transform: scale(0.97);
	}
	/* disabled 여도 강조 카드는 흐려지지 않게 */
	.compare-card:disabled {
		cursor: default;
	}
	@media (prefers-reduced-motion: reduce) {
		.compare-card {
			transition-duration: 0.1s;
		}
		.compare-card.picked {
			transform: none;
		}
	}
	/* 자리비움 오버레이: 화면 전체를 덮고 복귀 버튼만 활성 */
	.away-overlay {
		position: fixed;
		inset: 0;
		z-index: 50;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 24px;
		background: rgba(10, 8, 20, 0.62);
	}
	.away-overlay p {
		color: #fff;
	}
</style>
