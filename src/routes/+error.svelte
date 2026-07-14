<script lang="ts">
  import { page } from '$app/state';
</script>

<svelte:head><title>{page.status} — memedics</title></svelte:head>

<div class="wrap page" style="text-align:center;padding-top:80px;">
  <h1 style="font-family:var(--serif);font-size:42px;">{page.status}</h1>
  <p style="color:var(--mute);">{page.error?.message || '문제가 생겼습니다'}</p>
  <p><a href="/">← 홈으로</a></p>
</div>
