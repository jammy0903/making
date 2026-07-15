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

<footer class="site-footer">
  <div class="wrap ft-inner">
    <div class="ft-brand">
      <span class="ft-word">memedics</span>
      <span class="ft-tag">한국 밈 트렌드 사전 · 측정은 기계가, 판정은 사람이</span>
    </div>
    <nav class="ft-nav">
      <a href="/about">소개</a>
      <a href="/privacy">개인정보처리방침</a>
      <a href="/terms">이용약관</a>
      <a href="mailto:contact@memedics.space">문의</a>
    </nav>
    <div class="ft-copy">© 2026 memedics</div>
  </div>
</footer>
