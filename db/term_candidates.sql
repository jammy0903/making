-- discovery_candidates에 term형(검색수요 발굴) 후보 지원. SQL Editor에서 Run(재실행 안전).
-- 설계: docs/search-demand-design.md §5. 기존 url형(스카우트) 후보와 공존.
--
-- url은 NOT NULL UNIQUE 유지 — term형은 url='term:<term>'으로 넣어 기존 dedup
-- (ignore-duplicates on url)을 그대로 재사용한다(스키마 완화 불필요).

alter table discovery_candidates add column if not exists kind     text not null default 'url'; -- 'url' | 'term'
alter table discovery_candidates add column if not exists term     text;      -- 후보 단어 (kind='term')
alter table discovery_candidates add column if not exists evidence jsonb;     -- 근거 {gtrends, datalab:{...}, autocomplete}
alter table discovery_candidates add column if not exists score    numeric;   -- 판정 점수(급증 배율 등)

-- 관리자가 후보검토에서 term 반려 시 rejected_terms 기록(환류) 허용
drop policy if exists "admin insert rejected" on rejected_terms;
create policy "admin insert rejected" on rejected_terms
  for insert to authenticated
  with check (public.is_admin());
