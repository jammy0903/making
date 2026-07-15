<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { login } from '$lib/client/auth';
  import { user } from '$lib/client/session.svelte';
  import {
    submitMeme,
    fetchMySubmissions,
    withdrawSubmission,
    fetchRegisteredMemes,
    type Submission,
    type RegisteredMeme,
  } from '$lib/client/api';
  import { timeAgo } from '$lib/cards';

  const norm = (s: string) => (s || '').toLowerCase().replace(/\s+/g, '');

  let name = $state('');
  let description = $state('');
  let example = $state('');
  let sourceUrl = $state('');
  let tagsText = $state('');

  let mine = $state<Submission[]>([]);
  let memesIdx = $state<RegisteredMeme[]>([]);
  let loaded = $state(false);
  let busy = $state(false);
  let err = $state('');
  let ok = $state('');

  // 중복 판정: 정확 일치(등록 밈 이름/키워드) > 본인 검토중 신청 > 유사(부분 포함)
  const nn = $derived(norm(name));
  const dup = $derived.by(() => {
    if (nn.length < 2) return null;
    const exact = memesIdx.find((m) => norm(m.name) === nn || (m.keywords || []).some((k) => norm(k) === nn));
    if (exact) return { kind: 'registered' as const, id: exact.id, name: exact.name };
    const pend = mine.find((s) => s.status === 'pending' && norm(s.name) === nn);
    if (pend) return { kind: 'pending' as const, id: pend.id, name: pend.name };
    const sim = memesIdx.find((m) => {
      const mnk = norm(m.name);
      return mnk.length >= 2 && (mnk.includes(nn) || nn.includes(mnk));
    });
    if (sim) return { kind: 'similar' as const, id: sim.id, name: sim.name };
    return null;
  });
  const blockDup = $derived(!!dup && (dup.kind === 'registered' || dup.kind === 'pending'));

  async function load() {
    // 등록 밈 목록은 로그인 없이도 대조 가능(공개 읽기)
    try {
      memesIdx = await fetchRegisteredMemes();
    } catch (e) {
      console.error('등록 밈 조회 오류:', e);
    }
    if (!user.current) return;
    try {
      mine = await fetchMySubmissions();
    } catch (e) {
      err = '내 신청 목록을 불러오지 못했어요.';
      console.error('신청 조회 오류:', e);
    }
    loaded = true;
  }
  onMount(load);
  // 로그인 세션은 레이아웃 onMount 이후 채워지므로, 채워지면 한 번 불러온다
  $effect(() => {
    if (user.current && !loaded) load();
  });

  async function submit() {
    const nm = name.trim();
    err = '';
    ok = '';
    if (!nm) {
      err = '밈 이름은 필수예요.';
      return;
    }
    if (blockDup) {
      err = dup?.kind === 'pending' ? '이미 신청해 검토 중인 밈이에요.' : '이미 등록된 밈이에요. 목록에서 확인해 주세요.';
      return;
    }
    if (!user.current) return;
    busy = true;
    try {
      const row = await submitMeme(
        {
          name: nm,
          description: description.trim(),
          example: example.trim(),
          source_url: sourceUrl.trim(),
          tags: tagsText.split(/[,\n]/).map((t) => t.trim()).filter(Boolean),
        },
        user.current
      );
      mine = [row, ...mine];
      name = '';
      description = '';
      example = '';
      sourceUrl = '';
      tagsText = '';
      ok = '신청이 접수됐어요. 관리자 검토 후 등록됩니다.';
    } catch (e) {
      err = '신청에 실패했어요. 잠시 후 다시 시도해 주세요.';
      console.error('신청 오류:', e);
    }
    busy = false;
  }

  async function withdraw(id: number) {
    err = '';
    ok = '';
    try {
      await withdrawSubmission(id);
      mine = mine.map((s) =>
        s.id === id ? { ...s, status: 'withdrawn', withdrawn_at: new Date().toISOString() } : s
      );
    } catch (e) {
      err = '철회에 실패했어요.';
      console.error('철회 오류:', e);
    }
  }

  const label = (s: Submission['status']) =>
    s === 'pending' ? '검토 대기' : s === 'accepted' ? '등록됨' : s === 'rejected' ? '반려' : '철회됨';
</script>

<svelte:head>
  <title>밈 신청 — memedics</title>
  <meta name="description" content="새로 뜬 밈을 memedics에 신청하세요. 로그인한 회원이 제안하면 관리자 검토 후 등록됩니다." />
  <meta name="robots" content="noindex" />
  <link rel="canonical" href="{page.url.origin}/submit" />
</svelte:head>

<div class="wrap-narrow legal">
  <a class="back" href="/" style="border:none">← 홈으로</a>
  <h1>밈 신청</h1>
  <p class="lead">
    새로 뜬 밈을 직접 제안할 수 있어요. 기계 발굴과 마찬가지로 <strong>제안은 회원, 등록 결정은 관리자</strong>가 합니다.
    접수·철회·등록·반려는 모두 기록으로 남습니다.
  </p>

  {#if !user.current}
    <div class="subgate">
      <p>밈을 신청하려면 로그인이 필요해요.</p>
      <button class="btn-solid" onclick={login}>Google 계정으로 로그인</button>
    </div>
  {:else}
    <div class="subform">
      <div class="subrow">
        <label for="s-name">밈 이름 <span class="req">*</span></label>
        <input id="s-name" bind:value={name} maxlength="60" placeholder="예: 중꺾마" />
        {#if dup}
          {#if dup.kind === 'registered'}
            <div class="dup dup-warn">이미 등록된 밈이에요 — <a href="/m/{dup.id}">‘{dup.name}’ 보러가기 →</a></div>
          {:else if dup.kind === 'pending'}
            <div class="dup dup-warn">이미 신청해서 검토 중인 밈이에요.</div>
          {:else}
            <div class="dup dup-info">비슷한 밈이 있어요 — <a href="/m/{dup.id}">‘{dup.name}’ 확인 →</a></div>
          {/if}
        {/if}
      </div>
      <div class="subrow">
        <label for="s-desc">뜻 · 설명</label>
        <textarea id="s-desc" bind:value={description} placeholder="이 밈이 무슨 뜻인지, 어떤 상황에서 쓰이는지"></textarea>
      </div>
      <div class="subrow">
        <label for="s-ex">사용 예 · 맥락</label>
        <textarea id="s-ex" bind:value={example} placeholder="실제로 쓰인 문장이나 어디서 봤는지"></textarea>
      </div>
      <div class="subrow">
        <label for="s-src">출처 링크 (선택)</label>
        <input id="s-src" bind:value={sourceUrl} placeholder="https://" />
      </div>
      <div class="subrow">
        <label for="s-tags">태그 (쉼표로 구분, 선택)</label>
        <input id="s-tags" bind:value={tagsText} placeholder="유행어, 커뮤니티" />
      </div>
      <div class="subfoot">
        {#if err}<span class="cerr" role="alert">{err}</span>{/if}
        {#if ok}<span class="cok" role="status">{ok}</span>{/if}
        <button class="btn-solid" onclick={submit} disabled={busy || blockDup}>{busy ? '접수 중…' : '신청하기'}</button>
      </div>
    </div>

    <h2>내 신청</h2>
    {#if !loaded}
      <div class="empty">불러오는 중…</div>
    {:else if !mine.length}
      <div class="empty">아직 신청한 밈이 없어요.</div>
    {:else}
      <div class="rows">
        {#each mine as s (s.id)}
          <div class="sub-item">
            <div class="col">
              <div class="sub-line">
                <span class="sub-name">{s.name}</span>
                <span class="sub-status {s.status}">{label(s.status)}</span>
              </div>
              {#if s.description}<p class="m-desc" style="font-size:14px;margin:5px 0 0">{s.description}</p>{/if}
              <div class="m-meta" style="margin-top:6px">{timeAgo(s.created_at)}</div>
            </div>
            {#if s.status === 'pending'}
              <button class="btn" onclick={() => withdraw(s.id)}>신청 철회</button>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  {/if}
</div>
