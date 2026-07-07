<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/state';
	import WalkingDog from '$lib/components/WalkingDog.svelte';

	let { children } = $props();

	// 홈이 아니면 뒤로가기 노출
	const isHome = $derived(page.url.pathname === '/');
</script>

<svelte:head>
	<title>순위 월드컵</title>
	<link rel="icon" href={favicon} />
	<meta name="theme-color" content="#6d5efc" />
</svelte:head>

<!--
  광고 슬롯. 지금은 비어 있어 자동으로 숨겨짐(현재와 동일한 모습).
  나중에 각 div 안에 광고 코드(예: AdSense <ins>…</ins>)를 넣으면 배너로 표시된다.
  좌우 배너는 넓은 화면의 빈 여백에만 뜨고(콘텐츠 안 잘림), 좁으면 자동 숨김.
-->
<div class="ad ad-top" id="ad-top"></div>

<header class="app-header">
	{#if !isHome}
		<a class="btn" href="/" aria-label="홈으로" style="padding:8px 12px">‹</a>
	{/if}
	<h1 class="app-title">🏆 순위 월드컵</h1>
</header>

<div class="ad ad-side ad-left" id="ad-left"></div>
<div class="ad ad-side ad-right" id="ad-right"></div>

<main class="wrap" class:wide={isHome}>
	{@render children()}
</main>

<div class="ad ad-bottom" id="ad-bottom"></div>

<!-- 하우스 광고: 화면 아래를 걸어다니는 강아지 (dog-walk 크롬 확장) -->
<WalkingDog />
