<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { SITE } from '$lib/site';
	import { page } from '$app/state';
	import { injectAnalytics } from '@vercel/analytics/sveltekit';
	import { dev } from '$app/environment';
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

	// 홈 상단바 유형 필터 칩. 클릭=선택, 같은 칩 재클릭=해제(전체). search.type을 홈이 공유.
	const typeFilters = [
		['attribute', '속성'],
		['person', '인물'],
		['scenario', '상황'],
		['acquisition', '획득'],
		['value', '가치']
	] as const;
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
	{#if isHome}
		<!-- 검색창+유형칩을 한 묶음으로 감싸 헤더 가운데에 배치(margin:0 auto). -->
		<div class="header-mid">
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
			<div class="header-filters" role="group" aria-label="유형 필터">
				{#each typeFilters as [type, label] (type)}
					<button
						type="button"
						class="chip"
						class:on={search.type === type}
						aria-pressed={search.type === type}
						onclick={() => (search.type = search.type === type ? null : type)}>{label}</button
					>
				{/each}
			</div>
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
	/* 상단바 검색(홈에서만). 제목과 언어선택 사이 남는 공간을 채운다. */
	.header-search {
		position: relative;
		flex: 1 1 auto;
		max-width: 360px;
	}
	/* 홈 상단바: 검색창+유형칩 묶음(.header-mid)을 헤더 가운데에 배치.
	   margin:0 auto 가 좌우 남는 공간을 균등 분배 → 제목(그런데이제) 왼쪽에도 여백이
	   생겨 향후 엠블럼 자리 확보. 언어선택은 오른쪽 끝 유지. */
	.header-mid {
		display: flex;
		align-items: center;
		gap: 10px;
		margin: 0 auto; /* 가운데 정렬 */
		min-width: 0; /* 자식(칩) 축소 허용 */
		flex: 0 1 auto;
	}
	/* 검색창이 남는 공간을 채우되 좁아지면 먼저 줄어든다(칩보다 양보). 상한 340. */
	.app-header.wide .header-search {
		flex: 1 1 auto;
		max-width: 340px;
		min-width: 0;
	}
	/* 유형칩: 한 덩어리 세그먼트 컨트롤(연결된 토글). 데스크톱에선 항상 전부 표시. */
	.header-filters {
		display: flex;
		align-items: stretch;
		flex: 0 0 auto;
		border: 2px solid var(--line);
	}
	/* 모바일: 헤더를 세 줄로 — 1행 제목+언어선택, 2행 검색창, 3행 유형칩(전체폭 균등).
	   칩을 작게 줄이고 한 줄 폭에 나눠 담아 가로 스크롤 없이 5개 다 보이게. */
	@media (max-width: 680px) {
		.app-header {
			flex-wrap: wrap;
		}
		.app-title {
			flex: 1 1 auto; /* 남는 공간 차지 → 언어선택을 오른쪽 끝으로, 제목은 한 줄 유지 */
			white-space: nowrap;
		}
		.header-mid {
			order: 3; /* 제목·언어선택 다음(둘째 줄부터)으로 */
			flex: 1 1 100%; /* 한 줄 전체 차지 → 강제 줄바꿈 */
			margin: 0; /* 가운데정렬 해제(모바일은 폭 꽉 채움) */
			flex-direction: column; /* 검색창 / 칩을 세로로 분리 */
			align-items: stretch;
			gap: 8px;
		}
		.app-header.wide .header-search {
			max-width: none; /* 검색창이 줄 폭 다 쓰도록 상한 해제 */
		}
		.header-filters .chip {
			flex: 1 1 0; /* 5개 칩이 줄 폭을 균등 분할 */
			padding: 8px 4px; /* 작게 */
			font-size: 12px;
			min-width: 0;
		}
	}
	.chip {
		flex: 0 0 auto;
		font: inherit;
		font-size: 13px;
		font-weight: 700;
		padding: 7px 13px;
		border: none;
		border-left: 2px solid var(--line); /* 칩 사이 구분선 */
		background: var(--surface);
		color: var(--muted); /* 비활성은 은은하게 → 검색창과 경쟁 안 함 */
		cursor: pointer;
		white-space: nowrap;
		transition:
			background 0.12s,
			color 0.12s;
	}
	.chip:first-child {
		border-left: none;
	}
	.chip:hover {
		background: var(--soft);
		color: var(--ink);
	}
	.chip.on {
		background: var(--accent);
		color: var(--accent-ink);
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
