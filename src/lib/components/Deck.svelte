<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { newCards, tagText, metaNew, metaSteady, coverImage, ytId, ytThumb } from '$lib/cards';
  import { castVote, markVoted, type VoteChoice } from '$lib/client/api';
  import ThumbImg from '$lib/components/ThumbImg.svelte';
  import type { MemeCard } from '$lib/server/db';

  let { cards }: { cards: MemeCard[] } = $props();

  // 덱: 옛 밈(steady)·새 밈(new)을 섞어서 판정받는다. 셔플은 Math.random이라 mount 후 확정
  // (SSR/하이드레이션 불일치 방지). 초기엔 새 밈만 보여주고 mount 때 혼합 셔플로 교체.
  let deck = $state<MemeCard[]>(newCards(cards));
  onMount(() => {
    const shuffle = <T,>(a: T[]) => [...a].sort(() => Math.random() - 0.5);
    const news = newCards(cards);
    const steadies = cards.filter((c) => c.status === 'steady');
    deck = shuffle([...shuffle(news).slice(0, 15), ...shuffle(steadies).slice(0, 15)]);
  });

  const list = $derived(deck);
  let idx = $state(0);
  let done = $state(false);

  let dragX = $state(0);
  let dragging = $state(false);
  let flyDir = $state(0);

  // 렌더할 상위 3장 — 반드시 카드 id로 keying(each 아래). 위치(off)로 keying하면
  // 스와이프로 날아간 카드 DOM이 재활용돼 다음 카드가 바깥에서 회전하며 되돌아온다.
  const visible = $derived(
    [2, 1, 0].filter((off) => idx + off < list.length).map((off) => ({ off, m: list[idx + off] }))
  );

  function next() {
    if (idx + 1 >= list.length) done = true;
    else idx += 1;
  }
  function prev() {
    if (done) {
      done = false;
      idx = Math.max(0, list.length - 1);
    } else if (idx > 0) idx -= 1;
  }

  // 3지선다 판정 — 투표 후 다음 카드. 스와이프/건너뛰기는 투표 없이 넘김.
  function judge(choice: VoteChoice) {
    const m = list[idx];
    if (!m) return;
    markVoted(m.id, choice);
    castVote(m.id, choice).catch(() => {}); // 같은 달 중복(409) 등은 무시
    next();
  }

  function down(e: PointerEvent) {
    if (flyDir) return;
    const startX = e.clientX;
    let moved = 0;
    dragging = true;
    const cleanup = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel);
      dragging = false;
    };
    const move = (ev: PointerEvent) => {
      dragX = ev.clientX - startX;
      moved = Math.max(moved, Math.abs(dragX));
    };
    const up = (ev: PointerEvent) => {
      cleanup();
      const dx = ev.clientX - startX;
      if (Math.abs(dx) > 110) {
        flyDir = dx > 0 ? 1 : -1;
        setTimeout(() => {
          flyDir = 0;
          dragX = 0;
          next();
        }, 230);
      } else if (moved < 6) {
        dragX = 0;
        goto(`/m/${list[idx].id}`); // 탭 = 상세로
      } else {
        dragX = 0;
      }
    };
    const cancel = () => {
      cleanup();
      dragX = 0;
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel);
  }

  function cardStyle(off: number) {
    const top = off === 0;
    if (top) {
      const x = flyDir ? flyDir * 720 : dragX;
      const rot = flyDir ? flyDir * 30 : dragX / 24;
      const transition = dragging ? 'none' : 'transform .23s ease';
      return `z-index:30;transform:translate(${x}px,0) rotate(${rot}deg);box-shadow:0 14px 32px rgba(20,60,64,0.16);cursor:grab;transition:${transition};`;
    }
    return `z-index:${30 - off};transform:translateY(${off * 14}px) scale(${(1 - off * 0.045).toFixed(3)});box-shadow:0 4px 14px rgba(0,0,0,0.05);cursor:default;transition:transform .24s ease;`;
  }

  const counter = $derived(list.length ? `${Math.min(idx + 1, list.length)} / ${list.length}` : '0 / 0');
</script>

<div class="wrap deck-section">
  <div class="deck-title">밈 판정 · 이 밈, 아직 살아있나?</div>
  <div class="deck-holder">
    <div class="deck-stage">
      {#if !done && list.length > 0}
        {#each visible as v (v.m.id)}
          {@const m = v.m}
            <div
              class="deck-card"
              style={cardStyle(v.off)}
              role="group"
              aria-roledescription="밈 판정 카드"
              aria-label={m.name}
              onpointerdown={v.off === 0 ? down : undefined}
            >
              {#if coverImage(m)}
                <div class="photo-slot">
                  <ThumbImg src={coverImage(m)} alt={m.name} loading="lazy" />
                  {#if m.media.length > 1}<span class="multi-badge" aria-hidden="true">▤</span>{/if}
                </div>
              {:else if m.videoUrl}
                <div class="photo-slot vid">{#if ytId(m.videoUrl)}<img src={ytThumb(m.videoUrl)} alt="" referrerpolicy="no-referrer" />{:else}<video src={m.videoUrl} muted playsinline preload="metadata"></video>{/if}</div>
              {/if}
              <div class="card-body">
                {#if m.name}<span class="m-name">{m.name}</span>{/if}
                <div class="m-tags">{tagText(m)}</div>
                {#if m.desc}<p class="m-desc">{m.desc}</p>{/if}
                <div class="spacer"></div>
                <div class="m-meta">{m.status === 'steady' ? metaSteady(m) : metaNew(m)}</div>
              </div>
            </div>
        {/each}
      {:else if list.length === 0}
        <div class="deck-done"><span>판정할 밈이 없어요</span></div>
      {:else}
        <div class="deck-done">
          <span>다 판정했어요</span>
          <button class="btn-accent" onclick={() => { done = false; idx = 0; }}>처음부터 다시</button>
        </div>
      {/if}
    </div>

    {#if !done && list.length > 0}
      <div class="deck-vote">
        <button class="dv dv-yes" onclick={() => judge('yes')}>밈이다</button>
        <button class="dv dv-not" onclick={() => judge('notmeme')}>밈이 아니다</button>
      </div>
    {/if}

    <div class="deck-nav">
      <button class="btn" onclick={prev}>← 이전</button>
      <span class="deck-counter">{counter}</span>
      <button class="btn" onclick={next}>건너뛰기 →</button>
    </div>
    <div class="deck-hint">판정하면 다음 카드로 · 좌우로 넘기거나 건너뛰기 · 탭하면 자세히</div>
  </div>
  <div class="rule" style="margin-top:30px;"></div>
</div>
