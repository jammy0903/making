# 유형 기반 게임 전환 · 체크리스트 (2026-07-10)

> `docs/game-topic-types.md`(v2)를 실제 코드에 이식하는 로드맵.
> 목표 = **"단일 스타일 게임" → "유형(DeckType) 태그가 문체·결과 프레이밍·UI를 분기시키는 엔진".**
> 정본 스펙은 game-design.md(A~F), 유형 이론은 game-topic-types.md(v2). 이 문서는 그 위의 실행 계획.

## 0. 현재 코드 진단 (착수 전 기준선)

- `src/lib/game/decks.ts` — `Deck = {id,title,icon,a,b}`. **유형 태그 없음.** 문체 규칙(짧은 조건)이 주석에만 고정.
- `src/lib/game/engine.ts` — `computeResult`가 **현시선호 단일 로직**(score=비용가중 감수강도). `verdictLine`이 **취향/관용 프레이밍 하나**로 하드코딩.
- 유효성: 속성/인물/획득/가치형은 현재 결과 로직 재사용 가능. **상황형만 로직 충돌**(스위치=포기 가정 → 상황형은 재계산).

---

## Phase 0 · 유형 태그 인프라 ✅ 완료 (2026-07-10)

동작 변화 0, 분기의 토대만 놓는다.

- [x] `DeckType` 타입 정의 — `'attribute' | 'person' | 'scenario' | 'acquisition' | 'value'` (decks.ts)
- [x] `Deck` 인터페이스에 `type: DeckType` 추가 (+ optional `penaltyStyleOverride?: 'short' | 'long'`, §4 CLT 오버라이드)
- [x] 기존 2덱 태깅 — `summer-winter` = `attribute`, `marriage` = `person`
- [x] 유형별 config 맵 스켈레톤 — `TYPE_CONFIG[DeckType]` = { framing, penaltyStyle }. 값은 Phase 1~에서 소비
- [x] 테스트 — `decks.test.ts`(4): 모든 덱 유효 `type` / `TYPE_CONFIG` 5유형 전부 / 프레이밍·문체 필드
- [x] `pnpm test`(14) && `pnpm check`(0 err) && `pnpm build` 통과 → 커밋

## Phase 1 · 결과 프레이밍 유형 분기 ✅ 완료 (2026-07-10)

- [x] `verdictLine`을 `deck.type`별로 분기 — `FRAMING_VERDICTS[framing]`: 취향(속성)·관용(인물)·욕망(획득)·가치관(가치)·성향(상황, 잠정) (§9)
- [x] 헤드라인 꼬리도 프레이밍화 — `headlineTail(deck)`: "못 버리는 사람"/"견디고 사는 사람"/"원하는 사람"/"지키는 사람"/"밀어붙이는 타입"
- [x] 결과 카드 UI 문안 반영 — `g/[deck]/+page.svelte` 헤드라인이 `headlineTail(deck)` 사용
- [x] 테스트 — 속성=취향/인물=관용 verdict 분기, headlineTail 유형별 상이, 같은 시퀀스·다른 유형 문안 상이 (engine.test.ts +3)
- [x] `pnpm test`(17) && `pnpm check`(0) && `pnpm build` 통과 → 커밋
- 미해결(후속): `compareLine`의 "취향 갈렸네"는 아직 preference 고정 문구 — B-1 비교 페이지 다국어/프레이밍 손볼 때 함께.

## Phase 2 · 획득형 덱 추가 ✅ 완료 (2026-07-10)

- [x] 초능력 `비행 vs 순간이동` 덱 — `id: superpower`, `type: acquisition`, 부작용형 ≤20자(§2 유형4, §5-3)
- [x] §5-2 페널티 독립성 검증 — 10장 동시 성립(저고도·저속으로 하루종일 떠 있는 세계 / 짧은 거리·저정밀 순간이동)
- [x] §6-3 바이럴 변수 — 논쟁성·정체성표현력·유머·비교욕구 4개 "상"(일상공감도만 "하", 판타지) → 진행
- [x] `decks.ts` 반영. **Supabase `seed.sql`은 보류** — 이미 stale(구 문구) + `type` 컬럼 없어 스키마 마이그레이션 별도 필요. 앱은 decks.ts 사용
- [x] 결과 프레이밍 = 욕망 — 헤드라인 "원하는 사람", verdict "끝까지 비행을 원한 사람." 브라우저 확인
- [x] 브라우저 검증(localhost:5173): 홈 노출·페널티 렌더·조건접힘·완주 결과 확인 → 커밋
- [x] **추가 요청 반영**: 카드 위·아래 위치 **고정**(자문 A-2 스크램블 철회). `+page.svelte`의 `DISPLAY_ORDER` 제거, `order = [0,1]` 고정

## Phase 3 · 상황형 결과 로직 재설계 ✅ 완료 (2026-07-10)

- [x] `computeResult` 상황형 경로 — `ResultMode`(preference|strategy) 도입. 스위치를 "포기"가 아닌 "전략 재계산"으로 재해석. `indecisive`(preference)와 `adaptive`(strategy) 분리
- [x] 결과 프레이밍 = 전략 스타일 — `strategyVerdict`: 스위치 0="우직한 타입"/소수="실속 타입"/다수="적응형". UI에 adaptive 헤드라인 분기, 상위 N% 배지는 adaptive 시 숨김
- [x] 상황형 덱 `zombie`(도망 vs 싸움) — 문체 ≤25자. 문구는 **뇌절 톤(병맛·gross)** 으로(§idea-bank), 외부사건 금지·좌우 대칭 유지
- [x] 테스트 — 오실레이션(스위치 9)이 상황형에선 indecisive 아님·adaptive임 검증(engine.test +3)
- [x] `pnpm test`(23) && `pnpm check`(0) && `pnpm build` 통과 → 커밋·푸시(b838dda)

## Phase 4 · UI 레이아웃 유형 분기 (문체 길이 대응) ✅ 완료 (2026-07-10)

- [x] `penaltyStyleOf(deck)` 리졸버 신설 — `penaltyStyleOverride ?? TYPE_CONFIG[type].penaltyStyle`. 지금까지 정의만 되고 안 쓰이던 필드를 실제 소비
- [x] 카드 레이아웃 차등 — `.board.long`(인물형) = 문단형(줄간격 1.6·여백↑·14.5px), 짧은 조건형(속성/상황/획득/가치)은 기존 punchy 유지
- [x] `penaltyStyleOverride` 반영 — 리졸버 경유로 덱별 오버라이드가 UI까지 전달
- [x] 테스트 — 리졸버 오버라이드 우선·유형 기본값(decks.test +2)
- [ ] 문구 길이 가이드(§5-3) 린트/가드 — **보류(선택)**. 현재는 상황형 ≤25자 테스트만 존재
- [x] `pnpm test`(25) && `pnpm check`(0) && `pnpm build` 통과

## 상시 · 신규 덱 콘텐츠 파이프라인 (§10-③)

새 덱 만들 때마다: ① 유형 판별 → ② CLT 오버라이드 판단 → ③ 바이럴 변수 3+상 → ④ 페널티 독립성 → ⑤ 결과 프레이밍 결정.

---

## 의존성 / 순서 근거

- Phase 0 → 1 → 2는 **결과 로직을 안 건드림**(현시선호 재사용) → 저위험, 빠르게.
- Phase 3(상황형)만 `computeResult` 수술 → Phase 0~2 이후로 격리.
- Phase 4(UI)는 콘텐츠가 쌓인 뒤 착수해도 무방.
