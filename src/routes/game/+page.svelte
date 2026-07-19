<script lang="ts">
  import { m as t } from '$lib/paraglide/messages'; // 상세 페이지와 동일하게 t로 alias
  import { localizeHref } from '$lib/paraglide/runtime';
  import { hlCard } from '$lib/client/share';

  let { data } = $props();
  let shareLabel = $state(t.hl_share());

  type Card = { id: number; name: string; photo: string; idx: number };
  const BEST_KEY = 'mmd-hl-best';

  // intro → play → reveal(지수 공개 잠깐) → play|over
  let phase = $state<'intro' | 'play' | 'reveal' | 'over'>('intro');
  let a = $state<Card | null>(null);
  let b = $state<Card | null>(null);
  let streak = $state(0);
  let best = $state(0);
  let lastCorrect = $state(false);
  let isNewBest = $state(false);
  let queue: Card[] = [];

  // 시작 화면은 정적 렌더 → 셔플은 클라이언트에서만(SSR 불일치 없음)
  function shuffled(): Card[] {
    const arr = [...data.pool];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  function draw(): Card {
    if (!queue.length) queue = shuffled().filter((p) => p.id !== a?.id && p.id !== b?.id);
    return queue.pop()!;
  }
  function start() {
    best = Number(localStorage.getItem(BEST_KEY) || 0);
    queue = shuffled();
    a = queue.pop()!;
    b = queue.pop()!;
    streak = 0;
    isNewBest = false;
    phase = 'play';
  }
  function guess(higher: boolean) {
    if (phase !== 'play' || !a || !b) return;
    // 동점은 어느 쪽을 골라도 정답 (지수는 반올림 정수라 동점 가능)
    lastCorrect = b.idx === a.idx || (higher ? b.idx > a.idx : b.idx < a.idx);
    phase = 'reveal';
    setTimeout(() => {
      if (lastCorrect) {
        streak++;
        if (streak > best) {
          best = streak;
          isNewBest = true;
          localStorage.setItem(BEST_KEY, String(best));
        }
        a = b;
        b = draw();
        phase = 'play';
      } else {
        phase = 'over';
      }
    }, 1100);
  }

  async function share() {
    if (!b) return;
    shareLabel = t.share_making();
    try {
      const r = await hlCard({
        big: t.hl_card_big({ n: streak }),
        stopped: t.hl_card_stopped({ name: b.name }),
        best: isNewBest ? t.hl_card_best({ n: best }) : '',
        question: t.hl_card_q(),
        photo: b.photo,
        shareText: t.hl_share_text({ n: streak }),
      });
      shareLabel = r === 'downloaded+copied' ? t.share_saved_copied() : r === 'downloaded' ? t.share_saved() : r === 'shared' ? t.share_shared() : t.hl_share();
    } catch (e) {
      shareLabel = t.share_fail();
      console.error('하이로우 카드 공유 오류:', e);
    }
    setTimeout(() => (shareLabel = t.hl_share()), 2500);
  }
</script>

<svelte:head>
  <title>{t.hl_head_title()}</title>
  <meta name="description" content={t.hl_desc()} />
</svelte:head>

<div class="wrap-narrow page">
  <h1 class="hl-title">{t.hl_title()}</h1>
  <p class="disclaimer">{t.just_for_fun()}</p>

  {#if phase === 'intro'}
    <p class="hl-desc">{t.hl_desc()}</p>
    <p class="hl-rule">{t.hl_rule()}</p>
    <p class="hl-pool">{t.hl_pool_note({ count: data.pool.length })}</p>
    <button class="btn-solid" onclick={start}>{t.hl_start()}</button>
  {:else}
    <div class="hl-status">
      <span>{t.hl_streak({ n: streak })}</span>
      <span>{t.hl_best({ n: best })}</span>
    </div>
    <div class="hl-board">
      {#if a}
        <div class="hl-card">
          {#if a.photo}<img class="hl-thumb" src={a.photo} alt={a.name} referrerpolicy="no-referrer" />{/if}
          <div class="hl-name">{a.name}</div>
          <div class="hl-idx-label">{t.hl_idx_label()}</div>
          <div class="hl-idx">{a.idx}</div>
        </div>
      {/if}
      <div class="hl-vs">vs</div>
      {#if b}
        <div class="hl-card {phase === 'reveal' ? (lastCorrect ? 'win' : 'lose') : ''}">
          {#if b.photo}<img class="hl-thumb" src={b.photo} alt={b.name} referrerpolicy="no-referrer" />{/if}
          <div class="hl-name">{b.name}</div>
          <div class="hl-idx-label">{t.hl_idx_label()}</div>
          {#if phase === 'play'}
            <div class="hl-btns">
              <span class="hl-q">{t.hl_q()}</span>
              <button class="hl-btn" onclick={() => guess(true)}>{t.hl_higher()}</button>
              <button class="hl-btn" onclick={() => guess(false)}>{t.hl_lower()}</button>
            </div>
          {:else}
            <div class="hl-idx">{b.idx}</div>
            <div class="hl-mark {lastCorrect ? 'win' : 'lose'}">{lastCorrect ? t.hl_correct() : t.hl_wrong()}</div>
          {/if}
        </div>
      {/if}
    </div>

    {#if phase === 'over'}
      <div class="hl-over">
        <div class="hl-over-title">{t.hl_over_title({ n: streak })}</div>
        {#if isNewBest}<div class="hl-newbest">{t.hl_new_best()}</div>{/if}
        <div class="hl-over-actions">
          <button class="btn-solid" onclick={share}>{shareLabel}</button>
          <button class="btn" onclick={start}>{t.hl_retry()}</button>
          {#if b}
            <a class="hl-dict" href={localizeHref(`/m/${b.id}`)}>{t.hl_dict_link({ name: b.name })}</a>
          {/if}
        </div>
      </div>
    {/if}
  {/if}
</div>
