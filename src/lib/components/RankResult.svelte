<script lang="ts">
	import type { Candidate, Topic } from '$lib/domain';
	import type { HesitationSummary } from '$lib/ranking/hesitation';
	import { SITE, SITE_HOST } from '$lib/site';
	import { encodeRanking } from '$lib/share/rankingCodec';
	import { useT, getLocale, localePath } from '$lib/i18n';

	let {
		topic,
		ranking,
		hesitation,
		today = '',
		onRestart,
		shared = false
	}: {
		topic: Topic;
		ranking: Candidate[];
		/** 망설임(반응시간) 요약. 없거나(공유 뷰) count<=1 이면 리포트 숨김. */
		hesitation?: HesitationSummary;
		/** PDF 헤더 날짜(클라이언트에서 설정). 없으면 생략. */
		today?: string;
		/** 다시 하기 — 부모가 랭킹 상태를 초기화. 없으면(공유 뷰) 버튼 숨김. */
		onRestart?: () => void;
		/** 공유된 결과 뷰(읽기 전용): 공유 버튼 대신 "나도 해보기" CTA. */
		shared?: boolean;
	} = $props();

	const t = useT();
	const medal = (i: number) => (i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`);
	const exportPdf = () => window.print();

	// 무상태 공유 링크(§7.5): 순위를 주제 후보 인덱스 순열로 인코딩해 URL 조각으로.
	let copied = $state(false);
	async function copyShareLink() {
		// ranking(Candidate[]) → topic.candidates 내 인덱스로 매핑(코덱은 인덱스 기반)
		const idxOf = new Map(topic.candidates.map((c, i) => [c.id, i]));
		const indices = ranking.map((c) => idxOf.get(c.id) ?? -1);
		if (indices.some((i) => i < 0)) return; // 후보 불일치(방어) → 링크 생성 안 함
		const enc = encodeRanking(indices);
		const url = SITE + localePath(getLocale(), `/r/${topic.id}/${enc}`);
		try {
			await navigator.clipboard.writeText(url);
		} catch {
			// 클립보드 권한 없거나 비보안 컨텍스트: 링크를 노출해 수동 복사 가능하게
			window.prompt(t('result.share'), url);
		}
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}
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
	{#if hesitation && hesitation.count > 1}
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
	{#if shared}
		<!-- 공유된 결과 뷰: 이 주제를 직접 플레이하러 가는 CTA -->
		<a class="btn btn-primary btn-block" href={localePath(getLocale(), `/t/${topic.id}/play`)}
			>{t('result.playThis')}</a
		>
	{:else}
		<!-- 내 결과: 공유 링크 복사(§7.5 무상태 URL) -->
		<button class="btn btn-primary btn-block" onclick={copyShareLink}>
			{copied ? t('result.shareCopied') : t('result.share')}
		</button>
	{/if}
	<button class="btn btn-block" onclick={exportPdf}>{t('result.exportPdf')}</button>
	<div style="display:flex; gap:10px">
		{#if onRestart}
			<button class="btn" style="flex:1" onclick={onRestart}>{t('result.restart')}</button>
		{/if}
		<a class="btn" style="flex:1" href={localePath(getLocale(), '/')}>{t('nav.home')}</a>
	</div>
</div>
