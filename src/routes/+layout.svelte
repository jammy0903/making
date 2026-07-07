<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/state';

	let { children } = $props();

	// 홈이 아니면 뒤로가기 노출
	const isHome = $derived(page.url.pathname === '/');
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<meta name="theme-color" content="#6d5efc" />
</svelte:head>

<header class="app-header">
	{#if !isHome}
		<a class="btn" href="/" aria-label="홈으로" style="padding:8px 12px">‹</a>
	{/if}
	<h1 class="app-title">🎯 정하기 놀이터</h1>
</header>

<main class="wrap">
	{@render children()}
</main>
