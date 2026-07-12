<!--
	[프로토] 게임 카드 재설계 후보 비교. localhost:5173/proto/cards
	카드 = 조건명 + 현재 문장 1개(고정 크기, 누적돼도 안 늘어남).
	카드 밑 바구니 2개(왼=감수한 페널티, 오=감수한 메리트, 짧은 키워드).
	후보 1 = 리스트형 / 후보 2 = 채워지는 바구니(칩). 로직 동일, 시각만 다름.
-->
<script lang="ts">
	import Board from './Board.svelte';
	import { getDeck } from '$lib/game/decks';

	// 6판짜리 가변 덱으로 시연(문장 짧아 카드 크기 감 잡기 좋음).
	const deck = getDeck('tomato-vomit')!;

	// 바구니 칩용 짧은 태그(프로토 로컬). 강도 2~6 순(idx 0~4). p=페널티, m=메리트.
	// ⚠️ 디자인 확정 시 덱 데이터(Penalty.short/meritShort)로 이관.
	const shorts = {
		a: [
			{ p: '인상 쓰면 벌금 만원', m: '한 입당 수고비 만원' },
			{ p: '다이어트 이것만', m: '노력 없이 살 빠짐' },
			{ p: '소개팅마다 강제 주문', m: '소개팅 무조건 성공' },
			{ p: '온 동네 유명해짐', m: '인플루언서 협찬' },
			{ p: '명절 가족상 강제', m: '부모님 건강↑' }
		],
		b: [
			{ p: '냄새 24시간 뱀', m: '나만의 아로마·숙면' },
			{ p: '위장 상함·병원비', m: '광고비 월 40만원' },
			{ p: '소개팅 상대 도망', m: '혼자 최고의 만찬' },
			{ p: "평생 '토 먹는 사람'", m: '미식 브랜드 러브콜' },
			{ p: "묘비까지 '토 먹은 사람'", m: '평생 미쉐린 3스타' }
		]
	};
</script>

<div class="proto-wrap">
	<h1>게임 카드 재설계 — 후보 2개</h1>
	<p class="sub">
		덱: <b>{deck.title}</b><br />
		카드 = <b>조건명 + 현재 문장 1개</b>(크기 고정, 판 넘어가면 문장만 교체) · 바구니 =
		<b>감수(그 편 유지)한 것만</b> 짧게 모음(왼 페널티 · 오 메리트). 갈아타면(회피) 안 담김.
	</p>
	<p class="how">카드를 눌러 플레이 → 같은 편 계속 누르면 그 편 바구니가 채워지고, 반대편 누르면 갈아탐.</p>

	<section>
		<h2>후보 1 · 리스트형 바구니</h2>
		<Board {deck} {shorts} variant={1} />
	</section>

	<hr />

	<section>
		<h2>후보 2 · 채워지는 바구니(칩)</h2>
		<Board {deck} {shorts} variant={2} />
	</section>

	<hr />

	<section>
		<h2>후보 3 · 밸런스 저울 ⚖️ (참은 것 vs 얻은 것)</h2>
		<Board {deck} {shorts} variant={3} />
	</section>

	<hr />

	<section>
		<h2>후보 4 · 감정 아이템 태그 (💢 참은 것 · 💎 얻은 것)</h2>
		<Board {deck} {shorts} variant={4} />
	</section>
</div>

<style>
	/* 게임 폰트(Galmuri)·색은 body/app.css에서 상속 — 커스텀 폰트 지정 안 함. */
	.proto-wrap {
		max-width: 680px;
		margin: 0 auto;
		padding: 24px 16px 80px;
		color: var(--ink);
	}
	h1 {
		font-size: 20px;
		font-weight: 700;
		margin: 0 0 8px;
	}
	.sub {
		font-size: 13px;
		line-height: 1.6;
		color: var(--muted);
		margin: 0 0 6px;
	}
	.how {
		font-size: 12px;
		color: var(--muted);
		margin: 0 0 22px;
	}
	section {
		margin: 8px 0;
	}
	h2 {
		font-size: 15px;
		font-weight: 700;
		margin: 0 0 12px;
		padding-bottom: 6px;
		border-bottom: 3px solid var(--line);
	}
	hr {
		border: 0;
		border-top: 3px dashed var(--soft);
		margin: 34px 0;
	}
</style>
