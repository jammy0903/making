<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { newCards, steadyCards, deadCards, searchCards, statusLabel, metaNew, metaSteady, coverImage, ytId, ytThumb, displayTag } from '$lib/cards';
  import Deck from '$lib/components/Deck.svelte';
  import type { MemeCard } from '$lib/server/db';
  import { m } from '$lib/paraglide/messages';
  import { getLocale, localizeHref } from '$lib/paraglide/runtime';
  import { catLabel } from '$lib/categories';

  let { data } = $props();

  let tab = $state<'new' | 'steady'>('new');
  let steadyCat = $state('전체');
  let q = $state(page.url.searchParams.get('q') ?? ''); // /?q=밈 검색 유입 지원(SearchAction)

  const query = $derived(q.trim());

  // 구조화 데이터 — 사이트명 인식 + 검색창(사이트링크 검색박스)
  const siteLd = $derived(
    JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'memedics',
      alternateName: [m.home_ld_alt()],
      url: `${page.url.origin}/`,
      description: m.home_ld_desc(),
      inLanguage: getLocale(),
      potentialAction: {
        '@type': 'SearchAction',
        target: { '@type': 'EntryPoint', urlTemplate: `${page.url.origin}/?q={q}` },
        'query-input': 'required name=q',
      },
    })
  );
  const results = $derived(query ? searchCards(data.cards, query) : []);

  // 해시태그 필터 — URL ?tag= 로 상태 유지(상세 페이지에서도 링크로 진입)
  const activeTag = $derived(page.url.searchParams.get('tag') || '');
  const tagResults = $derived(activeTag ? data.cards.filter((c) => (c.tags || []).includes(activeTag)) : []);
  function pickTag(e: MouseEvent, tag: string) {
    e.preventDefault();
    e.stopPropagation(); // 행 전체가 상세 링크라 클릭 전파를 막고 필터로만
    q = '';
    goto(`/?tag=${encodeURIComponent(tag)}`);
  }
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
  let tagLimit = $state(PAGE);
  $effect(() => { void query; resultsLimit = PAGE; });
  $effect(() => { void activeTag; tagLimit = PAGE; });
  $effect(() => { void newSort; void tab; newLimit = PAGE; });
  $effect(() => { void steadyCat; void tab; steadyLimit = PAGE; });
  const newsShown = $derived(newsSorted.slice(0, newLimit));
  const steadyShown = $derived(steadyList.slice(0, steadyLimit));
  const resultsShown = $derived(results.slice(0, resultsLimit));
  const tagShown = $derived(tagResults.slice(0, tagLimit));

  onMount(() => {
    // 구 SPA 공유 링크(#m=id) 호환 — 경로형 상세로 승격
    const dm = location.hash.match(/^#m=(\d+)$/);
    if (dm) goto(`/m/${dm[1]}`, { replaceState: true });
  });
</script>

<svelte:head>
  <title>{m.home_head_title()}</title>
  <meta name="description" content={m.home_head_desc()} />
  <link rel="canonical" href="{page.url.origin}{localizeHref('/')}" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content={m.home_head_title()} />
  <meta property="og:description" content={m.home_og_desc()} />
  <meta property="og:url" content="{page.url.origin}{localizeHref('/')}" />
  <meta property="og:image" content="{page.url.origin}/og-default.png" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="keywords" content={m.home_keywords()} />
  {@html `<script type="application/ld+json">${siteLd}</script>`}
</svelte:head>

{#snippet tagChips(m: MemeCard)}
  {#if (m.tags || []).length}
    <span class="m-tags">{#each m.tags as t (t)}<button type="button" class="tagchip {activeTag === t ? 'on' : ''}" onclick={(e) => pickTag(e, t)}>{displayTag(t)}</button>{/each}</span>
  {/if}
{/snippet}

<div class="wrap masthead">
  <div class="eyebrow">Meme Dictionary</div>
  <h1><a href={localizeHref('/')} onclick={() => (q = '')} style="color:inherit;text-decoration:none" aria-label={m.tb_brand_home()}>memedics</a></h1>
  <p class="lede">{m.home_lede()}</p>
  <div class="rule"></div>
</div>

<div class="wrap searchwrap">
  <label class="searchbar">
    <svg class="search-ico" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2" />
      <line x1="16.5" y1="16.5" x2="21" y2="21" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
    </svg>
    <input type="search" bind:value={q} placeholder={m.home_search_ph()} aria-label={m.home_search_aria()} autocomplete="off" />
    {#if query}
      <button type="button" class="search-clear" onclick={() => (q = '')} aria-label={m.home_search_clear()}>✕</button>
    {/if}
  </label>
</div>

{#if query}
  <div class="wrap page">
    <div class="list-head"><div class="count">{m.home_search_count({ q: query, count: results.length })}</div></div>
    {#if !results.length}
      <div class="empty">{m.home_search_empty({ q: query })}<a href={localizeHref('/submit')}>{m.home_search_empty_cta()}</a></div>
    {:else}
      <div class="rows">
        {#each resultsShown as m (m.id)}
          <a class="row" href={localizeHref(`/m/${m.id}`)} style="border-bottom:1px solid var(--line3);color:inherit">
            <div class="col">
              <div class="rowline">
                {#if m.name}<span class="m-name">{m.name}</span>{/if}
                <span class="res-status {m.status}">{statusLabel(m)}</span>
                {@render tagChips(m)}
              </div>
              {#if m.desc}<p class="m-desc">{m.desc}</p>{/if}
            </div>
            {#if coverImage(m)}
              <div class="photo-slot thumb">
                <img src={coverImage(m)} alt={m.name} loading="lazy" referrerpolicy="no-referrer" />
                {#if m.media.length > 1}<span class="multi-badge" aria-hidden="true">▤</span>{/if}
              </div>
            {:else if m.videoUrl}
              <div class="photo-slot thumb vid">{#if ytId(m.videoUrl)}<img src={ytThumb(m.videoUrl)} alt="" referrerpolicy="no-referrer" />{:else}<video src={m.videoUrl} muted playsinline preload="metadata"></video>{/if}</div>
            {/if}
          </a>
        {/each}
      </div>
      {#if results.length > resultsLimit}
        <div class="morewrap"><button class="more" onclick={() => (resultsLimit += PAGE)}>{m.home_more({ count: results.length - resultsLimit })}</button></div>
      {/if}
    {/if}
  </div>
{:else if activeTag}
  <div class="wrap page">
    <div class="list-head">
      <div class="count">{m.home_tag_count({ tag: activeTag, count: tagResults.length })}</div>
      <a class="clear-tag" href={localizeHref('/')}>{m.home_tag_clear()}</a>
    </div>
    {#if !tagResults.length}
      <div class="empty">{m.home_tag_empty({ tag: activeTag })}</div>
    {:else}
      <div class="rows">
        {#each tagShown as m (m.id)}
          <a class="row" href={localizeHref(`/m/${m.id}`)} style="border-bottom:1px solid var(--line3);color:inherit">
            <div class="col">
              <div class="rowline">
                {#if m.name}<span class="m-name">{m.name}</span>{/if}
                <span class="res-status {m.status}">{statusLabel(m)}</span>
                {@render tagChips(m)}
              </div>
              {#if m.desc}<p class="m-desc">{m.desc}</p>{/if}
            </div>
            {#if coverImage(m)}
              <div class="photo-slot thumb">
                <img src={coverImage(m)} alt={m.name} loading="lazy" referrerpolicy="no-referrer" />
                {#if m.media.length > 1}<span class="multi-badge" aria-hidden="true">▤</span>{/if}
              </div>
            {:else if m.videoUrl}
              <div class="photo-slot thumb vid">{#if ytId(m.videoUrl)}<img src={ytThumb(m.videoUrl)} alt="" referrerpolicy="no-referrer" />{:else}<video src={m.videoUrl} muted playsinline preload="metadata"></video>{/if}</div>
            {/if}
          </a>
        {/each}
      </div>
      {#if tagResults.length > tagLimit}
        <div class="morewrap"><button class="more" onclick={() => (tagLimit += PAGE)}>{m.home_more({ count: tagResults.length - tagLimit })}</button></div>
      {/if}
    {/if}
  </div>
{:else}
<Deck cards={data.cards} />

<div class="wrap">
  <div class="tabs">
    <button class="tab {tab === 'new' ? 'active' : ''}" onclick={() => (tab = 'new')}>{m.home_tab_new()}</button>
    <button class="tab {tab === 'steady' ? 'active' : ''}" onclick={() => (tab = 'steady')}>{m.home_tab_steady()}</button>
    <a class="tab tab-cta" href={localizeHref('/submit')}>{m.home_tab_submit()}</a>
  </div>
</div>

{#if tab === 'new'}
  <div class="wrap page">
    <div class="list-head">
      <div class="count">{m.home_count_items({ count: news.length })}</div>
      <div class="seg" role="group" aria-label={m.home_sort_aria()}>
        <button class={newSort === 'recent' ? 'on' : ''} onclick={() => (newSort = 'recent')}>{m.home_sort_recent()}</button>
        <button class={newSort === 'name' ? 'on' : ''} onclick={() => (newSort = 'name')}>{m.home_sort_name()}</button>
        <button class={newSort === 'comments' ? 'on' : ''} onclick={() => (newSort = 'comments')}>{m.home_sort_comments()}</button>
      </div>
    </div>
    {#if !news.length}
      <div class="empty">{m.home_new_empty()}</div>
    {:else}
      <div class="rows">
        {#each newsShown as m (m.id)}
          <a class="row" href={localizeHref(`/m/${m.id}`)} style="border-bottom:1px solid var(--line3);color:inherit">
            <div class="col">
              <div class="rowline">
                {#if m.name}<span class="m-name">{m.name}</span>{/if}
                {@render tagChips(m)}
              </div>
              {#if m.desc}<p class="m-desc">{m.desc}</p>{/if}
              <div class="m-meta">{metaNew(m)}</div>
            </div>
            {#if coverImage(m)}
              <div class="photo-slot thumb">
                <img src={coverImage(m)} alt={m.name} loading="lazy" referrerpolicy="no-referrer" />
                {#if m.media.length > 1}<span class="multi-badge" aria-hidden="true">▤</span>{/if}
              </div>
            {:else if m.videoUrl}
              <div class="photo-slot thumb vid">{#if ytId(m.videoUrl)}<img src={ytThumb(m.videoUrl)} alt="" referrerpolicy="no-referrer" />{:else}<video src={m.videoUrl} muted playsinline preload="metadata"></video>{/if}</div>
            {/if}
          </a>
        {/each}
      </div>
      {#if news.length > newLimit}
        <div class="morewrap"><button class="more" onclick={() => (newLimit += PAGE)}>{m.home_more({ count: news.length - newLimit })}</button></div>
      {/if}
    {/if}
  </div>
{:else}
  <div class="wrap page">
    <div class="list-head">
      <div class="note">{m.home_steady_note()}</div>
    </div>
    <div class="cats">
      {#each cats as c (c)}
        <button class="cat {steadyCat === c ? 'on' : ''}" onclick={() => (steadyCat = c)}>{c === '전체' ? m.home_cat_all() : catLabel(c, getLocale() === 'en')}</button>
      {/each}
    </div>
    {#if !steadyList.length}
      <div class="empty">{m.home_steady_empty()}</div>
    {:else}
      <div class="rows">
        {#each steadyShown as m, i (m.id)}
          <a class="dict-row" href={localizeHref(`/m/${m.id}`)} style="color:inherit">
            <div class="dict-idx">{String(i + 1).padStart(2, '0')}</div>
            <div class="col">
              <div class="dict-head">
                {#if m.name}<span class="m-name">{m.name}</span>{/if}
                {@render tagChips(m)}
              </div>
              {#if m.desc}<p class="m-desc" style="font-size:14px;margin:5px 0 0;">{m.desc}</p>{/if}
              <div class="m-meta">{metaSteady(m)}</div>
            </div>
            {#if coverImage(m)}
              <div class="photo-slot thumb">
                <img src={coverImage(m)} alt={m.name} loading="lazy" referrerpolicy="no-referrer" />
                {#if m.media.length > 1}<span class="multi-badge" aria-hidden="true">▤</span>{/if}
              </div>
            {:else if m.videoUrl}
              <div class="photo-slot thumb vid">{#if ytId(m.videoUrl)}<img src={ytThumb(m.videoUrl)} alt="" referrerpolicy="no-referrer" />{:else}<video src={m.videoUrl} muted playsinline preload="metadata"></video>{/if}</div>
            {/if}
          </a>
        {/each}
      </div>
      {#if steadyList.length > steadyLimit}
        <div class="morewrap"><button class="more" onclick={() => (steadyLimit += PAGE)}>{m.home_more({ count: steadyList.length - steadyLimit })}</button></div>
      {/if}
    {/if}
    {#if deads.length}
      <div class="obits">
        <div class="obits-head">{m.home_obit_head()} <span class="obits-sub">{m.home_obit_sub({ count: deads.length })}</span></div>
        {#each deads as d (d.id)}
          <a class="obit-row" href={localizeHref(`/m/${d.id}`)} style="color:inherit">
            <span class="obit-name">{d.name}</span>
            <span class="obit-date">{m.home_obit_declared()}</span>
          </a>
        {/each}
      </div>
    {/if}
  </div>
{/if}
{/if}
