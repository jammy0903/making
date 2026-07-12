<!--
	[프로토] 새 게임 카드 = "조건명 + 현재 문장 1개"(고정 크기) + 카드 밑 바구니 2개.
	왼 바구니=감수한 페널티, 오 바구니=감수한 메리트. 갈아탄(회피) 조건은 안 담김.
	variant 1/2 = 바구니 시각 스타일 후보. 로직은 동일.
-->
<script lang="ts">
	import { shortenPenalty, type Deck, type Penalty } from '$lib/game/decks';
	import type { SideIndex } from '$lib/game/engine';
	import Icon from '$lib/game/Icon.svelte';

	type Short = { p: string; m: string };
	let {
		deck,
		variant,
		shorts
	}: { deck: Deck; variant: 1 | 2 | 3 | 4; shorts?: { a: Short[]; b: Short[] } } = $props();

	let picks = $state<SideIndex[]>([]);

	const rounds = $derived(deck.a.penalties.length + 1);
	const done = $derived(picks.length >= rounds);
	const roundNum = $derived(picks.length + 1);
	const sideOf = (s: SideIndex) => (s === 0 ? deck.a : deck.b);

	// 감수(그 편 유지)한 조건만 편별로 축적. 갈아탄 판은 안 담김.
	const endured = $derived.by<[Penalty[], Penalty[]]>(() => {
		const e: [Penalty[], Penalty[]] = [[], []];
		for (let R = 2; R <= picks.length; R++) {
			const prev = picks[R - 2];
			const cur = picks[R - 1];
			if (cur === prev) e[cur].push(sideOf(cur).penalties[R - 2]);
		}
		return e;
	});

	// 이번 판 결정 대상 = 활성 편(직전 선택)의 새 조건.
	const activeSide = $derived(picks.length >= 1 && !done ? picks[picks.length - 1] : null);
	const pending = $derived(
		activeSide !== null ? (sideOf(activeSide).penalties[picks.length - 1] ?? null) : null
	);

	// 카드에 보일 문장: 활성 편=이번 판 새 조건, 반대 편=마지막으로 감수한 조건(없으면 없음).
	function cardCond(s: SideIndex): Penalty | null {
		if (s === activeSide) return pending;
		const list = endured[s];
		return list.length ? list[list.length - 1] : null;
	}

	function pick(s: SideIndex) {
		if (!done) picks = [...picks, s];
	}
	const reset = () => (picks = []);
	const sides: SideIndex[] = [0, 1];

	// 바구니 칩 = 짧은 태그만. shorts 있으면 그걸, 없으면 원문 축약(폴백).
	function tag(s: SideIndex, p: Penalty, kind: 'p' | 'm'): string {
		const arr = s === 0 ? shorts?.a : shorts?.b;
		const t = arr?.[p.strength - 2]?.[kind];
		return t ?? shortenPenalty(kind === 'p' ? p.text : (p.merit ?? ''));
	}

	// 바구니 라벨(후보별). 3·4는 남녀노소 친화 한국어 + 감정 이모지.
	const LABELS: Record<number, { pi: string; pl: string; mi: string; ml: string }> = {
		1: { pi: '🧺', pl: '페널티', mi: '🧺', ml: '메리트' },
		2: { pi: '🧺', pl: '페널티', mi: '🧺', ml: '메리트' },
		3: { pi: '💢', pl: '참은 것', mi: '✨', ml: '얻은 것' },
		4: { pi: '🎒', pl: '참은 것', mi: '🎁', ml: '얻은 것' }
	};
	const L = $derived(LABELS[variant]);
</script>

<div class="board v{variant}">
	<div class="hd">
		<span class="rnd">{done ? '완주! 🎉' : `${roundNum}번째 판`}</span>
		<button class="rst" onclick={reset}>처음부터</button>
	</div>

	<div class="cards">
		{#each sides as s (s)}
			{@const c = cardCond(s)}
			<div class="col">
				<button
					class="card"
					class:active={s === activeSide}
					class:done
					onclick={() => pick(s)}
					disabled={done}
				>
					<div class="cname">
						<span class="emoji"><Icon value={sideOf(s).emoji} /></span>
						{sideOf(s).name}
					</div>
					<div class="csent" class:empty-wrap={!c}>
						{#if c}
							<span class="gr">그런데 이제</span>
							{c.text}.{#if c.merit}
								<span class="gr">하지만</span> <span class="mi">{c.merit}</span>.{/if}
						{:else}
							<span class="empty">여기 눌러서 이 편으로 시작</span>
						{/if}
					</div>
					{#if s === activeSide}<span class="tag">지금 이 조건 감수?</span>{/if}
				</button>

				<div class="baskets">
					<div class="bk pen">
						<div class="bk-h">{L.pi} {L.pl} <b>{endured[s].length}</b></div>
						<div class="bk-body">
							{#each endured[s] as p (p.strength)}
								<span class="chip">{tag(s, p, 'p')}</span>
							{:else}
								<span class="none">아직 없음</span>
							{/each}
						</div>
					</div>
					<div class="bk mer">
						<div class="bk-h">{L.mi} {L.ml} <b>{endured[s].filter((p) => p.merit).length}</b></div>
						<div class="bk-body">
							{#each endured[s].filter((p) => p.merit) as p (p.strength)}
								<span class="chip">{tag(s, p, 'm')}</span>
							{:else}
								<span class="none">아직 없음</span>
							{/each}
						</div>
					</div>
				</div>
			</div>
		{/each}
	</div>
</div>

<style>
	/* 게임 화면 디자인 시스템 그대로: Galmuri 픽셀 폰트(body 상속) · 잉크 테두리 3px ·
	   하드 그림자 · 각진 모서리 · CSS 변수(app.css). 현재 조건은 게임의 cond-new 노란 하이라이트. */
	.board {
		font: inherit;
		color: var(--ink);
	}
	.hd {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 10px;
	}
	.rnd {
		font-weight: 700;
		font-size: 15px;
	}
	.rst {
		font: inherit;
		font-size: 12px;
		font-weight: 700;
		border: 3px solid var(--line);
		background: var(--surface);
		color: var(--ink);
		border-radius: 0;
		padding: 5px 10px;
		cursor: pointer;
		box-shadow: 2px 2px 0 var(--shadow-color);
	}
	.rst:active {
		transform: translate(2px, 2px);
		box-shadow: none;
	}
	.cards {
		display: flex;
		gap: 12px;
		align-items: flex-start;
	}
	.col {
		flex: 1 1 0;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	/* ── 카드: 조건명 + 현재 문장 1개, 크기 고정. 게임 .panel과 동일 룩 ── */
	.card {
		display: flex;
		flex-direction: column;
		gap: 8px;
		text-align: left;
		width: 100%;
		padding: 16px;
		background: var(--surface);
		border: 3px solid var(--line);
		border-radius: 0;
		box-shadow: var(--shadow);
		cursor: pointer;
		font: inherit;
		color: var(--ink);
		min-height: 134px; /* 문장 1개 기준 고정 — 누적돼도 안 늘어남 */
		transition:
			transform 0.05s steps(2),
			box-shadow 0.05s steps(2);
	}
	.card:active:not(:disabled) {
		transform: translate(3px, 3px);
		box-shadow: 1px 1px 0 var(--shadow-color);
	}
	.card:disabled {
		cursor: default;
		opacity: 0.6;
	}
	.card.active {
		border-color: var(--gold);
		box-shadow: 4px 4px 0 var(--gold);
	}
	.cname {
		display: flex;
		align-items: center;
		gap: 6px;
		font-weight: 700;
		font-size: 15px;
	}
	.emoji {
		font-size: 1.2em;
		line-height: 1;
	}
	/* 현재 조건 = 게임의 cond-new(노란 하이라이트) 그대로 */
	.csent {
		font-size: 13.5px;
		line-height: 1.5;
		font-weight: 700;
		background: #fff3bf;
		color: #211f3d;
		padding: 8px 10px;
		border-left: 4px solid #f0b429;
	}
	.csent.empty-wrap {
		background: transparent;
		border-left: 0;
		padding: 6px 0;
		font-weight: 400;
	}
	.gr {
		font-size: 11px;
		color: #7a6f3a;
		font-weight: 600;
	}
	.mi {
		color: #1b6e3f;
		font-weight: 700;
	}
	.empty {
		color: var(--muted);
		font-size: 12.5px;
	}
	.tag {
		margin-top: auto;
		align-self: flex-start;
		font-size: 11px;
		font-weight: 700;
		color: #8a6d00;
		background: #fff3bf;
		border: 2px solid #f0b429;
		padding: 2px 7px;
	}

	/* ── 바구니 공통(같은 픽셀 테마) ── */
	.baskets {
		display: flex;
		gap: 8px;
	}
	.bk {
		flex: 1 1 0;
		min-width: 0;
	}
	.bk-h {
		display: flex;
		align-items: center;
		gap: 5px;
		font-size: 11.5px;
		font-weight: 700;
		margin-bottom: 5px;
	}
	.bk-h b {
		font-size: 11px;
		color: #fff;
		padding: 0 6px;
		border: 2px solid var(--line);
	}
	.pen .bk-h b {
		background: var(--danger);
	}
	.mer .bk-h b {
		background: var(--mint);
		color: #08301f;
	}
	.none {
		font-size: 11px;
		color: var(--muted);
	}

	/* ── 후보 1: 리스트형(· 세로 리스트) ── */
	.v1 .bk-body {
		display: flex;
		flex-direction: column;
		gap: 3px;
		padding: 8px;
		min-height: 62px;
		background: var(--surface);
		border: 3px solid var(--line);
		box-shadow: 2px 2px 0 var(--shadow-color);
	}
	.v1 .pen .bk-body {
		border-left-width: 6px;
		border-left-color: var(--danger);
	}
	.v1 .mer .bk-body {
		border-left-width: 6px;
		border-left-color: var(--mint);
	}
	.v1 .chip {
		font-size: 12px;
		line-height: 1.35;
	}
	.v1 .pen .chip::before {
		content: '· ';
		color: var(--danger);
		font-weight: 800;
	}
	.v1 .mer .chip::before {
		content: '· ';
		color: var(--mint);
		font-weight: 800;
	}

	/* ── 후보 2: 채워지는 바구니(칩이 통에 쌓임) ── */
	.v2 .bk-body {
		display: flex;
		flex-wrap: wrap;
		gap: 5px;
		align-content: flex-start;
		padding: 9px;
		min-height: 66px;
		background: var(--soft);
		border: 3px solid var(--line);
		box-shadow: 2px 2px 0 var(--shadow-color);
	}
	.v2 .chip {
		font-size: 11.5px;
		font-weight: 700;
		padding: 3px 8px;
		border: 2px solid var(--line);
		white-space: nowrap;
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.v2 .pen .chip {
		background: var(--danger);
		color: #fff;
	}
	.v2 .mer .chip {
		background: var(--mint);
		color: #08301f;
	}

	/* ── 후보 3: 밸런스 저울(밸런스게임 메타포). 보 + 받침점 ▲ 위에 두 접시 ── */
	.v3 .baskets {
		position: relative;
		gap: 22px;
		padding-top: 18px;
		margin-top: 4px;
	}
	.v3 .baskets::before {
		/* 저울 보(가로 막대) */
		content: '';
		position: absolute;
		top: 6px;
		left: 7%;
		right: 7%;
		height: 5px;
		background: var(--line);
	}
	.v3 .baskets::after {
		/* 받침점 ▲ */
		content: '';
		position: absolute;
		top: 8px;
		left: 50%;
		transform: translateX(-50%);
		width: 0;
		height: 0;
		border-left: 10px solid transparent;
		border-right: 10px solid transparent;
		border-bottom: 16px solid var(--line);
	}
	.v3 .bk {
		position: relative;
	}
	.v3 .bk::before {
		/* 접시를 보에 매단 줄 */
		content: '';
		position: absolute;
		top: -12px;
		left: 50%;
		transform: translateX(-50%);
		width: 3px;
		height: 12px;
		background: var(--line);
	}
	.v3 .bk-h {
		text-align: center;
	}
	.v3 .bk-body {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		align-content: flex-start;
		gap: 5px;
		padding: 10px;
		min-height: 60px;
		background: var(--surface);
		border: 3px solid var(--line);
		box-shadow: 2px 3px 0 var(--shadow-color);
	}
	.v3 .pen .bk-body {
		border-color: var(--danger);
	}
	.v3 .mer .bk-body {
		border-color: var(--mint);
	}
	.v3 .chip {
		font-size: 11.5px;
		font-weight: 700;
		padding: 3px 8px;
		border: 2px solid var(--line);
		white-space: nowrap;
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.v3 .pen .chip {
		background: var(--danger);
		color: #fff;
	}
	.v3 .mer .chip {
		background: var(--mint);
		color: #08301f;
	}

	/* ── 후보 4: 감정 아이템 태그(가독성·친화성 극대화). 큰 이모지 칩, 부드러운 색 ── */
	.v4 .bk-h {
		font-size: 12.5px;
	}
	.v4 .bk-body {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		padding: 11px;
		min-height: 58px;
		background: var(--surface);
		border: 3px solid var(--line);
		box-shadow: 3px 3px 0 var(--shadow-color);
	}
	.v4 .pen .bk-body {
		border-top: 6px solid var(--danger);
	}
	.v4 .mer .bk-body {
		border-top: 6px solid var(--mint);
	}
	.v4 .chip {
		display: inline-flex;
		align-items: center;
		font-size: 12.5px;
		font-weight: 700;
		line-height: 1.3;
		padding: 5px 9px;
		border: 2px solid var(--line);
	}
	.v4 .pen .chip {
		background: #ffe3e3;
		color: #b02020;
	}
	.v4 .mer .chip {
		background: #d3f9d8;
		color: #0f5c33;
	}
	.v4 .pen .chip::before {
		content: '💢';
		margin-right: 4px;
	}
	.v4 .mer .chip::before {
		content: '💎';
		margin-right: 4px;
	}

	/* ── 모바일(아이폰 등 ≤640px): 카드 2개는 좌우 유지(vs 대결), 카드 안 두 바구니는
	   세로로 쌓아 각 바구니가 칸 폭을 꽉 쓰게(가독성). 칩은 잘리지 말고 줄바꿈. ── */
	@media (max-width: 640px) {
		/* 두 편(카드+바구니)을 세로로 쌓아 각 편이 폭을 꽉 씀 → A/B 높이차로 어긋나던 문제 해소.
		   full-width라 카드 안 바구니 2개는 좌우 그대로, 후보 3 저울도 정상 유지. */
		.cards {
			flex-direction: column;
			gap: 16px;
		}
		.csent {
			font-size: 13px;
		}
		.chip {
			white-space: normal !important; /* 좁은 칩도 잘리지 말고 줄바꿈 */
		}
	}
</style>
