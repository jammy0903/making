<script lang="ts">
  import { m as t } from '$lib/paraglide/messages'; // 상세 페이지와 동일하게 t로 alias
  import { onDestroy } from 'svelte';
  import { localizeHref } from '$lib/paraglide/runtime';
  import { drawHlCard, cardBlob, shareBlob, saveBlob, publicImgUrl } from '$lib/client/share';
  import { kakaoEnabled, shareKakao } from '$lib/client/kakao';

  let { data } = $props();
  let shareLabel = $state(t.hl_share());
  let saveLabel = $state(t.card_save());
  let kakaoLabel = $state(t.kakao_share());

  // 결과 카드 — 게임이 끝나자마자 미리 그려 두고, 그 blob을 공유·저장이 함께 쓴다.
  let cardUrl = $state('');
  let cardBusy = $state(false);
  let cardData: Blob | null = null;

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
    shareLabel = t.hl_share();
    saveLabel = t.card_save();
    kakaoLabel = t.kakao_share();
    dropCard();
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
        buildCard(); // 결과 표시와 동시에 카드 생성 시작(밈 사진 로딩이 있어 시간이 걸린다)
      }
    }, 1100);
  }

  function dropCard() {
    if (cardUrl) URL.revokeObjectURL(cardUrl);
    cardUrl = '';
    cardData = null;
  }
  async function buildCard() {
    if (!b) return;
    dropCard();
    cardBusy = true;
    try {
      const canvas = await drawHlCard({
        big: t.hl_card_big({ n: streak }),
        stopped: t.hl_card_stopped({ name: b.name }),
        best: isNewBest ? t.hl_card_best({ n: best }) : '',
        question: t.hl_card_q(),
        photo: b.photo,
        shareText: t.hl_share_text({ n: streak }),
      });
      cardData = await cardBlob(canvas);
      cardUrl = URL.createObjectURL(cardData);
    } catch (e) {
      console.error('하이로우 카드 생성 오류:', e); // 카드가 없어도 결과 화면은 그대로 쓴다
    } finally {
      cardBusy = false;
    }
  }
  onDestroy(dropCard);

  async function share() {
    if (!cardData) return;
    shareLabel = t.share_making();
    try {
      const text = `${t.hl_share_text({ n: streak })}\n${location.origin}/game`;
      const r = await shareBlob(cardData, 'memedics-hl.png', text);
      shareLabel = r === 'downloaded+copied' ? t.share_saved_copied() : r === 'downloaded' ? t.share_saved() : r === 'shared' ? t.share_shared() : t.hl_share();
    } catch (e) {
      shareLabel = t.share_fail();
      console.error('하이로우 카드 공유 오류:', e);
    }
    setTimeout(() => (shareLabel = t.hl_share()), 2500);
  }

  function save() {
    if (!cardData) return;
    saveBlob(cardData, 'memedics-hl.png');
    saveLabel = t.card_save_done();
    setTimeout(() => (saveLabel = t.card_save()), 2500);
  }

  async function shareToKakao() {
    if (!b) return;
    try {
      await shareKakao({
        title: t.hl_kakao_title({ n: streak }),
        description: t.hl_kakao_desc({ name: b.name }),
        imageUrl: publicImgUrl(b.photo),
        path: '/game',
        buttonText: t.hl_start(),
      });
    } catch (e) {
      kakaoLabel = t.kakao_share_fail();
      console.error('카톡 공유 오류:', e);
      setTimeout(() => (kakaoLabel = t.kakao_share()), 2500);
    }
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
        <!-- 카드가 결과 그 자체다(연승 수·멈춘 밈·신기록이 모두 카드 안에 있다).
             텍스트로 또 쓰면 두 번 나와 어색해서 카드를 못 만든 경우의 폴백으로만 남긴다. -->
        {#if cardBusy}
          <div class="card-shot skel">{t.card_making()}</div>
        {:else if cardUrl}
          <figure class="card-shot">
            <img src={cardUrl} alt="{t.hl_over_title({ n: streak })}{isNewBest ? ' · ' + t.hl_new_best() : ''}" />
            <figcaption>{t.card_save_hint()}</figcaption>
          </figure>
        {:else}
          <div class="hl-over-title">{t.hl_over_title({ n: streak })}</div>
          {#if isNewBest}<div class="hl-newbest">{t.hl_new_best()}</div>{/if}
        {/if}

        <div class="hl-over-actions">
          <button class="btn-solid" onclick={share} disabled={!cardUrl}>{shareLabel}</button>
          {#if kakaoEnabled()}
            <button class="btn" onclick={shareToKakao}>{kakaoLabel}</button>
          {/if}
          <button class="btn" onclick={save} disabled={!cardUrl}>{saveLabel}</button>
          <button class="btn" onclick={start}>{t.hl_retry()}</button>
          {#if b}
            <a class="hl-dict" href={localizeHref(`/m/${b.id}`)}>{t.hl_dict_link({ name: b.name })}</a>
          {/if}
        </div>
      </div>
    {/if}
  {/if}
</div>
