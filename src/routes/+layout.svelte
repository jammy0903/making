<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { initAuth, login, logout, whoami, type AuthUser } from '$lib/client/auth';
  import { setUser, user } from '$lib/client/session.svelte';
  import WalkingDog from '$lib/components/WalkingDog.svelte';
  import { m } from '$lib/paraglide/messages';
  import { getLocale, setLocale, localizeHref } from '$lib/paraglide/runtime';

  let { children } = $props();

  let theme = $state<'light' | 'dark'>('light');

  onMount(async () => {
    // 테마: 저장된 선호 우선, 없으면 시스템 설정
    const stored = localStorage.getItem('mmd-theme');
    theme =
      stored === 'dark' || stored === 'light'
        ? stored
        : matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light';
    document.documentElement.dataset.theme = theme;

    initAuth(); // OAuth 콜백(#access_token) 처리
    try {
      const u: AuthUser | null = await whoami();
      if (u) setUser(u);
    } catch {
      /* 로그인 실패 = 익명 진행 */
    }
  });

  function toggleTheme() {
    theme = theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('mmd-theme', theme);
    document.documentElement.dataset.theme = theme;
  }
</script>

<div class="topbar">
  <div class="wrap tb-inner">
    <a class="tb-brand" href="/" style="border:none;color:inherit" aria-label="memedics 홈">
      <img class="tb-logo" src="/logo-mark.png" alt="" width="24" height="24" />
      <span>memedics</span>
    </a>
    <span class="tb-auth">
      <button
        class="tb-theme"
        onclick={toggleTheme}
        aria-label={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
        title={theme === 'dark' ? '라이트 모드' : '다크 모드'}
      >{theme === 'dark' ? '☀' : '☾'}</button>
      ·
      <button
        class="tb-link"
        onclick={() => setLocale(getLocale() === 'en' ? 'ko' : 'en')}
        aria-label={getLocale() === 'en' ? '한국어로 전환' : 'Switch to English'}
      >{getLocale() === 'en' ? 'KO' : 'EN'}</button>
      ·
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
      <span class="ft-tag">{m.brand_tagline()}</span>
    </div>
    <nav class="ft-nav">
      <a href={localizeHref('/all')}>{m.nav_all()}</a>
      <a href={localizeHref('/submit')}>{m.nav_submit()}</a>
      <a href={localizeHref('/about')}>{m.nav_about()}</a>
      <a href={localizeHref('/privacy')}>개인정보처리방침</a>
      <a href={localizeHref('/terms')}>이용약관</a>
      <a href="mailto:jamm2ic@gmail.com">문의</a>
    </nav>
    <div class="ft-copy">© 2026 memedics</div>
  </div>
</footer>

<!-- 하우스 광고: 화면 아래를 걸어다니는 강아지 (dog-walk 크롬 확장) -->
<WalkingDog />
