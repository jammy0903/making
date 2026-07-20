<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { initAuth, login, logout, whoami, type AuthUser } from '$lib/client/auth';
  import { setUser, user } from '$lib/client/session.svelte';
  import WalkingDog from '$lib/components/WalkingDog.svelte';
  import { page } from '$app/state';
  import { m } from '$lib/paraglide/messages';
  import { getLocale, setLocale, localizeHref, deLocalizeHref } from '$lib/paraglide/runtime';

  let { children } = $props();

  // hreflang: 현재 경로의 ko(무접두)·en(/en/) 대체 URL을 상호 연결(SEO)
  const koPath = $derived(deLocalizeHref(page.url.pathname));
  const enPath = $derived(localizeHref(koPath, { locale: 'en' }));
  const origin = $derived(page.url.origin);

  // 상단 세그먼트 네비 활성 표시 (locale 접두 제거한 경로로 판정)
  const navHome = $derived(koPath === '/');
  const navGame = $derived(koPath.startsWith('/game'));
  const navEra = $derived(koPath.startsWith('/era'));

  let theme = $state<'light' | 'dark'>('light');

  // 맨 위로 버튼: 한 화면 이상 내려갔을 때만 노출
  let showTop = $state(false);

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

  function onScroll() {
    showTop = window.scrollY > window.innerHeight;
  }

  function scrollTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
</script>

<svelte:window onscroll={onScroll} />

<svelte:head>
  <link rel="alternate" hreflang="ko" href="{origin}{koPath}" />
  <link rel="alternate" hreflang="en" href="{origin}{enPath}" />
  <link rel="alternate" hreflang="x-default" href="{origin}{koPath}" />
</svelte:head>

<div class="topbar">
  <div class="wrap tb-inner">
    <a class="tb-brand" href={localizeHref('/')} style="border:none;color:inherit" aria-label={m.tb_brand_home()}>
      <img class="tb-logo" src="/logo-mark.png" alt="" width="24" height="24" />
      <span>memedics</span>
    </a>
    <nav class="tb-nav" aria-label={m.tb_brand_home()}>
      <a class="tb-seg" class:on={navHome} href={localizeHref('/')} aria-current={navHome ? 'page' : undefined}>{m.nav_home()}</a>
      <a class="tb-seg" class:on={navGame} href={localizeHref('/game')} aria-current={navGame ? 'page' : undefined}>{m.nav_game()}</a>
      <a class="tb-seg" class:on={navEra} href={localizeHref('/era')} aria-current={navEra ? 'page' : undefined}>{m.nav_era()}</a>
    </nav>
    <span class="tb-auth">
      <button
        class="tb-theme"
        onclick={toggleTheme}
        aria-label={theme === 'dark' ? m.theme_to_light() : m.theme_to_dark()}
        title={theme === 'dark' ? m.theme_light() : m.theme_dark()}
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
        <button class="tb-link" onclick={logout}>{m.nav_logout()}</button> ·
        <a class="tb-link" href="/withdraw.html">{m.nav_withdraw()}</a>
      {:else}
        <button class="tb-link" onclick={login}>{m.nav_login()}</button>
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
      <a href={localizeHref('/game')}>{m.nav_game()}</a>
      <a href={localizeHref('/era')}>{m.nav_era()}</a>
      <a href={localizeHref('/all')}>{m.nav_all()}</a>
      <a href={localizeHref('/submit')}>{m.nav_submit()}</a>
      <a href={localizeHref('/about')}>{m.nav_about()}</a>
      <a href={localizeHref('/privacy')}>{m.nav_privacy()}</a>
      <a href={localizeHref('/terms')}>{m.nav_terms()}</a>
      <a href="mailto:jamm2ic@gmail.com">{m.nav_contact()}</a>
    </nav>
    <div class="ft-copy">© 2026 memedics</div>
  </div>
</footer>

{#if showTop}
  <button
    class="to-top"
    onclick={scrollTop}
    aria-label={getLocale() === 'en' ? 'Back to top' : '맨 위로 이동'}
    title={getLocale() === 'en' ? 'Back to top' : '맨 위로'}
  >↑</button>
{/if}

<!-- 하우스 광고: 화면 아래를 걸어다니는 강아지 (dog-walk 크롬 확장) -->
<WalkingDog />

<style>
  /* 걸어다니는 강아지(z-index 6, bottom 4px) 위로 겹치지 않게 띄움 */
  .to-top {
    position: fixed;
    right: 16px;
    bottom: 56px;
    z-index: 7;
    width: 42px;
    height: 42px;
    border-radius: 50%;
    border: 1px solid var(--accent-border);
    background: var(--surface);
    color: var(--accent);
    font-size: 18px;
    line-height: 1;
    cursor: pointer;
    box-shadow: 0 2px 10px rgb(0 0 0 / 0.14);
  }

  .to-top:hover {
    background: var(--accent-bg);
  }

  @media (max-width: 640px) {
    .to-top {
      right: 12px;
      bottom: 48px;
      width: 38px;
      height: 38px;
    }
  }
</style>
