<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { localePath, defaultLocale, type Locale } from '$lib/i18n';
	import { penaltyStyleOf } from '$lib/game/decks';
	import Icon from '$lib/game/Icon.svelte';
	import type { PageData } from './$types';
	import { saveResult } from '$lib/game/savedResults';
	import {
		accumulated,
		computeResult,
		decodeChoices,
		encodeChoices,
		headlineTail,
		pickResultCard,
		ROUNDS,
		type SideIndex
	} from '$lib/game/engine';
	import { recordPlay, type PlayRank } from '$lib/supabase';

	// 상위 N% 배지는 표본이 이만큼 쌓였을 때만 노출(초반 무의미한 수치 방지).
	const MIN_RANK_SAMPLE = 5;

	let { data }: { data: PageData } = $props();

	const locale = $derived((page.params.lang as Locale) ?? defaultLocale);
	const deck = $derived(data.deck ?? undefined);
	// 문체(§4 CLT): 긴 에피소드형(인물)은 문단처럼, 짧은 조건형은 punchy 라벨로 레이아웃 차등(Phase 4).
	const isLongStyle = $derived(deck ? penaltyStyleOf(deck) === 'long' : false);

	// 플레이 상태 — 고른 사이드 배열(0=a, 1=b). 메커니즘/점수는 화면에 숨김(B-2).
	let choices = $state<SideIndex[]>([]);

	// 공유된 결과 보기(?r=): 열면 남의 결과 카드가 바로 뜬다(플레이 없이 읽기전용).
	let sharedView = $state(false);
	onMount(() => {
		const r = decodeChoices(page.url.searchParams.get('r'));
		if (r) {
			choices = r;
			sharedView = true;
		}
	});

	const done = $derived(choices.length >= ROUNDS);
	const roundNum = $derived(choices.length + 1); // 1-based, 결정 중인 판
	// 메리트는 "반대편이 한 번이라도 선택되면" 그 쪽에 떠서 계속 유지된다(1번 조건 성격 — 안 사라짐).
	// A(0)를 고르면 B(1) 쪽에 B의 메리트가 뜨고, 그 뒤로 계속 남는다. 버린 저쪽의 탈출구로 갈아타게 유혹.
	// (직전 선택만 보던 옛 방식은 갈아탈 때 메리트가 사라지는 문제가 있었음.)
	const meritShown = $derived<[boolean, boolean]>([choices.includes(1), choices.includes(0)]);
	// 현재 판에서 각 사이드에 쌓인 페널티(이번 판 새 페널티 포함)
	const acc = $derived(deck && !done ? accumulated(deck, choices) : null);
	const result = $derived(deck && done ? computeResult(deck, choices) : null);
	// v3 캐릭터 카드: 덱에 resultCards가 있으면 숫자 결과 대신 유형 카드를 띄운다(없으면 null → v2 폴백).
	const card = $derived(deck && result ? pickResultCard(deck, result) : null);

	// 카드 위치 고정(사용자 요청): 매 판 deck.a 위·deck.b 아래로 고정. 스크램블 없음.
	// (자문 A-2 위치 편향 랜덤화는 플레이 감각상 철회 — 뭘 눌러도 자리가 안 바뀌게.)
	const order: SideIndex[] = [0, 1];

	// 완주 시 익명 로그 기록 + 상위 N%(B-2). 실패해도 게임엔 영향 없음.
	let rank = $state<PlayRank | null>(null);

	// 갈아탈 때 "아까움" 한 순간(B-3): 두고 가는 편을 짧게 붙잡는다.
	let switchNote = $state('');
	let switchTimer: ReturnType<typeof setTimeout> | null = null;

	function pick(s: SideIndex) {
		const prev = choices.length ? choices[choices.length - 1] : null;
		const next = [...choices, s];
		choices = next;
		if (prev !== null && s !== prev) {
			switchNote = `${sideName(prev)} 두고 가는 거야…?`;
			if (switchTimer) clearTimeout(switchTimer);
			switchTimer = setTimeout(() => (switchNote = ''), 1300);
		}
		if (next.length >= ROUNDS && deck) {
			recordPlay(deck.id, next, computeResult(deck, next)).then((r) => (rank = r));
			saveResult(deck.id, encodeChoices(next)); // 내 결과 저장(영구 아님)
		}
	}
	function restart() {
		choices = [];
		rank = null;
		sharedView = false;
		switchNote = '';
		if (switchTimer) clearTimeout(switchTimer);
	}

	// 결과 카드용 파생값
	const prefSide = $derived(deck && result ? (result.pref === 0 ? deck.a : deck.b) : null);
	const burnedSide = $derived(deck && result ? (result.burned === 0 ? deck.a : deck.b) : null);
	const headline = $derived(
		result && prefSide
			? result.enduredPref.length
				? result.enduredPref
						.slice(0, 2)
						.map((p) => p.text)
						.join(', ')
				: null
			: null
	);

	// 결과 비교(B-1): URL ?vs=<상대 10선택>이 있으면 같은 덱으로 상대 결과를 재현해 비교.
	const vsChoices = $derived(deck ? decodeChoices(page.url.searchParams.get('vs')) : null);
	const vsResult = $derived(deck && vsChoices ? computeResult(deck, vsChoices) : null);

	function sideName(s: SideIndex): string {
		return deck ? (s === 0 ? deck.a : deck.b).name : '';
	}

	// 나 vs 상대 한 줄 비교(같은 덱이라 선호편·버틴 깊이가 직접 비교됨).
	const compareLine = $derived.by(() => {
		if (!result || !vsResult) return '';
		const meName = sideName(result.pref);
		const youName = sideName(vsResult.pref);
		if (result.indecisive && vsResult.indecisive) return '둘 다 이쪽저쪽 못 정한 결정장애.';
		if (result.indecisive) return `나는 결정장애, 상대는 확고한 ${youName}.`;
		if (vsResult.indecisive) return `나는 확고한 ${meName}, 상대는 결정장애.`;
		if (result.pref === vsResult.pref) {
			const meDepth = result.holdMax[result.pref];
			const youDepth = vsResult.holdMax[vsResult.pref];
			if (meDepth === youDepth) return `둘 다 ${meName}, 버틴 깊이도 강도 ${meDepth}로 똑같아.`;
			const deeper = meDepth > youDepth ? '내' : '상대';
			const hi = Math.max(meDepth, youDepth);
			const lo = Math.min(meDepth, youDepth);
			return `둘 다 ${meName}! ${deeper}가 강도 ${hi}까지, 다른 쪽은 ${lo}에서 손절.`;
		}
		return `취향 갈렸네 — 나는 ${meName}, 상대는 ${youName}.`;
	});

	// 완주 결과의 누적 조건(각 편이 버틴 것들). 결과 카드·PDF의 "스토리"용.
	const resultAcc = $derived(done && deck ? accumulated(deck, choices) : null);

	// 공유 링크 2종:
	// - 결과 링크(?r=): 열면 내 결과 카드가 바로 보임(읽기전용). = 저장/공유의 핵심.
	// - 도전 링크(?vs=): 상대가 같은 주제를 플레이하고 나와 비교.
	const code = $derived(done && deck ? encodeChoices(choices) : '');
	const base = $derived(`${page.url.origin}${page.url.pathname}`);
	const resultUrl = $derived(code ? `${base}?r=${code}` : '');
	const vsUrl = $derived(code ? `${base}?vs=${code}` : '');

	// 인쇄(PDF) 상단 날짜.
	const printDate = $derived(
		new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
	);

	let shareMsg = $state('');
	async function copyLink(url: string, ok: string) {
		if (!url) return;
		try {
			await navigator.clipboard.writeText(url);
			shareMsg = ok;
		} catch {
			shareMsg = url; // 클립보드 차단 환경 — 링크 그대로 노출해 직접 복사.
		}
	}
	const shareResult = () => copyLink(resultUrl, '내 결과 링크 복사됨! 친구에게 보내면 내 결과를 그대로 봐요');
	const shareVs = () => copyLink(vsUrl, '비교 도전 링크 복사됨! 친구가 같은 주제로 겨뤄요');

	function printPdf() {
		if (typeof window !== 'undefined') window.print();
	}

	// ── 인스타 공유용 이미지(PNG) ─────────────────────────────
	// 결과를 세로형(1080×1350, 인스타 피드 4:5) 카드로 렌더 → 모바일은 공유 시트(→인스타),
	// 데스크톱은 다운로드. html-to-image는 필요할 때만 동적 import(초기 번들 경량화).
	let igCardEl = $state<HTMLElement>();
	let imgBusy = $state(false);

	// igCardEl → PNG {dataUrl, blob} 생성. 실패 시 throw.
	async function renderCardPng(el: HTMLElement): Promise<{ dataUrl: string; blob: Blob }> {
		const { toPng } = await import('html-to-image');
		const dataUrl = await toPng(el, {
			width: 1080,
			height: 1350,
			pixelRatio: 1,
			cacheBust: true,
			backgroundColor: '#ffffff',
			// 폰트 임베드 끄기: CDN(Galmuri) 스타일시트는 cross-origin이라 cssRules 접근이
			// SecurityError로 터진다. 스킵하면 이미지엔 시스템 폰트로 렌더(한글·이모지 정상).
			skipFonts: true,
			// 카드는 화면 밖(position:fixed; left:-20000px)에 있어서, 복제본이 그 오프셋까지
			// 물려받으면 캡처 캔버스가 백지가 된다. 캡처 시에만 원점으로 되돌린다.
			style: { position: 'static', left: '0px', top: '0px' }
		});
		const blob = await (await fetch(dataUrl)).blob();
		return { dataUrl, blob };
	}

	function isMobile(): boolean {
		return typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod|Mobi/i.test(navigator.userAgent);
	}

	async function shareImage() {
		if (!igCardEl || imgBusy) return;
		imgBusy = true;
		shareMsg = '';
		const el = igCardEl;

		// ★클립보드 write는 클릭 제스처가 살아있는 "동기 시점"에 호출해야 한다(await 뒤엔 만료됨).
		// 그래서 PNG 생성 Promise를 ClipboardItem에 그대로 넘겨, write()는 즉시 호출하고
		// blob은 나중에 resolve되게 한다(Chrome이 Promise value를 지원). PC 카톡 Ctrl+V의 핵심.
		const pngPromise = renderCardPng(el);
		const CI = (window as unknown as { ClipboardItem?: typeof ClipboardItem }).ClipboardItem;

		try {
			// 데스크톱: 클립보드 이미지 복사 우선(Web Share가 데스크톱을 가로채지 않게).
			if (!isMobile() && CI && navigator.clipboard?.write) {
				try {
					await navigator.clipboard.write([
						new CI({ 'image/png': pngPromise.then((r) => r.blob) })
					]);
					shareMsg = '이미지 복사됨! 카톡·메신저 창에 붙여넣기(Ctrl+V) 하세요';
					return;
				} catch {
					// 권한 거부·미지원 → 아래 다운로드 폴백으로.
				}
			}

			const { dataUrl, blob } = await pngPromise;
			const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
			const file = new File([blob], 'geuronde-ije.png', { type: 'image/png' });
			if (isMobile() && nav.canShare?.({ files: [file] })) {
				// 모바일: 네이티브 공유 시트(→ 인스타·카톡 등).
				await navigator.share({ files: [file], title: deck?.title ?? '그런데이제' });
				shareMsg = '공유 시트에서 앱을 골라 올려보세요!';
			} else {
				// 폴백: 파일 다운로드(클립보드·공유 시트 둘 다 안 될 때).
				const a = document.createElement('a');
				a.href = dataUrl;
				a.download = 'geuronde-ije.png';
				a.click();
				shareMsg = '이미지를 저장했어요! 카톡·인스타에 올려보세요';
			}
		} catch (e) {
			// 사용자가 공유 시트를 닫은 경우(AbortError)는 실패가 아님 — 조용히 넘김.
			if ((e as Error)?.name !== 'AbortError') {
				shareMsg = '이미지 생성에 실패했어요. 다시 시도해 주세요.';
			}
		} finally {
			imgBusy = false;
		}
	}
</script>

<svelte:head>
	<title>{deck ? deck.title : '그런데이제'}</title>
</svelte:head>

{#if !deck}
	<div class="empty" style="margin-top:48px">
		<h2>주제를 찾을 수 없어요.</h2>
		<a class="btn btn-primary" href={localePath(locale, '/')}>홈으로</a>
	</div>
{:else if !done && acc}
	<!-- 플레이: 두 사이드 세로 스택. 패널 자체가 선택 버튼. 라벨·점수 없음(B-2). -->
	{#if switchNote}
		<div class="switch-note" role="status">💔 {switchNote}</div>
	{/if}
	{#if vsChoices}
		<p class="challenge">누군가 이 주제로 비교를 걸었어요. 끝까지 가보자! 🆚</p>
	{/if}
	<div class="progress" aria-hidden="true">
		{#each Array(ROUNDS) as _, i (i)}
			<span class="dot" class:filled={i < choices.length}></span>
		{/each}
	</div>

	<div class="board" class:long={isLongStyle}>
		{#each order as si (si)}
			{@const s = si === 0 ? deck.a : deck.b}
			<button class="panel" onclick={() => pick(si)}>
				<span class="panel-head"><span class="emoji"><Icon value={s.emoji} /></span> {s.name}</span>
				<!-- 완화책(merit): 반대편이 한 번이라도 선택되면 그 쪽에 떠서 계속 유지(안 사라짐). -->
				{#if s.merit && meritShown[si]}
					<span class="merit"><span class="merit-tag">그래도</span> {s.merit}</span>
				{/if}
				<!-- 누적 표시(생략 없음): 감수한 조건이 판마다 쌓여 보인다. 최신만 강조. -->
				<div class="cond-list">
					{#each acc[si] as p, i (p.strength)}
						<span class="cond" class:cond-new={i === acc[si].length - 1}>
							<span class="gr">그런데 이제</span> {p.text}.{#if p.merit}
								<span class="gr">근데 이제</span> <span class="merit-in">{p.merit}</span>.{/if}
						</span>
					{/each}
				</div>
			</button>
		{/each}
	</div>
{:else if result && prefSide && burnedSide}
	<!-- 결과 카드: 버틴 깊이 대조(A-5). 플레이 중 숨긴 분석을 여기서 공개. -->
	<div class="result card">
		<div class="result-badge">그런데 이제 · 결과</div>

		{#if card}
			<!-- v3 캐릭터 카드(docs/v3-pivot §2-2): 3스텝 커뮤체. ①놀림 ②이유 ③예언/저주. -->
			<div class="char-card">
				<p class="char-label">🎴 당신의 유형: <b>「{card.label}」</b></p>
				<ul class="char-stats">
					{#each card.stats as st (st)}
						<li>{st}</li>
					{/each}
				</ul>
				<p class="char-prophecy">{card.prophecy}</p>
			</div>
		{:else if result.indecisive}
			<p class="result-headline">
				<span class="endured">이쪽저쪽 재기만 하다</span><br />
				어느 쪽도 끝까지 못 버틴 <b>결정장애</b> 유형
			</p>
		{:else if result.adaptive}
			<p class="result-headline">
				<span class="endured">상황마다 최선을 골라</span><br />
				유연하게 갈아탄 <b>적응형</b> 유형
			</p>
		{:else}
			<p class="result-headline">
				{#if headline}
					<span class="endured">「{headline}」</span><br />
				{/if}
				그래도 <span class="emoji"><Icon value={prefSide.emoji} /></span> <b>{prefSide.name}</b>
					{headlineTail(deck)}
			</p>
		{/if}

		{#if rank && rank.sample >= MIN_RANK_SAMPLE && !result.indecisive && !result.adaptive}
			<!-- 상위 N%(B-2): 같은 편 중 버틴 깊이 백분위. 표본 부족하면 숨김. -->
			<p class="rank-badge">🏆 {prefSide.name} 중 <b>상위 {rank.percentile}%</b></p>
		{/if}

		{#if !card}
			<div class="depth">
				<div class="depth-title">🌡️ 버틴 깊이</div>
				{#each [deck.a, deck.b] as s, si (si)}
					<div class="bar-row">
						<span class="bar-label"><Icon value={s.emoji} /> {s.name}</span>
						<span class="bar-track">
							<span class="bar-fill" style="width:{(result.holdMax[si] / ROUNDS) * 100}%"></span>
						</span>
						<span class="bar-num">{result.holdMax[si]}</span>
					</div>
				{/each}
				<p class="verdict">{result.verdict}</p>
			</div>
		{/if}

		{#if vsResult}
			<!-- 결과 비교(B-1): 같은 덱을 플레이한 상대와 나란히. -->
			<div class="vs-block">
				<div class="vs-title">🆚 상대와 비교</div>
				<div class="vs-grid">
					<div class="vs-col">
						<span class="vs-who">나</span>
						<span class="vs-pref">
							{#if result.indecisive}결정장애{:else}<Icon value={prefSide.emoji} /> {prefSide.name}{/if}
						</span>
						<span class="vs-depth">버틴 깊이 {result.holdMax[result.pref]}</span>
					</div>
					<div class="vs-col">
						<span class="vs-who">상대</span>
						<span class="vs-pref">
							{#if vsResult.indecisive}결정장애{:else}<Icon
									value={(vsResult.pref === 0 ? deck.a : deck.b).emoji}
								/> {(vsResult.pref === 0 ? deck.a : deck.b).name}{/if}
						</span>
						<span class="vs-depth">버틴 깊이 {vsResult.holdMax[vsResult.pref]}</span>
					</div>
				</div>
				<p class="vs-line">{compareLine}</p>
			</div>
		{/if}

		<div class="result-actions">
			{#if sharedView}
				<button class="btn btn-primary btn-act" onclick={restart}>
					<span class="ba-ic">🙋</span> 나도 해보기
				</button>
			{:else}
				<button class="btn btn-primary btn-act" onclick={restart}>
					<span class="ba-ic">🔄</span> 다시 하기
				</button>
			{/if}
			<a class="btn btn-act btn-other" href={localePath(locale, '/')}>
				<span class="ba-ic">🎲</span> 다른 주제
			</a>
		</div>

		<div class="share-box">
			<div class="share-row">
				<button class="rbtn" onclick={shareResult} title="결과 링크 공유">
					<span class="rbtn-face">🔗</span><em>내 결과 공유</em>
				</button>
				<button class="rbtn rbtn-ig" onclick={shareImage} disabled={imgBusy} title="인스타용 이미지">
					<span class="rbtn-face">📷</span><em>{imgBusy ? '…' : '이미지'}</em>
				</button>
				<button class="rbtn" onclick={shareVs} title="비교 도전장">
					<span class="rbtn-face">🆚</span><em>도전장</em>
				</button>
				<button class="rbtn" onclick={printPdf} title="PDF로 저장">
					<span class="rbtn-face">🖨️</span><em>PDF</em>
				</button>
			</div>
			{#if !sharedView}
				<p class="save-note">이 결과는 이 브라우저에 저장돼 있어요. 링크를 복사해두면 어디서든 다시 볼 수 있어요.</p>
			{/if}
			{#if shareMsg}
				<p class="share-msg">{shareMsg}</p>
			{/if}
		</div>
	</div>

	<!-- ── PDF/인쇄 전용 결과 증서(화면엔 안 보임, 인쇄 시에만) ────────── -->
	<section class="print-sheet" aria-hidden="true">
		<div class="ps-frame">
			<div class="ps-brand">그런데이제 · 결과 증서</div>
			<div class="ps-topic"><Icon value={deck.icon} /> {deck.title}</div>

			<div class="ps-verdict">
				{#if result.indecisive}
					어느 쪽도 끝까지 못 버틴 <b>결정장애</b> 유형
				{:else if result.adaptive}
					상황마다 최선을 골라 갈아탄 <b>적응형</b> 유형
				{:else}
					그래도 <Icon value={prefSide.emoji} /> <b>{prefSide.name}</b> {headlineTail(deck)}
				{/if}
			</div>
			{#if rank && rank.sample >= MIN_RANK_SAMPLE && !result.indecisive && !result.adaptive}
				<div class="ps-rank">🏆 {prefSide.name} 중 상위 {rank.percentile}%</div>
			{/if}

			<div class="ps-depth">
				{#each [deck.a, deck.b] as s, si (si)}
					<div class="ps-bar-row">
						<span class="ps-bar-label"><Icon value={s.emoji} /> {s.name}</span>
						<span class="ps-bar-track">
							<span class="ps-bar-fill" style="width:{(result.holdMax[si] / ROUNDS) * 100}%"></span>
						</span>
						<span class="ps-bar-num">강도 {result.holdMax[si]}</span>
					</div>
				{/each}
			</div>

			<p class="ps-line">{result.verdict}</p>

			{#if resultAcc}
				<div class="ps-story">
					<div class="ps-story-title">내가 «{prefSide.name}» 편에서 버틴 것들</div>
					<ul class="ps-conds">
						{#each resultAcc[result.pref] as p (p.strength)}
							<li>그런데 이제 {p.text}.{#if p.merit} 근데 이제 {p.merit}.{/if}</li>
						{/each}
						{#if resultAcc[result.pref].length === 0}
							<li class="ps-none">— (첫 판에 바로 갈아탔어요)</li>
						{/if}
					</ul>
				</div>
			{/if}

			<div class="ps-footer">
				<span>{printDate}</span>
				<span>codeinsight.online</span>
			</div>
		</div>
	</section>

	<!-- ── 인스타 공유용 이미지 카드(화면 밖 렌더 → html-to-image가 PNG로 캡처) ────── -->
	<div class="ig-card" bind:this={igCardEl} aria-hidden="true">
		<div class="ig-inner">
			<div class="ig-brand">그런데이제</div>
			<div class="ig-topic"><Icon value={deck.icon} /> {deck.title}</div>

			{#if card}
				<!-- v3 캐릭터 카드(화면 결과와 동일): 놀림 + 스탯 + 저주. 세로 중앙 배치로 잘림 방지. -->
				<div class="ig-char">
					<div class="ig-label">🎴 당신의 유형<br /><b>「{card.label}」</b></div>
					<ul class="ig-stats">
						{#each card.stats as st (st)}
							<li>{st}</li>
						{/each}
					</ul>
					<p class="ig-prophecy">{card.prophecy}</p>
				</div>
			{:else}
				<div class="ig-verdict">
					{#if result.indecisive}
						어느 쪽도 끝까지 못 버틴 <b>결정장애</b> 유형
					{:else if result.adaptive}
						상황마다 최선을 골라 갈아탄 <b>적응형</b> 유형
					{:else}
						그래도 <Icon value={prefSide.emoji} /> <b>{prefSide.name}</b> {headlineTail(deck)}
					{/if}
				</div>

				<div class="ig-depth">
					{#each [deck.a, deck.b] as s, si (si)}
						<div class="ig-bar-row">
							<span class="ig-bar-label"><Icon value={s.emoji} /> {s.name}</span>
							<span class="ig-bar-track">
								<span class="ig-bar-fill" style="width:{(result.holdMax[si] / ROUNDS) * 100}%"></span>
							</span>
							<span class="ig-bar-num">{result.holdMax[si]}</span>
						</div>
					{/each}
				</div>

				<p class="ig-line">{result.verdict}</p>

				{#if resultAcc && !result.indecisive && !result.adaptive && resultAcc[result.pref].length}
					<div class="ig-story">
						<div class="ig-story-title">«{prefSide.name}» 편에서 버틴 것들</div>
						<ul>
							{#each resultAcc[result.pref].slice(-3) as p (p.strength)}
								<li>그런데 이제 {p.text}.{#if p.merit} 근데 이제 {p.merit}.{/if}</li>
							{/each}
						</ul>
					</div>
				{/if}
			{/if}

			<div class="ig-footer">
				<span>{printDate}</span>
				<span>codeinsight.online</span>
			</div>
		</div>
	</div>
{/if}

<style>
	.progress {
		display: flex;
		justify-content: center;
		gap: 6px;
		margin: 8px 0 20px;
	}
	.dot {
		width: 10px;
		height: 10px;
		border: 2px solid var(--line);
		background: var(--surface);
	}
	.dot.filled {
		background: var(--accent);
		border-color: var(--accent);
	}

	.board {
		display: flex;
		flex-direction: column;
		gap: 14px;
		max-width: 560px;
		margin: 0 auto;
	}
	.panel {
		display: flex;
		flex-direction: column;
		gap: 8px;
		width: 100%;
		text-align: left;
		padding: 20px;
		background: var(--surface);
		border: 3px solid var(--line);
		box-shadow: var(--shadow);
		cursor: pointer;
		font: inherit;
		color: var(--ink);
		transition: transform 0.06s ease;
	}
	.panel:active {
		transform: translate(2px, 2px);
		box-shadow: none;
	}
	.panel-head {
		font-size: 22px;
		font-weight: 800;
	}
	.emoji {
		font-size: 1.1em;
	}
	/* 완화책(merit): 페널티(빨강 계열) 대비 초록 톤 숨통. 상시 노출. */
	.merit {
		font-size: 13px;
		line-height: 1.45;
		padding: 5px 8px;
		background: var(--soft);
		border-left: 3px solid #2e9e5b;
		color: var(--ink);
	}
	.merit-tag {
		font-size: 11px;
		font-weight: 700;
		color: #2e9e5b;
	}
	/* v3 인라인 메리트: 조건에 결합된 "근데 이제 ~" 부분을 초록 톤으로 구분. */
	.merit-in {
		color: #2e9e5b;
		font-weight: 600;
	}
	/* 누적 조건 리스트: 판마다 한 줄씩 쌓인다(생략 없음). */
	.cond-list {
		display: flex;
		flex-direction: column;
		gap: 5px;
	}
	.cond {
		font-size: 14px;
		line-height: 1.4;
		color: var(--ink);
		padding: 4px 8px;
		border-left: 3px solid var(--line);
	}
	/* "그런데 이제" 반복은 작게·연하게 두고 조건 문구를 앞세운다. */
	.gr {
		font-size: 11px;
		color: var(--muted);
		font-weight: 600;
	}
	/* 이번 판에 새로 붙은 조건만 강조(색 채움 + 굵게). */
	.cond-new {
		font-weight: 700;
		background: var(--accent);
		color: var(--accent-ink);
		border-left-color: var(--accent-ink);
	}
	.cond-new .gr {
		color: var(--accent-ink);
		opacity: 0.75;
	}
	/* 긴 에피소드형(인물): 조건 문장이 길어 살짝 크게·여유 있게. */
	.board.long .cond {
		font-size: 14.5px;
		line-height: 1.55;
	}

	.result {
		max-width: 480px;
		margin: 12px auto;
		padding: 24px;
		text-align: center;
	}
	.result-badge {
		font-size: 13px;
		letter-spacing: 0.04em;
		color: var(--muted);
		margin-bottom: 16px;
	}
	.result-headline {
		font-size: 19px;
		line-height: 1.5;
		margin: 0 0 22px;
	}
	.endured {
		color: var(--accent);
		font-weight: 700;
	}
	/* v3 캐릭터 카드(3스텝 커뮤체): ①놀림 헤드라인 ②이유 ③예언/저주. */
	.char-card {
		text-align: left;
		margin: 0 0 20px;
	}
	.char-label {
		font-size: 15px;
		line-height: 1.4;
		margin: 0 0 14px;
		text-align: center;
	}
	.char-label b {
		display: block;
		font-size: 23px;
		font-weight: 800;
		color: var(--accent);
		margin-top: 4px;
	}
	.char-stats {
		list-style: none;
		padding: 14px 16px;
		margin: 0 0 14px;
		background: var(--soft);
		border-radius: 10px;
		display: flex;
		flex-direction: column;
		gap: 9px;
	}
	.char-stats li {
		font-size: 14px;
		line-height: 1.4;
		color: var(--ink);
		padding-left: 14px;
		position: relative;
	}
	.char-stats li::before {
		content: '▸';
		position: absolute;
		left: 0;
		color: var(--accent);
	}
	.char-prophecy {
		font-size: 15px;
		font-weight: 700;
		line-height: 1.5;
		margin: 0;
		padding: 12px 14px;
		border: 2px dashed var(--line);
		border-radius: 10px;
		text-align: center;
	}
	.rank-badge {
		margin: -8px 0 18px;
		font-size: 15px;
		color: var(--accent);
	}
	.depth {
		text-align: left;
		border-top: 3px solid var(--line);
		padding-top: 16px;
	}
	.depth-title {
		font-weight: 700;
		margin-bottom: 10px;
	}
	.bar-row {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 8px;
	}
	.bar-label {
		flex: 0 0 84px;
		font-size: 14px;
	}
	.bar-track {
		flex: 1;
		height: 14px;
		background: var(--soft);
		border: 2px solid var(--line);
	}
	.bar-fill {
		display: block;
		height: 100%;
		background: var(--accent);
	}
	.bar-num {
		flex: 0 0 20px;
		text-align: right;
		font-size: 13px;
		font-weight: 700;
	}
	.verdict {
		margin: 12px 0 0;
		font-size: 15px;
		color: var(--ink);
	}
	.result-actions {
		display: flex;
		gap: 10px;
		margin-top: 22px;
	}
	.result-actions .btn {
		flex: 1;
	}
	/* 액션 버튼 꾸밈: 아이콘 + 살짝 큰 글씨. 눌리는 맛(neobrutalist)은 기본 .btn 유지. */
	.btn-act {
		font-size: 15px;
		font-weight: 800;
		gap: 7px;
	}
	.ba-ic {
		font-size: 1.15em;
		line-height: 1;
	}
	/* '다른 주제'는 보조 액션 — 은은한 틴트 배경으로 결과 링크 버튼들과 구분. */
	.btn-other {
		background: var(--soft);
	}
	.share-box {
		margin-top: 14px;
	}
	/* 공유 액션 4개를 한 행의 원형 아이콘 버튼으로. */
	.share-row {
		display: flex;
		justify-content: center;
		gap: 16px;
	}
	.rbtn {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
		border: none;
		background: transparent;
		cursor: pointer;
		font: inherit;
		color: var(--ink);
		padding: 0;
	}
	/* 동그란 버튼면 — 이모지 아이콘이 들어가는 원. */
	.rbtn-face {
		width: 60px;
		height: 60px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 25px;
		background: var(--surface);
		border: 3px solid var(--line);
		box-shadow: var(--shadow);
		transition: transform 0.06s ease;
	}
	.rbtn:active .rbtn-face {
		transform: translate(2px, 2px);
		box-shadow: none;
	}
	.rbtn em {
		font-style: normal;
		font-size: 11px;
		font-weight: 700;
		color: var(--muted);
		max-width: 66px;
		text-align: center;
		line-height: 1.2;
		word-break: keep-all;
	}
	/* 인스타 버튼만 그라데이션으로 강조. */
	.rbtn-ig .rbtn-face {
		background: linear-gradient(135deg, #f58529, #dd2a7b 55%, #8134af);
	}
	.rbtn:disabled {
		opacity: 0.6;
		cursor: default;
	}
	.save-note {
		margin: 12px 0 0;
		font-size: 12px;
		color: var(--muted);
		line-height: 1.5;
	}
	.share-msg {
		margin: 10px 0 0;
		font-size: 13px;
		color: var(--muted);
		word-break: break-all;
	}

	/* 인쇄 증서: 화면에선 숨김, 인쇄 시에만 노출(아래 @media print). */
	.print-sheet {
		display: none;
	}

	/* ───────── 인스타 공유 이미지 카드(1080×1350, 4:5) ─────────
	   화면 밖(left:-20000px)에 실제 렌더돼 있고, html-to-image가 이 노드를 PNG로 캡처.
	   공유 이미지는 사용자 테마와 무관하게 항상 밝은 톤으로 보이도록 색을 고정한다. */
	.ig-card {
		position: fixed;
		left: -20000px;
		top: 0;
		width: 1080px;
		height: 1350px;
		background: linear-gradient(160deg, #efe9ff 0%, #ffffff 58%);
		color: #17151f;
		overflow: hidden;
	}
	.ig-inner {
		box-sizing: border-box;
		height: 100%;
		padding: 90px 80px;
		display: flex;
		flex-direction: column;
	}
	.ig-brand {
		text-align: center;
		font-size: 34px;
		letter-spacing: 8px;
		font-weight: 800;
		color: #6d5efc;
	}
	.ig-topic {
		text-align: center;
		font-size: 58px;
		font-weight: 800;
		line-height: 1.25;
		margin: 20px 0 44px;
	}
	/* v3 캐릭터 카드(공유 이미지용): 남은 공간에 세로 중앙 배치 → 위아래 안 잘림. */
	.ig-char {
		flex: 1;
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 40px;
		min-height: 0;
	}
	.ig-label {
		text-align: center;
		font-size: 34px;
		line-height: 1.35;
		color: #17151f;
	}
	.ig-label b {
		display: inline-block;
		margin-top: 12px;
		font-size: 60px;
		font-weight: 800;
		line-height: 1.25;
		color: #6d5efc;
	}
	.ig-stats {
		list-style: none;
		margin: 0;
		padding: 40px 46px;
		background: #fff;
		border: 5px solid #d9cffb;
		border-radius: 24px;
		display: flex;
		flex-direction: column;
		gap: 26px;
		font-size: 38px;
		line-height: 1.35;
	}
	.ig-stats li::before {
		content: '▸ ';
		color: #6d5efc;
		font-weight: 800;
	}
	.ig-prophecy {
		text-align: center;
		font-weight: 800;
		font-size: 42px;
		line-height: 1.45;
		margin: 0;
		padding: 38px 40px;
		border: 5px dashed #d9cffb;
		border-radius: 24px;
	}
	.ig-verdict {
		text-align: center;
		font-size: 46px;
		line-height: 1.5;
		background: #fff;
		border: 5px solid #d9cffb;
		border-radius: 24px;
		padding: 44px 40px;
	}
	.ig-verdict b {
		color: #6d5efc;
	}
	.ig-depth {
		margin: 52px 0 8px;
		display: flex;
		flex-direction: column;
		gap: 30px;
	}
	.ig-bar-row {
		display: grid;
		grid-template-columns: 340px 1fr 84px;
		align-items: center;
		gap: 24px;
		font-size: 38px;
	}
	.ig-bar-label {
		font-weight: 800;
	}
	.ig-bar-track {
		height: 38px;
		background: #eee;
		border: 4px solid #17151f;
		border-radius: 999px;
		overflow: hidden;
	}
	.ig-bar-fill {
		display: block;
		height: 100%;
		background: #6d5efc;
	}
	.ig-bar-num {
		text-align: right;
		font-weight: 800;
		font-size: 34px;
	}
	.ig-line {
		text-align: center;
		font-weight: 800;
		font-size: 40px;
		margin: 44px 0;
	}
	.ig-story {
		margin-top: auto;
		border-top: 4px dashed #d9cffb;
		padding-top: 34px;
	}
	.ig-story-title {
		font-weight: 800;
		font-size: 34px;
		margin-bottom: 22px;
	}
	.ig-story ul {
		margin: 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 16px;
		font-size: 32px;
		line-height: 1.4;
	}
	.ig-story li::before {
		content: '✔ ';
		color: #6d5efc;
		font-weight: 800;
	}
	.ig-footer {
		display: flex;
		justify-content: space-between;
		margin-top: 40px;
		padding-top: 26px;
		border-top: 3px solid #efe9ff;
		font-size: 28px;
		color: #7a7391;
	}

	.switch-note {
		position: fixed;
		left: 50%;
		top: 42%;
		transform: translate(-50%, -50%);
		background: var(--ink);
		color: var(--surface);
		padding: 10px 18px;
		border: 3px solid var(--line);
		box-shadow: var(--shadow);
		font-weight: 700;
		font-size: 15px;
		z-index: 20;
		pointer-events: none;
		animation: switch-pop 1.3s ease forwards;
	}
	@keyframes switch-pop {
		0% {
			opacity: 0;
			transform: translate(-50%, -40%) scale(0.9);
		}
		15% {
			opacity: 1;
			transform: translate(-50%, -50%) scale(1);
		}
		78% {
			opacity: 1;
		}
		100% {
			opacity: 0;
			transform: translate(-50%, -56%);
		}
	}

	.challenge {
		max-width: 560px;
		margin: 0 auto 12px;
		padding: 10px 14px;
		text-align: center;
		font-size: 14px;
		font-weight: 700;
		background: var(--soft);
		border: 3px solid var(--line);
	}

	.vs-block {
		margin-top: 18px;
		border-top: 3px solid var(--line);
		padding-top: 16px;
		text-align: left;
	}
	.vs-title {
		font-weight: 700;
		margin-bottom: 10px;
	}
	.vs-grid {
		display: flex;
		gap: 10px;
	}
	.vs-col {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding: 12px;
		border: 2px solid var(--line);
		background: var(--surface);
		text-align: center;
	}
	.vs-who {
		font-size: 12px;
		color: var(--muted);
	}
	.vs-pref {
		font-size: 16px;
		font-weight: 800;
	}
	.vs-depth {
		font-size: 13px;
		color: var(--muted);
	}
	.vs-line {
		margin: 12px 0 0;
		font-size: 15px;
		font-weight: 700;
		text-align: center;
	}

	/* ───────── 인쇄(PDF) 전용 ───────── */
	@media print {
		/* 화면 UI는 전부 숨기고 증서만 남긴다. */
		:global(.app-header),
		:global(.ad),
		:global(.lang-select),
		.result-actions,
		.share-box,
		.switch-note {
			display: none !important;
		}
		:global(body),
		:global(.wrap) {
			margin: 0 !important;
			padding: 0 !important;
			background: #fff !important;
		}
		.result.card {
			display: none !important;
		}
		.print-sheet {
			display: block !important;
		}
		@page {
			margin: 12mm;
		}
	}

	.ps-frame {
		border: 3px solid #6d5efc;
		border-radius: 14px;
		padding: 28px 30px;
		color: #17151f;
		font-family: inherit;
		box-shadow: inset 0 0 0 6px #efe9ff;
	}
	.ps-brand {
		text-align: center;
		font-size: 13px;
		letter-spacing: 2px;
		color: #6d5efc;
		font-weight: 800;
		text-transform: uppercase;
	}
	.ps-topic {
		text-align: center;
		font-size: 26px;
		font-weight: 800;
		margin: 8px 0 18px;
	}
	.ps-verdict {
		text-align: center;
		font-size: 19px;
		line-height: 1.5;
		background: #f4f1ff;
		border: 2px solid #d9cffb;
		border-radius: 10px;
		padding: 16px;
	}
	.ps-verdict b {
		color: #6d5efc;
	}
	.ps-rank {
		text-align: center;
		font-weight: 800;
		margin-top: 12px;
		color: #b8860b;
	}
	.ps-depth {
		margin: 22px 0 6px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.ps-bar-row {
		display: grid;
		grid-template-columns: 120px 1fr 70px;
		align-items: center;
		gap: 10px;
		font-size: 15px;
	}
	.ps-bar-label {
		font-weight: 700;
	}
	.ps-bar-track {
		height: 16px;
		background: #eee;
		border: 2px solid #17151f;
		border-radius: 999px;
		overflow: hidden;
	}
	.ps-bar-fill {
		display: block;
		height: 100%;
		background: #6d5efc;
	}
	.ps-bar-num {
		text-align: right;
		font-weight: 700;
		font-size: 13px;
	}
	.ps-line {
		text-align: center;
		font-weight: 700;
		font-size: 16px;
		margin: 18px 0;
	}
	.ps-story {
		border-top: 2px dashed #d9cffb;
		padding-top: 16px;
	}
	.ps-story-title {
		font-weight: 800;
		margin-bottom: 10px;
	}
	.ps-conds {
		margin: 0;
		padding-left: 4px;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 6px;
		font-size: 14.5px;
	}
	.ps-conds li::before {
		content: '✔ ';
		color: #6d5efc;
		font-weight: 800;
	}
	.ps-none::before {
		content: '' !important;
	}
	.ps-footer {
		display: flex;
		justify-content: space-between;
		margin-top: 22px;
		padding-top: 12px;
		border-top: 2px solid #efe9ff;
		font-size: 12px;
		color: #7a7391;
	}
</style>
