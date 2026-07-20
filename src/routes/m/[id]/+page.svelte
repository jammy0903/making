<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { timeAgo, gallery, ytId, ytEmbed, ytThumb, displayTag, coverImage } from '$lib/cards';
  import { CATEGORIES } from '$lib/categories';
  import { guessedMap, markGuessed, castEraGuess, postComment, editComment, deleteComment, fetchMemeRaw, updateMeme, deleteMemeById, uploadMedia } from '$lib/client/api';
  import { m as t } from '$lib/paraglide/messages'; // 컴포넌트 상태 m(밈)과 충돌 피해 t로 alias
  import { getLocale, localizeHref } from '$lib/paraglide/runtime';

  import { voteCard } from '$lib/client/share';
  import { login, isAdmin } from '$lib/client/auth';
  import { user } from '$lib/client/session.svelte';
  import { loadCropper } from '$lib/client/crop';

  let { data } = $props();

  // SSR 데이터를 낙관적 UI용 로컬 상태로 복사
  let m = $state({ ...data.meme });
  let comments = $state([...data.comments]);
  $effect(() => {
    m = { ...data.meme };
    comments = [...data.comments];
  });

  // ── 이전/다음 밈 이동 (PC 양옆 화살표 · 모바일 스와이프) ──
  function goPrev() { if (data.prev) goto(`/m/${data.prev.id}`); }
  function goNext() { if (data.next) goto(`/m/${data.next.id}`); }
  let touchX = 0, touchY = 0, swipeSkip = false;
  function onTouchStart(e: TouchEvent) {
    const t = e.target as HTMLElement;
    // 캐러셀·입력칸 위에서 시작한 스와이프는 각자 기능(이미지 넘기기·텍스트 선택)에 양보
    swipeSkip = !!t.closest('.carousel, textarea, input, select');
    touchX = e.touches[0].clientX;
    touchY = e.touches[0].clientY;
  }
  function onTouchEnd(e: TouchEvent) {
    if (swipeSkip) return;
    const dx = e.changedTouches[0].clientX - touchX;
    const dy = e.changedTouches[0].clientY - touchY;
    if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.5) return; // 뚜렷한 가로 스와이프만
    if (dx < 0) goNext(); else goPrev(); // 왼쪽으로 밀면 다음, 오른쪽으로 밀면 이전
  }

  const shots = $derived(gallery(m));
  let carIdx = $state(0);
  function onCarScroll(e: Event) {
    const el = e.currentTarget as HTMLElement;
    carIdx = Math.round(el.scrollLeft / el.clientWidth);
  }

  // ── 관리자 인라인 편집 ──
  const admin = $derived(isAdmin(user.current));
  let editMode = $state(false);
  let saving = $state(false);
  let efUploading = $state(0);
  let editErr = $state('');
  let ef = $state<any>(null);
  const splitList = (s: string) => s.split(/[,\n]/).map((x) => x.trim()).filter(Boolean);

  async function editPost() {
    editErr = '';
    try {
      const raw = await fetchMemeRaw(m.id);
      if (!raw) { editErr = t.detail_load_err(); return; }
      const imgs = (raw.media || []).filter((x: any) => x?.type === 'image').map((x: any) => x.url);
      const vids = (raw.media || []).filter((x: any) => x?.type === 'video').map((x: any) => x.url);
      const cover = raw.photo_url || imgs[0] || '';
      const photos = cover ? [cover, ...imgs.filter((u: string) => u !== cover)] : imgs;
      ef = {
        name: raw.name || '', keywords: (raw.keywords || []).join(', '), description: raw.description || '',
        tags: (raw.tags || []).join(', '), category: raw.category || '', status: raw.status || 'new',
        photos, video: raw.video_url || vids[0] || '',
        source: raw.source || '',
      };
      editMode = true;
    } catch (e) {
      editErr = t.detail_load_fail();
      console.error('편집 로드 오류:', e);
    }
  }

  // 이미지 파일 업로드(4:3 크롭) → ef.photos 추가. 첫 장이 커버.
  async function pickEditPhotos(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const files = Array.from(input.files || []);
    input.value = '';
    if (!user.current) return;
    editErr = '';
    const cropper = await loadCropper();
    for (const f of files) {
      if (f.size > 10 * 1024 * 1024) { editErr = t.edit_err_photo_size({ name: f.name }); continue; }
      let up: File = f;
      if (cropper) { const blob: Blob | null = await cropper(f, 4 / 3); if (!blob) continue; up = new File([blob], f.name.replace(/\.[^.]+$/, '') + '.webp', { type: 'image/webp' }); }
      efUploading++;
      try { const url = await uploadMedia(up, user.current); ef.photos = [...ef.photos, url]; }
      catch (e2) { editErr = t.edit_err_upload(); console.error(e2); }
      efUploading--;
    }
  }
  function removeEditPhoto(i: number) { ef.photos = ef.photos.filter((_: string, idx: number) => idx !== i); }
  // 동영상 파일 업로드(유튜브는 아래 URL칸)
  async function pickEditVideo(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const f = (input.files || [])[0];
    input.value = '';
    if (!f || !user.current) return;
    if (f.size > 50 * 1024 * 1024) { editErr = t.edit_err_video_size(); return; }
    editErr = '';
    efUploading++;
    try { ef.video = await uploadMedia(f, user.current); }
    catch (e2) { editErr = t.edit_err_upload(); console.error(e2); }
    efUploading--;
  }

  async function savePost() {
    if (!ef) return;
    saving = true;
    editErr = '';
    const photos: string[] = (ef.photos || []).filter(Boolean);
    const video = (ef.video || '').trim();
    const media: { type: 'image' | 'video'; url: string }[] = [];
    for (const u of photos) media.push({ type: 'image', url: u });
    if (video) media.push({ type: 'video', url: video });
    const data = {
      name: ef.name.trim(), keywords: splitList(ef.keywords), description: ef.description.trim(),
      tags: splitList(ef.tags), category: ef.category.trim() || null, status: ef.status,
      source: ef.source.trim() || null, photo_url: photos[0] || null, video_url: video || null, media,
    };
    try {
      await updateMeme(m.id, data);
      m.name = data.name; m.desc = data.description; m.tags = data.tags; m.status = data.status;
      m.photoUrl = data.photo_url || ''; m.videoUrl = data.video_url || ''; m.media = media; m.src = data.source || '';
      editMode = false;
    } catch (e) {
      editErr = t.edit_save_fail() + (e as Error).message;
      console.error('편집 저장 오류:', e);
    }
    saving = false;
  }

  async function removeMeme() {
    if (!confirm(t.edit_del_confirm())) return;
    editErr = '';
    try {
      await deleteMemeById(m.id);
      goto(localizeHref('/'));
    } catch (e) {
      editErr = t.edit_del_fail() + (e as Error).message;
      console.error('삭제 오류:', e);
    }
  }

  let draftNick = $state('');
  let draftText = $state('');
  let cErr = $state(''); // 댓글 등록/수정/삭제 인라인 에러
  let editingId = $state<number | null>(null);
  let editText = $state('');
  let confirmDelId = $state<number | null>(null);
  let shareLabel = $state(t.share_default());

  const canEdit = (c: { user_id: string | null }) =>
    !!user.current && (String(c.user_id) === String(user.current.id) || isAdmin(user.current));

  // ── 연도 맞히기 ──
  // 슬라이더 범위는 실제 era_year 분포(1985~2026)를 덮되, 시작값은 중앙값(2018)에 둔다
  // — 어느 쪽으로도 같은 거리라 특정 연도로 유도하지 않는다.
  const GUESS_MIN = 1985;
  const GUESS_MAX = new Date().getFullYear();
  let guessYear = $state(2018);
  let guessVersion = $state(0); // 제출 직후 재계산 트리거
  // 서버는 개별 추측을 안 내주므로(집계 뷰만 공개) 이미 맞혔는지는 로컬 기록으로 판단한다.
  const myGuess = $derived.by(() => {
    guessVersion;
    if (typeof localStorage === 'undefined') return null;
    const v = guessedMap()[String(m.id)];
    return typeof v === 'number' ? v : null;
  });
  const guessDone = $derived(myGuess !== null);
  const gap = $derived(myGuess !== null && data.eraYear ? Math.abs(myGuess - data.eraYear) : 0);
  // 연표 위 위치(%). 군중 데이터가 없어도 "내 추측 vs 정답" 둘만으로 그림이 성립한다 —
  // 표본 3명 미만이면 평균을 숨기므로(개인 추측 노출 방지) 초기엔 이 그래프가 결과의 전부다.
  const pos = (y: number) => Math.max(0, Math.min(100, ((y - GUESS_MIN) / (GUESS_MAX - GUESS_MIN)) * 100));

  async function submitGuess() {
    if (guessDone) return;
    const y = guessYear;
    markGuessed(m.id, y); // 먼저 로컬에 남긴다 — 전송이 실패해도 정답은 보여준다
    guessVersion++;
    try {
      await castEraGuess(m.id, y);
    } catch (e) {
      console.error('연도 추측 전송 실패:', e); // 조용히 삼키지 않되 화면은 계속 진행
    }
  }

  const nextTarget = $derived(data.next ?? data.prev);

  const desc = $derived(m.desc || t.detail_desc_fallback({ name: m.name }));
  const pageUrl = $derived(`${page.url.origin}${localizeHref(`/m/${m.id}`)}`);
  const ogImage = $derived(m.photoUrl || `${page.url.origin}/og-default.png`);
  // 구조화 데이터 — 밈 사전 용어("○○ 뜻" 검색 리치결과)
  const memeLd = $derived(
    JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'DefinedTerm',
      name: m.name,
      description: desc,
      url: pageUrl,
      inLanguage: getLocale(),
      inDefinedTermSet: { '@type': 'DefinedTermSet', name: t.detail_ld_setname(), url: `${page.url.origin}/` },
    })
  );

  async function submitComment() {
    const text = draftText.trim();
    if (!text) return;
    const nick = user.current ? user.current.name : draftNick.trim() || t.anon();
    cErr = '';
    try {
      const row = await postComment(m.id, nick, text, user.current);
      comments = [row, ...comments];
      m.commentCount++;
      draftText = '';
    } catch (e) {
      cErr = t.cmt_err_post();
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
      cErr = t.cmt_err_edit();
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
      cErr = t.cmt_err_del();
      console.error('댓글 삭제 오류:', e);
    }
  }

  async function share() {
    shareLabel = t.share_making();
    try {
      const r = await voteCard({
        id: m.id,
        name: m.name,
        eraYear: data.eraYear,
        myGuess, // 아직 안 맞혔으면 null → 카드가 정답 없이 "몇 년도게?"로 나간다(스포일러 방지)
        photo: coverImage(m),
      });
      shareLabel = r === 'downloaded+copied' ? t.share_saved_copied() : r === 'downloaded' ? t.share_saved() : r === 'shared' ? t.share_shared() : t.share_default();
    } catch (e) {
      shareLabel = t.share_fail();
      console.error('공유 카드 오류:', e);
    }
    setTimeout(() => (shareLabel = t.share_default()), 2500);
  }

  const reg = $derived(
    m.status === 'new' ? (m.days === 0 ? t.reg_new_today() : t.reg_new_days({ days: m.days })) : t.reg_months({ months: m.months })
  );
</script>

<svelte:head>
  <title>{t.detail_head_title({ name: m.name })}</title>
  <meta name="description" content={desc} />
  <link rel="canonical" href={pageUrl} />
  <meta property="og:type" content="article" />
  <meta property="og:title" content={t.detail_og_title({ name: m.name })} />
  <meta property="og:description" content={desc} />
  <meta property="og:url" content={pageUrl} />
  <meta property="og:image" content={ogImage} />
  <meta name="twitter:card" content="summary_large_image" />
  {@html `<script type="application/ld+json">${memeLd}</script>`}
</svelte:head>

{#if data.prev}
  <a class="pager pager-prev" href={localizeHref(`/m/${data.prev.id}`)} aria-label={t.pager_prev({ name: data.prev.name })} title={t.pager_prev_title({ name: data.prev.name })}>‹</a>
{/if}
{#if data.next}
  <a class="pager pager-next" href={localizeHref(`/m/${data.next.id}`)} aria-label={t.pager_next({ name: data.next.name })} title={t.pager_next_title({ name: data.next.name })}>›</a>
{/if}

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="wrap-narrow page" ontouchstart={onTouchStart} ontouchend={onTouchEnd}>
  <div class="detail-top">
    <a class="back" href={localizeHref('/')} style="border:none">{t.detail_back()}</a>
    {#if admin && !editMode}
      <button class="edit-open" onclick={editPost}>{t.detail_edit()}</button>
    {/if}
  </div>
  {#if editErr && !editMode}<div class="cerr" role="alert" style="display:block;margin-bottom:10px">{editErr}</div>{/if}
  <div class="detail">
    {#if editMode}
      <div class="subform edit-form">
        <div class="subrow"><label for="e-name">{t.edit_name()}</label><input id="e-name" bind:value={ef.name} /></div>
        <div class="subrow"><label for="e-kw">{t.edit_kw()}</label><textarea id="e-kw" bind:value={ef.keywords}></textarea></div>
        <div class="subrow"><label for="e-desc">{t.edit_desc()}</label><textarea id="e-desc" bind:value={ef.description}></textarea></div>
        <div class="subrow"><label for="e-tags">{t.edit_tags()}</label><input id="e-tags" bind:value={ef.tags} /></div>
        <div class="subrow"><label for="e-cat">{t.edit_cat()}</label>
          <select id="e-cat" bind:value={ef.category}>
            <option value="">{t.edit_cat_select()}</option>
            {#each CATEGORIES as c}<option value={c}>{c}</option>{/each}
            {#if ef.category && !CATEGORIES.includes(ef.category)}<option value={ef.category}>{ef.category}</option>{/if}
          </select>
        </div>
        <div class="subrow"><label for="e-status">{t.edit_status()}</label>
          <select id="e-status" bind:value={ef.status}>
            <option value="new">{t.edit_status_new()}</option>
            <option value="steady">{t.edit_status_steady()}</option>
          </select>
        </div>
        <div class="subrow">
          <label for="e-photos">{t.edit_photos_label()}</label>
          <input id="e-photos" type="file" accept="image/*" multiple onchange={pickEditPhotos} />
          {#if efUploading}<div class="media-up">{t.edit_uploading({ count: efUploading })}</div>{/if}
          {#if ef.photos.length}
            <div class="media-grid">
              {#each ef.photos as u, i (u)}
                <div class="media-cell">
                  <img src={u} alt="" />
                  {#if i === 0}<span class="cover-badge">{t.edit_cover_badge()}</span>{/if}
                  <button type="button" class="media-cell-x" onclick={() => removeEditPhoto(i)} aria-label={t.edit_remove()}>✕</button>
                </div>
              {/each}
            </div>
          {/if}
        </div>
        <div class="subrow">
          <label for="e-video">{t.edit_video_label()}</label>
          <input id="e-video" type="file" accept="video/*" onchange={pickEditVideo} />
          <input type="text" placeholder={t.edit_video_ph()} bind:value={ef.video} style="margin-top:8px" />
          {#if ef.video}
            <div style="margin-top:8px">
              {#if ytId(ef.video)}<img src={ytThumb(ef.video)} alt={t.edit_yt_thumb_alt()} style="max-width:220px;border-radius:6px;display:block" />
              {:else}<!-- svelte-ignore a11y_media_has_caption --><video src={ef.video} controls muted playsinline preload="metadata" style="max-width:220px;border-radius:6px"></video>{/if}
              <button type="button" class="btn" style="margin-top:6px" onclick={() => (ef.video = '')}>{t.edit_video_remove()}</button>
            </div>
          {/if}
        </div>
        <div class="subrow"><label for="e-src">{t.edit_src()}</label><input id="e-src" bind:value={ef.source} /></div>
        <div class="edit-actions">
          {#if editErr}<span class="cerr" role="alert">{editErr}</span>{/if}
          <button class="btn" onclick={() => (editMode = false)}>{t.edit_cancel()}</button>
          <button class="btn btn-danger" onclick={removeMeme}>{t.edit_delete()}</button>
          <button class="btn-solid" onclick={savePost} disabled={saving}>{saving ? t.edit_saving() : t.edit_save()}</button>
        </div>
      </div>
    {:else}
      {#if shots.length}
        <div class="carousel">
          <div class="car-track" onscroll={onCarScroll}>
            {#each shots as s, i (s.url)}
              <div class="car-item">
                {#if s.type === 'video' && ytId(s.url)}
                  <iframe src={ytEmbed(s.url)} title={m.name} loading="lazy" style="width:100%;aspect-ratio:16/9;display:block;border:0;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
                {:else if s.type === 'video'}
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
      {#if (m.tags || []).length}
        <div class="tag-head">{#each m.tags as tag (tag)}<a class="tagchip" href={localizeHref(`/?tag=${encodeURIComponent(tag)}`)}>{displayTag(tag)}</a>{/each}</div>
      {/if}
      <div class="reg">
        {reg}{#if m.src} · {t.detail_src()} <a href={m.src} target="_blank" rel="noopener">{m.src}</a>{/if}
      </div>
      {#if m.desc}<p class="detail-desc">{m.desc}</p>{/if}
    {/if}

    <!-- 방문자 판정 = 연도 맞히기. "○○ 뜻"으로 들어온 사람이 뜻을 읽은 뒤 바로 해볼 수 있는
         한 동작이고, 이 사전의 축(전성기 연도)을 그대로 쓴다. era_year가 없으면 통째로 숨긴다. -->
    {#if data.eraYear}
      <div class="vote guess">
        {#if !guessDone}
          <div class="verdict">
            <span class="verdict-q">{t.guess_q()}</span>
            <strong class="verdict-a guess-pick">{guessYear}{t.guess_year_suffix()}</strong>
          </div>
          <input
            class="guess-slider"
            type="range"
            min={GUESS_MIN}
            max={GUESS_MAX}
            step="1"
            bind:value={guessYear}
            aria-label={t.guess_q()}
          />
          <div class="guess-ends"><span>{GUESS_MIN}</span><span>{GUESS_MAX}</span></div>
          <button class="btn-solid guess-submit" onclick={submitGuess}>{t.guess_submit()}</button>
        {:else}
          <div class="verdict">
            <span class="verdict-q">{t.guess_answer_label()}</span>
            <strong class="verdict-a">{data.eraYear}{t.guess_year_suffix()}</strong>
          </div>
          <!-- 연표 그래프 — 정답은 위, 내 추측은 아래에 찍어 두 라벨이 겹치지 않게 한다
               (연도가 가까울수록 마커가 붙는데, 위아래로 나누면 그때도 읽힌다). -->
          <div class="gtl">
            <div class="gtl-track">
              <div class="gtl-gap" style="left:{Math.min(pos(myGuess ?? 0), pos(data.eraYear))}%; width:{Math.abs(pos(data.eraYear) - pos(myGuess ?? 0))}%"></div>
              <div class="gtl-mark answer" style="left:{pos(data.eraYear)}%">
                <span class="gtl-lab top">{data.eraYear}</span>
              </div>
              <div class="gtl-mark mine" style="left:{pos(myGuess ?? 0)}%">
                <span class="gtl-lab bot">{t.guess_mine_short({ year: myGuess ?? 0 })}</span>
              </div>
              {#if data.guessStat}
                <div class="gtl-mark crowd" style="left:{pos(data.guessStat.avg_guess)}%">
                  <span class="gtl-lab bot2">{t.guess_crowd_short({ year: data.guessStat.avg_guess })}</span>
                </div>
              {/if}
            </div>
            <div class="guess-ends"><span>{GUESS_MIN}</span><span>{GUESS_MAX}</span></div>
          </div>
          <div class="guess-result">
            {#if gap === 0}{t.guess_exact()}
            {:else}{t.guess_off({ mine: myGuess ?? 0, gap })}{/if}
          </div>
          {#if data.guessStat}
            <div class="guess-crowd">{t.guess_crowd({ avg: data.guessStat.avg_guess, n: data.guessStat.guesses })}</div>
          {:else}
            <div class="guess-crowd">{t.guess_crowd_few()}</div>
          {/if}
        {/if}
        <div class="vote-foot">
          <span class="vote-note">{t.guess_note()}</span>
          <button class="vote-share" onclick={share}>{shareLabel}</button>
        </div>
        {#if guessDone && nextTarget}
          <!-- 판정 직후 동선이 끊기지 않게 다음 밈으로 잇는 훅 -->
          <a class="vote-next" href={localizeHref(`/m/${nextTarget.id}`)}>
            <span>{t.next_hook_done()}</span>
            <strong>{t.next_hook_cta({ name: nextTarget.name })}</strong>
          </a>
        {/if}
      </div>
    {/if}

    <div class="comments">
      <div class="comments-head"><h3>{t.comments_head({ count: m.commentCount })}</h3></div>
      <div class="clist">
        {#if !comments.length}
          <div class="empty">{t.comments_empty()}</div>
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
                  {#if c.is_user}<span class="badge user">{t.badge_user()}</span>{:else}<span class="badge anon">{t.badge_anon()}</span>{/if}
                  <span class="cwhen">{timeAgo(c.created_at)}</span>
                </div>
                {#if editingId === c.id}
                  <textarea class="cedit" bind:value={editText}></textarea>
                  <div class="cactions">
                    <button class="clink" onclick={saveEdit}>{t.cmt_save()}</button>
                    <button class="clink" onclick={() => (editingId = null)}>{t.cmt_cancel()}</button>
                  </div>
                {:else}
                  <p class="ctext">{c.body}</p>
                  {#if canEdit(c)}
                    {#if confirmDelId === c.id}
                      <div class="cactions">
                        <span class="cconfirm">{t.cmt_del_confirm()}</span>
                        <button class="clink danger" onclick={() => removeComment(c.id)}>{t.cmt_delete()}</button>
                        <button class="clink" onclick={() => (confirmDelId = null)}>{t.cmt_cancel()}</button>
                      </div>
                    {:else}
                      <div class="cactions">
                        <button class="clink" onclick={() => startEdit(c)}>{t.cmt_edit()}</button>
                        <button class="clink" onclick={() => { confirmDelId = c.id; editingId = null; }}>{t.cmt_delete()}</button>
                      </div>
                    {/if}
                  {/if}
                {/if}
              </div>
            </div>
          {/each}
        {/if}
      </div>
      <div class="cform">
        {#if !user.current}
          <div class="auth">
            <input class="nick" bind:value={draftNick} placeholder={t.cmt_nick_ph()} />
            <span class="or">{t.cmt_or()}</span>
            <button class="google" onclick={login}>{t.login_google()}</button>
          </div>
        {/if}
        <textarea bind:value={draftText} placeholder={t.cmt_text_ph()}></textarea>
        <div class="submit-row">
          {#if cErr}<span class="cerr" role="alert">{cErr}</span>{/if}
          <button class="btn-solid" onclick={submitComment}>{t.cmt_submit()}</button>
        </div>
      </div>
    </div>
  </div>
</div>
