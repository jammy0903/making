# 구현 진행 상태 · 핸드오프 (그런데 이제)

> 다른 컴퓨터에서 이어서 작업하기 위한 현재 상태 + 다음 스텝. 최종 업데이트 2026-07-10.

## 0. 지금 어디까지

- **설계 완료**: `docs/game-design.md` (정본 스펙 A~F) · `docs/balance-game-plan.md` (근거·역사).
- **Supabase 스키마 적용 완료** (원격 `making` 프로젝트) + MVP 2덱 시드 완료.
- **앱 코드 = 아직 랭킹게임 상태.** 밸런스게임으로 변형/폐기 작업이 다음 할 일.

## 1. 문서 지도

| 문서 | 역할 |
|---|---|
| `docs/game-design.md` | **정본 게임 스펙** (A 규칙 · B UX · C 콘텐츠 · D 결과·공유 · E 데이터 · F MVP) |
| `docs/balance-game-plan.md` | 피벗 근거·의사결정 히스토리 |
| `docs/impl-status.md` | (이 문서) 구현 진행·다음 스텝 |

## 2. 게임 핵심 (요약)

- 페널티-온리 밸런스게임 10판. 고른 쪽에만 `그런데 이제 ~해도` 누적, 반대쪽 안 건드림, 리셋 없음.
- 강도 = 판 번호(소프트 곡선). 1판 맨몸, 2~10판 페널티.
- **플레이 중 메커니즘/계산 전부 숨김 → 끝에 결과 "짠".**
- 결과 = 선호편(비용가중 감수 강도) + **버틴 깊이 대조**(카드 한 장 비난 금지, §A-5).
- MVP 2주제: `여름 vs 겨울` / `결혼: 얼굴천재 vs 개그천재`(아키타입). 무-AI. 한국어 온리.

## 3. Supabase (원격 준비 완료)

- 프로젝트: **making** (ref `faofjruxrabdbtesrkub`, ap-northeast-2).
- 테이블: `public.decks`(콘텐츠, 공개읽기 RLS) · `public.plays`(익명 로그, 삽입만 RLS). 랭킹게임 스키마 11테이블+함수2 전면 폐기됨.
- 스키마 = `supabase/migrations/0001_init.sql`, 시드 = `supabase/seed.sql`(2덱, 각 9+9장 적용됨).
- **다른 컴터 셋업**: `.env`에 `PUBLIC_SUPABASE_URL`(=https://faofjruxrabdbtesrkub.supabase.co) + `PUBLIC_SUPABASE_ANON_KEY` 넣기(Supabase 대시보드에서 복사, git 커밋 금지).

## 4. 코드 재활용/변형/폐기 맵 (기존 랭킹게임 → 밸런스게임)

**그대로 재활용**: SvelteKit+Vite+adapter-vercel+pnpm+vitest 셋업 · i18n 엔진(`src/lib/i18n/`) · 반응시간 `src/lib/ranking/hesitation.ts`(필드명만) · SEO(sitemap/hreflang) · 레이아웃 셸.

**손봐서 변형**:
- 공유 코덱 `src/lib/share/rankingCodec.ts` → 순열 대신 **10판 선택배열(0/1) 인코딩**(base64url 유틸·무상태 패턴 이식).
- `src/routes/[[lang=locale]]/t/[id]/play/+page.svelte`의 **2-카드 선택 UI** → "그런데 이제" 페널티-온리 10판.
- `src/lib/storage.ts` localStorage → Supabase 어댑터(주석에 이미 예고됨).
- 홈 라우트 → decks 그리드. i18n 메시지 내용 밸런스게임으로 교체(또는 한국어 온리 정리).

**버리고 새로 / 폐기**:
- PNG 결과카드(html2canvas 없음 → 의존성+구현 신규).
- Supabase 클라이언트 연결(현재 없음 → 신규).
- 폐기: `src/lib/ranking/eloRanker.ts`·`mergeRanker.ts`·`consistency.ts`·`types.ts` · `src/lib/stats/*` · `RankBoard.svelte`·`RankResult.svelte` · 후보 이미지 파이프라인(`ImageSearchModal`·`api/image*`·`server/bingImageSearch`·`server/hf`·`server/ssrf`·`scripts/*.mjs`) · 콘텐츠(`samples.ts`·`i18n/topics.ts`·`publicTopics.ts`·`static/gen/*`·`static/ads/dogs/*`).

## 5. 다음 스텝 체크리스트 (impl-todo)

한 항목씩, `pnpm check && pnpm build` 통과 후 커밋. (loop 하네스로도 사용 가능)

**Phase 1 · 연결·골격**
- [ ] `pnpm add @supabase/supabase-js` + `src/lib/supabase.ts` 클라이언트 + `.env`
- [ ] 익명 세션 id 유틸(localStorage에 uuid)
- [ ] `storage.ts` → Supabase 어댑터(decks 로드)
- [ ] 홈 라우트: decks 그리드(주제 선택, PIKU식)

**Phase 2 · 게임 엔진**
- [ ] 게임 상태 모델(선택배열·사이드별 누적 페널티·스위치) — 새 store/state
- [ ] play 화면: 2-카드 UI 변형, 강도=판번호 카드 append, **메커니즘 숨김**
- [ ] 결과 계산(§A-5): 선호편(비용가중 감수강도) + 완주강도 + 버틴 깊이 대조 문구

**Phase 3 · 결과·공유**
- [ ] 결과 카드 화면(§D-2 버틴 깊이 막대 레이아웃)
- [ ] PNG 이미지화(html2canvas 등 신규)
- [ ] 공유 URL 코덱 변형(10판 선택배열) + 결과 재현 라우트
- [ ] plays 로그 저장(익명, 표시는 안 함)

**Phase 4 · 정리**
- [ ] 폐기 코드/자산 삭제(§4 목록)
- [ ] i18n 정리(한국어 온리) · SEO 문구 갱신
- [ ] `pnpm check && build` 전체 통과

## 6. 열린 결정 (아직)

- 강도곡선 세부(§A-3 커브볼 배치) · 과한 연출 구체화(§B-3 후보) · 저작 도구(손저작→UGC) · 주제 확장.
