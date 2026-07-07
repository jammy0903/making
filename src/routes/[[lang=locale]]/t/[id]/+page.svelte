<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { getTopic } from '$lib/storage';
	import { isPlayable, type Topic } from '$lib/domain';
	import { useT, localePath, defaultLocale, type Locale } from '$lib/i18n';

	const t = useT();
	let { data } = $props();
	const locale = $derived((page.params.lang as Locale) ?? defaultLocale);
	const base = $derived(localePath(locale, `/t/${page.params.id}`));

	// SSR 데이터(공개 주제)가 있으면 서버 렌더 → 크롤러가 콘텐츠를 봄. 없으면 클라 localStorage.
	let topic = $state<Topic | undefined>(data.topic ?? undefined);
	let loaded = $state(!!data.topic);

	onMount(() => {
		if (!topic) {
			topic = getTopic(page.params.id!);
			loaded = true;
		}
	});
</script>

<svelte:head>
	{#if topic}
		<title>{topic.title} | {t('app.title')}</title>
		<meta name="description" content={topic.description || topic.title} />
		<meta property="og:title" content={topic.title} />
		<meta property="og:description" content={topic.description || topic.title} />
		<meta property="og:type" content="website" />
	{/if}
	{#if !data.topic}
		<meta name="robots" content="noindex" />
	{/if}
</svelte:head>

{#if !loaded}
	<p class="muted">{t('topic.loading')}</p>
{:else if !topic}
	<div class="empty">{t('topic.notFound')} <a href={localePath(locale, '/')}>{t('nav.home')}</a></div>
{:else}
	<h2 style="margin:8px 0 4px">{topic.title}</h2>
	{#if topic.description}
		<p class="muted" style="margin:0 0 16px">{topic.description}</p>
	{/if}

	<div class="card" style="padding:14px; margin-bottom:20px">
		<span class="muted" style="font-size:13px"
			>{t('topic.candidateCount', { n: topic.candidates.length })}</span
		>
		<div style="display:flex; flex-wrap:wrap; gap:8px; margin-top:10px">
			{#each topic.candidates as c (c.id)}
				<span
					style="display:inline-flex; align-items:center; gap:6px; padding:4px 10px 4px 4px; border:1px solid var(--line); border-radius:0; font-size:14px"
				>
					{#if c.image}
						<img
							src={c.image}
							alt={c.name}
							loading="lazy"
							style="width:24px; height:24px; border-radius:0; object-fit:cover"
						/>
					{:else}
						<span
							style="width:24px; height:24px; border-radius:0; background:var(--bg); display:grid; place-items:center; font-size:12px"
							>{c.name.slice(0, 1)}</span
						>
					{/if}
					{c.name}
				</span>
			{/each}
		</div>
	</div>

	{#if isPlayable(topic)}
		<h3 style="margin:0 0 10px">{t('topic.howDecide')}</h3>
		<div style="display:grid; gap:10px">
			<a class="btn btn-primary btn-block" href="{base}/play?mode=sort">
				{t('topic.optWorldcup')}
			</a>
			<a class="btn btn-block" href="{base}/play?mode=drag">
				{t('topic.optDrag')}
			</a>
		</div>
	{:else}
		<div class="empty">{t('topic.needTwo')}</div>
	{/if}
{/if}
