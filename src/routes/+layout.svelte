<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { SITE } from '$lib/site';
	import { page } from '$app/state';
	import { injectAnalytics } from '@vercel/analytics/sveltekit';
	import { dev } from '$app/environment';
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

	// Vercel Web Analytics — 방문자 지표는 전적으로 여기에 위임(자체 집계 없음).
	// dev에선 development 모드(콘솔 디버그, 실통계 미집계) → 로컬 방문이 실서비스 지표에 안 섞임.
	injectAnalytics({ mode: dev ? 'development' : 'production' });

	// 로케일은 URL 로 결정 (/ = ko, /en, /zh). 크로스-로케일 전환은 전체 리로드라 컨텍스트는 초기값 고정으로 안전.
	const initialLocale: Locale = (page.params.lang as Locale) ?? defaultLocale;
	setLocaleContext(initialLocale);
	const t = useT();

	const locale = $derived((page.params.lang as Locale) ?? defaultLocale);
	// 현재 경로에서 로케일 prefix 를 제거한 순수 경로(hreflang·전환기·canonical 용)
	const rest = $derived(splitLocale(page.url.pathname).rest);
	const isHome = $derived(rest === '/');
	const canonical = $derived(SITE + localePath(locale, rest));
	// og 이미지: 페이지 load가 결과별 이미지를 주면 그걸(레버 ②), 없으면 사이트 기본. 단일 og:image로 유지.
	const ogImage = $derived(
		(page.data as { og?: { image?: string } | null }).og?.image ?? `${SITE}/og-default.png`
	);

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
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content={t('app.title')} />
	<meta property="og:locale" content={locale} />
	{#each locales.filter((l) => l !== locale) as l (l)}
		<meta property="og:locale:alternate" content={l} />
	{/each}
	<meta property="og:url" content={canonical} />
	<meta property="og:image" content={ogImage} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:image" content={ogImage} />
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
	<img class="app-emblem" src="/emblem.png" alt="" aria-hidden="true" />
	<h1 class="app-title">{t('app.title')}</h1>
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
	/* 상단 제목 왼쪽 엠블럼(로고). 제목 폰트(18px)보다 살짝 큰 뱃지 크기. */
	.app-emblem {
		height: 36px;
		width: auto;
		flex: 0 0 auto;
		display: block;
	}
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
	/* 모바일: 제목이 남는 공간을 차지해 언어선택을 오른쪽 끝으로. */
	@media (max-width: 680px) {
		.app-header {
			flex-wrap: wrap;
		}
		.app-title {
			flex: 1 1 auto;
			white-space: nowrap;
		}
	}
</style>
