# SOLID 위반 · 코드 스멜 분석 보고서

> 작성일: 2026-07-09
> 대상: `making` 프로젝트 (SvelteKit, 월드컵 게임 앱)
> 범위: `src/` 전체 ~4,600줄 — 로직/서버 · 컴포넌트/라우트 · 데이터/i18n 3개 영역
> 방법: 실제 파일 직접 확인 기반. 헤드라인 항목은 재검증 완료.

---

## 진행 체크리스트

수정 진행 상황 (2026-07-09 착수):

- [x] **#4 SSRF 방어 실제 구현** — `src/lib/server/ssrf.ts` 신규(내부망 IP 차단 + DNS 해석), `image-proxy/+server.ts` 적용, `ssrf.test.ts` 16케이스 통과. `@types/node` devDependency 추가.
- [x] **#1 주제 데이터 3중 위치 결합** — `SampleTopic`에 `slug` 필드 추가(34개 주제에 삽입), `publicTopics.ts`의 `SLUGS` 위치결합 배열 제거하고 `s.slug` 직접 사용. 출력 불변 검증 완료(34개 slug 순서·id·후보id·3개 로케일 동일).
- [~] **#2 candidates[]↔images[] 인덱스 결합** — (Option 1 경량 처리) 로드 시 후보/이미지 개수 불일치를 `console.warn`으로 드러내는 안전장치 추가. 현재 데이터 경고 0 확인. 전면 `{name,image}` 객체화는 별도 작업으로 보류.
- [x] **#3 미사용 dragReorder + 드래그 이중 구현** — 커밋 `021f49d`에서 `dragReorder.ts` 삭제됨. 이중 구현 해소(RankBoard가 유일 구현). 남은 건 RankBoard 자체 명령형 드래그의 내부 개선뿐인데, 유일 소비자라 재사용 액션 추출은 YAGNI로 보류.
- [ ] #5 play 페이지 책임 과다
- [x] #6 RankMode 유령 값 — 커밋 `021f49d`에서 `'worldcup'` 제거, `RankMode = 'sort' | 'drag'`.
- [x] #7 home SEO 문구 i18n 우회 — `homeTitle`/`homeDesc` 하드코딩 제거, `home.seo.title`·`home.seo.description` 키를 3개 로케일 messages 에 추가하고 `t()`로 통합. `MessageKey`가 로케일 누락 방지. 출력 동등성 3개 로케일 바이트 동일 검증.
- [x] #8 messages 로케일별 중복 — `MessageKey` union 타입(ko 원천) + en/zh 키 누락 컴파일 검증(`_MissingKeys`) 추가. `translate`·`useT` 키 파라미터를 `MessageKey`로 좁힘. 오타·로케일 키 누락 둘 다 컴파일 타임 차단(음성 테스트로 실증). 27/27 테스트 통과.
- [~] #9 로케일 목록 하드코딩 — `splitLocale`·`pickLocale`이 `locales` 상수에서 유도하도록 변경(하드코딩 'en'/'zh' 제거). ⚠️ `index.ts`에 미커밋 상태로, 같은 파일의 #8(MessageKey) 작업과 섞여 있어 함께 커밋 필요.
- [x] #10 UA 문자열 중복 — 공용 `src/lib/server/http.ts`(`BROWSER_UA`) 신설, `bingImageSearch.ts`·`image-proxy/+server.ts` 두 곳을 참조로 교체. UA 정의는 이제 한 곳뿐.
- [ ] #11 Bing HTML 스크래핑 강결합
- [x] #12 writeAll 예외 무방비 — 커밋 `021f49d`에서 try/catch + 로그 + 명확한 예외.
- [x] #13 count 입력 검증 누락 — 커밋 `021f49d`에서 `Number.isFinite` + `Math.min(…,50)` clamp.
- [x] #14 SITE/도메인 상수 중복 — 공용 `src/lib/site.ts`(SITE·SITE_HOST) 신설, layout·home·sitemap·hooks·play 5곳을 참조로 교체. 렌더 검증(og:image·canonical 정상, 하드코딩 0).
- [x] #15 내부 에러 메시지 노출 — 커밋 `021f49d`에서 원문은 서버 로그, 외부엔 일반 메시지.
- [x] #16 번역 누락 raw 키 반환 — 커밋 `021f49d`에서 누락 키 `console.warn` 후 폴백.
- [~] #17 기타 스멜 — **처리:** play 매직넘버 상수화(`PICK_ANIM_MS`·`PICK_ANIM_REDUCED_MS`·`SEED_MAX`) + 시드 표현식 중복을 `randomSeed()` 헬퍼로 통합. create 반응성 해킹(`rows = rows;`)을 관용적 불변 업데이트(`rows.map`)로 교체. **보류(사유):** 인라인 스타일→클래스(대량 외형 변경), 데이터 내 `<b>`/`<br>`+`{@html}`(렌더 깨질 위험), 로딩 패턴 중복 제거(실질 리팩터), 이미지 파일명 slug 규칙 불일치(커밋된 에셋 리네임 필요) — 모두 별도 검증 세션 권장.

---

## 요약

| # | 항목 | 위치 | 유형 | 심각도 |
|---|------|------|------|--------|
| 1 | 주제 데이터 3중 위치 결합 | samples.ts ↔ publicTopics.ts ↔ topics.ts | SRP·OCP | 🔴 높음 |
| 2 | candidates[]↔images[] 인덱스 결합 | publicTopics.ts:67-70 | 취약 결합 | 🔴 높음 |
| 3 | 미사용 dragReorder + 드래그 이중 구현 | dragReorder.ts / RankBoard.svelte | DRY·데드코드 | 🔴 높음 |
| 4 | 불완전한 SSRF 방어 | image-proxy/+server.ts | 보안 | 🔴 높음 |
| 5 | play 페이지 책임 과다 | play/+page.svelte | SRP | 🟡 중간 |
| 6 | RankMode 유령 값 | types.ts:11 | 모델 혼란 | 🟡 중간 |
| 7 | home SEO 문구 i18n 우회 | +page.svelte:14-23 | 일관성 | 🟡 중간 |
| 8 | messages 로케일별 완전 중복 | messages.ts:4 | OCP·DRY | 🟡 중간 |
| 9 | 로케일 목록 하드코딩 | i18n/index.ts:48,60 | OCP | 🟡 중간 |
| 10 | UA 문자열 중복 | bingImageSearch.ts ↔ image-proxy | DRY | 🟡 중간 |
| 11 | Bing HTML 스크래핑 강결합 | bingImageSearch.ts:66-82 | 강결합 | 🟡 중간 |
| 12 | writeAll 예외 무방비 | storage.ts:25 | 에러 처리 | 🟡 중간 |
| 13 | count 입력 검증 누락 | image-search/+server.ts:17 | 검증 | 🟡 중간 |
| 14 | SITE/도메인 상수 4곳 중복 | layout·home·sitemap·play | DRY | 🟢 낮음 |
| 15 | 내부 에러 메시지 노출 | image/+server.ts:31 | 정보 노출 | 🟢 낮음 |
| 16 | 번역 누락 raw 키 반환 | i18n/index.ts:21 | 에러 은닉 | 🟢 낮음 |
| 17 | 기타 스멜 (반응성 해킹·매직넘버·인라인 스타일·마크업 혼입) | 다수 | 스멜 | 🟢 낮음 |

---

## 🔴 높음 — 구조적 문제

### 1. 하나의 "주제"가 3개 파일에 인덱스로 흩어져 결합 (SRP·OCP 위반)

**위치:** `src/lib/samples.ts` · `src/lib/publicTopics.ts:54-56` · `src/lib/i18n/topics.ts`

하나의 논리적 데이터(주제)가 세 파일에 나뉘어 **배열 순서(index)로만** 맞물려 있다. 실측: `SAMPLE_TOPICS` 34개, `SLUGS` 34개, `topicTranslations` 34키 — 현재는 정합하나 이를 강제하는 장치가 없다.

```ts
// publicTopics.ts:54-56  (접합부)
function toPublicTopic(index: number, locale: Locale): PublicTopic {
	const s = SAMPLE_TOPICS[index];
	const slug = SLUGS[index] ?? `topic-${index}`;   // ← 위치로만 연결 + 조용한 폴백
	const tr = locale === defaultLocale ? undefined : topicTranslations[slug]?.[locale];
```

**왜 문제인가**
- 중간에 주제를 하나만 삽입/삭제/재정렬하면 이후 **모든 주제의 slug·id·번역이 조용히 어긋난다.** slug는 SEO URL과 결정적 id에 쓰이므로 링크가 깨지고 잘못된 주제로 연결된다.
- `?? \`topic-${index}\`` 폴백이 그 불일치를 **에러 없이 숨긴다.**
- 새 주제 추가 시 최소 3개 파일을 동기 수정해야 한다 (OCP 위반: 확장에 열려있지 않고 수정을 강요).

**근본 원인:** `SampleTopic` 모델(samples.ts:9-16)에 `slug`/`id` 필드가 없어 데이터가 자기완결적이지 않다. 정체성이 다른 파일의 별도 배열에 있다.

**개선 방향:** `SampleTopic`에 `slug` 필드를 추가해 데이터 자체에 정체성을 부여하고, `SLUGS` 배열과 위치 결합을 제거한다. 번역도 slug 키로 직접 조회.

---

### 2. candidates[] ↔ images[] 위치 결합 (취약)

**위치:** `src/lib/publicTopics.ts:67-70`

```ts
candidates: s.candidates.map((name, i) => ({
	id: `${slug}-${i}`,
	name: tr?.candidates?.[i] ?? name,
	image: s.images?.[i] || undefined     // ← 이름과 사진을 인덱스로만 매칭
})),
```

**왜 문제인가**
- 후보 이름 배열과 이미지 배열을 인덱스로만 매칭하며 **길이/정합성 검증이 전혀 없다.** 후보만 재정렬하면 사진이 조용히 뒤바뀐다.
- 그 결합을 유지하려는 스멜이 데이터에 드러난다:
  - `samples.ts:474` — 후보 20개와 인덱스를 맞추려고 이미지를 `'/gen/potato-snack-13.webp', '', '', '', '', '', ''` 처럼 **빈 문자열로 패딩**.
  - `samples.ts:313-324` — delivery-food 주제가 best-food 이미지를 `best-food-14`, `best-food-06` 등 **특정 인덱스로 교차 참조**하고 의미는 주석(`// 족발`, `// 중국집`)으로만 표시. best-food 후보 순서가 바뀌면 delivery-food가 깨진다. 주석이 유일한 안전장치.
- 번역 후보 배열(`topics.ts:11`)도 "순서는 samples 와 동일"이라는 주석 하나에 의존해 손으로 인덱스를 정렬 → samples 변경 시 번역이 조용히 오정렬.

**개선 방향:** 후보를 `{ name, image }` 객체 배열로 묶어 이름·사진·번역이 한 단위로 이동하게 한다.

---

### 3. 미사용 `dragReorder.ts` + 드래그 기능 이중 구현 (DRY · 데드코드)

**위치:** `src/lib/actions/dragReorder.ts` (전체 93줄) · `src/lib/components/RankBoard.svelte:44-65`

- `dragReorder.ts`는 재사용 가능한 Svelte 액션으로 작성돼 있으나 **프로젝트 어디에서도 import되지 않는다** (데드 코드).
- 동시에 `RankBoard.svelte`가 드래그앤드롭을 **처음부터 다시 구현**한다:

```ts
// RankBoard.svelte:44-65  — 명령형 DOM 히트테스트
function onMove(e) {
	const slots = document.querySelectorAll('[data-slot]');
	// 매 포인터 이동마다 전 슬롯 순회 + getBoundingClientRect() 충돌 판정
}
```

**왜 문제인가**
- 같은 기능이 두 벌 존재 (DRY 위반, 유지보수 부담).
- 재구현 쪽은 Svelte의 선언적 바인딩/액션을 두고 `document.querySelectorAll` + `getBoundingClientRect`로 전역 DOM을 직접 조회 → 상태(`slots`/`pool`)와 실제 DOM이 어긋날 위험, 테스트 곤란.

**개선 방향:** `dragReorder` 액션을 채택해 `RankBoard`의 자체 구현을 대체하거나, 액션이 불필요하면 파일을 삭제.

---

### 4. 불완전한 SSRF 방어 (image-proxy) — 재검증 완료

**위치:** `src/routes/api/image-proxy/+server.ts:7, 25-27`

```ts
/** ⚠️ SSRF 방지를 위해 http(s) + 이미지 content-type 만 허용한다. */   // :7 — 단언
...
if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {       // :25 — 실제로는 프로토콜만 검사
	throw error(400, 'http(s) URL 만 허용됩니다.');
}
res = await fetch(parsed, { ... });   // 내부 호스트 차단 없이 그대로 fetch
```

**왜 문제인가**
- 주석은 "SSRF 방지"라 단언하지만 실제로는 **프로토콜만 검사**한다. `localhost`, `127.0.0.1`, 사설 대역(`10.x`/`192.168.x`/`172.16.x`), 클라우드 메타데이터 엔드포인트(`169.254.169.254`)로의 요청을 전혀 막지 못한다.
- 서버가 클라이언트 대신 임의 URL을 fetch해 응답을 돌려주므로 **내부망 스캐닝·메타데이터 탈취**에 악용될 수 있다.
- 잘못된 주석이 "방어됨"으로 오인시켜 더 위험하다.

**개선 방향:** URL 파싱 후 호스트를 DNS 해석해 사설/루프백/링크로컬 IP를 차단하고, content-type이 실제로 `image/*`인지(현재 `:41`에서 검사됨)와 함께 강제. 최소한 주석을 실제 동작에 맞게 수정.

---

## 🟡 중간

### 5. `play/+page.svelte` 책임 과다 (SRP)

**위치:** `src/routes/[[lang=locale]]/t/[id]/play/+page.svelte` (283줄)

한 파일이 (a) sort 모드 랭킹 오케스트레이션, (b) drag 모드 위임, (c) 반응시간(망설임) 로깅, (d) 결과 화면, (e) PDF 프린트 헤더/푸터, (f) 고뇌 리포트를 전부 담당한다. 템플릿이 `ranking` / `mode==='sort'` / drag 3개 큰 분기로 200줄 넘게 이어진다.
**개선:** 최소한 결과 화면·PDF 렌더링을 별도 컴포넌트로 분리.

### 6. `RankMode` 유령 값 (모델 혼란)

**위치:** `src/lib/ranking/types.ts:11` + `src/routes/[[lang=locale]]/+page.svelte:52-56`

`RankMode = 'sort' | 'worldcup' | 'drag'` 3값이지만 실제 대입은 `'sort'`/`'drag'`뿐(create·play 확인). 그런데 `modeLabel`은 `'sort'`와 `'worldcup'`을 같은 라벨로 매핑 → "순위 월드컵" UI가 내부적으로 `'sort'`인데 타입엔 쓰이지 않는 `'worldcup'` 유령 값이 남아 어느 값이 정본인지 혼란.
**개선:** `'worldcup'` 제거 또는 실제 사용값으로 통일.

### 7. home SEO 문구 i18n 우회 (일관성)

**위치:** `src/routes/[[lang=locale]]/+page.svelte:14-23`

`homeTitle`/`homeDesc`를 로케일별로 컴포넌트 안에 직접 하드코딩. 주석(`messages.ts 를 건드리지 않도록 여기서 정의`)이 스스로 인정하듯 나머지는 전부 `t()` i18n을 쓰는데 이 SEO 문구만 별도 관리 → 번역 소스 이원화.

### 8. messages 사전 로케일별 완전 중복 (OCP · DRY)

**위치:** `src/lib/i18n/messages.ts:4`

`Record<Locale, Record<string, string>>` 구조. 실측 ko/en/zh 각 63키로 현재는 완전 정합(누락 0)이나 강제하는 타입/검사가 없다. 새 로케일 = 63키 블록 통째 추가. 키 타입이 `string`이라 `t('오타')`가 컴파일 타임에 안 잡힌다.
**개선:** 키를 union 타입으로 좁혀 컴파일 타임 검증.

### 9. i18n 로케일 목록 하드코딩 (OCP)

**위치:** `src/lib/i18n/index.ts:48, 60-67`

```ts
if (seg === 'en' || seg === 'zh') { ... }   // :48
```

`locales` 상수(index.ts:9)에서 유도하지 않고 함수마다 `'en'`/`'zh'`를 하드코딩. 로케일 추가 시 `splitLocale`·`pickLocale`을 따로 고쳐야 한다.

### 10. UA 문자열 중복 (DRY)

**위치:** `src/lib/server/bingImageSearch.ts:10-11` ↔ `src/routes/api/image-proxy/+server.ts:12-13`

동일한 User-Agent 문자열이 두 파일에 복제. 버전 변경 시 한 곳만 고치면 조용히 불일치. 공용 상수로 추출 필요.

### 11. Bing HTML 마크업 강결합 (취약한 스크래핑)

**위치:** `src/lib/server/bingImageSearch.ts:66-82`

`m="{...}"` 정규식으로 Bing 결과 페이지 HTML을 파싱. 주석에서 스스로 인정하듯 Bing이 마크업만 바꿔도 전 기능이 깨진다. 외부 서비스의 비공식 내부 구조에 직접 의존. (설계상 불가피한 면이 있으나 실질 리스크.)

### 12. `writeAll` 예외 무방비 (비대칭 에러 처리)

**위치:** `src/lib/storage.ts:25-28`

`readAll`은 try/catch로 감싸 로그를 남기지만 `writeAll`의 `localStorage.setItem`은 무방비. 이 앱은 base64 data URL 이미지를 localStorage에 저장하므로 `QuotaExceededError`가 현실적으로 발생하며, 그 경우 저장이 조용히 실패하거나 처리되지 않은 예외로 터진다.

### 13. `count` 입력 검증 누락

**위치:** `src/routes/api/image-search/+server.ts:17`

```ts
opts.count = Number(count);   // 범위·NaN 검증 없음
```

`?count=abc`면 NaN → `results.length >= count` 종료 조건이 참이 안 돼 파싱 상한 무력화. `?count=99999`도 그대로 통과. `Number.isFinite` + clamp 필요.

---

## 🟢 낮음

### 14. `SITE`/도메인 상수 4곳 중복 (DRY)
`+layout.svelte:22`, `+page.svelte:12`, `sitemap.xml/+server.ts:3` 모두 `'https://codeinsight.online'`, 추가로 `play/+page.svelte:221`에 `codeinsight.online` 문자열 하드코딩. 도메인 변경 시 누락 위험. 공용 상수로 추출.

### 15. 내부 에러 메시지 그대로 노출
`api/image/+server.ts:31-34` & `image-search/+server.ts:23-26`: catch에서 `e.message`를 502 본문에 그대로 실어 반환. HF/Bing 원문 에러(엔드포인트·토큰 상태)가 외부로 샐 수 있다. 일반 메시지로 감싸고 원문은 서버 로그로만.

### 16. 번역 누락 raw 키 반환 (에러 은닉)
`i18n/index.ts:21` `dict[key] ?? messages[defaultLocale][key] ?? key`. 키가 없으면 키 문자열을 그대로 화면에 노출, 로그/경고 없음. 프로젝트 규칙("에러를 조용히 삼키지 않는다")과 상충.

### 17. 기타 스멜
- **반응성 해킹** — `create/+page.svelte:44,54`: `row.image = ...; rows = rows; // 반응성 트리거`. 중첩 객체 변이 후 배열 자기재대입으로 강제 갱신.
- **매직넘버** — `play/+page.svelte:90` 애니메이션 지연 `150/900`, `:50,109` 시드 상한 `1e9`.
- **인라인 스타일 남발** — `play`·`RankBoard`·`create`가 거의 모든 요소에 `style="..."` 하드코딩. 공통 스타일이 클래스로 안 뽑힘.
- **데이터에 마크업 혼입** — `messages.ts`의 `home.intro`/`rank.instruction` 등이 `<b>`, `<br/>` 포함 → 호출부에서 `{@html}` 강제(XSS 인접 스멜).
- **로딩 패턴 중복** — `t/[id]/+page.svelte` ↔ `play/+page.svelte`의 topic/loaded 로드 + loading/notFound 분기가 거의 동일 반복.
- **이미지 파일명이 slug 규칙 불일치** — `world-food`→`worldfood-*`, `baby-animal`→`animal-*`, `street-food`→`street-*`. slug로 이미지 경로 유도·검증 불가.

---

## 오탐 아님으로 확인된 것 (양호 — 지적 대상 아님)

- **i18n 키 정합성**: ko/en/zh 각 63키, 상호 누락 **0**.
- **후보 수 = 이미지 수**: 이미지 있는 모든 주제에서 일치(빈 문자열 패딩 포함). 하드 개수 불일치 **없음**.
- `WalkingDog.svelte`: 애니메이션 상수 명명·응집도 양호, `setInterval` 선택 근거 주석 있음.
- `ImageSearchModal.svelte`: 검색→프록시→리사이즈 흐름 응집도 높음, 하드코딩은 소소.
- `hesitation.ts`·`types.ts`·`image.ts`: 책임 분리·상수 명명·주석 양호. 매직넘버(512·0.82·30_000 등) 모두 명명 상수 또는 근거 주석 있음.
- `mergeRanker` undo 딥카피: 대상 규모(16개, 약 32회 비교)에선 문제없음.

---

## 우선순위 추천

1. **SSRF 방어 실제 구현** (#4) — 보안. 내부 IP 차단 추가.
2. **`SampleTopic`에 `slug` 필드 추가** (#1, #2) — 최대 구조 리스크. 3중 인덱스 결합의 근본 원인 해소.
3. **데드코드 `dragReorder.ts` 정리 + `RankBoard` 통합** (#3).
4. 이후 `play/+page.svelte` 컴포넌트 분리(#5), `RankMode` 유령 값 정리(#6).
