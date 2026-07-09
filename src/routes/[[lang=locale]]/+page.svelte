<script lang="ts">
	import { page } from '$app/state';
	import { localePath, defaultLocale, type Locale } from '$lib/i18n';
	import { DECKS } from '$lib/game/decks';

	const locale = $derived((page.params.lang as Locale) ?? defaultLocale);
</script>

<svelte:head>
	<title>그런데이제</title>
	<meta name="description" content="고른 쪽에 조건이 하나씩 붙는 10판 밸런스 게임. 끝까지 버틸 수 있어?" />
</svelte:head>

<section class="intro">
	<p class="muted">고른 쪽에 조건이 하나씩 붙어요. <b>그런데 이제</b>… 끝까지 버틸 수 있나요?</p>
</section>

<ul class="grid">
	{#each DECKS as deck (deck.id)}
		<li class="card deck">
			<a class="deck-link" href={localePath(locale, `/g/${deck.id}`)}>
				<span class="deck-icon">{deck.icon}</span>
				<strong class="deck-title">{deck.title}</strong>
				<span class="deck-sides">
					{deck.a.emoji} {deck.a.name} <span class="vs">vs</span> {deck.b.emoji} {deck.b.name}
				</span>
			</a>
		</li>
	{/each}
</ul>

<style>
	.intro {
		max-width: 640px;
		margin: 4px auto 20px;
		text-align: center;
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
</style>
