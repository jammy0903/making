<script lang="ts">
	import Icon from '$lib/game/Icon.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// 표본이 이보다 적으면 "참고용"으로 표시(적은 표본의 과장 방지).
	const MIN_SAMPLE = 10;

	// 카드별 "라운드별 편향" 펼침 상태(여러 개 동시 열림 허용).
	let open = $state<Record<string, boolean>>({});
	const toggle = (id: string) => (open[id] = !open[id]);

	const played = $derived(data.deckStats.filter((s) => s.plays > 0));
	const empty = $derived(data.deckStats.filter((s) => s.plays === 0));
</script>

<svelte:head>
	<title>모두의 선택 · 그런데이제</title>
	<meta name="description" content="다들 어느 쪽을 골랐을까? 덱마다 첫인상과 최종 선택, 페널티가 쌓일수록 갈리는 지점을 공개 통계로." />
</svelte:head>

<!-- A/B 선택 비율 막대(첫인상·최종선호·라운드별 공용) -->
{#snippet splitBar(a: number, b: number, nameA: string, nameB: string)}
	{@const total = a + b}
	{@const aPct = total ? Math.round((a / total) * 100) : 50}
	<div class="bias" title="{nameA} {a} · {nameB} {b}">
		<div class="bias-bar">
			<span class="bias-a" style="width:{aPct}%"></span>
			<span class="bias-b" style="width:{100 - aPct}%"></span>
		</div>
		<div class="bias-lbl">
			<span>{nameA} {aPct}%</span>
			<span>{100 - aPct}% {nameB}</span>
		</div>
	</div>
{/snippet}

<div class="stats">
	<h2>모두의 선택</h2>
	<p class="muted lead">
		총 <b>{data.totalPlays.toLocaleString()}</b>번의 플레이. 다들 처음엔 어디로 끌렸고, 페널티가 쌓이자
		어디서 갈아탔을까?
	</p>

	{#if played.length === 0}
		<p class="none">아직 쌓인 플레이가 없어요. 먼저 플레이해서 첫 데이터를 남겨보세요.</p>
	{:else}
		<div class="deck-stats">
			{#each played as s (s.id)}
				<div class="card ds" class:square={!open[s.id]}>
					<div class="ds-head">
						<span class="ds-icon"><Icon value={s.icon} /></span>
						<b class="ds-title">{s.title}</b>
						<span class="ds-plays">
							{s.plays.toLocaleString()}판{#if s.plays < MIN_SAMPLE}<span class="ds-warn"
									> · 표본 적음</span
								>{/if}
						</span>
					</div>

					<div class="ds-rows">
						<div class="ds-row">
							<span class="ds-lbl">첫인상 <small>맨몸</small></span>
							{@render splitBar(s.firstA, s.firstB, s.nameA, s.nameB)}
						</div>
						<div class="ds-row">
							<span class="ds-lbl">최종선호</span>
							{@render splitBar(s.prefA, s.prefB, s.nameA, s.nameB)}
						</div>
					</div>

					<button class="ds-toggle" onclick={() => toggle(s.id)}>
						{open[s.id] ? '라운드별 편향 접기 ▲' : '라운드별 편향 펼치기 ▼'}
					</button>

					{#if open[s.id]}
						<div class="rounds">
							<div class="rounds-cap">
								페널티(강도)가 붙을수록 <b>{s.nameA}</b> 선택 비율이 어떻게 움직이는지
							</div>
							{#each s.rounds as aCount, i (i)}
								{@const total = s.roundsTotal[i] ?? 0}
								<div class="round">
									<span class="round-lbl">{i === 0 ? '1판·맨몸' : `강도 ${i + 1}`}</span>
									{@render splitBar(aCount, total - aCount, s.nameA, s.nameB)}
									<span class="round-n">{total}</span>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}

	{#if empty.length}
		<h3>아직 데이터가 없는 주제</h3>
		<ul class="empty-list">
			{#each empty as s (s.id)}
				<li><span class="ds-icon"><Icon value={s.icon} /></span> {s.title}</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.stats {
		max-width: 640px;
		margin: 0 auto;
	}
	h2 {
		margin: 8px 0 8px;
	}
	.lead {
		margin: 0 0 20px;
		font-size: 15px;
		line-height: 1.6;
	}
	.muted {
		color: var(--muted);
	}
	.none {
		color: var(--muted);
		padding: 24px 0;
	}
	.deck-stats {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 14px;
	}
	@media (max-width: 440px) {
		.deck-stats {
			grid-template-columns: 1fr;
		}
	}
	.card {
		background: var(--surface);
		border: 3px solid var(--line);
		box-shadow: var(--shadow);
	}
	.ds {
		padding: 15px 16px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	/* 접힌 카드는 정사각형(내용이 넘치면 자연히 늘어남). 펼치면 square 해제. */
	.ds.square {
		aspect-ratio: 1 / 1;
	}
	@media (max-width: 440px) {
		.ds.square {
			aspect-ratio: auto; /* 1열(전체폭)에선 정사각형 강제 안 함 */
		}
	}
	.ds-head {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.ds-icon {
		font-size: 20px;
		display: inline-flex;
		align-items: center;
	}
	.ds-title {
		flex: 1;
		min-width: 0;
		font-size: 16px;
	}
	.ds-plays {
		font-size: 13px;
		color: var(--muted);
		font-weight: 700;
		white-space: nowrap;
	}
	.ds-warn {
		color: var(--gold);
	}
	.ds-rows {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.ds-row {
		display: flex;
		flex-direction: column;
		gap: 5px;
	}
	.ds-lbl {
		font-size: 12.5px;
		font-weight: 700;
		color: var(--muted);
	}
	.ds-lbl small {
		font-weight: 700;
		opacity: 0.7;
	}
	/* A/B 선택 비율 막대 */
	.bias {
		display: flex;
		flex-direction: column;
		gap: 3px;
	}
	.bias-bar {
		display: flex;
		height: 12px;
		border: 2px solid var(--line);
		overflow: hidden;
	}
	.bias-a {
		background: var(--accent);
	}
	.bias-b {
		background: var(--mint);
	}
	.bias-lbl {
		display: flex;
		justify-content: space-between;
		font-size: 11.5px;
		color: var(--muted);
		font-weight: 700;
	}
	.ds-toggle {
		align-self: flex-start;
		margin-top: auto; /* 정사각형 카드에서 토글을 하단에 붙임 */
		font: inherit;
		font-size: 12.5px;
		font-weight: 700;
		padding: 5px 10px;
		border: 2px solid var(--line);
		background: var(--surface);
		color: var(--ink);
		cursor: pointer;
	}
	.rounds {
		display: flex;
		flex-direction: column;
		gap: 8px;
		border-top: 2px dashed var(--line);
		padding-top: 12px;
	}
	.rounds-cap {
		font-size: 12.5px;
		color: var(--muted);
	}
	.round {
		display: grid;
		grid-template-columns: 68px 1fr 34px;
		align-items: center;
		gap: 10px;
	}
	.round-lbl {
		font-size: 12px;
		font-weight: 700;
		color: var(--muted);
		white-space: nowrap;
	}
	.round-n {
		font-size: 11px;
		color: var(--muted);
		text-align: right;
	}
	h3 {
		margin: 26px 0 10px;
		font-size: 15px;
	}
	.empty-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	.empty-list li {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 13px;
		color: var(--muted);
		border: 2px solid var(--line);
		padding: 6px 10px;
	}
</style>
