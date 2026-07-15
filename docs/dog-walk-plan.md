# 걸어다니는 강아지 광고 바 — 재건 계획서

> 화면 하단을 강아지가 좌→우로 걸어다니다 클릭하면 지정 사이트로 이동하는 "하우스 광고".
> 과거 피벗(새끼동물 월드컵 시절)에 `WalkingDog.svelte`로 존재했고, 현재 앱(memedics / 밈 레이더)에
> **재이식**한다. 이 문서는 실측한 히스토리 자산과 현재 스택 차이를 바탕으로 한 실행 계획이다.

## 0. 실측 근거 (2026-07-16 조사 완료)

- **원본 컴포넌트 존재**: `src/lib/components/WalkingDog.svelte` (커밋 `a6411aa` 시점). Svelte 5 룬(`$state`/`$derived`) + TS + i18n.
- **에셋 회수 가능**: 강아지 webp **30장**이 커밋 `e7815b9`에 있음 —
  `static/ads/dogs/{golden,corgi,sesame,poodle,chihuahua,chow}-{walk1,walk2,walk3,walk4,rest}.webp`.
- **스택 동일**: 현재도 SvelteKit + Svelte 5 룬 + Vite 8. → 로직 거의 그대로 이식 가능.
- **유일한 차이 — i18n 없음**: 현재 `+layout.svelte`는 `useT`/`$lib/i18n`를 안 쓰고 한국어 문자열을 직접 박음.
  → 포팅 시 `t('ad.dogWalk')` 제거하고 한국어 리터럴로 대체.
- **마운트 지점**: `src/routes/+layout.svelte` — 과거엔 `{@render children()}` 뒤 `<WalkingDog />` 배치.

## 1. 동작 사양 (원본 그대로 유지)

- 하단에서 강아지가 **좌→우 이동**(70px/초). 걷기 프레임 walk1~4를 140ms마다 순환해 다리 애니메이션.
- 9초 후부터 가끔 **멈춰 쉼**(rest 프레임, 1.5~3.2초) → 다시 걸음(다음 휴식 8~14초 뒤).
- 화면 오른쪽 끝을 벗어나면 **왼쪽에서 새 품종으로 재등장**(6품종 랜덤 순환).
- `setInterval`(60ms) + 실경과시간(dt) 기반 → 탭 비활성 시 큰 점프 방지, 프레임레이트 무관 일정 속도.
- **클릭 = 지정 URL 새 탭**(`target=_blank rel=noopener`).
- 레인은 `pointer-events:none`로 화면을 덮되 **강아지 본체만 클릭 가능**(뒤 콘텐츠 클릭 방해 없음).
- 접근성: `prefers-reduced-motion` 시 전환 정지, 레인 `aria-hidden`.

## 2. 결정 확정 (2026-07-16) ✅

| # | 항목 | 결정 |
|---|---|---|
| D1 | 클릭 목적지 URL | **같은 강아지 크롬확장** — 기존 웹스토어 URL 그대로 재사용 |
| D2 | 바(bar) 형태 | **투명 레인**(과거 방식) — 배경 스트립 없이 강아지만 걸어다님 |
| D3 | 표시 범위 | 전 페이지(원본 동일) |
| D4 | 확장 중복 숨김 | **유지** — 확장을 계속 쓰므로 `html.dog-walk-ext-installed` 숨김 CSS 유지 |

## ✅ 구현 완료 (2026-07-16)

- 에셋 30장 복원(`git checkout e7815b9 -- static/ads/dogs/`, 1.7MB) — 코드 참조 경로와 30/30 일치 확인
- `src/lib/components/WalkingDog.svelte` 이식(원본 로직 그대로, i18n 제거·URL 재사용·확장 숨김 유지)
- `+layout.svelte` footer 뒤에 `<WalkingDog />` 마운트
- 검증: `npm run build` 통과(컴파일·임포트·번들 포함), 에셋 경로 대조 통과
- ⚠️ 육안 애니메이션(걷기·휴식·재등장·클릭 이동)은 배포/미리보기에서 최종 확인 권장 — 원본 검증 로직의 충실 복원이라 회귀 위험 낮음

## 3. 구현 단계

1. **에셋 회수**: `git checkout e7815b9 -- static/ads/dogs/` (30장 복원). 용량·표시 확인.
2. **컴포넌트 이식**: `src/lib/components/WalkingDog.svelte` 생성 — 원본 로직 복사 후
   - i18n 제거(`t('ad.dogWalk')` → `'강아지 산책'` 등 리터럴)
   - `AD_URL`을 D1 결정값으로
   - D4 결정 따라 `html.dog-walk-ext-installed` 숨김 CSS 유지/제거
3. **바 형태(D2)**: (b) 선택 시 `.walk-lane`에 배경 스트립 스타일 추가(높이·배경·상단 라인) + 본문 하단 여백 확보.
4. **마운트**: `+layout.svelte`의 footer 앞(또는 `{@render children()}` 뒤)에 `<WalkingDog />` + import.
5. **검증**: dev 서버에서 강아지 이동·프레임·휴식·재등장·클릭 이동 육안 확인. 모바일 폭에서 겹침·가림 점검.
6. 커밋·푸시(습관대로).

## 4. 리스크·메모

- **z-index**: 현재 topbar/footer/모달과 충돌 없는 값 선택(원본 `z-index:6`). 상세페이지 하단 댓글창·버튼과 겹치지 않는지 확인.
- **성능**: setInterval 60ms 단일 타이머라 부담 적음. `will-change: transform`로 GPU 합성.
- **모바일**: 강아지 108px가 작은 화면에서 콘텐츠를 가릴 수 있음 → 필요 시 폭 축소 or 모바일 숨김 고려.
- **광고 정책**: 실제 외부 광고를 바에 넣을 경우(D2-b) 개인정보/약관 페이지 문구와 애드센스 정책 정합성 별도 점검.
