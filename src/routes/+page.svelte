<script lang="ts">
	import { onMount } from 'svelte';
	import { listTopics, deleteTopic } from '$lib/storage';
	import { isPlayable, type Topic } from '$lib/domain';

	let topics = $state<Topic[]>([]);

	onMount(() => {
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
</script>

<p class="muted" style="margin:8px 0 20px">
	후보를 비교하거나 직접 배치해 <b>전체 순위</b>를 정하는 놀이터.
</p>

<a class="btn btn-primary btn-block" href="/create" style="margin-bottom:24px">+ 새 주제 만들기</a>

{#if topics.length === 0}
	<div class="empty">아직 만든 주제가 없어요.<br />위 버튼으로 첫 주제를 만들어 보세요.</div>
{:else}
	<ul style="list-style:none; margin:0; padding:0; display:grid; gap:12px">
		{#each topics as t (t.id)}
			<li class="card" style="padding:16px">
				<div style="display:flex; align-items:baseline; justify-content:space-between; gap:12px">
					<strong style="font-size:17px">{t.title}</strong>
					<span class="muted" style="font-size:13px; white-space:nowrap"
						>{t.candidates.length}명 · {modeLabel[t.defaultMode]}</span
					>
				</div>
				{#if t.description}
					<p class="muted" style="margin:6px 0 0; font-size:14px">{t.description}</p>
				{/if}
				<div style="display:flex; gap:8px; margin-top:14px">
					{#if isPlayable(t)}
						<a class="btn btn-primary" href="/t/{t.id}" style="flex:1">▶ 플레이</a>
					{:else}
						<span class="btn" style="flex:1" aria-disabled="true">후보 부족</span>
					{/if}
					<button class="btn btn-danger" onclick={() => remove(t.id)}>삭제</button>
				</div>
			</li>
		{/each}
	</ul>
{/if}
