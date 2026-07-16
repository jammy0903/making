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
    uploadMedia,
    type Submission,
    type RegisteredMeme,
  } from '$lib/client/api';
  import { timeAgo } from '$lib/cards';
  import type { MediaItem } from '$lib/server/db';
  import { m } from '$lib/paraglide/messages';
  import { localizeHref } from '$lib/paraglide/runtime';

  const norm = (s: string) => (s || '').toLowerCase().replace(/\s+/g, '');
  const MAX_IMG = 10 * 1024 * 1024; // 10MB
  const MAX_VID = 50 * 1024 * 1024; // 50MB (버킷 제한과 동일)

  let name = $state('');
  let description = $state('');
  let example = $state('');
  let sourceUrl = $state('');
  let tagsText = $state('');
  let media = $state<MediaItem[]>([]); // 업로드된 사진/동영상 여러 개
  let uploading = $state(0); // 진행 중 업로드 수

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
      err = m.submit_err_load();
      console.error('신청 조회 오류:', e);
    }
    loaded = true;
  }
  onMount(load);
  // 로그인 세션은 레이아웃 onMount 이후 채워지므로, 채워지면 한 번 불러온다
  $effect(() => {
    if (user.current && !loaded) load();
  });

  // 여러 파일 선택 → 각각 업로드 → media 배열에 추가 (사진·동영상 혼합 가능)
  async function pickMedia(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const files = Array.from(input.files || []);
    input.value = '';
    if (!files.length || !user.current) return;
    err = '';
    for (const file of files) {
      const isVideo = file.type.startsWith('video');
      const max = isVideo ? MAX_VID : MAX_IMG;
      if (file.size > max) {
        err = m.submit_err_toobig({ name: file.name, mb: Math.round(max / 1024 / 1024) });
        continue;
      }
      uploading++;
      try {
        const url = await uploadMedia(file, user.current);
        media = [...media, { type: isVideo ? 'video' : 'image', url }];
      } catch (e2) {
        err = m.submit_err_upload();
        console.error('업로드 오류:', e2);
      }
      uploading--;
    }
  }
  function removeMedia(i: number) {
    media = media.filter((_, idx) => idx !== i);
  }

  async function submit() {
    const nm = name.trim();
    err = '';
    ok = '';
    if (!nm) {
      err = m.submit_err_name();
      return;
    }
    if (blockDup) {
      err = dup?.kind === 'pending' ? m.submit_err_dup_pending() : m.submit_err_dup_reg();
      return;
    }
    if (uploading > 0) {
      err = m.submit_err_uploading();
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
          media,
        },
        user.current
      );
      mine = [row, ...mine];
      name = '';
      description = '';
      example = '';
      sourceUrl = '';
      tagsText = '';
      media = [];
      ok = m.submit_ok();
    } catch (e) {
      err = m.submit_err_submit();
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
      err = m.submit_err_withdraw();
      console.error('철회 오류:', e);
    }
  }

  const label = (s: Submission['status']) =>
    s === 'pending' ? m.sub_status_pending() : s === 'accepted' ? m.sub_status_accepted() : s === 'rejected' ? m.sub_status_rejected() : m.sub_status_withdrawn();
</script>

<svelte:head>
  <title>{m.submit_head_title()}</title>
  <meta name="description" content={m.submit_head_desc()} />
  <meta name="robots" content="noindex" />
  <link rel="canonical" href="{page.url.origin}{localizeHref('/submit')}" />
</svelte:head>

<div class="wrap-narrow legal">
  <a class="back" href={localizeHref('/')} style="border:none">{m.back_home()}</a>
  <h1>{m.submit_h1()}</h1>
  <p class="lead">{@html m.submit_lead()}</p>

  {#if !user.current}
    <div class="subgate">
      <p>{m.submit_gate()}</p>
      <button class="btn-solid" onclick={login}>{m.login_google()}</button>
    </div>
  {:else}
    <div class="subform">
      <div class="subrow">
        <label for="s-name">{m.submit_name_label()} <span class="req">*</span></label>
        <input id="s-name" bind:value={name} maxlength="60" placeholder={m.submit_name_ph()} />
        {#if dup}
          {#if dup.kind === 'registered'}
            <div class="dup dup-warn">{m.submit_dup_registered()}<a href={localizeHref(`/m/${dup.id}`)}>{m.submit_dup_link({ name: dup.name })}</a></div>
          {:else if dup.kind === 'pending'}
            <div class="dup dup-warn">{m.submit_dup_pending()}</div>
          {:else}
            <div class="dup dup-info">{m.submit_dup_similar()}<a href={localizeHref(`/m/${dup.id}`)}>{m.submit_dup_similar_link({ name: dup.name })}</a></div>
          {/if}
        {/if}
      </div>
      <div class="subrow">
        <label for="s-desc">{m.submit_desc_label()}</label>
        <textarea id="s-desc" bind:value={description} placeholder={m.submit_desc_ph()}></textarea>
      </div>
      <div class="subrow">
        <label for="s-ex">{m.submit_ex_label()}</label>
        <textarea id="s-ex" bind:value={example} placeholder={m.submit_ex_ph()}></textarea>
      </div>
      <div class="subrow">
        <label for="s-src">{m.submit_src_label()}</label>
        <input id="s-src" bind:value={sourceUrl} placeholder="https://" />
      </div>
      <div class="subrow">
        <label for="s-tags">{m.submit_tags_label()}</label>
        <input id="s-tags" bind:value={tagsText} placeholder={m.submit_tags_ph()} />
      </div>

      <div class="subrow">
        <!-- svelte-ignore a11y_label_has_associated_control -->
        <label>{m.submit_media_label()}</label>
        {#if media.length}
          <div class="media-grid">
            {#each media as item, i (item.url)}
              <div class="media-cell">
                {#if item.type === 'video'}
                  <!-- svelte-ignore a11y_media_has_caption -->
                  <video src={item.url} muted playsinline preload="metadata"></video>
                {:else}
                  <img src={item.url} alt={m.submit_media_alt({ n: i + 1 })} />
                {/if}
                <button type="button" class="media-cell-x" onclick={() => removeMedia(i)} aria-label={m.submit_media_remove()}>✕</button>
              </div>
            {/each}
          </div>
        {/if}
        <input type="file" accept="image/*,video/*" multiple onchange={pickMedia} />
        {#if uploading > 0}<div class="media-up">{m.submit_uploading({ count: uploading })}</div>{/if}
      </div>

      <div class="subfoot">
        {#if err}<span class="cerr" role="alert">{err}</span>{/if}
        {#if ok}<span class="cok" role="status">{ok}</span>{/if}
        <button class="btn-solid" onclick={submit} disabled={busy || blockDup}>{busy ? m.submit_btn_busy() : m.submit_btn()}</button>
      </div>
    </div>

    <h2>{m.submit_mine_h2()}</h2>
    {#if !loaded}
      <div class="empty">{m.submit_loading()}</div>
    {:else if !mine.length}
      <div class="empty">{m.submit_mine_empty()}</div>
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
              <button class="btn" onclick={() => withdraw(s.id)}>{m.submit_withdraw_btn()}</button>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  {/if}
</div>
