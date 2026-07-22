<script lang="ts">
  // 짤 보관소 — 검색 → 메이슨리 그리드 → 클릭 시 확대 + 복사·다운로드.
  // 메이슨리는 CSS columns가 아니라 JS 열 분배(설계서 6장: 순서 보존·append 시 재배치 방지).
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { copyImage, download, isGif } from '$lib/client/jjalImage';

  let { data } = $props();

  type Jjal = (typeof data.jjals)[number];

  let q = $state('');
  let jjals = $state<Jjal[]>(data.jjals);
  let searching = $state(false);
  let searched = $state(false);
  let sel = $state<Jjal | null>(null);
  let copyLabel = $state('복사');
  let cols = $state(3);

  function calcCols() {
    const w = window.innerWidth;
    cols = w < 480 ? 2 : w < 900 ? 3 : w < 1280 ? 4 : 5;
  }
  onMount(() => {
    calcCols();
    // 상세 페이지의 키워드 링크(/jjal?q=퇴근)로 들어온 경우 바로 그 검색을 재현한다
    const initial = page.url.searchParams.get('q');
    if (initial) search(initial);
  });

  // 현재 높이가 가장 낮은 열에 다음 아이템을 넣는다 — 유사도 순서가 좌→우로 유지된다
  const columns = $derived.by(() => {
    const buckets: Jjal[][] = Array.from({ length: cols }, () => []);
    const heights = new Array(cols).fill(0);
    for (const j of jjals) {
      const i = heights.indexOf(Math.min(...heights));
      buckets[i].push(j);
      heights[i] += (j.height || 300) / (j.width || 300);
    }
    return buckets;
  });

  async function search(term?: string) {
    const query = (term ?? q).trim();
    if (term !== undefined) q = term;
    if (!query) return;
    searching = true;
    try {
      const r = await fetch('/jjal/search', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ q: query }),
      });
      if (r.ok) {
        jjals = (await r.json()).jjals;
        searched = true;
      }
    } finally {
      searching = false;
    }
  }

  async function onCopy(j: Jjal) {
    copyLabel = (await copyImage(j.image_url)) ? '복사됨!' : '실패 — 다운로드를 이용하세요';
    setTimeout(() => (copyLabel = '복사'), 1500);
  }
</script>

<svelte:window onresize={calcCols} />
<svelte:head>
  <title>짤 보관소 · 상황별 웃긴 짤 검색 | memedics</title>
  <meta
    name="description"
    content="퇴근·현타·어이없음 같은 상황과 감정으로 짤을 검색하고, 복사·다운로드해서 메신저에 바로 쓰세요."
  />
  <link rel="canonical" href="{page.url.origin}/jjal" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="memedics" />
  <meta property="og:title" content="짤 보관소 · 상황별 웃긴 짤 검색" />
  <meta
    property="og:description"
    content="상황과 감정으로 검색해서 딱 맞는 짤을 찾고 바로 복사하세요."
  />
  <meta property="og:url" content="{page.url.origin}/jjal" />
  <meta name="twitter:card" content="summary_large_image" />
</svelte:head>

<div class="wrap">
  <header class="top">
    <h1>짤 보관소</h1>
    <form
      onsubmit={(e) => {
        e.preventDefault();
        search();
      }}
    >
      <input
        type="search"
        bind:value={q}
        placeholder="상황·감정으로 검색 — 비, 어이없음, 퇴근…"
        maxlength="50"
        enterkeyhint="search"
      />
      <button type="submit" disabled={searching}>{searching ? '…' : '검색'}</button>
    </form>
    <div class="chips">
      {#each data.chips as c (c)}
        <button class="chip" onclick={() => search(c)}>{c}</button>
      {/each}
    </div>
  </header>

  {#if searched && !jjals.length}
    <p class="empty">이 검색어로는 아직 짤이 없어요</p>
  {:else}
    <div class="grid" style:--cols={cols}>
      {#each columns as col, ci (ci)}
        <div class="col">
          {#each col as j (j.id)}
            <!-- href는 크롤러용(색인 경로), 클릭은 모달 — onClick 전용 링크는 네이버·구글 모두 못 따라간다 -->
            <a
              class="cell"
              href="/jjal/{j.id}"
              onclick={(e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey) return; // 새 탭 열기는 그대로 둔다
                e.preventDefault();
                sel = j;
              }}
            >
              <img
                src={j.thumb_url || j.image_url}
                alt={j.caption || '짤'}
                loading="lazy"
                style:aspect-ratio={j.width && j.height ? `${j.width}/${j.height}` : undefined}
              />
            </a>
          {/each}
        </div>
      {/each}
    </div>
  {/if}

  <!-- 태그 랜딩 앵커 — 크롤러가 /jjal에서 태그 페이지로 내려가는 경로(칩 버튼은 크롤 불가) -->
  <nav class="taglinks">
    <h2>태그로 보기</h2>
    <ul>
      {#each data.tags as t (t.keyword)}
        <li><a href="/jjal/tag/{encodeURIComponent(t.keyword)}">{t.title}</a></li>
      {/each}
    </ul>
  </nav>
</div>

{#if sel}
  <div
    class="modal"
    role="dialog"
    aria-modal="true"
    tabindex="-1"
    onclick={() => (sel = null)}
    onkeydown={(e) => e.key === 'Escape' && (sel = null)}
  >
    <div class="sheet" role="presentation" onclick={(e) => e.stopPropagation()}>
      <img src={sel.image_url} alt={sel.caption || '짤'} />
      {#if sel.caption}<p class="cap">{sel.caption}</p>{/if}
      <div class="actions">
        {#if isGif(sel.image_url)}
          <!-- GIF는 복사하면 정지 이미지가 된다 — 다운로드가 기본 -->
          <button class="primary" onclick={() => download(sel!.image_url, sel!.id)}>GIF 저장</button>
        {:else}
          <button class="primary" onclick={() => onCopy(sel!)}>{copyLabel}</button>
          <button onclick={() => download(sel!.image_url, sel!.id)}>다운로드</button>
        {/if}
        <a href="/jjal/{sel.id}">자세히</a>
        {#if sel.meme_id}
          <a href="/m/{sel.meme_id}">밈 사전에서 보기</a>
        {/if}
        {#if sel.source_url}
          <a href={sel.source_url} target="_blank" rel="noopener noreferrer">출처</a>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .wrap {
    max-width: 1280px;
    margin: 0 auto;
    padding: 16px;
  }
  .top h1 {
    font-size: 1.3rem;
    margin: 0 0 10px;
  }
  form {
    display: flex;
    gap: 8px;
  }
  input[type='search'] {
    flex: 1;
    padding: 10px 14px;
    border: 1px solid var(--line);
    border-radius: 10px;
    background: var(--surface);
    color: inherit;
    font-size: 1rem;
  }
  form button {
    padding: 10px 18px;
    border: 0;
    border-radius: 10px;
    background: var(--accent);
    color: #fff;
    cursor: pointer;
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin: 10px 0 16px;
  }
  .chip {
    padding: 5px 12px;
    border: 1px solid var(--line);
    border-radius: 999px;
    background: var(--surface);
    color: inherit;
    cursor: pointer;
    font-size: 0.85rem;
  }
  .chip:hover {
    border-color: var(--accent);
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(var(--cols), 1fr);
    gap: 10px;
    align-items: start;
  }
  .col {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .cell {
    padding: 0;
    border: 0;
    background: none;
    cursor: zoom-in;
    border-radius: 10px;
    overflow: hidden;
  }
  .cell img {
    width: 100%;
    display: block;
    border-radius: 10px;
    background: var(--line4, #eee);
  }
  .empty {
    text-align: center;
    color: var(--muted, #888);
    padding: 48px 0;
  }
  .taglinks {
    margin-top: 32px;
  }
  .taglinks h2 {
    font-size: 1rem;
    margin-bottom: 8px;
  }
  .taglinks ul {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    list-style: none;
    padding: 0;
    margin: 0;
  }
  .taglinks a {
    display: inline-block;
    padding: 4px 12px;
    border: 1px solid var(--line, #ddd);
    border-radius: 999px;
    font-size: 0.85rem;
    text-decoration: none;
    color: inherit;
  }
  .modal {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 50;
    padding: 16px;
  }
  .sheet {
    background: var(--surface);
    border-radius: 14px;
    max-width: min(92vw, 560px);
    max-height: 90vh;
    overflow: auto;
    padding: 12px;
  }
  .sheet img {
    max-width: 100%;
    max-height: 65vh;
    display: block;
    margin: 0 auto;
    border-radius: 10px;
  }
  .cap {
    font-size: 0.9rem;
    color: var(--muted, #666);
    margin: 10px 2px 0;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 12px;
    align-items: center;
  }
  .actions button,
  .actions a {
    padding: 9px 16px;
    border-radius: 10px;
    border: 1px solid var(--line);
    background: var(--surface);
    color: inherit;
    cursor: pointer;
    text-decoration: none;
    font-size: 0.9rem;
  }
  .actions .primary {
    background: var(--accent);
    border-color: var(--accent);
    color: #fff;
  }
</style>
