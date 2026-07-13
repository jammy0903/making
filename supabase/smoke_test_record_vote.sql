-- ============================================================================
--  공감 리그 · record_vote 스모크 테스트
--  실행: gonggam_league_schema.sql → rpc_record_vote.sql 실행 후, 같은 프로젝트에서 Run
--
--  검증 항목:
--   ① 유효표 → 승자 Elo 상승 / 패자 하락
--   ② 잔류자표(is_incumbent_a) → 정상 반영
--   ③ 스킵 → Elo 미반영 + skip_count +1
--   ④ 300ms 미만 → 무효(Elo 미반영)
--   ⑤ 같은 상황끼리 대결 → 예외 거부
--   ⑥ 매치 로그 전건 기록
--
--  ⚠️ SQL Editor는 JWT가 없어 auth.uid()=null → 가중치 0.2(익명)로 계산됨(정상).
--  ⚠️ 테스트 데이터는 slug '_smoketest' 아레나에 남는다. 맨 아래 CLEANUP 를 따로 실행해 제거.
-- ============================================================================

do $$
declare
  a uuid; s1 uuid; s2 uuid;
begin
  -- 셋업: 아레나 1 + 상황 2 (display_text 20~40자 제약 통과)
  insert into arenas (slug, name, emoji)
    values ('_smoketest', '스모크 테스트', '🧪') returning id into a;
  insert into situations (arena_id, display_text, first_reporter_session, origin)
    values (a, '라면 물 다 맞췄는데 봉지에 수프가 없을 때', 'seed', 'seed') returning id into s1;
  insert into situations (arena_id, display_text, first_reporter_session, origin)
    values (a, '맨발로 걷다 식탁 다리에 새끼발가락 찧을 때', 'seed', 'seed') returning id into s2;

  -- ① 유효표: 첫 판(잔류자 없음), s1 승
  perform record_vote(a, s1, s2, s1, false, false, false, 'v1', 800, null);
  -- ② 잔류자표: s1=잔류자(incumbent), 좌우 스왑됨, s1 승
  perform record_vote(a, s1, s2, s1, false, true, true, 'v2', 1200, null);
  -- ③ 스킵: 투표자가 s2 를 안 겪음
  perform record_vote(a, s1, s2, null, true, false, false, 'v3', 1500, s2);
  -- ④ 300ms 미만: 무효
  perform record_vote(a, s1, s2, s1, false, false, false, 'v4', 100, null);

  -- ⑤ 같은 상황끼리 → 예외 나야 정상
  begin
    perform record_vote(a, s1, s1, s1, false, false, false, 'v5', 800, null);
    raise notice '⑤ FAIL: 같은 상황 대결이 통과됨';
  exception when others then
    raise notice '⑤ PASS: 같은 상황 대결 거부됨 (%)', sqlerrm;
  end;

  -- 요약 NOTICE (에디터 Messages 탭에서 확인)
  raise notice '⑥ 매치 로그 %건 (기대: 4 — 유효2 + 스킵1 + 무효1)',
    (select count(*) from matches where arena_id = a);
  raise notice '③ s2 skip_count = % (기대: 1)', (select skip_count from situations where id = s2);
  raise notice '① s1 elo = % (기대: >1500)', (select round(elo::numeric, 1) from situations where id = s1);
  raise notice '① s2 elo = % (기대: <1500)', (select round(elo::numeric, 1) from situations where id = s2);
end $$;

-- ============================================================================
--  결과 그리드 — 이게 최종 증거다.
--  기대: 라면(s1) elo>1500·대결2·승2·스킵0  /  맨발(s2) elo<1500·대결2·승0·스킵1
-- ============================================================================
select
  left(display_text, 22) as 상황,
  round(elo::numeric, 1)  as elo,        -- 1500에서 움직였으면 record_vote 동작 OK
  matches                 as 대결,
  wins                    as 승,
  skip_count              as 스킵,
  status                  as 상태
from situations
where arena_id = (select id from arenas where slug = '_smoketest')
order by elo desc;

-- ============================================================================
--  CLEANUP — 검증 확인 후 이 한 줄만 따로 드래그해서 Run (arena 삭제 시 전부 cascade)
-- ============================================================================
-- delete from arenas where slug = '_smoketest';
