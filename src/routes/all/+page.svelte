<script lang="ts">
  import { page } from '$app/state';
  import { m } from '$lib/paraglide/messages';
  import { localizeHref } from '$lib/paraglide/runtime';
  let { data } = $props();
</script>

<svelte:head>
  <title>{m.all_head_title()}</title>
  <meta name="description" content={m.all_head_desc()} />
  <link rel="canonical" href="{page.url.origin}{localizeHref('/all')}" />
</svelte:head>

<div class="wrap masthead">
  <div class="eyebrow">Index</div>
  <h1>{m.all_h1()}</h1>
  <p class="lede">{m.all_lede({ count: data.memes.length })}</p>
  <div class="rule"></div>
</div>

<div class="wrap page">
  <ul class="index-list">
    {#each data.memes as item (item.id)}
      <li><a href={localizeHref(`/m/${item.id}`)}>{item.name}</a></li>
    {/each}
  </ul>
</div>
