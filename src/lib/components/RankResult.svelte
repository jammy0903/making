<script lang="ts">
	import type { Candidate, Topic } from '$lib/domain';
	import type { HesitationSummary } from '$lib/ranking/hesitation';
	import { SITE_HOST } from '$lib/site';
	import { useT, getLocale, localePath } from '$lib/i18n';

	let {
		topic,
		ranking,
		hesitation,
		today,
		onRestart
	}: {
		topic: Topic;
		ranking: Candidate[];
		/** 망설임(반응시간) 요약. 비교가 없던 드래그 모드면 count===0 → 리포트 숨김. */
		hesitation: HesitationSummary;
		/** PDF 헤더 날짜(클라이언트에서 설정). 없으면 생략. */
		today: string;
		/** 다시 하기 — 부모가 랭킹 상태를 초기화한다. */
		onRestart: () => void;
	} = $props();

	const t = useT();
	const medal = (i: number) => (i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`);
	const exportPdf = () => window.print();
</script>

<div class="print-area">
	<!-- 화면용 제목 -->
	<h2 class="no-print" style="margin:8px 0 4px">🏆 {topic.title} — {t('result.suffix')}</h2>
	<p class="muted no-print" style="margin:0 0 16px">{t('result.done')}</p>

	<!-- PDF 전용 헤더 -->
	<div class="pdf-header print-only">
		<div class="pdf-title">🏆 {topic.title}</div>
		<div class="pdf-sub">{t('result.suffix')}{today ? ` · ${today}` : ''}</div>
		<div class="pdf-rule"></div>
	</div>

	<ol class="rank-list" style="list-style:none; margin:0; padding:0; display:grid; gap:8px">
		{#each ranking as c, i (c.id)}
			<li
				class="card rank-row {i < 3 ? 'top' : ''}"
				style="padding:10px 14px; display:flex; align-items:center; gap:12px; {i < 3
					? 'border-color: var(--accent)'
					: ''}"
			>
				<span style="font-size:20px; width:32px; text-align:center">{medal(i)}</span>
				{#if c.image}
					<img
						src={c.image}
						alt=""
						style="width:40px; height:40px; border-radius:0; object-fit:cover"
					/>
				{/if}
				<strong style="font-size:16px">{c.name}</strong>
			</li>
		{/each}
	</ol>

	<!-- 고뇌 리포트: 화면 + PDF 모두 표시.
	     비교가 2번 미만이면(드래그 모드 0번, 후보 2명 sort 1번) 최고 고뇌 = 0초컷이 같은
	     대결이 돼 무의미하므로 숨긴다. -->
	{#if hesitation.count > 1}
		<div
			class="card hesitation-report"
			style="margin-top:16px; padding:14px; display:grid; gap:8px; font-size:14px"
		>
			<strong>{t('result.hesitation.title')}</strong>
			{#if hesitation.mostAgonized}
				<span
					>{t('result.hesitation.agonized', {
						a: hesitation.mostAgonized.winnerName,
						b: hesitation.mostAgonized.loserName,
						s: hesitation.mostAgonized.seconds
					})}</span
				>
			{/if}
			{#if hesitation.instant}
				<span
					>{t('result.hesitation.instant', {
						a: hesitation.instant.winnerName,
						b: hesitation.instant.loserName,
						s: hesitation.instant.seconds
					})}</span
				>
			{/if}
		</div>
	{/if}

	<!-- PDF 전용 푸터 -->
	<div class="pdf-footer print-only">{SITE_HOST} · {t('app.title')}</div>
</div>

<div class="no-print" style="display:grid; gap:10px; margin-top:20px">
	<button class="btn btn-primary btn-block" onclick={exportPdf}>{t('result.exportPdf')}</button>
	<div style="display:flex; gap:10px">
		<button class="btn" style="flex:1" onclick={onRestart}>{t('result.restart')}</button>
		<a class="btn" style="flex:1" href={localePath(getLocale(), '/')}>{t('nav.home')}</a>
	</div>
</div>
