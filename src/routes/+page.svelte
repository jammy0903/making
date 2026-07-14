<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { newCards, steadyCards, deadCards, tagText, metaNew, metaSteady } from '$lib/cards';
  import Deck from '$lib/components/Deck.svelte';

  let { data } = $props();

  let tab = $state<'new' | 'steady'>('new');
  let steadyCat = $state('전체');

  const news = $derived(newCards(data.cards));
  const steadies = $derived(steadyCards(data.cards));
  const deads = $derived(deadCards(data.cards));
  const cats = $derived(['전체', ...new Set(steadies.map((c) => c.cat).filter(Boolean))]);
  const steadyList = $derived(steadyCat === '전체' ? steadies : steadies.filter((m) => m.cat === steadyCat));

  onMount(() => {
    // 구 SPA 공유 링크(#m=id) 호환 — 경로형 상세로 승격
    const dm = location.hash.match(/^#m=(\d+)$/);
    if (dm) goto(`/m/${dm[1]}`, { replaceState: true });
  });
</script>

<svelte:head>
  <title>memedics — 한국 밈 트렌드 사전</title>
  <meta name="description" content="새로 뜬 밈과 오래 살아남은 밈을 여러 커뮤니티에서 측정해 보여주는 밈 사전, memedics." />
  <link rel="canonical" href="{page.url.origin}/" />
</svelte:head>

<div class="wrap masthead">
  <div class="eyebrow">Meme Dictionary</div>
  <h1>memedics</h1>
  <p class="lede">새로 뜬 밈과 오래 살아남은 밈을 모아 둡니다. 판정하지 않고, 있는 그대로 보여드립니다. 해석은 읽는 사람의 몫.</p>
  <div class="rule"></div>
</div>

<Deck cards={data.cards} />

<div class="wrap">
  <div class="tabs">
    <button class="tab {tab === 'new' ? 'active' : ''}" onclick={() => (tab = 'new')}>새로 올라온</button>
    <button class="tab {tab === 'steady' ? 'active' : ''}" onclick={() => (tab = 'steady')}>스테디</button>
  </div>
</div>

{#if tab === 'new'}
  <div class="wrap page">
    <div class="list-head"><div class="count">최근 등록순 · {news.length}개 항목</div></div>
    {#if !news.length}
      <div class="empty">아직 새로 올라온 밈이 없습니다.</div>
    {:else}
      <div class="rows">
        {#each news as m (m.id)}
          <a class="row" href="/m/{m.id}" style="border-bottom:1px solid var(--line3);color:inherit">
            <div class="col">
              <div class="rowline">
                {#if m.name}<span class="m-name">{m.name}</span>{/if}
                <span class="m-tags">{tagText(m)}</span>
              </div>
              {#if m.desc}<p class="m-desc">{m.desc}</p>{/if}
              <div class="m-meta">{metaNew(m)}</div>
            </div>
            {#if m.photoUrl}
              <div class="photo-slot thumb"><img src={m.photoUrl} alt={m.name} loading="lazy" referrerpolicy="no-referrer" /></div>
            {/if}
          </a>
        {/each}
      </div>
    {/if}
  </div>
{:else}
  <div class="wrap page">
    <div class="list-head">
      <div class="note">여러 소스에서 측정한 활성도 순위입니다. 앞의 번호가 순위 · 판정하지 않고 있는 그대로.</div>
    </div>
    <div class="cats">
      {#each cats as c (c)}
        <button class="cat {steadyCat === c ? 'on' : ''}" onclick={() => (steadyCat = c)}>{c}</button>
      {/each}
    </div>
    {#if !steadyList.length}
      <div class="empty">이 분류엔 아직 스테디 밈이 없습니다.</div>
    {:else}
      <div class="rows">
        {#each steadyList as m, i (m.id)}
          <a class="dict-row" href="/m/{m.id}" style="color:inherit">
            <div class="dict-idx">{String(i + 1).padStart(2, '0')}</div>
            <div class="col">
              <div class="dict-head">
                {#if m.name}<span class="m-name">{m.name}</span>{/if}
                <span class="m-tags">{tagText(m)}</span>
              </div>
              {#if m.desc}<p class="m-desc" style="font-size:14px;margin:5px 0 0;">{m.desc}</p>{/if}
              <div class="m-meta">{metaSteady(m)}</div>
            </div>
          </a>
        {/each}
      </div>
    {/if}
    {#if deads.length}
      <div class="obits">
        <div class="obits-head">† 부고 <span class="obits-sub">두 신호(언급 소멸·판정 여론)가 겹쳐 사망 선고된 밈 · {deads.length}</span></div>
        {#each deads as m (m.id)}
          <a class="obit-row" href="/m/{m.id}" style="color:inherit">
            <span class="obit-name">{m.name}</span>
            <span class="obit-date">사망 선고</span>
          </a>
        {/each}
      </div>
    {/if}
  </div>
{/if}
