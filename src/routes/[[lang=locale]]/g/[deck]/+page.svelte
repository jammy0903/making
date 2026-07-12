<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { localePath, defaultLocale, josaEunNeun, type Locale } from '$lib/i18n';
	import { penaltyStyleOf, shortenPenalty, type Penalty } from '$lib/game/decks';
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
		roundsOf,
		type SideIndex
	} from '$lib/game/engine';
	import { recordPlay, type PlayRank } from '$lib/supabase';

	// 상위 N% 배지는 표본이 이만큼 쌓였을 때만 노출(초반 무의미한 수치 방지).
	const MIN_RANK_SAMPLE = 5;

	let { data }: { data: PageData } = $props();

	const locale = $derived((page.params.lang as Locale) ?? defaultLocale);
	const deck = $derived(data.deck ?? undefined);
	// 그 덱의 총 판 수(v3.1 가변 5~10). 덱 없으면 최대값 폴백.
	const rounds = $derived(deck ? roundsOf(deck) : ROUNDS);
	// 문체(§4 CLT): 긴 에피소드형(인물)은 문단처럼, 짧은 조건형은 punchy 라벨로 레이아웃 차등(Phase 4).
	const isLongStyle = $derived(deck ? penaltyStyleOf(deck) === 'long' : false);

	// 플레이 상태 — 고른 사이드 배열(0=a, 1=b). 메커니즘/점수는 화면에 숨김(B-2).
	let choices = $state<SideIndex[]>([]);

	// 공유된 결과 보기(?r=): 열면 남의 결과 카드가 바로 뜬다(플레이 없이 읽기전용).
	let sharedView = $state(false);
	onMount(() => {
		const r = decodeChoices(page.url.searchParams.get('r'));
		// 공유 시퀀스는 그 덱 판 수와 길이가 맞아야 함(덱이 짧아졌거나 다른 길이면 무시).
		if (r && (!deck || r.length === roundsOf(deck))) {
			choices = r;
			sharedView = true;
		}
	});

	const done = $derived(!!deck && choices.length >= rounds);
	const roundNum = $derived(choices.length + 1); // 1-based, 결정 중인 판
	// 메리트는 "반대편이 한 번이라도 선택되면" 그 쪽에 떠서 계속 유지된다(1번 조건 성격 — 안 사라짐).
	// A(0)를 고르면 B(1) 쪽에 B의 메리트가 뜨고, 그 뒤로 계속 남는다. 버린 저쪽의 탈출구로 갈아타게 유혹.
	// (직전 선택만 보던 옛 방식은 갈아탈 때 메리트가 사라지는 문제가 있었음.)
	const meritShown = $derived<[boolean, boolean]>([choices.includes(1), choices.includes(0)]);
	// 현재 판에서 각 사이드에 쌓인 페널티(이번 판 새 페널티 포함)
	const acc = $derived(deck && !done ? accumulated(deck, choices) : null);

	// ── 새 픽셀 레이아웃 "표시용"만(게임 로직·엔진·점수·결과 전부 불변. choices에서 파생만) ──
	// 활성 편 = 직전 선택 / pending = 이번 판 그 편에 붙은 새 조건 / endured = 감수(유지)한 조건만.
	const activeSide = $derived(
		deck && choices.length >= 1 && !done ? choices[choices.length - 1] : null
	);
	const pending = $derived(
		deck && activeSide !== null
			? ((activeSide === 0 ? deck.a : deck.b).penalties[choices.length - 1] ?? null)
			: null
	);
	const endured = $derived.by<[Penalty[], Penalty[]]>(() => {
		const e: [Penalty[], Penalty[]] = [[], []];
		if (!deck) return e;
		for (let R = 2; R <= choices.length; R++) {
			if (choices[R - 1] === choices[R - 2]) {
				const cur = choices[R - 1];
				e[cur].push((cur === 0 ? deck.a : deck.b).penalties[R - 2]);
			}
		}
		return e;
	});
	// 바구니 칩 라벨: 손저작 라벨(short/meritShort) 우선, 없으면 원문 자동 축약.
	const shortTag = (p: Penalty, kind: 'p' | 'm') =>
		kind === 'p'
			? (p.short ?? shortenPenalty(p.text))
			: (p.meritShort ?? shortenPenalty(p.merit ?? ''));

	const result = $derived(deck && done ? computeResult(deck, choices) : null);
	// v3 캐릭터 카드: 덱에 resultCards가 있으면 숫자 결과 대신 유형 카드를 띄운다(없으면 null → v2 폴백).
	const card = $derived(deck && result ? pickResultCard(deck, result) : null);

	// 카드 위치 고정(사용자 요청): 매 판 deck.a 왼쪽·deck.b 오른쪽으로 고정. 스크램블 없음.
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
		if (deck && next.length >= rounds) {
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

	// ── 결과 영수증(감수·회피 영수증) 데이터 ──
	// 각 판(강도 2~N): 그 판 내 편에 붙은 페널티 + 버텼나(감수)/갈아탔나(회피).
	const receiptItems = $derived.by(() => {
		if (!deck || !result) return [] as { s: number; t: string; kind: '감수' | '회피' }[];
		const out: { s: number; t: string; kind: '감수' | '회피' }[] = [];
		for (let n = 2; n <= choices.length; n++) {
			const held = choices[n - 2];
			const p = (held === 0 ? deck.a : deck.b).penalties[n - 2];
			if (!p) continue;
			out.push({ s: n, t: p.short || shortenPenalty(p.text), kind: choices[n - 1] === held ? '감수' : '회피' });
		}
		return out;
	});
	const rcCnt = (k: '감수' | '회피') => receiptItems.filter((i) => i.kind === k).length;
	// 합계 = 유형 라벨(카드), 없으면 verdict 폴백. 부가세 = 회피·감수 카운트.
	const rcGrade = $derived(card?.label ?? result?.verdict ?? '');

	// 결과 비교(B-1): URL ?vs=<상대 선택>이 있으면 같은 덱으로 상대 결과를 재현해 비교.
	// 길이가 그 덱 판 수와 맞을 때만 유효(가변 길이).
	const vsChoices = $derived.by(() => {
		if (!deck) return null;
		const c = decodeChoices(page.url.searchParams.get('vs'));
		return c && c.length === rounds ? c : null;
	});
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
	// 영수증을 폭 1080px로 꽉 채워 흰 배경 PNG로 렌더(높이는 영수증 길이에 맞춤) → 모바일은
	// 공유 시트(→인스타), 데스크톱은 다운로드. html-to-image는 필요할 때만 동적 import(번들 경량화).
	let igCardEl = $state<HTMLElement>();
	let imgBusy = $state(false);

	// PNG용 Galmuri 픽셀 폰트 임베드 CSS(base64). 최초 1회 빌드 후 캐시. 실패 시 '' (시스템 폰트 폴백).
	let _galmuriCss: string | null = null;
	async function galmuriEmbedCss(): Promise<string> {
		if (_galmuriCss !== null) return _galmuriCss;
		const toB64 = (buf: ArrayBuffer) => {
			const bytes = new Uint8Array(buf);
			let bin = '';
			for (let i = 0; i < bytes.length; i += 0x8000)
				bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
			return btoa(bin);
		};
		try {
			const [reg, bold] = await Promise.all([
				fetch('/fonts/Galmuri11.woff2').then((r) => r.arrayBuffer()),
				fetch('/fonts/Galmuri11-Bold.woff2').then((r) => r.arrayBuffer())
			]);
			_galmuriCss =
				`@font-face{font-family:'Galmuri11';font-weight:400;font-style:normal;src:url(data:font/woff2;base64,${toB64(reg)}) format('woff2')}` +
				`@font-face{font-family:'Galmuri11';font-weight:700;font-style:normal;src:url(data:font/woff2;base64,${toB64(bold)}) format('woff2')}`;
		} catch {
			_galmuriCss = '';
		}
		return _galmuriCss;
	}

	// igCardEl → PNG {dataUrl, blob}. 배경색 없이 영수증이 가로 폭을 꽉 채우고,
	// 프레임 높이를 영수증 높이에 맞춰(여백 0) 캡처한다.
	async function renderCardPng(el: HTMLElement): Promise<{ dataUrl: string; blob: Blob }> {
		const rc = el.querySelector<HTMLElement>('.rcpt');
		let outH = el.clientHeight;
		if (rc) {
			rc.style.transform = 'none';
			const sc = el.clientWidth / rc.offsetWidth; // 가로 폭 꽉 채우기(여백 없음)
			rc.style.transform = `translateX(-50%) scale(${sc})`;
			outH = Math.round(rc.offsetHeight * sc); // 프레임 높이 = 영수증 높이 → 배경 여백 제거
			el.style.height = `${outH}px`;
		}
		const { toPng } = await import('html-to-image');
		const fontEmbedCSS = await galmuriEmbedCss();
		const dataUrl = await toPng(el, {
			width: 1080,
			height: outH,
			pixelRatio: 1,
			cacheBust: true,
			backgroundColor: '#ffffff',
			// Galmuri 픽셀 폰트를 base64로 임베드 → PNG에도 픽셀 폰트. fontEmbedCSS를 직접 주면
			// html-to-image가 문서 스타일시트를 안 훑어서 CDN cross-origin cssRules SecurityError도 회피.
			fontEmbedCSS,
			// 카드는 화면 밖(position:fixed; left:-20000px)에 있어서, 복제본이 그 오프셋까지
			// 물려받으면 캡처 캔버스가 백지가 된다. 캡처 시에만 원점으로 되돌린다.
			style: { position: 'static', left: '0px', top: '0px' }
		});
		el.style.height = ''; // 다음 캡처 대비 프레임 높이 원복
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

{#snippet resultReceipt()}
	<div class="rcpt">
		<div class="rc-store">그 런 데 이 제</div>
		<div class="rc-kind">취 향 영 수 증</div>
		<div class="rc-info">{deck?.title}</div>
		<div class="rc-eq">================================</div>
		<div class="rc-row rc-head"><span>품 목</span><span class="rc-gb">구분</span></div>
		<div class="rc-dash">- - - - - - - - - - - - - - - - -</div>
		{#each receiptItems as it (it.s)}
			<div class="rc-row rc-item" class:avoid={it.kind === '회피'}>
				<span class="rc-nm"
					>{it.t}{#if it.kind === '회피'}<span class="rc-cant">{josaEunNeun(it.t)} 못해</span>{/if}</span
				>
				<span class="rc-lead"></span>
				<span class="rc-gb k-{it.kind}">{it.kind}</span>
			</div>
		{/each}
		<div class="rc-eq">================================</div>
		<div class="rc-kv rc-total"><span>합 계</span><b class="rc-grade">「{rcGrade}」</b></div>
		<div class="rc-kv rc-vat">
			<span>부가세</span><span class="rc-lead"></span><b>회피 {rcCnt('회피')} · 감수 {rcCnt('감수')}</b>
		</div>
		<div class="rc-kv"><span>결제수단</span><b>인생 · 일시불</b></div>
		{#if rank && rank.sample >= MIN_RANK_SAMPLE && !result?.indecisive && !result?.adaptive}
			<div class="rc-kv"><span>버틴 자</span><b>상위 {rank.percentile}%</b></div>
		{/if}
		<div class="rc-eq">================================</div>
		<div class="rc-fine">* 감수한 인생은 교환·환불 불가 *</div>
		<div class="rc-barcode"></div>
		<div class="rc-thanks">☺ 감 사 합 니 다</div>
		<div class="rc-url">codeinsight.online</div>
	</div>
{/snippet}

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
		{#each Array(rounds) as _, i (i)}
			<span class="dot" class:filled={i < choices.length}></span>
		{/each}
	</div>

	<!-- 새 픽셀 레이아웃(화면만): ① 편 이름 a vs b ② 현재 조건 하나 ③ 편별 바구니(PC 좌우·모바일 세로) -->
	<div class="names">
		<button class="ncard a" class:active={activeSide === 0} onclick={() => pick(0)}>
			<span class="emoji"><Icon value={deck.a.emoji} /></span> <span class="nm">{deck.a.name}</span>
		</button>
		<span class="vs">VS</span>
		<button class="ncard b" class:active={activeSide === 1} onclick={() => pick(1)}>
			<span class="emoji"><Icon value={deck.b.emoji} /></span> <span class="nm">{deck.b.name}</span>
		</button>
	</div>

	<div class="cond-bar" class:a={activeSide === 0} class:b={activeSide === 1}>
		{#if pending}
			<span class="gr">그런데 이제</span> {pending.text}.{#if pending.merit}
				<span class="gr">하지만</span> <span class="merit-in">{pending.merit}</span>.{/if}
			<span class="dlg" aria-hidden="true">▼</span>
		{:else}
			<span class="cond-empty">위에서 한쪽을 골라 시작하세요. 그 편에 조건이 하나씩 붙어요.</span>
		{/if}
	</div>

	<div class="baskets">
		{#each order as si (si)}
			{@const s = si === 0 ? deck.a : deck.b}
			<div class="sbox {si === 0 ? 'a' : 'b'}">
				<div class="sbox-h"><span class="emoji"><Icon value={s.emoji} /></span> {s.name}</div>
				<div class="grp mer">
					<div class="grp-h">🎁 이득 <b>{endured[si].filter((p) => p.merit).length}</b></div>
					<div class="chips">
						{#each endured[si].filter((p) => p.merit) as p (p.strength)}
							<span class="chip">{shortTag(p, 'm')}</span>
						{:else}
							<span class="none">—</span>
						{/each}
					</div>
				</div>
				<div class="grp pen">
					<div class="grp-h">💢 감수 <b>{endured[si].length}</b></div>
					<div class="chips">
						{#each endured[si] as p (p.strength)}
							<span class="chip">{shortTag(p, 'p')}</span>
						{:else}
							<span class="none">—</span>
						{/each}
					</div>
				</div>
			</div>
		{/each}
	</div>
{:else if result && prefSide && burnedSide}
	<!-- 결과 카드: 버틴 깊이 대조(A-5). 플레이 중 숨긴 분석을 여기서 공개. -->
	<div class="result card">
		{@render resultReceipt()}

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
							<span class="ps-bar-fill" style="width:{(result.holdMax[si] / rounds) * 100}%"></span>
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
							<li>그런데 이제 {p.text}.{#if p.merit} 하지만 {p.merit}.{/if}</li>
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
		{@render resultReceipt()}
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

	.emoji {
		font-size: 1.1em;
	}
	/* v3 인라인 메리트: 조건에 결합된 "하지만 ~" 부분을 초록 톤으로 구분. */
	.merit-in {
		color: var(--merit);
		font-weight: 600;
	}
	/* "그런데 이제" 반복은 작게·연하게 두고 조건 문구를 앞세운다. */
	.gr {
		font-size: 11px;
		color: var(--muted);
		font-weight: 600;
	}

	.result {
		max-width: 480px;
		margin: 12px auto;
		padding: 24px;
		text-align: center;
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

	/* ───────── 공유 이미지 카드(폭 1080px, 높이는 영수증에 맞춤) ─────────
	   화면 밖(left:-20000px)에 실제 렌더돼 있고, html-to-image가 이 노드를 PNG로 캡처.
	   공유 이미지는 사용자 테마와 무관하게 항상 밝은 톤으로 보이도록 색을 고정한다.
	   renderCardPng가 캡처 직전 영수증을 폭에 꽉 맞춰 키우고 프레임 높이를 영수증에 맞춘다. */
	.ig-card {
		position: fixed;
		left: -20000px;
		top: 0;
		width: 1080px;
		height: 1920px;
		background: #ffffff; /* 배경색 제거 — 영수증이 프레임을 꽉 채움 */
		overflow: hidden;
	}
	.ig-card :global(.rcpt) {
		position: absolute;
		left: 50%;
		top: 0; /* 최상단부터 — 위쪽 여백 없음 */
		transform-origin: top center;
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
	/* ── 결과 영수증(감수·회피) — 화면·PNG 공용 ── */
	.rcpt {
		width: 330px;
		box-sizing: border-box;
		margin: 0 auto;
		background: #f7f6f2;
		color: #22201c;
		font-family: 'Galmuri11', ui-monospace, 'Courier New', monospace;
		font-size: 12px;
		line-height: 1.5;
		padding: 24px 22px;
		box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18);
		--z: 12px;
		-webkit-mask:
			conic-gradient(from -45deg at bottom, #0000, #000 1deg 89deg, #0000 90deg) 0 100% / var(--z)
				var(--z) repeat-x,
			conic-gradient(from 135deg at top, #0000, #000 1deg 89deg, #0000 90deg) 0 0 / var(--z) var(--z)
				repeat-x,
			linear-gradient(#000 0 0) 0 50% / 100% calc(100% - 2 * var(--z)) no-repeat;
		mask:
			conic-gradient(from -45deg at bottom, #0000, #000 1deg 89deg, #0000 90deg) 0 100% / var(--z)
				var(--z) repeat-x,
			conic-gradient(from 135deg at top, #0000, #000 1deg 89deg, #0000 90deg) 0 0 / var(--z) var(--z)
				repeat-x,
			linear-gradient(#000 0 0) 0 50% / 100% calc(100% - 2 * var(--z)) no-repeat;
	}
	.rc-store {
		text-align: center;
		font-size: 20px;
		font-weight: 800;
		letter-spacing: 1px;
	}
	.rc-kind {
		text-align: center;
		font-size: 14px;
		font-weight: 700;
		letter-spacing: 1px;
		margin-top: 4px;
	}
	.rc-info {
		text-align: center;
		font-size: 11px;
		color: #555;
	}
	.rc-dash,
	.rc-eq {
		text-align: center;
		color: #888;
		font-size: 11px;
		letter-spacing: -0.5px;
		overflow: hidden;
		white-space: nowrap;
		margin: 4px 0;
	}
	.rc-eq {
		color: #333;
	}
	.rc-row {
		display: flex;
		justify-content: space-between;
		gap: 8px;
		padding: 3px 2px;
		align-items: baseline;
	}
	.rc-row.avoid {
		background: #fbeeec;
	}
	.rc-cant {
		color: #c0392b;
		font-weight: 800;
		white-space: nowrap;
	}
	.rc-head {
		font-weight: 800;
		color: #555;
		font-size: 11px;
	}
	.rc-nm {
		flex: 1;
		min-width: 0;
	}
	/* 품목 행: 왼쪽 정렬 + 회색 점선 리더 후 감수/회피 */
	.rc-item .rc-nm {
		flex: 0 1 auto;
		text-align: left;
	}
	.rc-gb {
		flex: none;
		text-align: right;
		font-weight: 800;
		white-space: nowrap;
	}
	.k-감수 {
		color: #1a7f4b;
	}
	.k-회피 {
		color: #c0392b;
	}
	.rc-sum {
		text-align: center;
		font-weight: 800;
		font-size: 12px;
		white-space: nowrap;
	}
	.rc-kv {
		display: flex;
		justify-content: space-between;
		gap: 10px;
		font-size: 12px;
	}
	.rc-kv span {
		color: #666;
		white-space: nowrap;
	}
	.rc-kv b {
		text-align: right;
		white-space: nowrap;
	}
	.rc-total {
		font-size: 15px;
		font-weight: 800;
		margin: 6px 0;
		white-space: nowrap;
		background: #a3a3a3;
		color: #fff;
		padding: 5px 12px;
		border-radius: 3px;
	}
	.rc-total span {
		color: #fff;
	}
	.rc-total b {
		font-size: 15px;
		color: #fff;
	}
	.rc-vat {
		align-items: flex-end;
	}
	.rc-lead {
		flex: 1;
		min-width: 14px;
		border-bottom: 1.5px dotted #b0b0b0;
		margin: 0 6px 4px;
	}
	.rc-grade {
		font-family: 'Pretendard', -apple-system, system-ui, sans-serif;
		font-size: 12px;
		font-weight: 800;
		letter-spacing: -0.2px;
		white-space: normal;
		text-align: right;
	}
	.rc-fine {
		text-align: center;
		font-size: 11px;
		color: #555;
		margin-top: 2px;
	}
	.rc-barcode {
		height: 46px;
		margin: 12px 6px 4px;
		background-image: repeating-linear-gradient(
			90deg,
			#1a1a1a 0 1.5px,
			#f7f6f2 1.5px 3px,
			#1a1a1a 3px 6px,
			#f7f6f2 6px 7.5px,
			#1a1a1a 7.5px 8.5px,
			#f7f6f2 8.5px 11px,
			#1a1a1a 11px 13px,
			#f7f6f2 13px 14px
		);
		background-size: 14px 100%;
		background-repeat: repeat-x;
	}
	.rc-thanks {
		text-align: center;
		font-size: 13px;
		font-weight: 700;
		margin-top: 10px;
	}
	.rc-url {
		text-align: center;
		font-size: 11px;
		color: #555;
	}
	/* ═══ 새 픽셀 플레이 레이아웃(편 이름·현재 조건·편별 바구니). 게임 로직 무관, 화면만. ═══ */
	.names {
		display: flex;
		align-items: stretch;
		gap: 8px;
		max-width: 640px;
		margin: 0 auto 10px;
	}
	.ncard {
		flex: 1 1 0;
		min-width: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		font: inherit;
		font-weight: 800;
		font-size: 16px;
		color: var(--ink);
		background: var(--surface);
		padding: 14px 10px;
		border: 3px solid var(--line);
		box-shadow: var(--shadow);
		cursor: pointer;
		transition:
			transform 0.05s steps(2),
			box-shadow 0.05s steps(2);
	}
	.ncard .nm {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.ncard.a {
		background: var(--side-a);
	}
	.ncard.b {
		background: var(--side-b);
	}
	.ncard:active {
		transform: translate(3px, 3px);
		box-shadow: 1px 1px 0 var(--shadow-color);
	}
	.ncard.active {
		border-color: var(--gold);
		box-shadow: 4px 4px 0 var(--gold);
	}
	.vs {
		align-self: center;
		font-weight: 800;
		font-size: 13px;
		color: #fff;
		background: var(--danger);
		border: 3px solid var(--line);
		padding: 2px 8px;
		box-shadow: 2px 2px 0 var(--shadow-color);
	}
	.cond-bar {
		position: relative;
		max-width: 640px;
		margin: 0 auto 16px;
		font-size: 14.5px;
		line-height: 1.55;
		font-weight: 700;
		background: var(--cond-hl);
		color: #211f3d;
		padding: 14px;
		border: 3px solid var(--line);
		box-shadow: var(--shadow);
		min-height: 82px;
		background-image: repeating-linear-gradient(
			0deg,
			#0000 0 3px,
			rgba(33, 31, 61, 0.04) 3px 4px
		);
	}
	.cond-bar .gr {
		color: #7a6f3a;
	}
	.cond-bar .merit-in {
		color: #1b6e3f;
		font-weight: 700;
	}
	.cond-bar .dlg {
		position: absolute;
		right: 10px;
		bottom: 6px;
		color: #b58a00;
		animation: condblink 1s steps(2) infinite;
	}
	@keyframes condblink {
		50% {
			opacity: 0;
		}
	}
	.cond-empty {
		font-weight: 400;
		font-size: 13px;
		color: #8a7f4a;
	}
	.baskets {
		display: flex;
		gap: 10px;
		max-width: 640px;
		margin: 0 auto;
	}
	.sbox {
		flex: 1 1 0;
		min-width: 0;
		background: var(--surface);
		border: 3px solid var(--line);
		box-shadow: var(--shadow);
	}
	.sbox-h {
		font-weight: 800;
		font-size: 13.5px;
		padding: 8px 10px;
		border-bottom: 2px dashed var(--soft);
		display: flex;
		align-items: center;
		gap: 5px;
	}
	/* 1행(헤더)을 그 편 이름카드와 같은 색으로 채움 */
	.sbox.a .sbox-h {
		background: var(--side-a);
	}
	.sbox.b .sbox-h {
		background: var(--side-b);
	}
	.grp {
		padding: 8px 10px;
	}
	.grp.mer {
		border-bottom: 2px dashed var(--soft);
	}
	.grp-h {
		font-size: 11.5px;
		font-weight: 700;
		margin-bottom: 6px;
	}
	.grp-h b {
		font-size: 11px;
		color: #fff;
		padding: 0 6px;
		border: 2px solid var(--line);
	}
	.grp.mer .grp-h b {
		background: var(--merit);
	}
	.grp.pen .grp-h b {
		background: var(--penalty);
	}
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 5px;
	}
	.chip {
		font-size: 11.5px;
		font-weight: 700;
		padding: 3px 8px;
		border: 2px solid var(--line);
	}
	.grp.mer .chip {
		background: var(--merit-soft);
		color: var(--merit-ink);
	}
	.grp.pen .chip {
		background: var(--penalty-soft);
		color: var(--penalty-ink);
	}
	.none {
		font-size: 11px;
		color: var(--muted);
	}
	/* 모바일: 편별 바구니 세로 스택 / PC: 좌우 나란히(기본 flex row) */
	@media (max-width: 640px) {
		.baskets {
			flex-direction: column;
		}
		.cond-bar {
			font-size: 13.5px;
		}
		.ncard {
			font-size: 13px;
			padding: 10px 8px;
		}
		.ncard .nm {
			white-space: normal;
		}
	}
</style>
