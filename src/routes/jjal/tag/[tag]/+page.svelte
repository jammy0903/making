<script lang="ts">
  // 태그 랜딩 — "○○ 짤" 검색의 착지점. 도입 문단 + 앵커 그리드(크롤 가능한 링크가 생명).
  import { page } from '$app/state';

  let { data } = $props();

  const t = $derived(data.tag);
  const url = $derived(`${page.url.origin}/jjal/tag/${encodeURIComponent(t.keyword)}`);
  const title = $derived(`${t.title} · 짤 보관소 | memedics`);

  const ld = $derived(
    JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: t.title,
      description: t.intro,
      url,
    })
  );
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="description" content={t.intro} />
  <link rel="canonical" href={url} />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="memedics" />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={t.intro} />
  <meta property="og:url" content={url} />
  {#if data.jjals[0]}<meta property="og:image" content={data.jjals[0].image_url} />{/if}
  <meta name="twitter:card" content="summary_large_image" />
  {@html `<script type="application/ld+json">${ld}<\/script>`}
</svelte:head>

<div class="wrap">
  <nav class="crumb"><a href="/jjal">짤 보관소</a> <span>›</span> {t.title}</nav>

  <h1>{t.title}</h1>
  <!-- 도입 문단 — 이 페이지가 색인될 자격의 근거(thin content 방지) -->
  <p class="intro">{t.intro}</p>

  <div class="grid">
    {#each data.jjals as j (j.id)}
      <a href="/jjal/{j.id}">
        <img
          src={j.thumb_url || j.image_url}
          alt={j.caption ? `${j.caption} 짤` : `${t.keyword} 짤`}
          loading="lazy"
          style:aspect-ratio={j.width && j.height ? `${j.width}/${j.height}` : undefined}
        />
      </a>
    {/each}
  </div>

  <section class="more">
    <h2>다른 태그</h2>
    <ul>
      {#each data.others as o (o.keyword)}
        <li><a href="/jjal/tag/{encodeURIComponent(o.keyword)}">{o.title}</a></li>
      {/each}
    </ul>
  </section>
</div>

<style>
  .wrap {
    max-width: 960px;
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
  h1 {
    font-size: 1.4rem;
    margin: 0 0 8px;
  }
  .intro {
    color: var(--muted, #666);
    line-height: 1.6;
    margin: 0 0 20px;
  }
  .grid {
    columns: 3 200px;
    column-gap: 10px;
  }
  .grid a {
    display: block;
    margin-bottom: 10px;
    break-inside: avoid;
    border-radius: 8px;
    overflow: hidden;
  }
  .grid img {
    width: 100%;
    height: auto;
    display: block;
  }
  .more {
    margin-top: 32px;
  }
  .more h2 {
    font-size: 1rem;
    margin-bottom: 8px;
  }
  .more ul {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    list-style: none;
    padding: 0;
    margin: 0;
  }
  .more a {
    display: inline-block;
    padding: 4px 12px;
    border: 1px solid var(--line, #ddd);
    border-radius: 999px;
    font-size: 0.85rem;
    text-decoration: none;
    color: inherit;
  }
</style>
