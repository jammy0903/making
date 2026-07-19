<script lang="ts">
  import { m as t } from '$lib/paraglide/messages'; // 다른 페이지와 동일하게 t로 alias
  import { castAwareness, castReading, type AgeBand } from '$lib/client/api';
  import { eraCard } from '$lib/client/share';

  let { data } = $props();

  type Card = { id: number; name: string; photo: string; year: number };
  // 세대 버킷 — 각 버킷에서 고르게 출제해야 판독이 특정 세대로 쏠리지 않는다
  const BUCKETS: [number, number][] = [
    [0, 2012],
    [2013, 2016],
    [2017, 2019],
    [2020, 2022],
    [2023, 2024],
    [2025, 9999],
  ];
  const PER_BUCKET = 3;

  let phase = $state<'intro' | 'play' | 'result'>('intro');
  let deck = $state<Card[]>([]);
  let pos = $state(0);
  let known = $state<Card[]>([]);
  let shareLabel = $state(t.era_share());
  let ageDone = $state(false);
  const AGE_BANDS: AgeBand[] = ['~19', '20-24', '25-29', '30-39', '40+'];

  const DECK_N = $derived(Math.min(PER_BUCKET * BUCKETS.length, data.pool.length));
  const cur = $derived(deck[pos] ?? null);

  function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function start() {
    const picked: Card[] = [];
    for (const [lo, hi] of BUCKETS) {
      const bucket = data.pool.filter((p: Card) => p.year >= lo && p.year <= hi);
      picked.push(...shuffle(bucket).slice(0, PER_BUCKET));
    }
    deck = shuffle(picked);
    pos = 0;
    known = [];
    shareLabel = t.era_share();
    ageDone = false;
    phase = 'play';
  }
  function answer(knows: boolean) {
    if (!cur) return;
    if (knows) known = [...known, cur];
    castAwareness(cur.id, knows).catch((e) => console.error('인지도 수집 실패:', e)); // 수집 실패해도 판독은 계속
    if (pos + 1 < deck.length) pos++;
    else phase = 'result';
  }

  // 판독 채점 — 무보정 휴리스틱(응답 표본 쌓이면 IRT θ 추정으로 교체 예정).
  // 단순 평균의 두 결함을 논문 근거로 보정한다:
  //  (1) 과거 편향: 회고절정 연구의 cascading bump — 젊은 세대도 옛 밈(Rickroll 등)을
  //      흔히 알아 옛 밈 지식은 나이 변별력이 낮고 평균을 과거로 끌어당긴다.
  //      → 최신일수록 큰 가중(변별력 프록시)으로 상쇄.
  //  (2) 소표본 극단값: 아는 밈 1~2개로 극단 연도가 나오는 것을 방지.
  //      → 풀 중앙연도(SHRINK_Y)에 가상관측 SHRINK_K개를 섞어 중앙으로 수축.
  const W_BASE = 2004;        // 최신 가중 기준(가중 = year - W_BASE, 2005→1 … 2025→21)
  const SHRINK_K = 4;         // 수축 강도(가상관측 수)
  const SHRINK_Y = 2018;      // 큐레이션 풀(2005~2025)의 중앙 연도
  const mentalYear = $derived.by(() => {
    const n = known.length;
    if (!n) return null;
    let wsum = 0, wavg = 0;
    for (const c of known) {
      const w = c.year - W_BASE;
      wsum += w;
      wavg += c.year * w;
    }
    wavg /= wsum; // 최신 가중 평균
    return Math.round((wavg * n + SHRINK_Y * SHRINK_K) / (n + SHRINK_K));
  });
  const eraLabel = $derived.by(() => {
    const y = mentalYear;
    if (y === null) return '';
    if (y <= 2009) return t.era_label_2009();
    if (y <= 2012) return t.era_label_2012();
    if (y <= 2016) return t.era_label_2016();
    if (y <= 2019) return t.era_label_2019();
    if (y <= 2022) return t.era_label_2022();
    if (y <= 2024) return t.era_label_2024();
    return t.era_label_2026();
  });
  const allKnown = $derived(deck.length > 0 && known.length >= Math.ceil(deck.length * 0.9));
  const headline = $derived(mentalYear === null ? t.era_none_title() : t.era_year_fmt({ year: mentalYear }));
  const subline = $derived(mentalYear === null ? t.era_none_sub() : allKnown ? t.era_all_sub() : eraLabel);

  function pickAge(band: AgeBand) {
    if (mentalYear === null) return;
    // 판독값 + 실제 나이대를 함께 기록 → 정확도 측정·문항 보정 재료. 실패해도 UX는 진행.
    castReading(mentalYear, known.length, deck.length, band).catch((e) => console.error('판독 기록 실패:', e));
    ageDone = true;
  }

  async function share() {
    if (mentalYear === null && !deck.length) return;
    shareLabel = t.share_making();
    try {
      const r = await eraCard({
        headline,
        sub: subline,
        stat: t.era_stat({ known: known.length, total: deck.length }),
        question: t.era_card_q(),
        shareText: t.era_share_text({ year: headline, label: subline }),
        photos: known.slice(0, 4).map((k) => k.photo).filter(Boolean),
      });
      shareLabel = r === 'downloaded+copied' ? t.share_saved_copied() : r === 'downloaded' ? t.share_saved() : r === 'shared' ? t.share_shared() : t.era_share();
    } catch (e) {
      shareLabel = t.share_fail();
      console.error('판독 카드 공유 오류:', e);
    }
    setTimeout(() => (shareLabel = t.era_share()), 2500);
  }
</script>

<svelte:head>
  <title>{t.era_head_title()}</title>
  <meta name="description" content={t.era_desc({ n: DECK_N })} />
</svelte:head>

<div class="wrap-narrow page">
  <h1 class="hl-title">{t.era_title()}</h1>
  <p class="disclaimer">{t.just_for_fun()}</p>

  {#if phase === 'intro'}
    <p class="hl-desc">{t.era_desc({ n: DECK_N })}</p>
    <p class="hl-rule">{t.era_rule()}</p>
    <button class="btn-solid" onclick={start}>{t.era_start()}</button>
  {:else if phase === 'play' && cur}
    <div class="hl-status">
      <span>{t.era_progress({ i: pos + 1, n: deck.length })}</span>
    </div>
    <div class="era-card">
      {#if cur.photo}<img class="era-thumb" src={cur.photo} alt={cur.name} referrerpolicy="no-referrer" />{/if}
      <div class="era-name">{cur.name}</div>
      <div class="era-btns">
        <button class="hl-btn" onclick={() => answer(true)}>{t.era_know()}</button>
        <button class="hl-btn era-dunno" onclick={() => answer(false)}>{t.era_dunno()}</button>
      </div>
    </div>
  {:else if phase === 'result'}
    <div class="era-result">
      <div class="era-result-label">{t.era_result_label()}</div>
      <div class="era-year">{headline}</div>
      <div class="era-sub">{subline}</div>
      <div class="era-stat">{t.era_stat({ known: known.length, total: deck.length })}</div>
      {#if mentalYear !== null}
        <div class="era-age">
          {#if ageDone}
            <div class="era-age-thanks">{t.era_age_thanks()}</div>
          {:else}
            <div class="era-age-q">{t.era_age_q()}</div>
            <div class="era-age-bands">
              {#each AGE_BANDS as band (band)}
                <button class="era-age-band" onclick={() => pickAge(band)}>{band}</button>
              {/each}
            </div>
          {/if}
        </div>
      {/if}
      <div class="hl-over-actions">
        <button class="btn-solid" onclick={share}>{shareLabel}</button>
        <button class="btn" onclick={start}>{t.era_retry()}</button>
      </div>
    </div>
  {/if}
</div>
