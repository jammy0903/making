-- B-2 상위 N%: 플레이를 기록하고 "버틴 깊이" 상위 백분위를 돌려주는 RPC.
-- plays 는 RLS로 SELECT 불가(익명 앱) → 집계는 SECURITY DEFINER 함수 안에서만.
-- 행은 노출하지 않고 숫자(percentile, sample)만 반환 → 자문 B-5 데이터윤리 부합.

create or replace function public.record_play(
  p_deck_id    text,
  p_session_id text,
  p_choices    smallint[],
  p_pref       smallint,
  p_depth_a    smallint,
  p_depth_b    smallint
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_my_depth smallint := case when p_pref = 0 then p_depth_a else p_depth_b end;
  v_sample   int;
  v_top      int;   -- 나만큼 이상 깊게 버틴 표본 수(자기 포함)
  v_pct      int;
begin
  if not exists (select 1 from public.decks where id = p_deck_id) then
    raise exception 'unknown deck: %', p_deck_id;
  end if;

  insert into public.plays (deck_id, session_id, choices, pref_side, depth_a, depth_b)
  values (p_deck_id, p_session_id, p_choices, p_pref, p_depth_a, p_depth_b);

  -- 같은 덱 · 같은 선호편 표본
  select count(*) into v_sample
    from public.plays
   where deck_id = p_deck_id and pref_side = p_pref;

  select count(*) into v_top
    from public.plays
   where deck_id = p_deck_id and pref_side = p_pref
     and (case when p_pref = 0 then depth_a else depth_b end) >= v_my_depth;

  -- 깊을수록 상위: 상위 % = 나 이상 깊게 버틴 비율. 최소 1%로 클램프.
  v_pct := greatest(1, round(100.0 * v_top / nullif(v_sample, 0)));

  return jsonb_build_object('percentile', v_pct, 'sample', v_sample);
end;
$$;

grant execute on function
  public.record_play(text, text, smallint[], smallint, smallint, smallint)
  to anon, authenticated;
