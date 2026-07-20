-- 판독기(era) 보정용 집계 뷰 — meme_awareness/era_readings는 select 정책이 없어(잠금 목적)
-- 지금까지 아무도 못 읽었다. 관리자만 보게 뷰 안에서 직접 is_admin()으로 걸러서 노출한다
-- (뷰는 소유자 권한으로 하부 테이블 RLS를 우회하므로, RLS가 아니라 WHERE절이 실질적 방어선).
-- SQL Editor에서 Run (재실행 안전).
--
-- 쓰임:
--   1) meme_awareness_stats — 밈별 실측 인지도(%). 90%+ 다 아는 문항/한 자릿수%대 아무도
--      모르는 문항은 변별력이 낮으므로, 표본이 쌓이면 출제 풀에서 빼거나 가중치 낮출 후보.
--   2) era_calibration — 나이대(age_band)별 판독값(mental_year) 평균/표준편차. 나이대가
--      어릴수록 평균 연도가 높게 나와야(단조 감소) 판독기가 실제로 세대를 가른다는 근거.
--   3) era_calibration_summary — 나이대(순번)와 mental_year의 상관계수 1개 숫자로 요약.
--      음수가 나와야 정상(어릴수록=순번 낮을수록 연도 높음). 0 근처거나 양수면 판독기가
--      나이를 못 가르는 것 — 가중치 공식(W_BASE/SHRINK_*) 재설계 신호.
--      ⚠️ 단, 상관계수 하나로 다 판단하지 말 것 — cascading reminiscence bump 연구
--      (Krumhansl & Zupnick, 2013, Psychological Science)에 따르면 옛 문화 콘텐츠 인지도는
--      나이에 따라 매끈하게 줄지 않고 특정 시기에 "덩어리(bump)"로 뭉쳐 나타난다. 즉 전체
--      상관은 약해도 특정 나이대 구간에서만 뚜렷이 갈릴 수 있으므로, era_calibration의
--      나이대별 표(꺾은선처럼 읽기)를 같이 봐서 국소적 단조성이 있는지 확인해야 한다.

create or replace view meme_awareness_stats as
select
  m.id as meme_id,
  m.name,
  m.era_year,
  count(*) filter (where a.knows)                                      as knows_yes,
  count(*)                                                              as knows_total,
  round(100.0 * count(*) filter (where a.knows) / nullif(count(*), 0), 1) as awareness_pct
from meme_awareness a
join memes m on m.id = a.meme_id
where public.is_admin()
group by m.id, m.name, m.era_year
order by m.era_year nulls last, awareness_pct desc nulls last;

create or replace view era_calibration as
select
  age_band,
  count(*)                                              as n,
  round(avg(mental_year))                               as avg_mental_year,
  round(stddev(mental_year)::numeric, 1)                as stddev_mental_year,
  round(avg(known_count::numeric / nullif(total_count, 0)) * 100, 1) as avg_known_pct
from era_readings
where public.is_admin()
group by age_band
order by case age_band
  when '~19' then 1 when '20-24' then 2 when '25-29' then 3
  when '30-39' then 4 when '40+' then 5 end;

create or replace view era_calibration_summary as
select
  count(*) as n,
  round(corr(
    case age_band
      when '~19' then 1 when '20-24' then 2 when '25-29' then 3
      when '30-39' then 4 when '40+' then 5 end,
    mental_year
  )::numeric, 3) as age_year_corr -- 예상: 음수(나이대 순번↓ = 어림 → 연도↑)
from era_readings
where public.is_admin();
