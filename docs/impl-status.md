# 구현 진행 상태 · 핸드오프 (그런데 이제)

> 다른 컴퓨터에서 이어서 작업하기 위한 현재 상태 + 다음 스텝. 최종 업데이트 2026-07-12(v3.1 가변 길이 계획 — 문서 반영, 코드 TODO §7.1).

## 0. 지금 어디까지

- **v2 밸런스게임 = 실제로 구현 완료** (랭킹게임 전면 삭제 후 신규). 홈(주제그리드+검색)·플레이 `g/[deck]`·결과카드+PNG+PDF증서·`?r=`공유·`?vs=`비교·Supabase 라이브(`record_play` RPC·상위N%·익명로그)·`/admin`·`/suggest` 전부 동작. `pnpm check && build` 통과.
- **유형(DeckType) 기반 엔진** — attribute/person/scenario/acquisition/value, TYPE_CONFIG로 문체·결과프레이밍·결과모드·UI 분기(type-system-plan Phase0~4 완료). **덱 10개**(뇌절·병맛·gross 톤 포함).
- **Supabase** 원격 `making` 스키마+시드 적용(단 앱은 `decks.ts` 하드코딩 사용, `seed.sql`은 stale). 시크릿=SOPS+age(`.env.enc`).
- **★2026-07-11: v3 방향 전환 결정** — [v3-pivot.md](./v3-pivot.md). 페널티-온리 → **페널티+메리트 결합(필수)**, 숫자 결과 → **캐릭터 카드**. 문서(game-design·deck-authoring·이 문서 §7·8)에 반영됨. **코드는 아직 v2 → v3 구현이 다음 할 일**(§7·§8).

## 1. 문서 지도

| 문서 | 역할 |
|---|---|
| `docs/game-design.md` | **정본 게임 스펙** (A 규칙 · B UX · C 콘텐츠 · D 결과·공유 · E 데이터 · F MVP) |
| `docs/balance-game-plan.md` | 피벗 근거·의사결정 히스토리 |
| `docs/consultation-2026-07.md` | 외부 자문 반영 · 개선 로드맵 체크리스트(A/B/C) |
| `docs/game-topic-types.md` | **주제 유형 분류 체계 v2**(속성/인물/상황/획득/가치) · CLT 기반 문체·에스컬레이션 전환 · 바이럴 변수·혼합·페널티 독립성 · 논문 근거 |
| `docs/type-system-plan.md` | **유형 기반 게임 전환 체크리스트**(Phase 0 태그 인프라 → 1 결과 프레이밍 → 2 획득형 → 3 상황형 로직 → 4 UI) |
| `docs/v3-pivot.md` | **★v3 방향 정본**(재미 3층 진단 · 메리트 결합 · 캐릭터 카드 · 유지/수정/폐기 · 로드맵) |
| `docs/deck-authoring-guide.md` | 덱 저작 가이드(v3 반영: 메리트 결합 필수 · 캐릭터 카드) |
| `docs/idea-bank.md` | 뇌절 소재 뱅크(원석 130+) |
| `docs/new-ai-prompt.md` | v3 원본 브리핑(다른 AI가 짠 실행 프롬프트) |
| `docs/impl-status.md` | (이 문서) 구현 진행·다음 스텝 |

## 2. 게임 핵심 (요약 · v3)

- 밸런스게임. 고른 쪽에만 조건 누적, 반대쪽 안 건드림, 리셋 없음. 강도 = 판 번호(1판 맨몸, 강도 2부터).
  - **✅ v3.1 가변 길이(2026-07-12, 코드 반영 완료)**: 10판 고정 → **판 수 5~10, 덱마다 자유**(조건 4~9개). 엔진(`roundsOf`·`extremeThreshold`·decode 5~10)·`decks.test.ts`(4~9 허용)·플레이/admin 화면·`savedResults` 모두 반영. 첫 가변 덱 `tomato-vomit`(6판) 추가·테스트 통과. 상세 §7.1.
- **★v3 조건 = 페널티+메리트 결합(필수)**: `그런데 이제 {페널티}. 근데 이제 {메리트}.` — 메리트가 있어야 판마다 저울질(엔트로피)이 생김. (v2 페널티-온리는 재확인 절차 돼 재미 0.)
- **플레이 중 메커니즘/계산 전부 숨김 → 끝에 결과 "짠".**
- **★v3 결과 = 캐릭터 카드**: 유형네이밍(명사구)+특이스탯(구체 숫자)+미래예언. 편당 극단/애매 2종. (선호편·버틴깊이는 카드 셀렉터로만.)
- 무-AI. 한국어 온리. 현재 덱 10개(v2, 메리트 결합으로 재저작 필요).

## 3. Supabase (원격 준비 완료)

- 프로젝트: **making** (ref `faofjruxrabdbtesrkub`, ap-northeast-2).
- 테이블: `public.decks`(콘텐츠, 공개읽기 RLS) · `public.plays`(익명 로그, 삽입만 RLS). 랭킹게임 스키마 11테이블+함수2 전면 폐기됨.
- 스키마 = `supabase/migrations/0001_init.sql`, 시드 = `supabase/seed.sql`(2덱, 각 9+9장 적용됨).
- **다른 컴터 셋업**: `.env`에 `PUBLIC_SUPABASE_URL`(=https://faofjruxrabdbtesrkub.supabase.co) + `PUBLIC_SUPABASE_ANON_KEY` 넣기(Supabase 대시보드에서 복사, git 커밋 금지).

## 4. 현재 코드베이스 (랭킹게임 삭제 후 클린 슬레이트)

랭킹게임 코드·자산·구 문서는 **삭제 완료**(§0). 밸런스게임은 아래 셸 위에 신규 구현한다.

**남은 셸 (전부 재활용)**:
- 빌드 셋업: SvelteKit+Vite+adapter-vercel+pnpm+vitest.
- `src/lib/i18n/` (엔진 + 로케일 파라미터·hooks). 현재 문구는 `app.title`·`nav.home`·`lang.label`만 — 밸런스게임 화면 만들며 키 추가.
- `src/routes/+layout.svelte` (헤더·언어전환·광고 슬롯·SEO 셸), `+error.svelte`, `sitemap.xml`.
- `src/routes/[[lang=locale]]/+page.*` = 홈 **플레이스홀더("준비 중")** → decks 그리드로 교체(§B-4).
- `src/lib/site.ts`(도메인), `params/locale.ts`, `hooks.server.ts`(호스트 정규화·로케일).
- 이미지 자산 `static/gen`·`static/ads`·`산출물` 보존.

**신규로 만들 것** (기존 코드 없음 — §5에서 상술):
- Supabase 클라이언트 연결 · 익명 세션 · decks 로드 어댑터.
- 게임 상태/엔진(선택배열·누적 페널티·스위치) · 2-카드 play UI · 결과 계산(§A-5).
- 결과 카드 + PNG 이미지화 · 10판 선택배열 공유 코덱 · plays 로그 저장.

## 5. v2 구현 체크리스트 (✅ 완료 — 이력)

아래 Phase 1~4는 v2 밸런스게임 초기 구현 계획으로, **전부 구현 완료**됨(§0). v3 할 일은 §7 참조.

**Phase 1 · 연결·골격** ✅ Supabase 클라이언트·익명 세션·decks 로드·홈 그리드
**Phase 2 · 게임 엔진** ✅ 게임 상태·2카드 play UI·강도=판번호·메커니즘 숨김·결과 계산(§A-5)
**Phase 3 · 결과·공유** ✅ 결과 카드·PNG·공유 코덱(`?r=`·`?vs=`)·plays 로그
**Phase 4 · 정리** ✅ 랭킹 코드 삭제·한국어 정리·`pnpm check && build` 통과

> ⚠️ Phase 2·3의 "버틴 깊이 대조 결과"는 **v3에서 캐릭터 카드로 교체 예정**(§7). 페널티-온리 조건도 **메리트 결합으로 재작성** 예정.

## 6. 열린 결정 (아직)

- 강도곡선 세부(§A-3 커브볼 배치) · 과한 연출 구체화(§B-3 후보) · 저작 도구(손저작→UGC) · 주제 확장.
- 외부 자문 반영 진행: A그룹(문장형 라벨·위치 랜덤화·조건 접힘·오실레이션 유형·1판 가중치) **구현 완료**.
  B그룹 전체(B-1 결과 비교 `?vs=` · B-2 상위 N% RPC · B-3 스위치 아까움 연출 · B-4 3막 강도 재배치 ·
  B-5 데이터 윤리) **구현 완료**. → `docs/consultation-2026-07.md`. (남은 C그룹은 보류 항목)
- Supabase 연동 라이브: `@supabase/supabase-js`, `src/lib/supabase.ts`, RPC `record_play`(migrations 0002).
  `.env`의 `PUBLIC_SUPABASE_*` 필요(로컬 채워짐). **Vercel 배포 시 동일 env 등록 필요.**

## 7. v3 전환 — 코드 영향 / 할 일 (2026-07-11)

방향 = [v3-pivot.md](./v3-pivot.md). 페널티-온리 → **페널티+메리트 결합(필수)**, 숫자 결과 → **캐릭터 카드**.
현재 구현(v2)과의 갭:

**① 조건 스키마 = 페널티에 메리트 결합**
- `src/lib/game/decks.ts` `Penalty {strength, text}` → **`merit` 필드 추가** (`{strength, text, merit}`), 필수.
- 렌더(`g/[deck]/+page.svelte`) `그런데 이제 {text}` → `그런데 이제 {text}. 근데 이제 {merit}.` — **고른 쪽(내 편)** 조건에 결합.
- ⚠️ 현재 `Side.merit`(편당 1개, **안 고른 쪽**에 상시 노출해 갈아타게 유혹)은 **v3와 다른 구조**. 결정 필요: (a) 폐기하고 per-페널티 merit로 일원화 / (b) 별개 장치로 병존. → v3-pivot은 (a) 지향.
- 기존 10덱은 페널티만 있음 → **전부 메리트 결합으로 재저작** 필요(또는 v3 신규 덱부터).

**② 결과 = 캐릭터 카드 생성기**
- 덱 스키마에 **편·결과별 캐릭터 카드 데이터** 추가: 각 편 {극단, 애매} × {유형네이밍, 특이스탯[], 미래예언}. → `decks.ts` 대폭 확장 or 별도 콘텐츠.
- `engine.ts` `computeResult`(선호편·`holdMax`·오실레이션)는 유지하되 **표면 문구(`verdictLine`·`headlineTail`) 대신 어느 카드(편·극단/애매)를 띄울지 고르는 셀렉터**로 재활용. 극단/애매 판정 = 버틴깊이 완주강도 임계(v3.0 고정 8+/5~7 → **v3.1은 덱 최대 강도 상대값**, §7.1).
- 결과 카드 UI(`+page.svelte`)·PNG·`?r=`·`?vs=` 비교를 캐릭터 카드 레이아웃(§D-2)으로 교체.
- 특이 스탯은 "실제 고른 조건과 연결" → 카드 저작 시 그 편 페널티 이미지에서 파생(무-AI 유지).

**③ 콘텐츠 파이프라인**: 새 덱은 [deck-authoring-guide §8~9](./deck-authoring-guide.md)(v3) 순서로 — 판 수 결정 → 페널티 N개 → 메리트 결합 → 5항목 체크 → 흡수검사 → 캐릭터 카드 4종 → 자체검증(엔트로피/저울질/캡처/발견).

**착수 순서(권장)**: 스키마(①`Penalty.merit`·②카드데이터) → 렌더/결과 UI → 신규 v3 덱 1개로 파일럿 검증(엔트로피·완주율·공유) → 기존 덱 마이그레이션.

## 7.1 v3.1 가변 길이 — ✅ 코드 반영 완료 (2026-07-12)

방향 = **판 수 5~10, 덱마다 자유**(조건 4~9개). 코드 반영 상태:

- **`engine.ts`** ✅ — `roundsOf(deck) = a.penalties.length + 1` / `extremeThreshold(deck) = roundsOf-1`(마지막 2단계 버팀=극단, `pickResultCard`가 사용) / `decodeChoices` 정규식 `/^[01]{5,10}$/`(덱 길이 일치는 플레이 화면이 검증). `ROUNDS=10`은 상한 폴백 상수로만 잔존.
- **`decks.test.ts`** ✅ — "페널티 4~9장 · 강도 2부터 연속 · 양편 동일"로 완화됨.
- **플레이 화면(`g/[deck]/+page.svelte`)** ✅ — `roundsOf(deck)` 기반 `rounds`로 `done`·렌더·게이지 처리, 공유 `?r=`/`?vs=` 길이 검증.
- **admin(`+page.svelte`)** ✅ — 조건 4~9개 편집 UI.
- **`savedResults.ts`** ✅ — `saveResult` 정규식 `/^[01]{10}$/` → `/^[01]{5,10}$/`로 수정(6판 결과 저장되게, 2026-07-12).
- **첫 가변 덱** ✅ — `tomato-vomit`(토맛 토마토 vs 토마토맛 토, **6판/5조건**) `decks.ts`에 추가, 테스트 32/32 통과.
  - ⚠️ **DB 미반영**: `decks.data`(정본)에는 아직 없음 → 라이브엔 안 뜸. 동기화 시 [[deck-db-sync-wipes-images]] 주의(커버 이미지 날림).
