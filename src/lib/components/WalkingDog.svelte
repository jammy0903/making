<script lang="ts">
	// 화면 아래에서 강아지가 왼→오른쪽으로 걸어다니는 하우스 광고(dog-walk 크롬 확장).
	// 걷기 프레임(walk1~4)을 순환해 다리를 움직이고, 가끔 멈춰 쉬는(rest) 모습.
	// 한 바퀴 돌면 품종을 랜덤으로 바꿔 여러 강아지가 번갈아 나온다.
	import { onMount } from 'svelte';

	const AD_URL =
		'https://chromewebstore.google.com/detail/glciecgcibkmbkkllmhagignmmjghkmj'; // 강아지 산책 크롬 웹스토어
	const AD_LABEL = '강아지 산책 · 클릭';
	const BREEDS = ['golden', 'corgi', 'ig', 'poodle', 'chihuahua', 'chow']; // ig = 이탈리안그레이하운드
	const base = (b: string, f: string) => `/ads/dogs/${b}-${f}.webp`;

	const SPEED = 70; // px/초
	const FRAME_MS = 140; // 걷기 프레임 교체 간격
	const DOG_W = 108; // 강아지 폭(px) — 화면 밖 판정용

	// 시작 품종만 고정값(SSR 안전). 이후 브라우저에서 랜덤 교체.
	let breed = $state(BREEDS[0]);
	let frame = $state(0); // 0~3
	let resting = $state(false);
	let x = $state(-DOG_W);
	let hidden = $state(false); // 폰·태블릿(터치기기)에선 숨김

	const src = $derived(resting ? base(breed, 'rest') : base(breed, `walk${frame + 1}`));

	onMount(() => {
		// 폰·태블릿에선 강아지 숨김 — 크롬 확장은 모바일/태블릿 브라우저서 설치 불가라 광고가 무의미.
		// 기기감지: (hover:none)+(pointer:coarse)=터치 전용 기기(터치 노트북은 hover:hover라 제외) · UA · 모바일 크기.
		const touchOnly = matchMedia('(hover: none) and (pointer: coarse)').matches;
		const mobileUA = /Android|iPhone|iPod|iPad|Mobile|Tablet|Silk/i.test(navigator.userAgent);
		if (touchOnly || mobileUA || window.innerWidth <= 820) { hidden = true; return; } // 애니메이션도 안 돌림
		// requestAnimationFrame 대신 setInterval 사용: 탭이 숨겨져도(느리게나마) 계속 돈다.
		// dt 는 실제 경과시간으로 계산해 프레임레이트와 무관하게 일정 속도로 걷는다.
		let last = performance.now();
		let frameAcc = 0;
		let nextRestAt = 9000; // 첫 휴식까지(ms, 누적시간 기준)
		let restUntil = 0;
		let elapsed = 0;
		const rand = (a: number, b: number) => a + Math.random() * (b - a);

		function tick() {
			const now = performance.now();
			const dt = Math.min((now - last) / 1000, 0.1); // 비활성 복귀 시 큰 점프 방지
			last = now;
			elapsed += dt * 1000;

			if (resting) {
				if (elapsed >= restUntil) {
					resting = false;
					nextRestAt = elapsed + rand(8000, 14000);
				}
			} else {
				x += SPEED * dt;
				frameAcc += dt * 1000;
				if (frameAcc >= FRAME_MS) {
					frame = (frame + 1) % 4;
					frameAcc -= FRAME_MS;
				}
				// 화면 오른쪽 끝을 벗어나면 왼쪽에서 새 품종으로 다시 시작
				if (x > window.innerWidth + DOG_W) {
					x = -DOG_W;
					breed = BREEDS[Math.floor(Math.random() * BREEDS.length)];
				} else if (elapsed >= nextRestAt) {
					resting = true;
					restUntil = elapsed + rand(1500, 3200);
				}
			}
		}
		const id = setInterval(tick, 60);
		return () => clearInterval(id);
	});
</script>

{#if !hidden}
	<div class="walk-lane" aria-hidden="true">
		<a
			class="walk-dog"
			href={AD_URL}
			target="_blank"
			rel="noopener"
			title={AD_LABEL}
			style="transform: translateX({x}px)"
		>
			<img src={src} alt={AD_LABEL} />
		</a>
	</div>
{/if}

<style>
	/* 화면 하단 전체를 덮되 클릭은 통과(강아지 자신만 클릭 가능) */
	.walk-lane {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		height: 0;
		z-index: 6;
		pointer-events: none;
	}
	/* 모바일 크기 + 터치 전용 기기(폰·태블릿)에선 숨김 (JS 기기감지와 이중). 데스크톱(터치 노트북 포함)만 표시 */
	@media (max-width: 820px), (hover: none) and (pointer: coarse) {
		.walk-lane { display: none; }
	}
	.walk-dog {
		position: fixed;
		left: 0;
		bottom: 4px;
		width: 108px;
		pointer-events: auto;
		display: block;
		will-change: transform;
	}
	.walk-dog img {
		width: 100%;
		height: auto;
		display: block;
		image-rendering: auto; /* 사진이라 전역 pixelated 해제 */
		filter: drop-shadow(0 3px 2px rgba(0, 0, 0, 0.28));
	}
	/* 접근성: 모션 최소화 선호 시 정지(쉬는 모습으로) */
	@media (prefers-reduced-motion: reduce) {
		.walk-dog {
			transition: none;
		}
	}
	/* 확장 설치자에겐 하우스 광고 숨김: 이미 자기 강아지가 걸어다니므로 중복 방지.
	   확장 content script 가 document_start 에 <html> 에 이 클래스를 심는다. */
	:global(html.dog-walk-ext-installed) .walk-lane {
		display: none;
	}
</style>
