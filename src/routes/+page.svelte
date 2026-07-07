<script lang="ts">
	import { onMount } from 'svelte';
	import { listTopics, deleteTopic, seedSamplesIfNeeded } from '$lib/storage';
	import { isPlayable, type Topic } from '$lib/domain';
	import { useT } from '$lib/i18n';

	const t = useT();

	let topics = $state<Topic[]>([]);

	onMount(() => {
		seedSamplesIfNeeded();
		topics = listTopics();
	});

	function remove(id: string) {
		deleteTopic(id);
		topics = listTopics();
	}

	const modeLabel: Record<string, string> = {
		sort: t('mode.worldcup'),
		worldcup: t('mode.worldcup'),
		drag: t('mode.drag')
	};

	// 갤러리 커버: 사진이 있는 첫 후보 이미지
	function cover(topic: Topic): string | undefined {
		return topic.candidates.find((c) => c.image)?.image;
	}
</script>

<div class="home-head">
	<p class="muted" style="margin:8px 0 20px">{@html t('home.intro')}</p>

	<a class="btn btn-primary btn-block" href="/create" style="margin-bottom:24px"
		>{t('home.newTopic')}</a
	>
</div>

{#if topics.length === 0}
	<div class="empty">{@html t('home.empty')}</div>
{:else}
	<ul class="gallery">
		{#each topics as topic (topic.id)}
			<li class="card gcard">
				<a
					class="cover"
					href={isPlayable(topic) ? `/t/${topic.id}` : undefined}
					aria-label={topic.title}
				>
					{#if cover(topic)}
						<img src={cover(topic)} alt="" />
					{:else}
						<span class="cover-ph">🏆</span>
					{/if}
					<span class="badge">{t('badge.count', { n: topic.candidates.length })}</span>
				</a>
				<div class="body">
					<strong class="gtitle">{topic.title}</strong>
					<span class="muted gmeta">{modeLabel[topic.defaultMode]}</span>
					{#if topic.description}
						<p class="muted gdesc">{topic.description}</p>
					{/if}
					<div class="actions">
						{#if isPlayable(topic)}
							<a class="btn btn-primary" href="/t/{topic.id}" style="flex:1">{t('home.play')}</a>
						{:else}
							<span class="btn" style="flex:1" aria-disabled="true">{t('home.notEnough')}</span>
						{/if}
						<button
							class="btn btn-danger del"
							onclick={() => remove(topic.id)}
							aria-label={t('common.delete')}>✕</button
						>
					</div>
				</div>
			</li>
		{/each}
	</ul>
{/if}

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
