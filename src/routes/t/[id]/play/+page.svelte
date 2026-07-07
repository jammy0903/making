<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { getTopic } from '$lib/storage';
	import type { Candidate, Topic, RankMode } from '$lib/domain';
	import { MergeRanker } from '$lib/ranking/mergeRanker';
	import type { Pair } from '$lib/ranking/types';
	import { dragReorder } from '$lib/actions/dragReorder';

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

	// 드래그 상태
	let order = $state<Candidate[]>([]);
	let byId = new Map<string, Candidate>();

	// 완료된 순위(두 모드 공통)
	let ranking = $state<Candidate[] | null>(null);

	const ratio = $derived(estTotal > 0 ? Math.min(asked / estTotal, 1) : 0);

	onMount(() => {
		const t = getTopic(page.params.id!);
		topic = t;
		loaded = true;
		if (!t) return;
		const q = page.url.searchParams.get('mode');
		mode = q === 'drag' ? 'drag' : 'sort';
		byId = new Map(t.candidates.map((c) => [c.id, c]));

		if (mode === 'sort') {
			ranker = new MergeRanker(t.candidates, { seed: Math.floor(Math.random() * 1e9) });
			refresh();
		} else {
			order = t.candidates.slice();
		}
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

	function onReorder(ids: string[]) {
		order = ids.map((id) => byId.get(id)!).filter(Boolean);
	}
	function finishDrag() {
		ranking = order.slice();
	}

	function restart() {
		ranking = null;
		if (mode === 'sort' && topic) {
			ranker = new MergeRanker(topic.candidates, { seed: Math.floor(Math.random() * 1e9) });
			refresh();
		} else if (topic) {
			order = topic.candidates.slice();
		}
	}

	function exportPdf() {
		window.print();
	}

	const medal = (i: number) => (i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`);
</script>

{#if !loaded}
	<p class="muted">불러오는 중…</p>
{:else if !topic}
	<div class="empty">주제를 찾을 수 없어요. <a href="/">홈으로</a></div>
{:else if ranking}
	<!-- ===== 결과 ===== -->
	<div class="print-area">
		<h2 style="margin:8px 0 4px">🏆 {topic.title} — 결과</h2>
		<p class="muted no-print" style="margin:0 0 16px">순위가 정해졌어요!</p>
		<ol style="list-style:none; margin:0; padding:0; display:grid; gap:8px">
			{#each ranking as c, i (c.id)}
				<li
					class="card"
					style="padding:10px 14px; display:flex; align-items:center; gap:12px; {i < 3
						? 'border-color: var(--accent)'
						: ''}"
				>
					<span style="font-size:20px; width:32px; text-align:center">{medal(i)}</span>
					{#if c.image}
						<img
							src={c.image}
							alt=""
							style="width:40px; height:40px; border-radius:8px; object-fit:cover"
						/>
					{/if}
					<strong style="font-size:16px">{c.name}</strong>
				</li>
			{/each}
		</ol>
	</div>

	<div class="no-print" style="display:grid; gap:10px; margin-top:20px">
		<button class="btn btn-primary btn-block" onclick={exportPdf}>📄 PDF로 내보내기</button>
		<div style="display:flex; gap:10px">
			<button class="btn" style="flex:1" onclick={restart}>다시 하기</button>
			<a class="btn" style="flex:1" href="/">홈으로</a>
		</div>
	</div>
{:else if mode === 'sort'}
	<!-- ===== 순위 월드컵(비교) ===== -->
	<div style="display:flex; align-items:center; justify-content:space-between; margin:8px 0 6px">
		<span class="muted" style="font-size:13px">{asked} / 약 {estTotal}회</span>
		<button class="btn" style="padding:6px 12px" onclick={undo} disabled={!canUndo}>↶ 되돌리기</button>
	</div>
	<div
		style="height:6px; background:var(--line); border-radius:999px; overflow:hidden; margin-bottom:20px"
	>
		<div style="height:100%; width:{ratio * 100}%; background:var(--accent); transition:width .2s"></div>
	</div>

	{#if pair}
		<p style="text-align:center; margin:0 0 16px" class="muted">둘 중 더 위인 걸 골라요</p>
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
							style="width:100%; aspect-ratio:1; border-radius:12px; object-fit:cover"
						/>
					{:else}
						<div
							style="width:100%; aspect-ratio:1; border-radius:12px; background:var(--bg); display:grid; place-items:center; font-size:40px"
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
	<!-- ===== 직접 순위(드래그) ===== -->
	<p style="text-align:center; margin:8px 0 16px" class="muted">위에서부터 1등. 드래그해서 배치해요</p>
	<ul
		use:dragReorder={{ onReorder }}
		style="list-style:none; margin:0 0 20px; padding:0; display:grid; gap:8px; touch-action:none"
	>
		{#each order as c, i (c.id)}
			<li
				data-drag-item
				data-id={c.id}
				class="card"
				style="padding:10px 14px; display:flex; align-items:center; gap:12px; cursor:grab; user-select:none"
			>
				<span class="muted" style="width:24px; text-align:center">{i + 1}</span>
				{#if c.image}
					<img
						src={c.image}
						alt=""
						style="width:40px; height:40px; border-radius:8px; object-fit:cover"
					/>
				{/if}
				<strong style="font-size:16px; flex:1">{c.name}</strong>
				<span class="muted" style="font-size:20px">⠿</span>
			</li>
		{/each}
	</ul>
	<button class="btn btn-primary btn-block" onclick={finishDrag}>이 순위로 완료</button>
{/if}

<style>
	/* 비교 카드 선택 피드백: 누르면 약 1초간 커지며 강조 */
	.compare-card {
		border: 2px solid transparent;
		transition:
			transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1),
			border-color 0.2s ease,
			box-shadow 0.2s ease,
			opacity 0.2s ease;
		will-change: transform;
	}
	.compare-card.picked {
		transform: scale(1.06);
		border-color: var(--accent);
		box-shadow: 0 10px 30px color-mix(in srgb, var(--accent) 40%, transparent);
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
