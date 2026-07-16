<script lang="ts">
  import { page } from '$app/state';
  import { m } from '$lib/paraglide/messages';
  import { localizeHref } from '$lib/paraglide/runtime';
</script>

<svelte:head>
  <title>{m.privacy_head_title()}</title>
  <meta name="description" content={m.privacy_head_desc()} />
  <link rel="canonical" href="{page.url.origin}{localizeHref('/privacy')}" />
</svelte:head>

<div class="wrap-narrow legal">
  <a class="back" href={localizeHref('/')} style="border:none">{m.back_home()}</a>
  <h1>{m.privacy_h1()}</h1>
  <p class="updated">{m.legal_updated()}</p>
  {#if m.legal_courtesy()}<p class="updated" style="font-style:italic">{m.legal_courtesy()}</p>{/if}

  <p class="lead">{m.privacy_lead()}</p>

  <h2>{m.privacy_h_1()}</h2>
  <ul>
    <li>{@html m.privacy_li_1_1()}</li>
    <li>{@html m.privacy_li_1_2()}</li>
    <li>{@html m.privacy_li_1_3()}</li>
  </ul>

  <h2>{m.privacy_h_2()}</h2>
  <ul>
    <li>{m.privacy_li_2_1()}</li>
    <li>{m.privacy_li_2_2()}</li>
    <li>{m.privacy_li_2_3()}</li>
  </ul>

  <h2>{m.privacy_h_3()}</h2>
  <p>{@html m.privacy_p_3()}</p>

  <h2>{m.privacy_h_4()}</h2>
  <ul>
    <li>{@html m.privacy_li_4_1()}</li>
    <li>{@html m.privacy_li_4_2()}</li>
  </ul>
  <p>{m.privacy_p_4()}</p>

  <h2>{m.privacy_h_5()}</h2>
  <p>{m.privacy_p_5()}</p>

  <h2>{m.privacy_h_6()}</h2>
  <p>{m.privacy_contact()}<a href="mailto:jamm2ic@gmail.com">jamm2ic@gmail.com</a></p>
</div>
