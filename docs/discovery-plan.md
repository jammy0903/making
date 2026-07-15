# 밈 발굴 시스템 — 실행 계획서

> 설계 근거: [discovery-design.md](./discovery-design.md) (문헌 조사 기반 4단 깔때기).
> 진행할 때마다 이 문서의 체크박스를 갱신한다. **날짜 게이트가 있으니 Phase 0 시작일이 전체 일정의 기준.**

## 현재 상태

- [ ] Phase 0 — 누적 시작 (시작일: ____________ ← 배포된 날 기입, 이 날짜 + 14일이 Phase 1 게이트)
- [ ] Phase 1 — 버스트 감지 + 데이터랩 검증 (게이트: Phase 0 + 최소 14일)
- [ ] Phase 2 — LLM 분류 + 후보 큐 연결
- [ ] Phase 3 — soynlp 업그레이드 + 기각 환류 자동화 (게이트: Phase 0 + 2~3개월)

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

- [ ] DB 마이그레이션 `db/discovery_schema.sql`
  - `raw_texts(id, text, source, topic, day, created_at)` — 크롤 원문. 90일 보존(이후 삭제).
  - `ngram_daily(ngram, day, source, count)` — PK(ngram, day, source). upsert 누적.
  - `rejected_terms(term, rejected_at, note)` — 사람이 반려한 후보(환류용).
- [ ] `src/discovery/accumulate.js` — 크롤 원문에서:
  - 문자 n-gram(2~6자, 한글만) + 어절 토큰 추출
  - 등록 밈 키워드 매칭분 제외(기존 matcher 재사용) · rejected_terms 제외 · 숫자/단일문자 제외
  - `ngram_daily`에 upsert, `raw_texts`에 원문 저장
- [ ] `src/pipeline.js`의 `runCommentCrawl`에 훅 연결 (매칭 직후 `allPosts` 재사용, 추가 크롤 0)
- [ ] 실패 격리: 누적 실패가 기존 mention_counts 크롤을 깨지 않게 try/catch
- [ ] GH Actions 크론(기존 crawl.yml)에서 자동으로 같이 돌게 확인
- [ ] **배포 후 이 문서 상단에 시작일 기입**

**검증**: 크롤 1회 실행 후 Supabase에서 `select count(*) from ngram_daily` > 0 확인.

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
