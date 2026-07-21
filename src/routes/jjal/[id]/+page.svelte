<script lang="ts">
  // 짤 상세 — 검색 유입의 착지점. 메타는 문서마다 고유해야 한다(네이버: 전 페이지 동일 title 불이익).
  import { page } from '$app/state';
  import { copyImage, download, isGif } from '$lib/client/jjalImage';

  let { data } = $props();

  const j = $derived(data.jjal);
  const kws = $derived(j.keywords || []);
  const url = $derived(`${page.url.origin}/jjal/${j.id}`);

  // 캡션이 곧 title이다 — 판정 단계에서 만든 한국어 한 문장이 검색 결과에 그대로 노출된다
  const title = $derived(`${j.caption || `짤 #${j.id}`} · 짤 보관소 | memedics`);
  const desc = $derived(
    j.caption
      ? `${j.caption} · ${kws.length ? kws.join(', ') + ' 상황에 쓰는 짤입니다. ' : ''}복사·다운로드해서 메신저에 바로 쓰세요.`
      : '상황에 맞는 짤을 복사·다운로드해서 메신저에 바로 쓰세요.'
  );

  // 이미지 검색이 막힌 상황에서 alt는 남은 몇 안 되는 통제 수단이다(docs/jjal-seo-plan.md)
  const alt = $derived(j.caption ? `${j.caption} 짤` : '짤 이미지');

  const ld = $derived(
    JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'ImageObject',
      contentUrl: j.image_url,
      thumbnailUrl: j.thumb_url || j.image_url,
      caption: j.caption || undefined,
      keywords: kws.length ? kws.join(', ') : undefined,
      width: j.width || undefined,
      height: j.height || undefined,
      representativeOfPage: true,
      url,
    })
  );

  let copyLabel = $state('복사');

  async function onCopy() {
    copyLabel = (await copyImage(j.image_url)) ? '복사됨!' : '실패 — 다운로드를 이용하세요';
    setTimeout(() => (copyLabel = '복사'), 1500);
  }
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="description" content={desc} />
  <link rel="canonical" href={url} />
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="memedics" />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={desc} />
  <meta property="og:url" content={url} />
  <meta property="og:image" content={j.image_url} />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={title} />
  <meta name="twitter:description" content={desc} />
  <meta name="twitter:image" content={j.image_url} />
  {@html `<script type="application/ld+json">${ld}<\/script>`}
</svelte:head>

<div class="wrap">
  <nav class="crumb"><a href="/jjal">짤 보관소</a> <span>›</span> {j.caption || `짤 #${j.id}`}</nav>

  <article>
    <img
      class="hero"
      src={j.image_url}
      {alt}
      width={j.width || undefined}
      height={j.height || undefined}
    />

    {#if j.caption}<h1>{j.caption}</h1>{/if}

    <div class="actions">
      {#if isGif(j.image_url)}
        <!-- GIF는 복사하면 정지 이미지가 된다 — 다운로드가 기본 -->
        <button class="primary" onclick={() => download(j.image_url, j.id)}>GIF 저장</button>
      {:else}
        <button class="primary" onclick={onCopy}>{copyLabel}</button>
        <button onclick={() => download(j.image_url, j.id)}>다운로드</button>
      {/if}
      {#if j.meme_id}<a href="/m/{j.meme_id}">밈 사전에서 보기</a>{/if}
      {#if j.source_url}<a href={j.source_url} target="_blank" rel="noopener noreferrer">출처</a>{/if}
    </div>

    {#if kws.length}
      <!-- 키워드는 텍스트로도 남긴다 — 이 페이지가 가진 거의 유일한 색인 재료다 -->
      <ul class="kws">
        {#each kws as k (k)}
          <li><a href="/jjal?q={encodeURIComponent(k)}">{k}</a></li>
        {/each}
      </ul>
    {/if}
  </article>

  {#if data.related.length}
    <section class="related">
      <h2>비슷한 짤</h2>
      <div class="grid">
        {#each data.related as r (r.id)}
          <a href="/jjal/{r.id}">
            <img
              src={r.thumb_url || r.image_url}
              alt={r.caption ? `${r.caption} 짤` : '짤'}
              loading="lazy"
              style:aspect-ratio={r.width && r.height ? `${r.width}/${r.height}` : undefined}
            />
          </a>
        {/each}
      </div>
    </section>
  {/if}
</div>

<style>
  .wrap {
    max-width: 720px;
    margin: 0 auto;
    padding: 16px;
  }
  .crumb {
    font-size: 0.85rem;
    color: var(--muted, #888);
    margin-bottom: 12px;
  }
  .crumb a {
    color: inherit;
  }
  .crumb span {
    margin: 0 4px;
  }
  .hero {
    width: 100%;
    height: auto;
    max-height: 70vh;
    object-fit: contain;
    display: block;
    border-radius: 12px;
    background: var(--line4, #eee);
  }
  h1 {
    font-size: 1.15rem;
    line-height: 1.5;
    margin: 14px 0 0;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 14px;
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
  .kws {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    list-style: none;
    padding: 0;
    margin: 16px 0 0;
  }
  .kws a {
    display: block;
    padding: 5px 12px;
    border: 1px solid var(--line);
    border-radius: 999px;
    font-size: 0.85rem;
    text-decoration: none;
    color: inherit;
  }
  .kws a:hover {
    border-color: var(--accent);
  }
  .related {
    margin-top: 36px;
  }
  .related h2 {
    font-size: 1rem;
    margin: 0 0 10px;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 10px;
  }
  .grid img {
    width: 100%;
    display: block;
    border-radius: 10px;
    background: var(--line4, #eee);
  }
</style>
