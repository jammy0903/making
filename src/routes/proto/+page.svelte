<!--
	[임시 프로토타입] 결과 카드 = "진짜 영수증"처럼. 상단 그런데이제 · 감수·회피 영수증 고정.
	감열지 질감 + 사업자정보 + 구분선 + 항목표(강도·구분) + 바코드 + 톱니 절취 edge.
	인스타 규격(9:16/4:5/1:1) 프레임에 scale-to-fit. localhost:5173/proto.
-->
<script lang="ts">
	const s = {
		title: '월 200 백수 vs 월 천 직장인',
		side: '월 200 백수',
		rankPct: 31,
		label: '한 번 흔들렸다 돌아온 소신파',
		log: [
			{ s: 2, t: '카톡 상메 "취준중" 10년째', kind: '감수' },
			{ s: 3, t: '축의금 5만원 궁상', kind: '감수' },
			{ s: 4, t: '점심 10분컷', kind: '회피' },
			{ s: 5, t: '칼퇴 5분 전 야근', kind: '회피' },
			{ s: 6, t: '알바 면접만 보고 안 감', kind: '복귀' },
			{ s: 7, t: '조카 세뱃돈 파산', kind: '감수' },
			{ s: 8, t: '동창회 버스 시간표', kind: '감수' },
			{ s: 9, t: '건강보험료 고지서', kind: '감수' },
			{ s: 10, t: '통장 세 자릿수', kind: '감수' }
		]
	};
	const cnt = (k: string) => s.log.filter((l) => l.kind === k).length;
	// 은/는 조사 자동(받침 유무). 회피 항목 "…은/는 못해" 렌더용.
	function josa(w: string): string {
		const c = w.charCodeAt(w.length - 1);
		if (c < 0xac00 || c > 0xd7a3) return '은';
		return (c - 0xac00) % 28 === 0 ? '는' : '은';
	}

	function fit(node: HTMLElement) {
		const run = () => {
			const card = node.querySelector<HTMLElement>('.rcpt');
			if (!card) return;
			card.style.transform = 'none';
			const pad = 0.94;
			const sc = Math.min(
				(node.clientWidth * pad) / card.offsetWidth,
				(node.clientHeight * pad) / card.offsetHeight
			);
			card.style.transform = `translateX(-50%) scale(${sc})`;
		};
		run();
		const t = setTimeout(run, 350);
		return { destroy: () => clearTimeout(t) };
	}
</script>

<svelte:head><title>감수·회피 영수증 · proto</title></svelte:head>

{#snippet receipt()}
	<div class="rcpt">
		<div class="rc-store">그 런 데 이 제</div>
		<div class="rc-kind">감 수 · 회 피 영 수 증</div>
		<div class="rc-info">{s.title}</div>

		<div class="rc-eq">================================</div>
		<div class="rc-row rc-head"><span>품 목</span><span class="rc-gb">구분</span></div>
		<div class="rc-dash">- - - - - - - - - - - - - - - - -</div>
		{#each s.log as it (it.s)}
			<div class="rc-row" class:avoid={it.kind === '회피'} class:back={it.kind === '복귀'}>
				<span class="rc-nm"
					>{it.t}{#if it.kind === '회피'}<span class="rc-cant">{josa(it.t)} 못해</span>{/if}</span
				>
				<span class="rc-gb k-{it.kind}">{it.kind}</span>
			</div>
		{/each}
		<div class="rc-eq">================================</div>
		<div class="rc-sum">감수 {cnt('감수')} · 회피 {cnt('회피')} · 복귀 {cnt('복귀')}</div>
		<div class="rc-dash">- - - - - - - - - - - - - - - - -</div>
		<div class="rc-kv rc-total"><span>합 계</span><b>{s.side}</b></div>
		<div class="rc-kv rc-vat">
			<span>부가세</span>
			<span class="rc-lead"></span>
			<b class="rc-grade">「{s.label}」</b>
		</div>

		<div class="rc-eq">================================</div>
		<div class="rc-kv"><span>결제수단</span><b>인생 · 일시불</b></div>
		<div class="rc-kv"><span>승인번호</span><b>20260712-0031</b></div>
		<div class="rc-kv"><span>버틴 자</span><b>상위 {s.rankPct}%</b></div>
		<div class="rc-eq">================================</div>

		<div class="rc-fine">* 감수한 인생은 교환·환불 불가 *</div>
		<div class="rc-fine">* 재 발 행 불 가 *</div>

		<div class="rc-barcode"></div>
		<div class="rc-bnum">9 791234 567890</div>

		<div class="rc-thanks">☺ 감 사 합 니 다</div>
		<div class="rc-url">codeinsight.online</div>
	</div>
{/snippet}

<div class="stage">
	<h1>감수·회피 영수증 · 결과 카드 <small>9:16 스토리/릴스 고정 (1080 × 1920) · scale-to-fit</small></h1>
	<div class="frames">
		<figure>
			<figcaption>9:16 · 스토리/릴스 <span>1080 × 1920</span></figcaption>
			<div class="frame r916" use:fit>{@render receipt()}</div>
		</figure>
	</div>
</div>

<style>
	.stage {
		width: 100vw;
		position: relative;
		left: 50%;
		transform: translateX(-50%);
		box-sizing: border-box;
		padding: 24px 16px 60px;
		font-family: 'Pretendard', -apple-system, system-ui, sans-serif;
	}
	h1 {
		font-size: 20px;
		text-align: center;
		margin: 0 0 24px;
	}
	h1 small {
		display: block;
		font-size: 13px;
		color: #888;
		font-weight: 400;
		margin-top: 4px;
	}
	.frames {
		display: flex;
		gap: 40px;
		justify-content: center;
		align-items: flex-start;
		flex-wrap: wrap;
	}
	figure {
		margin: 0;
	}
	figcaption {
		text-align: center;
		font-size: 14px;
		font-weight: 800;
		color: #333;
		margin-bottom: 10px;
	}
	figcaption span {
		display: block;
		font-size: 11px;
		font-weight: 400;
		color: #999;
		margin-top: 2px;
	}
	.frame {
		position: relative;
		overflow: hidden;
		border-radius: 20px;
		background: linear-gradient(155deg, #7b6cff 0%, #6d5efc 45%, #4a3fd6 100%);
		box-shadow: 0 12px 30px rgba(74, 63, 214, 0.28);
	}
	.r916 {
		width: 360px;
		height: 640px;
	}
	.r45 {
		width: 360px;
		height: 450px;
	}
	.r11 {
		width: 420px;
		height: 420px;
	}
	.frame .rcpt {
		position: absolute;
		left: 50%;
		top: 4%;
		transform-origin: top center;
	}

	/* ── 진짜 영수증(감열지) ── */
	.rcpt {
		width: 330px;
		box-sizing: border-box;
		background: #f7f6f2;
		color: #22201c;
		font-family: 'Galmuri11', ui-monospace, 'Courier New', monospace;
		font-size: 12px;
		line-height: 1.5;
		padding: 24px 22px;
		box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18);
		/* 위·아래 톱니 절취 edge */
		--z: 12px;
		-webkit-mask:
			conic-gradient(from -45deg at bottom, #0000, #000 1deg 89deg, #0000 90deg) 0 100% / var(--z)
				var(--z) repeat-x,
			conic-gradient(from 135deg at top, #0000, #000 1deg 89deg, #0000 90deg) 0 0 / var(--z)
				var(--z) repeat-x,
			linear-gradient(#000 0 0) 0 50% / 100% calc(100% - 2 * var(--z)) no-repeat;
		mask:
			conic-gradient(from -45deg at bottom, #0000, #000 1deg 89deg, #0000 90deg) 0 100% / var(--z)
				var(--z) repeat-x,
			conic-gradient(from 135deg at top, #0000, #000 1deg 89deg, #0000 90deg) 0 0 / var(--z)
				var(--z) repeat-x,
			linear-gradient(#000 0 0) 0 50% / 100% calc(100% - 2 * var(--z)) no-repeat;
	}
	.rc-store {
		text-align: center;
		font-size: 20px;
		font-weight: 800;
		letter-spacing: 1px;
		font-family: 'Galmuri11', ui-monospace, monospace;
	}
	.rc-kind {
		text-align: center;
		font-size: 14px;
		font-weight: 700;
		letter-spacing: 1px;
		margin-top: 4px;
		font-family: 'Galmuri11', ui-monospace, monospace;
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
		margin: 7px 0;
	}
	.rc-eq {
		color: #333;
	}
	.rc-row {
		display: grid;
		grid-template-columns: 1fr auto;
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
	}
	.rc-row.back {
		background: #e6efe5;
	}
	.rc-head {
		font-weight: 800;
		color: #555;
		font-size: 11px;
	}
	.rc-nm {
		min-width: 0;
	}
	.rc-lv {
		text-align: center;
		color: #666;
	}
	.rc-gb {
		text-align: right;
		font-weight: 800;
	}
	.k-감수 {
		color: #1a7f4b;
	}
	.k-회피 {
		color: #c0392b;
	}
	.k-복귀 {
		color: #1d6fb8;
	}
	.k-완주 {
		color: #1a1a1a;
	}
	.k-시작 {
		color: #999;
	}
	.rc-sum {
		text-align: center;
		font-weight: 800;
		font-size: 12px;
	}
	.rc-kv {
		display: flex;
		justify-content: space-between;
		gap: 10px;
		font-size: 12px;
	}
	.rc-kv span {
		color: #666;
	}
	.rc-kv b {
		text-align: right;
	}
	.rc-grade {
		font-family: 'Pretendard', -apple-system, system-ui, sans-serif;
		font-size: 13.5px;
		font-weight: 800;
		letter-spacing: -0.2px;
	}
	.rc-total {
		font-size: 15px;
		font-weight: 800;
		margin: 2px 0;
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
	.rc-total b {
		font-size: 15px;
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
	.rc-bnum {
		text-align: center;
		font-size: 12px;
		letter-spacing: 3px;
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
</style>
