<script lang="ts">
  import { page } from '$app/state';
  import { m } from '$lib/paraglide/messages';
  import { localizeHref } from '$lib/paraglide/runtime';
</script>

<svelte:head>
  <title>{m.about_head_title()}</title>
  <meta name="description" content={m.about_head_desc()} />
  <link rel="canonical" href="{page.url.origin}{localizeHref('/about')}" />
</svelte:head>

<div class="wrap-narrow legal">
  <a class="back" href={localizeHref('/')} style="border:none">{m.about_back()}</a>
  <h1>{m.about_title()}</h1>
  <p class="updated">{m.about_subtitle()}</p>

  <p class="lead">{@html m.about_lead()}</p>

  <h2>{m.about_h_measure()}</h2>
  <p>{@html m.about_p_measure()}</p>

  <h2>{m.about_h_decide()}</h2>
  <p>{@html m.about_p_decide()}</p>

  <h2>{m.about_h_vote()}</h2>
  <p>{@html m.about_p_vote()}</p>

  <p style="margin-top:30px">
    {m.about_contact()}<a href="mailto:jamm2ic@gmail.com">jamm2ic@gmail.com</a>
  </p>
</div>
