<script lang="ts">
  import { page } from '$app/state';
  import { m } from '$lib/paraglide/messages';
  import { localizeHref } from '$lib/paraglide/runtime';
</script>

<svelte:head><title>{page.status} — memedics</title></svelte:head>

<div class="wrap page" style="text-align:center;padding-top:80px;">
  <h1 style="font-family:var(--serif);font-size:42px;">{page.status}</h1>
  <p style="color:var(--mute);">{page.error?.message || m.err_message()}</p>
  <p><a href={localizeHref('/')}>{m.back_home()}</a></p>
</div>
