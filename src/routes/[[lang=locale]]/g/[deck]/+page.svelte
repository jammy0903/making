<script lang="ts">
	import { page } from '$app/state';
	import { localePath, defaultLocale, type Locale } from '$lib/i18n';
	import { getDeck } from '$lib/game/decks';
	import { accumulated, computeResult, ROUNDS, type SideIndex } from '$lib/game/engine';

	const locale = $derived((page.params.lang as Locale) ?? defaultLocale);
	const deck = $derived(getDeck(page.params.deck ?? ''));

	// 플레이 상태 — 고른 사이드 배열(0=a, 1=b). 메커니즘/점수는 화면에 숨김(B-2).
	let choices = $state<SideIndex[]>([]);

	const done = $derived(choices.length >= ROUNDS);
	const roundNum = $derived(choices.length + 1); // 1-based, 결정 중인 판
	// 현재 판에서 각 사이드에 쌓인 페널티(이번 판 새 페널티 포함)
	const acc = $derived(deck && !done ? accumulated(deck, choices) : null);
	const result = $derived(deck && done ? computeResult(deck, choices) : null);

	// 위치 편향 제거: 판마다 위·아래 표시 순서를 섞는다(자문 A-2).
	// 결과 로직엔 미사용(결정론 유지) — 고정 스크램블 5:5, 선택 기록은 여전히 사이드ID.
	const DISPLAY_ORDER: SideIndex[][] = [
		[0, 1],
		[1, 0],
		[1, 0],
		[0, 1],
		[0, 1],
		[1, 0],
		[0, 1],
		[1, 0],
		[1, 0],
		[0, 1]
	];
	const order = $derived(DISPLAY_ORDER[choices.length % DISPLAY_ORDER.length]);

	function pick(s: SideIndex) {
		choices = [...choices, s];
	}
	function restart() {
		choices = [];
	}

	// 결과 카드용 파생값
	const prefSide = $derived(deck && result ? (result.pref === 0 ? deck.a : deck.b) : null);
	const burnedSide = $derived(deck && result ? (result.burned === 0 ? deck.a : deck.b) : null);
	const headline = $derived(
		result && prefSide
			? result.enduredPref.length
				? result.enduredPref
						.slice(0, 2)
						.map((p) => p.text)
						.join(', ')
				: null
			: null
	);
</script>

<svelte:head>
	<title>{deck ? deck.title : '그런데이제'}</title>
</svelte:head>

{#if !deck}
	<div class="empty" style="margin-top:48px">
		<h2>주제를 찾을 수 없어요.</h2>
		<a class="btn btn-primary" href={localePath(locale, '/')}>홈으로</a>
	</div>
{:else if !done && acc}
	<!-- 플레이: 두 사이드 세로 스택. 패널 자체가 선택 버튼. 라벨·점수 없음(B-2). -->
	<div class="progress" aria-hidden="true">
		{#each Array(ROUNDS) as _, i (i)}
			<span class="dot" class:filled={i < choices.length}></span>
		{/each}
	</div>

	<div class="board">
		{#each order as si (si)}
			{@const s = si === 0 ? deck.a : deck.b}
			<button class="panel" onclick={() => pick(si)}>
				<span class="panel-head"><span class="emoji">{s.emoji}</span> {s.name}</span>
				{#if acc[si].length > 2}
					<!-- 이전 조건 접힘: 인지 부하 완화(자문 A-3). 최신 조건만 강조. -->
					<span class="cond-fold">이미 {acc[si].length - 1}개 감수 중…</span>
					<span class="cond cond-new">그런데 이제 {acc[si][acc[si].length - 1].text}</span>
				{:else}
					{#each acc[si] as p (p.strength)}
						<span class="cond">그런데 이제 {p.text}</span>
					{/each}
				{/if}
			</button>
		{/each}
	</div>
{:else if result && prefSide && burnedSide}
	<!-- 결과 카드: 버틴 깊이 대조(A-5). 플레이 중 숨긴 분석을 여기서 공개. -->
	<div class="result card">
		<div class="result-badge">그런데 이제 · 결과</div>

		{#if result.indecisive}
			<p class="result-headline">
				<span class="endured">이쪽저쪽 재기만 하다</span><br />
				어느 쪽도 끝까지 못 버틴 <b>결정장애</b> 유형
			</p>
		{:else}
			<p class="result-headline">
				{#if headline}
					<span class="endured">「{headline}」</span><br />
				{/if}
				그래도 <span class="emoji">{prefSide.emoji}</span> <b>{prefSide.name}</b> 못 버리는 사람
			</p>
		{/if}

		<div class="depth">
			<div class="depth-title">🌡️ 버틴 깊이</div>
			{#each [deck.a, deck.b] as s, si (si)}
				<div class="bar-row">
					<span class="bar-label">{s.emoji} {s.name}</span>
					<span class="bar-track">
						<span class="bar-fill" style="width:{(result.holdMax[si] / ROUNDS) * 100}%"></span>
					</span>
					<span class="bar-num">{result.holdMax[si]}</span>
				</div>
			{/each}
			<p class="verdict">{result.verdict}</p>
		</div>

		<div class="result-actions">
			<button class="btn btn-primary" onclick={restart}>다시 하기</button>
			<a class="btn" href={localePath(locale, '/')}>다른 주제</a>
		</div>
	</div>
{/if}

<style>
	.progress {
		display: flex;
		justify-content: center;
		gap: 6px;
		margin: 8px 0 20px;
	}
	.dot {
		width: 10px;
		height: 10px;
		border: 2px solid var(--line);
		background: var(--surface);
	}
	.dot.filled {
		background: var(--accent);
		border-color: var(--accent);
	}

	.board {
		display: flex;
		flex-direction: column;
		gap: 14px;
		max-width: 560px;
		margin: 0 auto;
	}
	.panel {
		display: flex;
		flex-direction: column;
		gap: 8px;
		width: 100%;
		text-align: left;
		padding: 20px;
		background: var(--surface);
		border: 3px solid var(--line);
		box-shadow: var(--shadow);
		cursor: pointer;
		font: inherit;
		color: var(--ink);
		transition: transform 0.06s ease;
	}
	.panel:active {
		transform: translate(2px, 2px);
		box-shadow: none;
	}
	.panel-head {
		font-size: 22px;
		font-weight: 800;
	}
	.emoji {
		font-size: 1.1em;
	}
	.cond {
		font-size: 15px;
		line-height: 1.45;
		color: var(--ink);
		padding-left: 2px;
	}
	.cond-fold {
		font-size: 13px;
		color: var(--muted);
		padding-left: 2px;
	}
	.cond-new {
		font-weight: 700;
	}

	.result {
		max-width: 480px;
		margin: 12px auto;
		padding: 24px;
		text-align: center;
	}
	.result-badge {
		font-size: 13px;
		letter-spacing: 0.04em;
		color: var(--muted);
		margin-bottom: 16px;
	}
	.result-headline {
		font-size: 19px;
		line-height: 1.5;
		margin: 0 0 22px;
	}
	.endured {
		color: var(--accent);
		font-weight: 700;
	}
	.depth {
		text-align: left;
		border-top: 3px solid var(--line);
		padding-top: 16px;
	}
	.depth-title {
		font-weight: 700;
		margin-bottom: 10px;
	}
	.bar-row {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 8px;
	}
	.bar-label {
		flex: 0 0 84px;
		font-size: 14px;
	}
	.bar-track {
		flex: 1;
		height: 14px;
		background: var(--soft);
		border: 2px solid var(--line);
	}
	.bar-fill {
		display: block;
		height: 100%;
		background: var(--accent);
	}
	.bar-num {
		flex: 0 0 20px;
		text-align: right;
		font-size: 13px;
		font-weight: 700;
	}
	.verdict {
		margin: 12px 0 0;
		font-size: 15px;
		color: var(--ink);
	}
	.result-actions {
		display: flex;
		gap: 10px;
		margin-top: 22px;
	}
	.result-actions .btn {
		flex: 1;
	}
</style>
