<script lang="ts">
  import { page } from '$app/state';
  import { tagText, timeAgo, gallery } from '$lib/cards';
  import { votedMap, sameMonth, markVoted, castVote, postComment, editComment, deleteComment, type VoteChoice } from '$lib/client/api';

  const CHOICE_LABEL: Record<VoteChoice, string> = { yes: '밈이다', no: '죽은 밈이다', notmeme: '밈이 아니다' };
  import { voteCard } from '$lib/client/share';
  import { login, isAdmin } from '$lib/client/auth';
  import { user } from '$lib/client/session.svelte';

  let { data } = $props();

  // SSR 데이터를 낙관적 UI용 로컬 상태로 복사
  let m = $state({ ...data.meme });
  let comments = $state([...data.comments]);
  $effect(() => {
    m = { ...data.meme };
    comments = [...data.comments];
  });

  const shots = $derived(gallery(m));
  let carIdx = $state(0);
  function onCarScroll(e: Event) {
    const el = e.currentTarget as HTMLElement;
    carIdx = Math.round(el.scrollLeft / el.clientWidth);
  }

  let draftNick = $state('');
  let draftText = $state('');
  let cErr = $state(''); // 댓글 등록/수정/삭제 인라인 에러
  let editingId = $state<number | null>(null);
  let editText = $state('');
  let confirmDelId = $state<number | null>(null);
  let shareLabel = $state('결과 카드 공유');
  let voteVersion = $state(0); // 투표 직후 쿨다운 재계산 트리거

  const canEdit = (c: { user_id: string | null }) =>
    !!user.current && (String(c.user_id) === String(user.current.id) || isAdmin(user.current));

  const total = $derived(m.voteYes + m.voteNo); // 생존 게이지는 밈이다 vs 죽은밈
  const yesPct = $derived(total ? Math.round((m.voteYes / total) * 100) : 0);
  const noPct = $derived(total ? 100 - yesPct : 0);
  const votedEntry = $derived.by(() => {
    voteVersion;
    if (typeof localStorage === 'undefined') return null;
    return votedMap()[String(m.id)] || null;
  });
  const votedNow = $derived(!!(votedEntry && sameMonth(votedEntry.t)));
  const voteHint = $derived(
    votedNow
      ? '이번 달 판정 완료 · 다음 달 다시'
      : votedEntry
        ? `지난 판정: ${CHOICE_LABEL[votedEntry.c as VoteChoice] ?? '판정'} · 다시 판정 가능`
        : ''
  );

  const desc = $derived(m.desc || `${m.name} — 밈 뜻과 활성도를 memedics에서 확인하세요.`);
  const pageUrl = $derived(`${page.url.origin}/m/${m.id}`);
  const ogImage = $derived(m.photoUrl || `${page.url.origin}/og-default.png`);

  async function vote(choice: VoteChoice) {
    if (votedNow) return;
    markVoted(m.id, choice);
    if (choice === 'yes') m.voteYes++;
    else if (choice === 'no') m.voteNo++;
    else m.voteNotmeme++;
    voteVersion++;
    try {
      await castVote(m.id, choice);
    } catch {
      /* 같은 달 중복(409) 등은 표시만 유지 */
    }
  }

  async function submitComment() {
    const text = draftText.trim();
    if (!text) return;
    const nick = user.current ? user.current.name : draftNick.trim() || '익명';
    cErr = '';
    try {
      const row = await postComment(m.id, nick, text, user.current);
      comments = [row, ...comments];
      m.commentCount++;
      draftText = '';
    } catch (e) {
      cErr = '댓글 등록에 실패했어요. 잠시 후 다시 시도해 주세요.';
      console.error('댓글 등록 오류:', e);
    }
  }

  function startEdit(c: { id: number; body: string }) {
    editingId = c.id;
    editText = c.body;
    confirmDelId = null;
    cErr = '';
  }

  async function saveEdit() {
    const text = editText.trim();
    if (!text || editingId == null) return;
    const id = editingId;
    cErr = '';
    try {
      await editComment(id, text);
      comments = comments.map((c) => (c.id === id ? { ...c, body: text } : c));
      editingId = null;
    } catch (e) {
      cErr = '수정에 실패했어요.';
      console.error('댓글 수정 오류:', e);
    }
  }

  async function removeComment(id: number) {
    cErr = '';
    try {
      await deleteComment(id);
      comments = comments.filter((c) => c.id !== id);
      m.commentCount = Math.max(0, m.commentCount - 1);
      confirmDelId = null;
    } catch (e) {
      cErr = '삭제에 실패했어요.';
      console.error('댓글 삭제 오류:', e);
    }
  }

  async function share() {
    shareLabel = '만드는 중…';
    try {
      const r = await voteCard(m);
      shareLabel = r === 'downloaded+copied' ? '이미지 저장 · 링크 복사됨 ✓' : r === 'downloaded' ? '이미지 저장됨 ✓' : r === 'shared' ? '공유됨 ✓' : '결과 카드 공유';
    } catch (e) {
      shareLabel = '공유 실패';
      console.error('공유 카드 오류:', e);
    }
    setTimeout(() => (shareLabel = '결과 카드 공유'), 2500);
  }

  const reg = $derived(
    m.status === 'new' ? (m.days === 0 ? '오늘 등록' : `등록 ${m.days}일 전`) : `등록 ${m.months}개월 전`
  );
</script>

<svelte:head>
  <title>{m.name} 뜻 — memedics 밈 사전</title>
  <meta name="description" content={desc} />
  <link rel="canonical" href={pageUrl} />
  <meta property="og:type" content="article" />
  <meta property="og:title" content={`${m.name} — 살았나 죽었나 | memedics`} />
  <meta property="og:description" content={desc} />
  <meta property="og:url" content={pageUrl} />
  <meta property="og:image" content={ogImage} />
  <meta name="twitter:card" content="summary_large_image" />
</svelte:head>

<div class="wrap-narrow page">
  <a class="back" href="/" style="border:none">← 목록으로</a>
  <div class="detail">
    {#if shots.length}
      <div class="carousel">
        <div class="car-track" onscroll={onCarScroll}>
          {#each shots as s, i (s.url)}
            <div class="car-item">
              {#if s.type === 'video'}
                <!-- svelte-ignore a11y_media_has_caption -->
                <video src={s.url} controls playsinline preload="metadata"></video>
              {:else}
                <img src={s.url} alt={`${m.name} ${i + 1}`} referrerpolicy="no-referrer" />
              {/if}
            </div>
          {/each}
        </div>
        {#if shots.length > 1}
          <div class="car-dots">
            {#each shots as _, i (i)}<span class="car-dot {carIdx === i ? 'on' : ''}"></span>{/each}
          </div>
        {/if}
      </div>
    {/if}
    {#if m.name}<div class="headword">{m.name}</div>{/if}
    <div class="tag-head">{tagText(m)}</div>
    <div class="reg">
      {reg}{#if m.status === 'dead'} · <span class="obit-mark">† 사망 선고</span>{/if}{#if m.src} · 출처 <a href={m.src} target="_blank" rel="noopener">{m.src}</a>{/if}
    </div>
    {#if m.desc}<p class="detail-desc">{m.desc}</p>{/if}

    <div class="vote">
      <div class="vote-row">
        <div class="vote-btns {votedNow ? 'voted' : ''}">
          <button class="vote-btn" onclick={() => vote('yes')}>밈이다</button>
          <button class="vote-btn" onclick={() => vote('notmeme')}>밈이 아니다</button>
          <button class="vote-btn" onclick={() => vote('no')}>죽은 밈이다</button>
        </div>
        <span class="vote-total">{total + m.voteNotmeme}표 참여</span>
        {#if voteHint}<span class="vote-hint">{voteHint}</span>{/if}
      </div>
      <div
        class="vote-bar"
        role="progressbar"
        aria-label="생존 비율"
        aria-valuenow={yesPct}
        aria-valuemin="0"
        aria-valuemax="100"
      ><div style="width:{yesPct}%"></div></div>
      <div class="vote-legend"><span>밈이다 {yesPct}% · {m.voteYes}표</span><span>죽은 밈 {noPct}% · {m.voteNo}표</span></div>
      {#if m.voteNotmeme > 0}
        <div class="vote-notmeme">밈이 아니라는 판정 {m.voteNotmeme}표</div>
      {/if}
      <div class="vote-foot">
        <span class="vote-note">최근 90일 판정 게이지 · 브라우저 기준 익명 · 월 1회 재판정</span>
        <button class="vote-share" onclick={share}>{shareLabel}</button>
      </div>
    </div>

    <div class="comments">
      <div class="comments-head"><h3>댓글 {m.commentCount}</h3></div>
      <div class="cform">
        {#if !user.current}
          <div class="auth">
            <input class="nick" bind:value={draftNick} placeholder="닉네임 (선택)" />
            <span class="or">또는</span>
            <button class="google" onclick={login}>Google 계정으로 로그인</button>
          </div>
        {/if}
        <textarea bind:value={draftText} placeholder="이 밈에 대해 한마디 남겨 보세요"></textarea>
        <div class="submit-row">
          {#if cErr}<span class="cerr" role="alert">{cErr}</span>{/if}
          <button class="btn-solid" onclick={submitComment}>등록</button>
        </div>
      </div>
      <div class="clist">
        {#if !comments.length}
          <div class="empty">첫 댓글을 남겨 보세요.</div>
        {:else}
          {#each comments as c (c.id)}
            <div class="citem">
              {#if c.is_user}
                <div class="avatar user">{(c.nick || '?').slice(0, 1)}</div>
              {:else}
                <div class="avatar anon"></div>
              {/if}
              <div class="col">
                <div class="cmeta">
                  <span class="cnick {c.is_user ? 'user' : 'anon'}">{c.nick}</span>
                  {#if c.is_user}<span class="badge user">로그인</span>{:else}<span class="badge anon">익명</span>{/if}
                  <span class="cwhen">{timeAgo(c.created_at)}</span>
                </div>
                {#if editingId === c.id}
                  <textarea class="cedit" bind:value={editText}></textarea>
                  <div class="cactions">
                    <button class="clink" onclick={saveEdit}>저장</button>
                    <button class="clink" onclick={() => (editingId = null)}>취소</button>
                  </div>
                {:else}
                  <p class="ctext">{c.body}</p>
                  {#if canEdit(c)}
                    {#if confirmDelId === c.id}
                      <div class="cactions">
                        <span class="cconfirm">삭제할까요?</span>
                        <button class="clink danger" onclick={() => removeComment(c.id)}>삭제</button>
                        <button class="clink" onclick={() => (confirmDelId = null)}>취소</button>
                      </div>
                    {:else}
                      <div class="cactions">
                        <button class="clink" onclick={() => startEdit(c)}>수정</button>
                        <button class="clink" onclick={() => { confirmDelId = c.id; editingId = null; }}>삭제</button>
                      </div>
                    {/if}
                  {/if}
                {/if}
              </div>
            </div>
          {/each}
        {/if}
      </div>
    </div>
  </div>
</div>
