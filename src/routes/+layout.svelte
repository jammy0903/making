<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import favicon from '$lib/assets/favicon.svg';
	import { SITE } from '$lib/site';
	import { page } from '$app/state';
	import { injectAnalytics } from '@vercel/analytics/sveltekit';
	import { logVisit } from '$lib/supabase';
	import { search } from '$lib/search.svelte';
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

	injectAnalytics(); // Vercel Web Analytics (유입 측정)

	// 고유 방문자 집계(관리자 페이지 자체 방문은 제외 — 로그인하면 어차피 세션이 관리자로 표시됨).
	onMount(() => {
		if (!page.url.pathname.startsWith('/admin')) logVisit();
	});

	// 로케일은 URL 로 결정 (/ = ko, /en, /zh). 크로스-로케일 전환은 전체 리로드라 컨텍스트는 초기값 고정으로 안전.
	const initialLocale: Locale = (page.params.lang as Locale) ?? defaultLocale;
	setLocaleContext(initialLocale);
	const t = useT();

	const locale = $derived((page.params.lang as Locale) ?? defaultLocale);
	// 현재 경로에서 로케일 prefix 를 제거한 순수 경로(hreflang·전환기·canonical 용)
	const rest = $derived(splitLocale(page.url.pathname).rest);
	const isHome = $derived(rest === '/');
	const canonical = $derived(SITE + localePath(locale, rest));

	// WebSite 구조화 데이터(JSON-LD)
	const websiteLd = $derived(
		JSON.stringify({
			'@context': 'https://schema.org',
			'@type': 'WebSite',
			name: t('app.title'),
			url: SITE + localePath(locale, '/'),
			inLanguage: locale
		})
	);

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

	<!-- 구글 서치콘솔 소유권 확인 -->
	<meta name="google-site-verification" content="fTGiuFJ27AfnyjIL6zIcD_VGvsguOIn1kEaVHBRfG10" />

	<!-- 기본 Open Graph / Twitter (페이지에서 og:title 등은 덮어씀) -->
	<meta property="og:site_name" content={t('app.title')} />
	<meta property="og:locale" content={locale} />
	<meta property="og:url" content={canonical} />
	<meta property="og:image" content="{SITE}/og-default.png" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:image" content="{SITE}/og-default.png" />
</svelte:head>

<!-- WebSite 구조화 데이터 (svelte:head 의 script 안 {@html} 은 비어버려서 body 에 둠 — 크롤러는 body JSON-LD 도 읽음) -->
<!-- eslint-disable-next-line svelte/no-at-html-tags -->
{@html `<script type="application/ld+json">${websiteLd}</script>`}

<!--
  광고 슬롯. 지금은 비어 있어 자동으로 숨겨짐(현재와 동일한 모습).
  나중에 각 div 안에 광고 코드(예: AdSense <ins>…</ins>)를 넣으면 배너로 표시된다.
  좌우 배너는 넓은 화면의 빈 여백에만 뜨고(콘텐츠 안 잘림), 좁으면 자동 숨김.
-->
<div class="ad ad-top" id="ad-top"></div>

<header class="app-header" class:wide={isHome}>
	{#if !isHome}
		<a class="btn" href={localePath(locale, '/')} aria-label={t('nav.home')} style="padding:8px 12px"
			>‹</a
		>
	{/if}
	<h1 class="app-title">{t('app.title')}</h1>
	{#if isHome}
		<div class="header-search">
			<span class="hs-icon" aria-hidden="true">🔍</span>
			<input
				type="search"
				bind:value={search.q}
				placeholder="주제·조건 검색"
				aria-label="주제·조건 검색"
			/>
			{#if search.q}
				<button
					type="button"
					class="hs-clear"
					onclick={() => (search.q = '')}
					aria-label="검색어 지우기">✕</button
				>
			{/if}
		</div>
	{/if}
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

<style>
	.lang-select {
		margin-left: 8px;
		font: inherit;
		font-size: 13px;
		padding: 6px 8px;
		border: 3px solid var(--line);
		border-radius: 0;
		background: var(--surface);
		color: var(--ink);
		cursor: pointer;
	}
	/* 상단바 검색(홈에서만). 제목과 언어선택 사이 남는 공간을 채운다. */
	.header-search {
		position: relative;
		flex: 1 1 auto;
		max-width: 360px;
	}
	/* 넓은 상단바(홈)에선 검색창이 남는 공간을 채워 언어선택을 오른쪽 끝으로 민다. */
	.app-header.wide .header-search {
		max-width: none;
	}
	.header-search input {
		width: 100%;
		font: inherit;
		font-size: 14px;
		padding: 7px 30px 7px 34px;
		border: 3px solid var(--line);
		background: var(--surface);
		color: var(--ink);
	}
	.hs-icon {
		position: absolute;
		left: 10px;
		top: 50%;
		transform: translateY(-50%);
		font-size: 14px;
		pointer-events: none;
		opacity: 0.7;
	}
	/* 브라우저 기본 검색 지우기(✕) 숨김 — 커스텀 ✕만 사용(중복 방지). */
	.header-search input::-webkit-search-cancel-button {
		-webkit-appearance: none;
		appearance: none;
	}
	.header-search .hs-clear {
		position: absolute;
		right: 6px;
		top: 50%;
		transform: translateY(-50%);
		border: none;
		background: transparent;
		color: var(--muted);
		font-size: 14px;
		cursor: pointer;
		padding: 4px;
		line-height: 1;
	}
</style>
