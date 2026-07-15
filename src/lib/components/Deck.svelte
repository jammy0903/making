<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { newCards, tagText, metaNew, metaSteady } from '$lib/cards';
  import type { MemeCard } from '$lib/server/db';

  type DeckCard = MemeCard & { retrial?: boolean };

  let { cards }: { cards: MemeCard[] } = $props();

  // 재심: 90일 표 10개 미만 스테디 무작위 3개 — SSR/하이드레이션 불일치 방지를 위해 mount 후 선정
  let retrials = $state<DeckCard[]>([]);
  onMount(() => {
    retrials = cards
      .filter((c) => c.status === 'steady' && c.voteYes + c.voteNo < 10)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map((c) => ({ ...c, retrial: true }));
  });

  const list = $derived<DeckCard[]>([...newCards(cards), ...retrials]);
  let idx = $state(0);
  let done = $state(false);

  // 드래그 상태 (legacy attachDeck 이식)
  let dragX = $state(0);
  let dragging = $state(false);
  let flyDir = $state(0); // 0=없음, ±1=날아가는 중

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
    // 세로 스크롤로 브라우저가 제스처를 가져가면 pointercancel — 드래그 상태만 정리
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
  <div class="deck-title">넘겨보기 · 새로 뜬 밈 & 재심</div>
  <div class="deck-holder">
    <div class="deck-stage">
      {#if !done && list.length > 0}
        {#each [2, 1, 0] as off (off)}
          {#if idx + off < list.length}
            {@const m = list[idx + off]}
            <div
              class="deck-card"
              style={cardStyle(off)}
              role="group"
              aria-roledescription="넘겨보기 카드"
              aria-label={m.name}
              onpointerdown={off === 0 ? down : undefined}
            >
              {#if m.photoUrl}
                <div class="photo-slot"><img src={m.photoUrl} alt={m.name} loading="lazy" referrerpolicy="no-referrer" /></div>
              {/if}
              <div class="card-body">
                {#if m.retrial}<div class="deck-retrial">재심 · 살았나 죽었나</div>{/if}
                {#if m.name}<span class="m-name">{m.name}</span>{/if}
                <div class="m-tags">{tagText(m)}</div>
                {#if m.desc}<p class="m-desc">{m.desc}</p>{/if}
                <div class="spacer"></div>
                <div class="m-meta">{m.retrial ? metaSteady(m) : metaNew(m)}</div>
              </div>
            </div>
          {/if}
        {/each}
      {:else if list.length === 0}
        <div class="deck-done"><span>아직 새로 뜬 밈이 없어요</span></div>
      {:else}
        <div class="deck-done">
          <span>새로 뜬 밈을 다 넘겨봤어요</span>
          <button class="btn-accent" onclick={() => { done = false; idx = 0; }}>처음부터 다시</button>
        </div>
      {/if}
    </div>
    <div class="deck-nav">
      <button class="btn" onclick={prev}>← 이전</button>
      <span class="deck-counter">{counter}</span>
      <button class="btn-accent" onclick={next}>넘기기 →</button>
    </div>
    <div class="deck-hint">카드를 좌우로 드래그하거나 버튼으로 넘겨보세요 · 탭하면 자세히</div>
  </div>
  <div class="rule" style="margin-top:30px;"></div>
</div>
