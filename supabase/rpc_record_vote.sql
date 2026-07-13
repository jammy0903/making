-- ============================================================================
--  공감 리그 · 쓰기 RPC — record_vote
--  근거: docs/공감리그_설계문서.md (v4) §4 투표 · §5 랭킹 산식 · §14 로그 컬럼
--  실행: Supabase SQL Editor 에 붙여넣고 Run (gonggam_league_schema.sql 실행 후)
--
--  왜 RPC인가: 승자 잔류(§4-1) 때문에 잔류 챔피언 한 행에 동시 UPDATE가 몰린다.
--  클라이언트가 테이블을 직접 UPDATE 하지 않고 이 함수 한 겹을 통과시켜야,
--  나중에 큐잉·배치로 바꿔도 프론트를 안 건드린다. (SECURITY DEFINER = RLS 우회)
--
--  📌 규약: 잔류자(incumbent)는 항상 p_sit_a 로 넘긴다.
--     → is_incumbent_a=true ⟺ sit_a=잔류자, sit_b=도전자 (β 적용 대상이 명확)
--     → 첫 판(잔류자 없음)만 is_incumbent_a=false
--     → 화면 좌우는 p_position_swapped 로 따로 기록 (위치 편향 §4-2)
-- ============================================================================

-- β(친숙성 편향 보정값) — 매주 재추정해 여기 저장(§4-2 · §15). 0 = 데이터 쌓이기 전 무효.
alter table arenas add column if not exists beta double precision not null default 0;

-- ---------------------------------------------------------------------------
-- K-factor: K(n) = clamp( 64/(1 + n/12), 10, 64 )   (§5-2)
-- ---------------------------------------------------------------------------
create or replace function elo_k(n integer)
returns double precision
language sql immutable
as $$
  select greatest(10.0, least(64.0, 64.0 / (1.0 + n / 12.0)));
$$;

-- ---------------------------------------------------------------------------
-- record_vote — 투표 1건: 매치 로그(항상) + 실시간 Elo 갱신(유효표만)
-- ---------------------------------------------------------------------------
create or replace function record_vote(
  p_arena            uuid,
  p_sit_a            uuid,          -- 잔류자(incumbent). 첫 판이면 아무 쪽
  p_sit_b            uuid,          -- 도전자(challenger)
  p_winner           uuid,          -- p_sit_a | p_sit_b | null(=skip)
  p_is_skip          boolean,
  p_is_incumbent_a   boolean,
  p_position_swapped boolean,
  p_voter_session    text,
  p_ms_elapsed       integer,
  p_skip_of          uuid default null   -- 스킵 시 '안 겪어본' 상황 (§4-4 스킵률)
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid       uuid := auth.uid();                                   -- 로그인 유저(익명이면 null)
  v_weight    double precision := case when auth.uid() is null then 0.2 else 1.0 end;  -- §13
  v_match_id  uuid;
  v_elo_a     double precision;
  v_elo_b     double precision;
  v_m_a       integer;
  v_m_b       integer;
  v_beta      double precision;
  v_k         integer;
  v_w         double precision;
  v_eff_a     double precision;
  v_eff_b     double precision;
  v_e_a       double precision;
  v_s_a       double precision;
  v_new_a     double precision;
  v_new_b     double precision;
  v_winner_new double precision;
  v_rank      integer;
begin
  ---- 입력 검증 --------------------------------------------------------------
  if p_sit_a = p_sit_b then
    raise exception 'sit_a and sit_b must differ';
  end if;
  if p_voter_session is null or p_voter_session = '' then
    raise exception 'voter_session required';
  end if;
  if p_is_skip then
    if p_winner is not null then raise exception 'skip must have null winner'; end if;
  elsif p_winner is null or (p_winner <> p_sit_a and p_winner <> p_sit_b) then
    raise exception 'winner must be sit_a or sit_b';
  end if;

  ---- 자기 상황 투표 불가 (§13) — 로그인 유저 한정(익명은 식별 불가) ----------
  if v_uid is not null and exists (
    select 1 from situations
    where id in (p_sit_a, p_sit_b) and first_reporter_id = v_uid
  ) then
    raise exception 'cannot vote on your own situation';
  end if;

  ---- 두 행을 id 순으로 잠금 → 데드락 방지(핫로우 경합은 여기서 직렬화) --------
  perform 1 from situations
    where id in (p_sit_a, p_sit_b) and arena_id = p_arena
    order by id for update;
  select elo, matches into v_elo_a, v_m_a from situations where id = p_sit_a and arena_id = p_arena;
  select elo, matches into v_elo_b, v_m_b from situations where id = p_sit_b and arena_id = p_arena;
  if v_elo_a is null or v_elo_b is null then
    raise exception 'situation not found in arena';
  end if;

  ---- 매치 로그 (항상 기록 — 감사·어뷰징 분석용) -----------------------------
  insert into matches (arena_id, sit_a, sit_b, winner_id, is_skip, is_incumbent_a,
                       position_swapped, voter_id, voter_session, weight, ms_elapsed)
  values (p_arena, p_sit_a, p_sit_b, p_winner, p_is_skip, p_is_incumbent_a,
          p_position_swapped, v_uid, p_voter_session, v_weight, p_ms_elapsed)
  returning id into v_match_id;

  ---- 스킵: Elo 미반영, 안 겪어본 상황의 skip_count +1 (§4-3, §4-4) -----------
  if p_is_skip then
    if p_skip_of is not null then
      update situations set skip_count = skip_count + 1
        where id = p_skip_of and id in (p_sit_a, p_sit_b);
    end if;
    return jsonb_build_object('match_id', v_match_id, 'applied', false, 'reason', 'skip');
  end if;

  ---- 300ms 미만 무효 (§13): 기록만 하고 Elo 미반영 --------------------------
  if coalesce(p_ms_elapsed, 0) < 300 then
    return jsonb_build_object('match_id', v_match_id, 'applied', false, 'reason', 'too_fast');
  end if;

  ---- 반복 판정 감쇠 w = weight / √(k+1) (§4-2) ------------------------------
  --   k = 이 유저가 '잔류자'를 판정한 이전 횟수(같은 사람이 같은 잔류자를 반복해 이기게 하는 편향).
  --   첫 판(잔류자 없음)은 반복 편향이 없어 k=0.
  v_beta := coalesce((select beta from arenas where id = p_arena), 0);
  if p_is_incumbent_a then
    select count(*) into v_k from matches
      where voter_session = p_voter_session and not is_skip and id <> v_match_id
        and (sit_a = p_sit_a or sit_b = p_sit_a);      -- 잔류자 = sit_a
    v_eff_a := v_elo_a + v_beta;    -- 친숙성 편향 보정: 잔류자를 β만큼 강하다고 취급 → 잔류자 승리는 덜 인정
    v_eff_b := v_elo_b;
  else
    v_k := 0;
    v_eff_a := v_elo_a;
    v_eff_b := v_elo_b;
  end if;
  v_w := v_weight / sqrt(v_k + 1);

  ---- 기대 승률(β 반영) → Elo 갱신 -------------------------------------------
  --   β는 '기대값'에만 반영. 실제 누적은 raw elo 기준(온도계를 왜곡하지 않는다 §5-5).
  v_e_a := 1.0 / (1.0 + power(10.0, (v_eff_b - v_eff_a) / 400.0));
  v_s_a := case when p_winner = p_sit_a then 1.0 else 0.0 end;

  v_new_a := v_elo_a + elo_k(v_m_a) * v_w * (v_s_a - v_e_a);
  v_new_b := v_elo_b + elo_k(v_m_b) * v_w * ((1.0 - v_s_a) - (1.0 - v_e_a));

  update situations set
      elo = v_new_a,
      matches = matches + 1,
      wins = wins + case when p_winner = id then 1 else 0 end,
      status = case when status = 'qualifying' and matches + 1 >= 30 then 'active' else status end
    where id = p_sit_a;
  update situations set
      elo = v_new_b,
      matches = matches + 1,
      wins = wins + case when p_winner = id then 1 else 0 end,
      status = case when status = 'qualifying' and matches + 1 >= 30 then 'active' else status end
    where id = p_sit_b;

  ---- 즉시 보상용 순위(§4-6). 승자의 현역 내 순위. (핫패스면 나중에 캐시) -------
  v_winner_new := case when p_winner = p_sit_a then v_new_a else v_new_b end;
  select count(*) + 1 into v_rank from situations
    where arena_id = p_arena and status = 'active' and elo > v_winner_new;

  return jsonb_build_object(
    'match_id', v_match_id,
    'applied', true,
    'weight', v_w,
    'winner_rank', v_rank,
    'elo', jsonb_build_object(
      p_sit_a::text, round(v_new_a::numeric, 1),
      p_sit_b::text, round(v_new_b::numeric, 1)
    )
  );
end;
$$;

grant execute on function record_vote(
  uuid, uuid, uuid, uuid, boolean, boolean, boolean, text, integer, uuid
) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 클라이언트 호출 예 (SvelteKit ↔ supabase-js):
--   await supabase.rpc('record_vote', {
--     p_arena: arenaId, p_sit_a: incumbentId, p_sit_b: challengerId,
--     p_winner: winnerId, p_is_skip: false,
--     p_is_incumbent_a: true, p_position_swapped: shownSwapped,
--     p_voter_session: sessionId(), p_ms_elapsed: elapsed
--   });
-- 반환: { applied, winner_rank, elo: { <sitId>: newElo, ... } } → 즉시 보상 표시
-- ---------------------------------------------------------------------------
