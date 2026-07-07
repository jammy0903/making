<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { getTopic } from '$lib/storage';
	import type { Candidate, Topic, RankMode } from '$lib/domain';
	import { MergeRanker } from '$lib/ranking/mergeRanker';
	import type { Pair } from '$lib/ranking/types';
	import RankBoard from '$lib/components/RankBoard.svelte';
	import { useT, getLocale, localePath } from '$lib/i18n';

	const t = useT();
	const dateLocale = { ko: 'ko-KR', en: 'en-US', zh: 'zh-CN' }[getLocale()];

	let topic = $state<Topic | undefined>(undefined);
	let loaded = $state(false);
	let mode = $state<RankMode>('sort');

	// 순위 월드컵(비교) 상태
	// pair 는 $state.raw 로 둔다: $state 의 깊은 프록시가 후보 객체를 감싸면
	// 엔진 내부 원본과 참조(===)가 달라져 answer() 가 실패하기 때문.
	let ranker: MergeRanker<Candidate> | null = null;
	let pair = $state.raw<Pair<Candidate> | null>(null);
	let asked = $state(0);
	let estTotal = $state(0);
	let canUndo = $state(false);
	let picking = $state<string | null>(null); // 선택 애니메이션 중인 후보 id

	// 완료된 순위(두 모드 공통)
	let ranking = $state.raw<Candidate[] | null>(null);
	let today = $state(''); // PDF 헤더 날짜(클라이언트에서 설정)

	const ratio = $derived(estTotal > 0 ? Math.min(asked / estTotal, 1) : 0);

	onMount(() => {
		today = new Date().toLocaleDateString(dateLocale);
		const tp = getTopic(page.params.id!);
		topic = tp;
		loaded = true;
		if (!tp) return;
		const q = page.url.searchParams.get('mode');
		mode = q === 'drag' ? 'drag' : 'sort';

		if (mode === 'sort') {
			ranker = new MergeRanker(tp.candidates, { seed: Math.floor(Math.random() * 1e9) });
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
	}

	function reducedMotion() {
		return typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
	}

	function pick(c: Candidate) {
		if (picking) return; // 애니메이션 중 중복 선택 방지
		picking = c.id;
		// 고른 카드를 약 1초간 강조(커짐)한 뒤 다음 비교로 진행
		const delay = reducedMotion() ? 150 : 900;
		setTimeout(() => {
			ranker?.answer(c);
			picking = null;
			refresh();
		}, delay);
	}
	function undo() {
		ranker?.undo();
		refresh();
	}

	function restart() {
		ranking = null;
		if (mode === 'sort' && topic) {
			ranker = new MergeRanker(topic.candidates, { seed: Math.floor(Math.random() * 1e9) });
			refresh();
		}
		// drag 모드는 RankBoard 가 새로 마운트되며 초기화됨
	}

	function exportPdf() {
		window.print();
	}

	const medal = (i: number) => (i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`);
</script>

{#if !loaded}
	<p class="muted">{t('topic.loading')}</p>
{:else if !topic}
	<div class="empty">{t('topic.notFound')} <a href={localePath(getLocale(), "/")}>{t("nav.home")}</a></div>
{:else if ranking}
	<!-- ===== 결과 ===== -->
	<div class="print-area">
		<!-- 화면용 제목 -->
		<h2 class="no-print" style="margin:8px 0 4px">🏆 {topic.title} — {t('result.suffix')}</h2>
		<p class="muted no-print" style="margin:0 0 16px">{t('result.done')}</p>

		<!-- PDF 전용 헤더 -->
		<div class="pdf-header print-only">
			<div class="pdf-title">🏆 {topic.title}</div>
			<div class="pdf-sub">{t('result.suffix')}{today ? ` · ${today}` : ''}</div>
			<div class="pdf-rule"></div>
		</div>

		<ol class="rank-list" style="list-style:none; margin:0; padding:0; display:grid; gap:8px">
			{#each ranking as c, i (c.id)}
				<li
					class="card rank-row {i < 3 ? 'top' : ''}"
					style="padding:10px 14px; display:flex; align-items:center; gap:12px; {i < 3
						? 'border-color: var(--accent)'
						: ''}"
				>
					<span style="font-size:20px; width:32px; text-align:center">{medal(i)}</span>
					{#if c.image}
						<img
							src={c.image}
							alt=""
							style="width:40px; height:40px; border-radius:0; object-fit:cover"
						/>
					{/if}
					<strong style="font-size:16px">{c.name}</strong>
				</li>
			{/each}
		</ol>

		<!-- PDF 전용 푸터 -->
		<div class="pdf-footer print-only">codeinsight.online · {t('app.title')}</div>
	</div>

	<div class="no-print" style="display:grid; gap:10px; margin-top:20px">
		<button class="btn btn-primary btn-block" onclick={exportPdf}>{t('result.exportPdf')}</button>
		<div style="display:flex; gap:10px">
			<button class="btn" style="flex:1" onclick={restart}>{t('result.restart')}</button>
			<a class="btn" style="flex:1" href={localePath(getLocale(), "/")}>{t("nav.home")}</a>
		</div>
	</div>
{:else if mode === 'sort'}
	<!-- ===== 순위 월드컵(비교) ===== -->
	<div style="display:flex; align-items:center; justify-content:space-between; margin:8px 0 6px">
		<span class="muted" style="font-size:13px">{t('play.progress', { asked, est: estTotal })}</span>
		<button class="btn" style="padding:6px 12px" onclick={undo} disabled={!canUndo}
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
		<p style="text-align:center; margin:0 0 16px" class="muted">{t('play.pickHigher')}</p>
		<div style="display:grid; grid-template-columns:1fr 1fr; gap:12px">
			{#each [pair.a, pair.b] as c (c.id)}
				<button
					class="card compare-card"
					class:picked={picking === c.id}
					class:dim={picking !== null && picking !== c.id}
					onclick={() => pick(c)}
					disabled={picking !== null}
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
</style>
