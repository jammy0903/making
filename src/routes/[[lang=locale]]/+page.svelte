<script lang="ts">
	import { page } from '$app/state';
	import { localePath, defaultLocale, type Locale } from '$lib/i18n';
	import { search } from '$lib/search.svelte';
	import Icon from '$lib/game/Icon.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const locale = $derived((page.params.lang as Locale) ?? defaultLocale);

	// 검색어는 상단바(헤더) 입력창과 공유(search.q). 주제·조건 둘 다 필터.
	const results = $derived.by(() => {
		const query = search.q.trim().toLowerCase();
		return data.decks.map((deck) => {
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
	<title>그런데이제</title>
	<meta name="description" content="고른 쪽에 조건이 하나씩 붙는 10판 밸런스 게임. 끝까지 버틸 수 있어?" />
</svelte:head>

<section class="intro">
	<p class="muted">고른 쪽에 조건이 하나씩 붙어요. <b>그런데 이제</b>… 끝까지 버틸 수 있나요?</p>
</section>

{#if results.length === 0}
	<p class="no-result">‘{search.q}’에 해당하는 주제·조건이 없어요.</p>
{:else}
	<ul class="grid">
		{#each results as { deck, condHint } (deck.id)}
			<li class="card deck">
				<a class="deck-link" href={localePath(locale, `/g/${deck.id}`)}>
					<span class="deck-icon"><Icon value={deck.icon} alt={deck.title} /></span>
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
	<a href={localePath(locale, '/suggest')}>💡 새 주제·조건 신청하기</a>
</p>

<style>
	.intro {
		max-width: 640px;
		margin: 0 auto 20px;
		text-align: center;
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
