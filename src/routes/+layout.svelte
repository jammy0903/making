<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { initAuth, login, logout, whoami, type AuthUser } from '$lib/client/auth';
  import { setUser, user } from '$lib/client/session.svelte';

  let { children } = $props();

  onMount(async () => {
    initAuth(); // OAuth 콜백(#access_token) 처리
    try {
      const u: AuthUser | null = await whoami();
      if (u) setUser(u);
    } catch {
      /* 로그인 실패 = 익명 진행 */
    }
  });
</script>

<div class="topbar">
  <div class="wrap tb-inner">
    <a class="tb-brand" href="/" style="border:none;color:inherit">memedics</a>
    <span class="tb-auth">
      {#if user.current}
        <span class="tb-user">{user.current.name}</span> ·
        <button class="tb-link" onclick={logout}>로그아웃</button> ·
        <a class="tb-link" href="/withdraw.html">탈퇴</a>
      {:else}
        <button class="tb-link" onclick={login}>Google 로그인</button>
      {/if}
    </span>
  </div>
</div>

{@render children()}
