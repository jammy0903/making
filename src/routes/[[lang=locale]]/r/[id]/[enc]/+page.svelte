<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { getTopic } from '$lib/storage';
	import type { Candidate, Topic } from '$lib/domain';
	import { decodeRanking } from '$lib/share/rankingCodec';
	import RankResult from '$lib/components/RankResult.svelte';
	import { useT, getLocale, localePath } from '$lib/i18n';

	const t = useT();

	// 무상태 공유 결과(§7.5): URL 조각을 디코드해 주제 후보로 매핑 → 읽기 전용 렌더.
	// 주제 해석은 getTopic — 샘플은 어디서나, 사용자 주제는 만든 기기(localStorage)에서만.
	type State =
		| { kind: 'loading' }
		| { kind: 'notFound' } // 주제를 못 찾음(다른 기기의 사용자 주제 등)
		| { kind: 'invalid' } // 링크 손상·주제 후보 변경으로 디코드 실패
		| { kind: 'ok'; topic: Topic; ranking: Candidate[] };

	let view = $state<State>({ kind: 'loading' });
	let today = $state('');

	onMount(() => {
		const dateLocale = { ko: 'ko-KR', en: 'en-US', zh: 'zh-CN' }[getLocale()];
		today = new Date().toLocaleDateString(dateLocale);

		const topic = getTopic(page.params.id!, getLocale());
		if (!topic) {
			view = { kind: 'notFound' };
			return;
		}
		const indices = decodeRanking(page.params.enc!, topic.candidates.length);
		if (!indices) {
			view = { kind: 'invalid' };
			return;
		}
		view = { kind: 'ok', topic, ranking: indices.map((i) => topic.candidates[i]) };
	});
</script>

{#if view.kind === 'loading'}
	<p class="muted">{t('topic.loading')}</p>
{:else if view.kind === 'ok'}
	<p class="muted" style="margin:8px 0 4px; font-size:13px">🔗 {t('shared.badge')}</p>
	<RankResult topic={view.topic} ranking={view.ranking} {today} shared />
{:else}
	<div class="empty" style="text-align:center; padding:32px 0">
		<p class="muted">
			{view.kind === 'notFound' ? t('shared.notFound') : t('shared.invalid')}
		</p>
		<a class="btn" href={localePath(getLocale(), '/')} style="margin-top:12px"
			>{t('nav.home')}</a
		>
	</div>
{/if}
