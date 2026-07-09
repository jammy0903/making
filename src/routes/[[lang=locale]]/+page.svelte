<script lang="ts">
	import { useT } from '$lib/i18n';

	const t = useT();
	// 랭킹게임 홈은 피벗으로 제거됨. "그런데이제" 밸런스게임 구현 시
	// decks 그리드(docs/game-design.md §B-4)로 교체된다.
	const title = $derived(t('app.title'));
</script>

<svelte:head>
	<title>{title}</title>
</svelte:head>

<section class="placeholder">
	<h2>{title}</h2>
	<p class="muted">준비 중입니다.</p>
</section>

<style>
	.placeholder {
		max-width: 640px;
		margin: 48px auto;
		text-align: center;
	}
</style>
