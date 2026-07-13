<script lang="ts">
	import { page } from '$app/state';
	import { localePath, defaultLocale, type Locale } from '$lib/i18n';
	import { SITE } from '$lib/site';
	import { search } from '$lib/search.svelte';
	import { isImageIcon } from '$lib/game/decks';
	import Icon from '$lib/game/Icon.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const locale = $derived((page.params.lang as Locale) ?? defaultLocale);

	// 게임 카탈로그 구조화 데이터(ItemList) — 크롤러가 덱 목록을 하나의 컬렉션으로 인식.
	const itemListLd = $derived(
		JSON.stringify({
			'@context': 'https://schema.org',
			'@type': 'ItemList',
			name: '그런데이제 밸런스 게임 주제',
			itemListElement: data.decks.map((d, i) => ({
				'@type': 'ListItem',
				position: i + 1,
				name: d.title,
				url: SITE + localePath(locale, `/g/${d.id}`)
			}))
		})
	);

	// 검색어·유형칩은 상단바(헤더)와 공유(search.q·search.type). 주제·조건·유형 필터.
	const results = $derived.by(() => {
		const query = search.q.trim().toLowerCase();
		const type = search.type;
		return data.decks
			.filter((deck) => !type || deck.type === type)
			.map((deck) => {
			// 주제 매칭(제목·양편 이름)
			const inTopic = [deck.title, deck.a.name, deck.b.name]
				.join(' ')
				.toLowerCase()
				.includes(query);
			// 조건 매칭: 어느 편의 어떤 조건 문구에 걸렸는지 기록(힌트 표시용)
			let hitCond: { text: string; side: string; emoji: string } | null = null;
			if (query) {
				for (const [side, s] of [
					['a', deck.a],
					['b', deck.b]
				] as const) {
					const p = s.penalties.find((p) => p.text.toLowerCase().includes(query));
					if (p) {
						hitCond = { text: p.text, side: s.name, emoji: s.emoji };
						break;
					}
				}
			}
			return { deck, match: !query || inTopic || !!hitCond, condHint: inTopic ? null : hitCond };
		}).filter((r) => r.match);
	});
</script>

<svelte:head>
	<title>그런데이제 — 고를 때마다 조건이 붙는 밸런스 게임</title>
	<meta
		name="description"
		content="고른 쪽에 조건이 하나씩 붙는 밸런스 게임. 여름 vs 겨울, 월 200 백수 vs 월 천 직장인… 끝까지 버틸 수 있어?"
	/>
</svelte:head>

<!-- 게임 카탈로그 ItemList JSON-LD (svelte:head 안 {@html} script는 비어버려 body에 둠 — 크롤러는 body도 읽음) -->
<!-- eslint-disable-next-line svelte/no-at-html-tags -->
{@html `<script type="application/ld+json">${itemListLd}</script>`}

<section class="intro">
	<p class="muted">고른 쪽에 조건이 하나씩 붙어요. <b>그런데 이제</b>… 끝까지 버틸 수 있나요?</p>
	<a class="stats-cta" href={localePath(locale, '/stats')}>📊 모두의 선택 보기</a>
</section>

{#if results.length === 0}
	<p class="no-result">
		{#if search.q.trim()}‘{search.q}’에 해당하는 주제·조건이 없어요.{:else}이 유형에 해당하는 주제가 없어요.{/if}
	</p>
{:else}
	<ul class="grid">
		{#each results as { deck, condHint } (deck.id)}
			<li class="card deck">
				<a class="deck-link" href={localePath(locale, `/g/${deck.id}`)}>
					{#if isImageIcon(deck.icon)}
						<!-- 이미지 아이콘: 카드 폭을 채우는 배너로 전체가 다 보이게(잘림 없음) -->
						<img class="deck-cover" src={deck.icon} alt={deck.title} />
					{:else}
						<span class="deck-icon">{deck.icon}</span>
					{/if}
					<strong class="deck-title">{deck.title}</strong>
					<span class="deck-sides">
						<Icon value={deck.a.emoji} /> {deck.a.name} <span class="vs">vs</span>
						<Icon value={deck.b.emoji} /> {deck.b.name}
					</span>
					{#if condHint}
						<span class="cond-hit"
							>🔍 …{condHint.text} <em>(<Icon value={condHint.emoji} /> {condHint.side})</em></span
						>
					{/if}
				</a>
			</li>
		{/each}
	</ul>
{/if}

<p class="suggest-cta">
	<a href={localePath(locale, '/suggest')}>💡 내가 주제 만들기</a>
</p>

<style>
	.intro {
		max-width: 640px;
		margin: 0 auto 20px;
		text-align: center;
	}
	.stats-cta {
		display: inline-block;
		margin-top: 10px;
		font-size: 13px;
		font-weight: 700;
		text-decoration: none;
		color: var(--ink);
		border: 2px solid var(--line);
		padding: 6px 14px;
	}
	.stats-cta:hover {
		border-color: var(--accent);
		color: var(--accent);
	}
	.no-result {
		text-align: center;
		color: var(--muted);
		margin: 32px auto;
	}
	.cond-hit {
		margin-top: 6px;
		font-size: 12px;
		color: var(--accent);
		line-height: 1.4;
	}
	.cond-hit em {
		color: var(--muted);
		font-style: normal;
	}
	.grid {
		list-style: none;
		margin: 0 auto;
		padding: 0;
		max-width: 640px;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
		gap: 16px;
	}
	.deck {
		padding: 0;
		overflow: hidden;
	}
	.deck-link {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		padding: 28px 16px;
		text-align: center;
		text-decoration: none;
		color: var(--ink);
	}
	.deck-icon {
		font-size: 44px;
	}
	/* 이미지 아이콘 배너: 카드 폭을 채우고 모든 덱이 같은 높이(~1.8:1)로 통일.
	   가로가 넓은 이미지(파노라마)는 좌우가 살짝 crop되지만 배너 크기가 균일해진다. */
	.deck-cover {
		width: 100%;
		aspect-ratio: 11 / 6;
		object-fit: cover;
		display: block;
		border-radius: 8px;
	}
	.deck-title {
		font-size: 17px;
		line-height: 1.3;
	}
	.deck-sides {
		font-size: 14px;
		color: var(--muted);
	}
	.vs {
		opacity: 0.6;
		margin: 0 2px;
	}
	.suggest-cta {
		text-align: center;
		margin: 24px auto 0;
	}
	.suggest-cta a {
		color: var(--muted);
		font-size: 14px;
		text-decoration: none;
		border-bottom: 2px dotted var(--muted);
		padding-bottom: 1px;
	}
</style>
