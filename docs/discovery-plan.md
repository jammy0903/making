# 밈 발굴 시스템 — 실행 계획서

> 설계 근거: [discovery-design.md](./discovery-design.md) (문헌 조사 기반 4단 깔때기).
> 진행할 때마다 이 문서의 체크박스를 갱신한다. **날짜 게이트가 있으니 Phase 0 시작일이 전체 일정의 기준.**

## ⭐ 전략 재정렬 (2026-07-16) — "댓글 버스트"를 1순위에서 내림

**근거(경험적)**: 막힌 소스(펨코·인스티즈 등) 댓글을 사람이 직접 긁어 6개 파일을 돌려봤더니
새 밈 **0개**(뉴스·정치·스포츠 토론이라 노이즈). 유머·반응 스레드에선 몇 개 나왔지만,
결정적으로 **지금까지 등록된 밈 중 자동 n-gram 파이프라인이 찾아준 건 0개** —
전부 운영자 지식 + 사람의 수동 판독에서 나왔다.

**왜 댓글이 약한가**: 밈은 댓글에서 태어나지 않는다. 영상·짤·클립·스트리머 순간에서 태어나고
댓글은 그 **메아리**일 뿐. 그래서 댓글 n-gram은 ①후행 ②노이즈 ③시각밈 놓침의 3중 약점.
잘 잡는 건 **글자 자체로 퍼지는 신조어**(알빠노·테무거지)뿐이다.

**새 우선순위 (발굴 엔진)**:
1. **검색 수요 — 네이버 데이터랩** (구 Phase 1의 검증 절반을 주력으로 승격). 사람들이 "○○ 뜻"을
   검색 = **진짜 수요이자 확산 증거**이고 SEO와도 직결. → **1순위**.
2. **정리글 스카우트** — "요즘 유행 밈 정리" 블로그/카페 글(사람이 이미 밈을 모아둔 것). `naver/scout.js` 강화. → 2순위.
3. **사람 큐레이션** — 운영자 + `/submit`(회원 신청). 초기엔 제일 정확하며 **지금 실제로 발굴을 다 하는 채널**. → 3순위.
4. **(보조) 댓글 n-gram 버스트** — 신조어 조기감지용으로만. 2주 누적은 계속 돌리되 **주력 엔진에서 격하**.

> 요약: 통계 버스트에 기대 걸지 말고 **검색량·정리글·사람**을 위로. 아래 Phase 문서는 유지하되
> "댓글 버스트(구 Phase 1의 burst.js)"는 보조로 읽고, **데이터랩·스카우트·신청**을 앞세운다.

## 1순위 강화 조사 (2026-07-16, 논문+웹 검색 + 엔드포인트 실검증)

**데이터랩의 근본 한계**: 키워드를 *넣어줘야만* 상대값(ratio)을 재는 **검증기**다. 발굴기가 아니다.
따라서 1순위 파이프라인은 「후보 공급 → 데이터랩 검증」 2단으로 설계해야 한다.

**후보 공급 채널 (실검증 완료)**:
| 채널 | 상태 | 역할 |
|---|---|---|
| **구글 트렌드 실시간 RSS** `trends.google.com/trending/rss?geo=KR` | ✅ **200 확인**(키·라이브러리 불필요, XML) | 한국 급상승 검색어 ~20개/일. 네이버 실검 폐지(2021) 이후 유일한 공식·안정 실검 소스 |
| **네이버 검색광고 keywordstool API** (`/keywordstool`, 연관키워드+월간검색수) | 가입 필요(무료, 광고주센터 별도 키) | 시드("밈","신조어","유행어","○○ 뜻")의 **연관키워드 + 절대 검색량** — 데이터랩 상대값 약점 보완 |
| 네이버 자동완성(비공식 JSON) | 확인됨(비공식이라 불안정 감수) | 후보 검증: **"X 뜻" 자동완성 존재 = 뜻 검색 수요 존재** |
| 네이트 실시간 이슈 / signal.bz | 간헐(레이트리밋·EUC-KR) | 보조. 뉴스성 키워드 위주 |

**핵심 트릭 — "X 뜻" 신호**: 밈의 검색 수요는 "X **뜻**" 형태로 나타난다(뉴스 인물·사건은 "뜻"으로 검색 안 함).
후보 X에 대해 데이터랩에 `X`와 `X 뜻`을 함께 조회 → "X 뜻"이 뜨면 밈/신조어 확률 급상승. 뉴스 오탐 필터를 공짜로 얻는다.

**문헌 확인**: 검색량 기반 감지(nowcasting, Choi&Varian 계열)는 신뢰 확립된 방법론.
Zhang 2016(JCMC, 인용 261): 인터넷 슬랭은 니치 커뮤니티→대중 확산 — **니치(커뮤·스카우트)에서 발견, 대중(검색량)으로 검증**이라는 우리 2단 구조와 일치.
밈 인기곡선 분류(SIAM AN25)는 Phase 3감.

**강화된 1순위 파이프라인**:
```
[공급] 구글트렌드RSS + 검색광고 연관키워드 + 정리글 스카우트 + /submit + (보조)n-gram
   → 등록밈/기각어 제외(dedup)
[검증] 데이터랩: X & "X 뜻" 급증 확인 (+자동완성 "X 뜻" 존재)
[정제] LLM 4-way 분류 (Phase 2와 공용)
[결정] 관리자 큐 — 사람이 등록/반려
```

## 현재 상태

- [x] Phase 0 — 누적 시작 (시작일: **2026-07-15**). ⚠️ 재정렬로 **주력 아님**(신조어 보조용). 계속 돌림.
- [x] 1순위 강화 조사 — 후보 공급 채널 확정·실검증 (위 표)
- [x] 1순위 설계서 작성 — **[search-demand-design.md](./search-demand-design.md)** (아키텍처·API 상세·판정 규칙·실패 모드)
- [x] **[승격] 검색 수요 감지 구현** (2026-07-16) — **1순위 가동 시작**
  - [x] `src/discovery/gtrends.js` — 구글트렌드 RSS(geo=KR) 수집기 (키 불필요, 파싱 실패 격리)
  - [x] `src/naver/datalab.js` — X·"X 뜻" 동시 조회 + **앵커 정규화** + 판정(judge)
  - [x] `src/naver/autocomplete.js` — "X 뜻" 자동완성 가점 (비공식, 실패 무시)
  - [x] `discovery_candidates` term형 확장 — 적용됨(`db/term_candidates.sql`, kind/term/evidence/score)
  - [x] `scripts/discover-search.js` 드라이런 검증 — 뉴스 후보 10/10 탈락("뜻" 필터 특이도 확인),
        판정기는 발화(onset) 감지기라 과거 발화 밈이 통과 안 하는 것은 정상. 임계는 운영하며 튜닝
        (`SURGE_RATIO=3`, `RISE_X=1.5` — datalab.js 상수)
  - [x] GH Actions 크론 통합 — crawl 후 `discover-search --apply --max=20`(격리, continue-on-error)
  - [x] 관리자 후보검토 탭 term형 렌더(근거 요약) + 반려 시 rejected_terms 환류(RLS 정책 적용)
  - [x] 검색광고 채널 — **403 해결 + 용도 재정의 완료 (2026-07-16)**
    - **403 원인 = customer ID 오류**: `2554148`(틀림) → **`4446758`(정답)**. 코드·서명·비밀키는 처음부터 결백
      (서명 공식 1:1 동일 · 시계 스큐 −1초 · 4개 엔드포인트 동일 403 → 계정 전체 인증 실패였음). `.env customerid` 갱신함
    - **핵심 실측 발견 — keywordstool은 발굴 채널로 죽은 카드**: 광고주용 상업 키워드 도구라
      신조어("알빠노"·"테무깡")엔 연관키워드가 자기 자신뿐이고, 확장하면 프랜차이즈 상업어(빽다방·메가커피창업)만 나온다.
      → 어제 만든 `fetchMemeCandidates()`(시드 확장 발굴)는 근본적으로 헛다리. **삭제**함
    - **살린 가치 = 절대 검색량 보강**: 아무 term이나 넣으면 절대 월간검색량을 준다(데이터랩은 상대 ratio만).
      `fetchVolumes(terms)` 신설(5개 배치, hint term 자기 볼륨 에코 이용) → `discover-search.js`가 통과 후보의
      절대량을 evidence.monthly로 첨부. ⚠️ 신조어는 과소집계(알빠노=20) — 참고·랭킹용이지 하드 필터 아님
    - CI 통합 완료: GH 시크릿 3개 등록(`NAVER_AD_API_KEY`/`_SECRET`/`_CUSTOMER_ID`) + crawl.yml discover-search env 전달
  - [ ] 임계 튜닝 — 매일 큐 관찰하며 조정. 신선한 밈 발화를 처음 잡는 날이 진짜 검증
- [x] **[승격] 정리글 스카우트 강화** (2026-07-16) — **2순위 가동**
  - `src/naver/scout.js` 재작성: 정리글 링크만 쌓던 것 → **제목+요약을 Haiku로 넣어 밈 term 추출**
    (`collectRoundupTerms()`, 쿼리별 상한 PER_QUERY로 전 쿼리 고루 기여, 출처 정리글을 evidence.from에 보존)
  - **onset 게이트 우회 설계**: scout term은 사람이 큐레이션한 것이라 발화 지난 밈이 많음 →
    datalab(onset 감지기)에 통과시키면 다 죽음. gtrends는 게이트 유지, **scout는 큐 직행**(datalab·절대량은 보강만)
  - per-crawl 파이프라인에서 분리(`pipeline.js`의 scout 훅 제거) → 일 1회 `discover-search`로 통합(LLM 비용 절약)
  - CI: `CLAUDE_KEY` 시크릿 등록 + crawl.yml discover-search env에 `claude_key` 전달
  - 검증: 실측 60기사→20term 추출·절대량 20/20 보강·드라이런 통과(영크크·도파민디톡스·조용한사직 등 실밈 다수, 노이즈는 사람 큐가 거름)
- [x] **유튜브 발원지 채널 ④** (2026-07-16) — 밈은 영상에서 태어난다 → 제목에서 발굴
  - `src/discovery/yt-discover.js`: ④-a 급상승(`chart=mostPopular` KR, 1 unit) + ④-b 스트리머(지정 채널 최근 업로드, `src/discovery/streamers.js`에 @핸들 추가) 제목을 Haiku로 밈 term 추출
  - 원시 신호라 gtrends처럼 **onset 게이트 태워** 큐 정제(LLM 추출 + 검색수요 이중 필터). `discover-search` collectCandidates에 합류
  - LLM 호출 공용화(`src/discovery/llm.js` — scout와 공유). CI: crawl.yml discover-search에 `youtube_data_api_key` 전달
  - 검증: 급상승 50제목→11term(본캐·핵과금러·참교육 등 게임/스트리머 슬랭), 통합 드라이런 통과
  - ⏳ **스트리머 목록 비어있음** — 모니터링할 채널 @핸들을 `streamers.js`에 채우면 ④-b 가동
- [ ] 사람 큐레이션 — 운영자 + `/submit`(이미 작동). 유지·확대. **3순위**
- [ ] (보조) 버스트 감지 `burst.js` — 신조어 조기감지용. 게이트: 누적 14일+ (구 Phase 1)
- [ ] Phase 2 — LLM 분류 + 후보 큐 연결 (검색/스카우트/버스트 통과분 공용 정제)
- [ ] Phase 3 — soynlp 업그레이드 + 기각 환류 자동화 (게이트: 누적 2~3개월)

이미 완료된 선행 작업 (2026-07-15):
- [x] 크롤 안정화 — 타임아웃·재시도·동시성 제한·원인 로깅 (`src/crawlers/http.js`)
- [x] 죽은 소스 비활성화 (fmkorea 430 / instiz 클플 403 / yeosig DNS 사망 — 헤드리스로도 불가 확인)
- [x] 유튜브 확장 — 주제당 영상 1→5개, 댓글 ~1,764건/일 (할당량 불변)
- [x] LLM 드라이런 실험 (`scripts/discover-memes.js`) — "LLM 단독 1차 발굴"은 정밀도 부족 확인, 문헌도 동일 결론
- [x] 문헌 조사 + 설계 확정 (`docs/discovery-design.md`)

---

## Phase 0 — 원문·n-gram 누적 (감지 없음, 쌓기만)

**목표**: 버스트 감지의 배경률(λ) 계산에 필요한 시계열 데이터를 오늘부터 쌓는다.
**왜 급한가**: 배경률에 최소 14일(권장 28일) 누적 필요 — 이게 돌아야 시계가 흐른다.

- [x] DB 마이그레이션 `db/discovery_schema.sql` — Supabase에 적용됨(migration `discovery_phase0_accumulation`)
  - `raw_texts(post_id UNIQUE, text, source, topic, url, day)` — 크롤 원문. 90일 보존.
  - `ngram_daily(ngram, day, source, count, doc_count)` — PK(ngram, day, source). RPC `bump_ngram_daily`로 가산 upsert(덮어쓰기 방지). 180일 보존.
  - `rejected_terms(term, rejected_at, note)` — 사람이 반려한 후보(환류용).
- [x] `src/discovery/accumulate.js`
  - 한글 문자 n-gram(2~6자) 추출 (`[가-힣]{2,}` 연속 시퀀스 내에서만 — ㅋㅋ·영문·숫자 자동 제외)
  - 등록 밈 키워드 제외(양방향 부분문자열) · rejected_terms 제외 · 크롤당 2회 미만 제외(행 폭발 방지)
  - post_id 전역 dedup — 재크롤된 옛 댓글이 통계 오염 안 함 · 네트워크 재시도(withRetry)
- [x] `src/pipeline.js` 훅 — 매칭 0건이어도 누적되도록 early-return보다 앞에, try/catch 격리
- [x] 실패 격리 확인 (누적 실패해도 측정 크롤 계속 — 실제 실패 케이스로 검증됨)
- [x] GH Actions: crawl.yml의 crawl-once → pipeline 경로에 자동 포함, 추가 시크릿 불필요 (Supabase만 사용)
- [x] 시작일 기입 (2026-07-15)

**검증 완료 (2026-07-15)**: 로컬 크롤 3회 실행 → raw_texts 2,100+건 · ngram_daily 5,700+행 확인.
상위 n-gram이 일상 어미(니다/는데/진짜)로 채워짐 = 기준선 정상. dedup 동작 확인(재실행 시 신규만 집계).

## Phase 1 — 버스트 감지 + 네이버 데이터랩 교차검증 (게이트: 누적 14일+)

**목표**: 통계만으로 "튀는 미등록 단어"를 하루 0~20개로 압축하고, 전 국민 검색량으로 검증.

- [ ] `src/discovery/burst.js` — Poisson 버스트 게이트:
  - 배경률 λ = 직전 28일(최소 14일) 이동 평균
  - 조건: P(X≥k|λ)<0.001 AND 당일 카운트 ≥3 AND 소스≥2(또는 유튜브 영상≥2) AND 3일 중 2일 지속
- [ ] `src/naver/datalab.js` — 검색어트렌드 API (`POST /v1/datalab/search`, 기존 naver/client.js 재사용):
  - 후보를 5그룹×20키워드/호출로 배치 조회 (일 한도 1,000회, 충분)
  - 판정: 최근 7~14일 ratio 0→양수 전환 or 급상승이면 가중
- [ ] 드라이런 스크립트 `scripts/discover-stats.js` — 콘솔 출력만, 저장 없음 (품질 눈으로 확인)
- [ ] 임계값 튜닝 (오탐 보면서 P 임계·최소 카운트 조정)

**검증**: 드라이런 출력에서 후보 대부분이 "그럴싸한" 수준이면 통과. 주당 진짜 밈 0~5개가 정상 기대치.

## Phase 2 — LLM 4-way 분류 + 후보 큐 연결

**목표**: 통계 통과분만 LLM 정제 → discovery_candidates → 관리자 검토.

- [ ] `discovery_candidates` 스키마 확장: `term, meaning, evidence(사용 문맥), score, kind('url'|'term')` 컬럼 추가 (기존 url 기반 후보와 공존)
- [ ] `src/discovery/classify.js` — 후보별:
  - raw_texts에서 실제 사용 문맥 3~5개 추출해 프롬프트에 주입
  - 4-way 분류 {밈/신조어, 고유명사, 일반어, 오타}: Haiku 같은 프롬프트 3회 다수결
  - '밈/신조어' 합의분만 상위 모델(Sonnet급) 1회 최종 판정 + 뜻 생성
  - env: `claude_key` (이미 .env에 있음). GH Actions 시크릿에도 추가 필요
- [ ] discovery_candidates에 pending 저장
- [ ] `public/admin.js` 후보검토 탭: term형 후보 렌더(뜻·근거 문맥·점수 표시) + 반려 시 rejected_terms에도 기록
- [ ] GH Actions 크론에 통합 (크롤 후 이어서 실행)

**검증**: 관리자 큐에 올라온 것 중 절반 이상이 "등록할 만함"이면 목표 달성 (문헌 달성치 58.7%).

## Phase 3 — 고도화 (게이트: 누적 2~3개월)

- [ ] soynlp cohesion + branching entropy로 n-gram → 진짜 단어 경계 추출 업그레이드
- [ ] 기각 환류 자동화: rejected_terms를 LLM negative few-shot으로 프롬프트에 자동 주입
- [ ] 자체 골드셋(등록 밈 + 기각 오탐) 회귀 테스트 — 프롬프트/모델 변경 시 정밀도 측정
- [ ] (선택) 동시출현 그룹핑: 같은 영상/글에서 함께 튄 토큰 묶기 (TwitterMonitor 2단계)

---

## 운영 메모

- **비용**: 데이터랩 무료 · Supabase 무료 한도 내 · LLM 월 1천 원 미만 추정. 병목은 돈이 아니라 누적 시간.
- **철학 불변**: 기계는 제안(Phase 2까지), 등록/반려 결정은 사람. 기존 "탄생도 죽음도 기계는 제안, 사람이 결정"과 동일.
- **기대치**: 진짜 신조어는 희귀 사건 (Grieve: 89억 토큰→54개). 주당 0~5개면 정상. 조급해하지 말 것.
- **LLM 드라이런**(`scripts/discover-memes.js`)은 Phase 2 완성 전까지 보조 실험 도구로 유지.
