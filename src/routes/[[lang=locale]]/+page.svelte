<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { pruneSeededSamples, listUserTopics, deleteTopic } from '$lib/storage';
	import { type Topic } from '$lib/domain';
	import { useT, localePath, defaultLocale, type Locale } from '$lib/i18n';
	import { SITE } from '$lib/site';

	const t = useT();
	let { data } = $props();
	const locale = $derived((page.params.lang as Locale) ?? defaultLocale);

	// 홈 SEO 메타(로케일별) — messages.ts 를 건드리지 않도록 여기서 정의
	const homeTitle: Record<Locale, string> = {
		ko: '순위 월드컵 - 이상형 월드컵 만들기·음식·동물·연예인 순위',
		en: 'Ranking Worldcup - Make Your Own Ideal Type Tournament',
		zh: '排名世界杯 - 制作理想型世界杯·美食·动物·明星排名'
	};
	const homeDesc: Record<Locale, string> = {
		ko: '이상형 월드컵처럼 둘 중 하나를 골라 전체 순위를 정하는 놀이터. 음식·새끼동물·아이돌 등 다양한 월드컵을 즐기고 나만의 월드컵도 만들어요.',
		en: 'Pick one of two to rank everything, ideal-type worldcup style. Play food, baby animal, idol tournaments and create your own.',
		zh: '像理想型世界杯一样二选一，决出完整排名。畅玩美食、萌宠、偶像等世界杯，也能创建自己的世界杯。'
	};
	// 홈 ItemList 구조화 데이터
	const itemListLd = $derived(
		JSON.stringify({
			'@context': 'https://schema.org',
			'@type': 'ItemList',
			itemListElement: data.samples.map((s, i) => ({
				'@type': 'ListItem',
				position: i + 1,
				name: s.title,
				url: SITE + localePath(locale, `/t/${s.slug}`)
			}))
		})
	);


	// 사용자가 만든 주제(클라이언트 localStorage)
	let userTopics = $state<Topic[]>([]);

	onMount(() => {
		pruneSeededSamples(); // 예전에 심긴 샘플 제거(서버 렌더로 이관됨)
		userTopics = listUserTopics();
	});

	function remove(id: string) {
		deleteTopic(id);
		userTopics = listUserTopics();
	}

	const modeLabel: Record<string, string> = {
		sort: t('mode.worldcup'),
		drag: t('mode.drag')
	};

	interface Item {
		href: string;
		title: string;
		description: string;
		mode: string;
		count: number;
		cover: string | null;
		deletable: boolean;
		id?: string;
	}

	// 공개(샘플, SSR) + 사용자(localStorage) 통합 목록
	const items = $derived<Item[]>([
		...data.samples.map((s) => ({
			href: localePath(locale, `/t/${s.slug}`),
			title: s.title,
			description: s.description,
			mode: s.defaultMode,
			count: s.count,
			cover: s.cover,
			deletable: false
		})),
		...userTopics.map((tp) => ({
			href: localePath(locale, `/t/${tp.id}`),
			title: tp.title,
			description: tp.description,
			mode: tp.defaultMode,
			count: tp.candidates.length,
			cover: tp.candidates.find((c) => c.image)?.image ?? null,
			deletable: true,
			id: tp.id
		}))
	]);
</script>

<svelte:head>
	<title>{homeTitle[locale]}</title>
	<meta name="description" content={homeDesc[locale]} />
	<meta property="og:title" content={homeTitle[locale]} />
	<meta property="og:description" content={homeDesc[locale]} />
</svelte:head>

<!-- eslint-disable-next-line svelte/no-at-html-tags -->
{@html `<script type="application/ld+json">${itemListLd}</script>`}

<div class="home-head">
	<p class="muted" style="margin:8px 0 20px">{@html t('home.intro')}</p>

	<a class="btn btn-primary btn-block" href={localePath(locale, '/create')} style="margin-bottom:24px"
		>{t('home.newTopic')}</a
	>
</div>

<ul class="gallery">
	{#each items as item (item.href)}
		<li class="card gcard">
			<a class="cover" href={item.href} aria-label={item.title}>
				{#if item.cover}
					<img src={item.cover} alt={item.title} loading="lazy" />
				{:else}
					<span class="cover-ph">🏆</span>
				{/if}
				<span class="badge">{t('badge.count', { n: item.count })}</span>
			</a>
			<div class="body">
				<strong class="gtitle">{item.title}</strong>
				<span class="muted gmeta">{modeLabel[item.mode]}</span>
				{#if item.description}
					<p class="muted gdesc">{item.description}</p>
				{/if}
				<div class="actions">
					<a class="btn btn-primary" href={item.href} style="flex:1">{t('home.play')}</a>
					{#if item.deletable}
						<button
							class="btn btn-danger del"
							onclick={() => remove(item.id!)}
							aria-label={t('common.delete')}>✕</button
						>
					{/if}
				</div>
			</div>
		</li>
	{/each}
</ul>

<style>
	/* 상단 소개·버튼은 가운데 640px 로 유지 (갤러리만 넓게) */
	.home-head {
		max-width: 640px;
		margin: 0 auto;
	}
	/* 다열 갤러리: 화면 폭에 따라 열 수 자동 (좁으면 1열, 넓으면 4열 안팎) */
	.gallery {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
		gap: 16px;
	}
	.gcard {
		padding: 0;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}
	.cover {
		position: relative;
		display: block;
		aspect-ratio: 4 / 3;
		background: var(--soft);
		border-bottom: 3px solid var(--line);
	}
	.cover img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}
	.cover-ph {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		font-size: 40px;
	}
	.badge {
		position: absolute;
		top: 6px;
		right: 6px;
		padding: 2px 8px;
		background: var(--ink);
		color: var(--surface);
		font-size: 12px;
		font-weight: 700;
	}
	.body {
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding: 12px;
		flex: 1;
	}
	.gtitle {
		font-size: 16px;
		line-height: 1.3;
	}
	.gmeta {
		font-size: 12px;
	}
	.gdesc {
		margin: 2px 0 0;
		font-size: 13px;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
	.actions {
		display: flex;
		gap: 8px;
		margin-top: auto;
		padding-top: 12px;
	}
	/* 삭제 버튼: 컴팩트하게 (폭 축소 + 가벼운 그림자) */
	.actions .del {
		flex: 0 0 auto;
		min-height: 0;
		padding: 8px 10px;
		font-size: 13px;
		box-shadow: 2px 2px 0 var(--danger);
	}
	.actions .del:active {
		box-shadow: 1px 1px 0 var(--danger);
	}
</style>
