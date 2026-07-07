<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/state';
	import WalkingDog from '$lib/components/WalkingDog.svelte';
	import {
		setLocaleContext,
		useT,
		locales,
		localeNames,
		localePath,
		splitLocale,
		defaultLocale,
		type Locale
	} from '$lib/i18n';

	let { children } = $props();

	const SITE = 'https://codeinsight.online';

	// 로케일은 URL 로 결정 (/ = ko, /en, /zh). 크로스-로케일 전환은 전체 리로드라 컨텍스트는 초기값 고정으로 안전.
	const initialLocale: Locale = (page.params.lang as Locale) ?? defaultLocale;
	setLocaleContext(initialLocale);
	const t = useT();

	const locale = $derived((page.params.lang as Locale) ?? defaultLocale);
	// 현재 경로에서 로케일 prefix 를 제거한 순수 경로(hreflang·전환기·canonical 용)
	const rest = $derived(splitLocale(page.url.pathname).rest);
	const isHome = $derived(rest === '/');
	const canonical = $derived(SITE + localePath(locale, rest));

	function switchLang(e: Event) {
		const l = (e.currentTarget as HTMLSelectElement).value as Locale;
		location.href = localePath(l, rest); // 크로스-로케일: URL 이동 + 전체 리로드
	}
</script>

<svelte:head>
	<title>{t('app.title')}</title>
	<link rel="icon" href={favicon} />
	<meta name="theme-color" content="#6d5efc" />
	<link rel="canonical" href={canonical} />
	{#each locales as l (l)}
		<link rel="alternate" hreflang={l} href={SITE + localePath(l, rest)} />
	{/each}
	<link rel="alternate" hreflang="x-default" href={SITE + localePath(defaultLocale, rest)} />
</svelte:head>

<!--
  광고 슬롯. 지금은 비어 있어 자동으로 숨겨짐(현재와 동일한 모습).
  나중에 각 div 안에 광고 코드(예: AdSense <ins>…</ins>)를 넣으면 배너로 표시된다.
  좌우 배너는 넓은 화면의 빈 여백에만 뜨고(콘텐츠 안 잘림), 좁으면 자동 숨김.
-->
<div class="ad ad-top" id="ad-top"></div>

<header class="app-header">
	{#if !isHome}
		<a class="btn" href={localePath(locale, '/')} aria-label={t('nav.home')} style="padding:8px 12px"
			>‹</a
		>
	{/if}
	<h1 class="app-title">🏆 {t('app.title')}</h1>
	<select class="lang-select" aria-label={t('lang.label')} value={locale} onchange={switchLang}>
		{#each locales as l (l)}
			<option value={l}>{localeNames[l]}</option>
		{/each}
	</select>
</header>

<div class="ad ad-side ad-left" id="ad-left"></div>
<div class="ad ad-side ad-right" id="ad-right"></div>

<main class="wrap" class:wide={isHome}>
	{@render children()}
</main>

<div class="ad ad-bottom" id="ad-bottom"></div>

<!-- 하우스 광고: 화면 아래를 걸어다니는 강아지 (dog-walk 크롬 확장) -->
<WalkingDog />

<style>
	.lang-select {
		margin-left: auto;
		font: inherit;
		font-size: 13px;
		padding: 6px 8px;
		border: 3px solid var(--line);
		border-radius: 0;
		background: var(--surface);
		color: var(--ink);
		cursor: pointer;
	}
</style>
