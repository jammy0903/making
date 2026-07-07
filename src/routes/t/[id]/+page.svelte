<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { getTopic } from '$lib/storage';
	import { isPlayable, type Topic } from '$lib/domain';
	import { useT } from '$lib/i18n';

	const t = useT();

	let topic = $state<Topic | undefined>(undefined);
	let loaded = $state(false);

	onMount(() => {
		topic = getTopic(page.params.id!);
		loaded = true;
	});
</script>

{#if !loaded}
	<p class="muted">{t('topic.loading')}</p>
{:else if !topic}
	<div class="empty">{t('topic.notFound')} <a href="/">{t('nav.home')}</a></div>
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
							alt=""
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
			<a class="btn btn-primary btn-block" href="/t/{topic.id}/play?mode=sort">
				{t('topic.optWorldcup')}
			</a>
			<a class="btn btn-block" href="/t/{topic.id}/play?mode=drag">
				{t('topic.optDrag')}
			</a>
		</div>
	{:else}
		<div class="empty">{t('topic.needTwo')}</div>
	{/if}
{/if}
