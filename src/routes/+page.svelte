<script lang="ts">
	import { onMount } from 'svelte';
	import { listTopics, deleteTopic, seedSamplesIfNeeded } from '$lib/storage';
	import { isPlayable, type Topic } from '$lib/domain';

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
		sort: '순위 월드컵',
		worldcup: '순위 월드컵',
		drag: '직접 순위'
	};

	// 갤러리 커버: 사진이 있는 첫 후보 이미지
	function cover(t: Topic): string | undefined {
		return t.candidates.find((c) => c.image)?.image;
	}
</script>

<div class="home-head">
	<p class="muted" style="margin:8px 0 20px">
		후보를 비교하거나 직접 배치해 <b>전체 순위</b>를 정하는 놀이터.
	</p>

	<a class="btn btn-primary btn-block" href="/create" style="margin-bottom:24px">+ 새 주제 만들기</a>
</div>

{#if topics.length === 0}
	<div class="empty">아직 만든 주제가 없어요.<br />위 버튼으로 첫 주제를 만들어 보세요.</div>
{:else}
	<ul class="gallery">
		{#each topics as t (t.id)}
			<li class="card gcard">
				<a class="cover" href={isPlayable(t) ? `/t/${t.id}` : undefined} aria-label={t.title}>
					{#if cover(t)}
						<img src={cover(t)} alt="" />
					{:else}
						<span class="cover-ph">🏆</span>
					{/if}
					<span class="badge">{t.candidates.length}명</span>
				</a>
				<div class="body">
					<strong class="gtitle">{t.title}</strong>
					<span class="muted gmeta">{modeLabel[t.defaultMode]}</span>
					{#if t.description}
						<p class="muted gdesc">{t.description}</p>
					{/if}
					<div class="actions">
						{#if isPlayable(t)}
							<a class="btn btn-primary" href="/t/{t.id}" style="flex:1">▶ 플레이</a>
						{:else}
							<span class="btn" style="flex:1" aria-disabled="true">후보 부족</span>
						{/if}
						<button class="btn btn-danger del" onclick={() => remove(t.id)} aria-label="삭제">✕</button>
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
