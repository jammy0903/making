<!--
	[프로토·새 레이아웃 + 그래픽 스킨] 사용자 스케치:
	① 상단 = 편 이름 카드 2개(a vs b) ② 중앙 = 현재 조건 1개 full-width ③ 하단 = 편별 바구니 2개
	theme='pixel'(아케이드) / 'receipt'(감열지 전표·도트프린터). 로직·규칙 동일.
-->
<script lang="ts">
	import { shortenPenalty, type Deck, type Penalty } from '$lib/game/decks';
	import type { SideIndex } from '$lib/game/engine';
	import Icon from '$lib/game/Icon.svelte';

	type Short = { p: string; m: string };
	let {
		deck,
		shorts,
		theme = 'pixel'
	}: { deck: Deck; shorts?: { a: Short[]; b: Short[] }; theme?: 'pixel' | 'receipt' } = $props();

	let picks = $state<SideIndex[]>([]);
	const rounds = $derived(deck.a.penalties.length + 1);
	const done = $derived(picks.length >= rounds);
	const roundNum = $derived(picks.length + 1);
	const sideOf = (s: SideIndex) => (s === 0 ? deck.a : deck.b);

	const endured = $derived.by<[Penalty[], Penalty[]]>(() => {
		const e: [Penalty[], Penalty[]] = [[], []];
		for (let R = 2; R <= picks.length; R++) {
			const prev = picks[R - 2];
			const cur = picks[R - 1];
			if (cur === prev) e[cur].push(sideOf(cur).penalties[R - 2]);
		}
		return e;
	});
	const activeSide = $derived(picks.length >= 1 && !done ? picks[picks.length - 1] : null);
	const pending = $derived(
		activeSide !== null ? (sideOf(activeSide).penalties[picks.length - 1] ?? null) : null
	);

	function tag(s: SideIndex, p: Penalty, kind: 'p' | 'm'): string {
		const arr = s === 0 ? shorts?.a : shorts?.b;
		const t = arr?.[p.strength - 2]?.[kind];
		return t ?? shortenPenalty(kind === 'p' ? p.text : (p.merit ?? ''));
	}
	function pick(s: SideIndex) {
		if (!done) picks = [...picks, s];
	}
	const reset = () => (picks = []);
	const sides: SideIndex[] = [0, 1];
</script>

<div class="nb {theme}">
	<div class="hd">
		<span class="rnd">{done ? '완주! 🎉' : `${roundNum}번째 판`}</span>
		<button class="rst" onclick={reset}>{theme === 'receipt' ? '재발행' : '처음부터'}</button>
	</div>

	{#if theme === 'receipt'}
		<div class="rc-head">
			<div class="rc-title">그런데이제 · 취향전표</div>
			<div class="rc-sub">{deck.title}</div>
		</div>
	{/if}

	<!-- ① 편 이름 카드 2개 -->
	<div class="names">
		<button class="ncard a" class:active={activeSide === 0} disabled={done} onclick={() => pick(0)}>
			<Icon value={deck.a.emoji} /> <span>{deck.a.name}</span>
		</button>
		<span class="vs">VS</span>
		<button class="ncard b" class:active={activeSide === 1} disabled={done} onclick={() => pick(1)}>
			<Icon value={deck.b.emoji} /> <span>{deck.b.name}</span>
		</button>
	</div>

	<!-- ② 현재 조건 1개(full-width) -->
	<div class="cond" class:a={activeSide === 0} class:b={activeSide === 1}>
		{#if theme === 'receipt'}<span class="rc-tag">▎지금 조건</span>{/if}
		{#if pending}
			<span class="gr">그런데 이제</span>
			{pending.text}.{#if pending.merit}
				<span class="gr">하지만</span> <span class="mi">{pending.merit}</span>.{/if}
			{#if theme === 'pixel'}<span class="dlg">▼</span>{/if}
		{:else if done}
			<span class="empty">끝! 아래 바구니에 쌓인 걸로 결과가 나와요.</span>
		{:else}
			<span class="empty">위에서 한쪽을 골라 시작하세요. 그 편에 조건이 하나씩 붙어요.</span>
		{/if}
	</div>

	<!-- ③ 편별 바구니 2개 -->
	<div class="baskets">
		{#each sides as s (s)}
			<div class="sbox {s === 0 ? 'a' : 'b'}">
				<div class="sbox-h"><Icon value={sideOf(s).emoji} /> {sideOf(s).name}</div>
				<div class="grp mer">
					<div class="grp-h">🎁 얻은 것 <b>{endured[s].filter((p) => p.merit).length}</b></div>
					<div class="chips">
						{#each endured[s].filter((p) => p.merit) as p (p.strength)}
							<span class="chip">{tag(s, p, 'm')}</span>
						{:else}
							<span class="none">—</span>
						{/each}
					</div>
				</div>
				<div class="grp pen">
					<div class="grp-h">💢 참은 것 <b>{endured[s].length}</b></div>
					<div class="chips">
						{#each endured[s] as p (p.strength)}
							<span class="chip">{tag(s, p, 'p')}</span>
						{:else}
							<span class="none">—</span>
						{/each}
					</div>
				</div>
			</div>
		{/each}
	</div>

	{#if theme === 'receipt'}
		<div class="rc-foot">
			<div class="rc-barcode" aria-hidden="true"></div>
			<div class="rc-thanks">* 감수한 항목만 집계됩니다 *</div>
		</div>
	{/if}
</div>

<style>
	.nb {
		font: inherit;
		color: var(--ink);
	}
	.hd {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 12px;
	}
	.rnd {
		font-weight: 700;
		font-size: 15px;
	}
	.rst {
		font: inherit;
		font-size: 12px;
		font-weight: 700;
		cursor: pointer;
	}

	/* ① 편 이름 카드 */
	.names {
		display: flex;
		align-items: stretch;
		gap: 8px;
		margin-bottom: 10px;
	}
	.ncard {
		flex: 1 1 0;
		min-width: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		font: inherit;
		font-weight: 800;
		font-size: 16px;
		color: var(--ink);
		padding: 14px 10px;
		cursor: pointer;
	}
	.ncard span {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.ncard:disabled {
		opacity: 0.6;
		cursor: default;
	}
	.vs {
		align-self: center;
		font-weight: 800;
		font-size: 13px;
		color: var(--muted);
	}

	/* ② 현재 조건 바 */
	.cond {
		position: relative;
		font-size: 14.5px;
		line-height: 1.55;
		font-weight: 700;
		padding: 14px;
		margin-bottom: 16px;
		min-height: 82px;
	}
	.cond .gr {
		font-size: 11px;
		font-weight: 600;
	}
	.cond .empty {
		font-weight: 400;
		font-size: 13px;
	}

	/* ③ 편별 바구니 */
	.baskets {
		display: flex;
		gap: 10px;
	}
	.sbox {
		flex: 1 1 0;
		min-width: 0;
	}
	.sbox-h {
		font-weight: 800;
		font-size: 13.5px;
		padding: 8px 10px;
		display: flex;
		align-items: center;
		gap: 5px;
	}
	.grp {
		padding: 8px 10px;
	}
	.grp-h {
		font-size: 11.5px;
		font-weight: 700;
		margin-bottom: 6px;
	}
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 5px;
	}
	.chip {
		font-size: 11.5px;
		font-weight: 700;
		padding: 3px 8px;
	}
	.none {
		font-size: 11px;
		color: var(--muted);
	}

	/* ══════════════ 스킨 1 · 픽셀 아케이드 ══════════════ */
	.pixel .rst {
		border: 3px solid var(--line);
		background: var(--surface);
		color: var(--ink);
		padding: 5px 10px;
		box-shadow: 2px 2px 0 var(--shadow-color);
	}
	.pixel .rst:active {
		transform: translate(2px, 2px);
		box-shadow: none;
	}
	.pixel .ncard {
		border: 3px solid var(--line);
		box-shadow: var(--shadow);
		transition:
			transform 0.05s steps(2),
			box-shadow 0.05s steps(2);
	}
	.pixel .ncard.a {
		background: var(--side-a);
	}
	.pixel .ncard.b {
		background: var(--side-b);
	}
	.pixel .ncard:active:not(:disabled) {
		transform: translate(3px, 3px);
		box-shadow: 1px 1px 0 var(--shadow-color);
	}
	.pixel .ncard.active {
		border-color: var(--gold);
		box-shadow: 4px 4px 0 var(--gold);
	}
	.pixel .vs {
		background: var(--danger);
		color: #fff;
		border: 3px solid var(--line);
		padding: 2px 8px;
		box-shadow: 2px 2px 0 var(--shadow-color);
	}
	.pixel .cond {
		background: var(--cond-hl);
		color: #211f3d;
		border: 3px solid var(--line);
		border-left-width: 8px;
		border-left-color: var(--cond-hl-line);
		box-shadow: var(--shadow);
		/* 살짝 스캔라인(픽셀 CRT 느낌) */
		background-image: repeating-linear-gradient(
			0deg,
			#0000 0 3px,
			rgba(33, 31, 61, 0.04) 3px 4px
		);
	}
	.pixel .cond.a {
		border-left-color: var(--penalty);
	}
	.pixel .cond.b {
		border-left-color: var(--merit);
	}
	.pixel .cond .gr {
		color: #7a6f3a;
	}
	.pixel .cond .mi {
		color: #1b6e3f;
		font-weight: 700;
	}
	.pixel .cond .empty {
		color: #8a7f4a;
	}
	.pixel .dlg {
		position: absolute;
		right: 10px;
		bottom: 6px;
		color: #b58a00;
		animation: blink 1s steps(2) infinite;
	}
	@keyframes blink {
		50% {
			opacity: 0;
		}
	}
	.pixel .sbox {
		border: 3px solid var(--line);
		background: var(--surface);
		box-shadow: var(--shadow);
	}
	.pixel .sbox.a {
		border-top: 7px solid var(--penalty);
	}
	.pixel .sbox.b {
		border-top: 7px solid var(--merit);
	}
	.pixel .sbox-h {
		border-bottom: 2px dashed var(--soft);
	}
	.pixel .grp.mer {
		border-bottom: 2px dashed var(--soft);
	}
	.pixel .grp-h b {
		font-size: 11px;
		color: #fff;
		padding: 0 6px;
		border: 2px solid var(--line);
	}
	.pixel .grp.mer .grp-h b {
		background: var(--merit);
	}
	.pixel .grp.pen .grp-h b {
		background: var(--penalty);
	}
	.pixel .chip {
		border: 2px solid var(--line);
	}
	.pixel .grp.mer .chip {
		background: var(--merit-soft);
		color: var(--merit-ink);
	}
	.pixel .grp.pen .chip {
		background: var(--penalty-soft);
		color: var(--penalty-ink);
	}

	/* ══════════════ 스킨 2 · 감열지 전표(도트프린터/타자기) ══════════════ */
	.receipt {
		background: #f7f4ea;
		color: #33302a;
		padding: 16px 16px 10px;
		border: 1px solid #d8d2c0;
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
		/* 감열지 결 */
		background-image: repeating-linear-gradient(0deg, #0000 0 22px, rgba(0, 0, 0, 0.02) 22px 23px);
	}
	.receipt .rnd {
		font-size: 13px;
		letter-spacing: 1px;
	}
	.receipt .rst {
		border: 1px dashed #8a8578;
		background: #fffdf6;
		color: #33302a;
		padding: 3px 9px;
	}
	.receipt .rc-head {
		text-align: center;
		border-top: 2px dashed #b7b09c;
		border-bottom: 2px dashed #b7b09c;
		padding: 8px 0;
		margin-bottom: 12px;
	}
	.receipt .rc-title {
		font-weight: 800;
		font-size: 15px;
		letter-spacing: 2px;
	}
	.receipt .rc-sub {
		font-size: 11.5px;
		color: #6e695c;
		margin-top: 2px;
	}
	.receipt .ncard {
		background: #fffdf6;
		border: 1px dashed #8a8578;
		color: #33302a;
		font-weight: 700;
	}
	.receipt .ncard.active {
		border-style: solid;
		border-color: #33302a;
		background: #efe9d6;
	}
	.receipt .vs {
		color: #a7a08c;
	}
	.receipt .cond {
		background: #fffdf6;
		border: 1px dashed #b7b09c;
		border-top-width: 2px;
		border-bottom-width: 2px;
		color: #33302a;
		font-weight: 400;
		padding: 12px 12px 12px 14px;
	}
	.receipt .cond.a {
		border-left: 4px solid #b23b3b;
	}
	.receipt .cond.b {
		border-left: 4px solid #2f7d52;
	}
	.receipt .rc-tag {
		display: block;
		font-size: 10.5px;
		font-weight: 700;
		color: #8a8578;
		letter-spacing: 1px;
		margin-bottom: 4px;
	}
	.receipt .cond .gr {
		color: #a7a08c;
	}
	.receipt .cond .mi {
		font-weight: 700;
		text-decoration: underline;
	}
	.receipt .cond .empty {
		color: #8a8578;
	}
	.receipt .sbox {
		background: #fffdf6;
		border: 1px dashed #b7b09c;
	}
	.receipt .sbox-h {
		border-bottom: 1px dashed #cfc8b4;
		font-weight: 700;
		letter-spacing: 1px;
	}
	.receipt .grp.mer {
		border-bottom: 1px dashed #cfc8b4;
	}
	.receipt .grp-h {
		display: flex;
		justify-content: space-between;
	}
	.receipt .grp-h b {
		font-weight: 700;
	}
	/* 전표: 칩을 세로 품목 나열로 */
	.receipt .chips {
		flex-direction: column;
		gap: 2px;
		align-items: stretch;
	}
	.receipt .chip {
		border: 0;
		background: transparent;
		padding: 1px 0;
		font-weight: 400;
		font-size: 12px;
	}
	.receipt .chip::before {
		content: '· ';
		color: #a7a08c;
	}
	.receipt .rc-foot {
		text-align: center;
		margin-top: 12px;
		border-top: 2px dashed #b7b09c;
		padding-top: 10px;
	}
	.receipt .rc-barcode {
		height: 34px;
		margin: 0 auto 6px;
		max-width: 220px;
		background: repeating-linear-gradient(
			90deg,
			#33302a 0 2px,
			#0000 2px 4px,
			#33302a 4px 5px,
			#0000 5px 9px,
			#33302a 9px 12px,
			#0000 12px 14px
		);
	}
	.receipt .rc-thanks {
		font-size: 11px;
		color: #6e695c;
		letter-spacing: 1px;
	}

	/* 모바일: 편별 바구니 세로 스택 + 이름 줄바꿈 */
	@media (max-width: 640px) {
		.baskets {
			flex-direction: column;
		}
		.cond {
			font-size: 13.5px;
		}
		.ncard {
			font-size: 13px;
			padding: 10px 8px;
		}
		.ncard span {
			white-space: normal;
		}
	}
</style>
