<script lang="ts">
  import { page } from '$app/state';
  import { m } from '$lib/paraglide/messages';
  import { localizeHref } from '$lib/paraglide/runtime';
</script>

<svelte:head>
  <title>{m.terms_head_title()}</title>
  <meta name="description" content={m.terms_head_desc()} />
  <link rel="canonical" href="{page.url.origin}{localizeHref('/terms')}" />
</svelte:head>

<div class="wrap-narrow legal">
  <a class="back" href={localizeHref('/')} style="border:none">{m.back_home()}</a>
  <h1>{m.terms_h1()}</h1>
  <p class="updated">{m.legal_updated()}</p>
  {#if m.legal_courtesy()}<p class="updated" style="font-style:italic">{m.legal_courtesy()}</p>{/if}

  <p class="lead">{m.terms_lead()}</p>

  <h2>{m.terms_h_1()}</h2>
  <p>{m.terms_p_1()}</p>

  <h2>{m.terms_h_2()}</h2>
  <p>{m.terms_p_2()}</p>

  <h2>{m.terms_h_3()}</h2>
  <ul>
    <li>{m.terms_li_3_1()}</li>
    <li>{m.terms_li_3_2()}</li>
    <li>{m.terms_li_3_3()}</li>
    <li>{m.terms_li_3_4()}</li>
  </ul>

  <h2>{m.terms_h_4()}</h2>
  <p>{m.terms_p_4()}</p>

  <h2>{m.terms_h_5()}</h2>
  <p>{m.terms_p_5()}</p>

  <h2>{m.terms_h_6()}</h2>
  <p>{m.terms_contact()}<a href="mailto:jamm2ic@gmail.com">jamm2ic@gmail.com</a></p>
</div>
