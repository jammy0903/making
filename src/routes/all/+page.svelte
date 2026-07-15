<script lang="ts">
  import { page } from '$app/state';
  let { data } = $props();
</script>

<svelte:head>
  <title>전체 밈 목록 — memedics 밈 사전</title>
  <meta name="description" content="memedics에 등록된 모든 밈의 뜻을 한눈에. 밈 이름을 눌러 뜻과 활성도를 확인하세요." />
  <link rel="canonical" href="{page.url.origin}/all" />
</svelte:head>

<div class="wrap masthead">
  <div class="eyebrow">Index</div>
  <h1>전체 밈</h1>
  <p class="lede">memedics에 등록된 밈 {data.memes.length}개. 이름을 누르면 뜻과 활성도를 볼 수 있어요.</p>
  <div class="rule"></div>
</div>

<div class="wrap page">
  <ul class="index-list">
    {#each data.memes as m (m.id)}
      <li><a href="/m/{m.id}">{m.name}</a></li>
    {/each}
  </ul>
</div>
