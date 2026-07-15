<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { newCards, steadyCards, deadCards, searchCards, statusLabel, tagText, metaNew, metaSteady } from '$lib/cards';
  import Deck from '$lib/components/Deck.svelte';

  let { data } = $props();

  let tab = $state<'new' | 'steady'>('new');
  let steadyCat = $state('전체');
  let q = $state('');

  const query = $derived(q.trim());
  const results = $derived(query ? searchCards(data.cards, query) : []);
  const news = $derived(newCards(data.cards));
  const steadies = $derived(steadyCards(data.cards));
  const deads = $derived(deadCards(data.cards));
  const cats = $derived(['전체', ...new Set(steadies.map((c) => c.cat).filter(Boolean))]);
  const steadyList = $derived(steadyCat === '전체' ? steadies : steadies.filter((m) => m.cat === steadyCat));

  // 새 밈 정렬
  let newSort = $state<'recent' | 'name' | 'comments'>('recent');
  const newsSorted = $derived.by(() => {
    const arr = [...news];
    if (newSort === 'name') return arr.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
    if (newSort === 'comments') return arr.sort((a, b) => b.commentCount - a.commentCount);
    return arr; // 최신순 — 서버 created_at desc 순서 유지
  });

  // 더 보기 (긴 목록 점진 표시)
  const PAGE = 24;
  let newLimit = $state(PAGE);
  let steadyLimit = $state(PAGE);
  let resultsLimit = $state(PAGE);
  $effect(() => { void query; resultsLimit = PAGE; });
  $effect(() => { void newSort; void tab; newLimit = PAGE; });
  $effect(() => { void steadyCat; void tab; steadyLimit = PAGE; });
  const newsShown = $derived(newsSorted.slice(0, newLimit));
  const steadyShown = $derived(steadyList.slice(0, steadyLimit));
  const resultsShown = $derived(results.slice(0, resultsLimit));

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
  <meta property="og:type" content="website" />
  <meta property="og:title" content="memedics — 한국 밈 트렌드 사전" />
  <meta property="og:description" content="새로 뜬 밈과 오래 살아남은 밈을 여러 커뮤니티에서 측정해 보여주는 밈 사전." />
  <meta property="og:url" content="{page.url.origin}/" />
  <meta property="og:image" content="{page.url.origin}/og-default.png" />
  <meta name="twitter:card" content="summary_large_image" />
</svelte:head>

<div class="wrap masthead">
  <div class="eyebrow">Meme Dictionary</div>
  <h1>memedics</h1>
  <p class="lede">새로 뜬 밈과 오래 살아남은 밈을 모아 둡니다. 판정하지 않고, 있는 그대로 보여드립니다. 해석은 읽는 사람의 몫.</p>
  <div class="rule"></div>
</div>

<div class="wrap searchwrap">
  <label class="searchbar">
    <svg class="search-ico" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2" />
      <line x1="16.5" y1="16.5" x2="21" y2="21" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
    </svg>
    <input type="search" bind:value={q} placeholder="밈 이름·뜻으로 검색" aria-label="밈 검색" autocomplete="off" />
    {#if query}
      <button type="button" class="search-clear" onclick={() => (q = '')} aria-label="검색 지우기">✕</button>
    {/if}
  </label>
</div>

{#if query}
  <div class="wrap page">
    <div class="list-head"><div class="count">‘{query}’ 검색 · {results.length}개</div></div>
    {#if !results.length}
      <div class="empty">‘{query}’에 맞는 밈이 없습니다. <a href="/submit">이 밈 신청하기 →</a></div>
    {:else}
      <div class="rows">
        {#each resultsShown as m (m.id)}
          <a class="row" href="/m/{m.id}" style="border-bottom:1px solid var(--line3);color:inherit">
            <div class="col">
              <div class="rowline">
                {#if m.name}<span class="m-name">{m.name}</span>{/if}
                <span class="res-status {m.status}">{statusLabel(m)}</span>
                <span class="m-tags">{tagText(m)}</span>
              </div>
              {#if m.desc}<p class="m-desc">{m.desc}</p>{/if}
            </div>
            {#if m.photoUrl}
              <div class="photo-slot thumb"><img src={m.photoUrl} alt={m.name} loading="lazy" referrerpolicy="no-referrer" /></div>
            {/if}
          </a>
        {/each}
      </div>
      {#if results.length > resultsLimit}
        <div class="morewrap"><button class="more" onclick={() => (resultsLimit += PAGE)}>더 보기 ({results.length - resultsLimit}개)</button></div>
      {/if}
    {/if}
  </div>
{:else}
<Deck cards={data.cards} />

<div class="wrap">
  <div class="tabs">
    <button class="tab {tab === 'new' ? 'active' : ''}" onclick={() => (tab = 'new')}>새로 올라온</button>
    <button class="tab {tab === 'steady' ? 'active' : ''}" onclick={() => (tab = 'steady')}>스테디</button>
  </div>
</div>

{#if tab === 'new'}
  <div class="wrap page">
    <div class="list-head">
      <div class="count">{news.length}개 항목</div>
      <div class="seg" role="group" aria-label="정렬">
        <button class={newSort === 'recent' ? 'on' : ''} onclick={() => (newSort = 'recent')}>최신순</button>
        <button class={newSort === 'name' ? 'on' : ''} onclick={() => (newSort = 'name')}>이름순</button>
        <button class={newSort === 'comments' ? 'on' : ''} onclick={() => (newSort = 'comments')}>댓글순</button>
      </div>
    </div>
    {#if !news.length}
      <div class="empty">아직 새로 올라온 밈이 없습니다.</div>
    {:else}
      <div class="rows">
        {#each newsShown as m (m.id)}
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
      {#if news.length > newLimit}
        <div class="morewrap"><button class="more" onclick={() => (newLimit += PAGE)}>더 보기 ({news.length - newLimit}개)</button></div>
      {/if}
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
        {#each steadyShown as m, i (m.id)}
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
      {#if steadyList.length > steadyLimit}
        <div class="morewrap"><button class="more" onclick={() => (steadyLimit += PAGE)}>더 보기 ({steadyList.length - steadyLimit}개)</button></div>
      {/if}
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
{/if}
