<script lang="ts">
	import { onMount } from 'svelte';
	import { getSessionId } from '$lib/supabase';
	import { isImageIcon, type Deck, type DeckType } from '$lib/game/decks';
	import Icon from '$lib/game/Icon.svelte';
	import ImageSearchModal from '$lib/components/ImageSearchModal.svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let sessionId = $state('');
	onMount(() => {
		sessionId = getSessionId();
	});

	const kindLabel = (k: string) => (k === 'topic' ? '주제' : '조건');
	const statusLabel: Record<string, string> = {
		pending: '대기',
		accepted: '수락',
		rejected: '거절'
	};

	// ── 덱 편집 ─────────────────────────────────────────────
	const TYPES: DeckType[] = ['attribute', 'person', 'scenario', 'acquisition', 'value'];
	let editing = $state<Deck | null>(null);

	function editDeck(d: Deck) {
		editing = structuredClone(d); // data.decks는 서버산 plain 객체
	}
	function cancelEdit() {
		editing = null;
	}

	// ── 이미지 업로드 ─────────────────────────────────────────
	// 파일 선택 → /admin/upload(service_role)로 올리고, 반환 URL을 해당 필드에 채운다.
	// 필드값이 이모지든 URL이든 같은 문자열 필드 하나로 저장(하위호환, isImageIcon으로 렌더 분기).
	let uploading = $state<string | null>(null); // 업로드 중인 필드 키(라벨)
	let uploadErr = $state('');

	async function uploadImage(e: Event, apply: (url: string) => void, key: string) {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		uploading = key;
		uploadErr = '';
		try {
			const fd = new FormData();
			fd.append('file', file);
			const res = await fetch('/admin/upload', { method: 'POST', body: fd });
			if (!res.ok) {
				uploadErr = (await res.text().catch(() => '')) || `업로드 실패 (${res.status})`;
				return;
			}
			const { url } = (await res.json()) as { url: string };
			apply(url);
		} catch {
			uploadErr = '업로드 중 오류가 났어요';
		} finally {
			uploading = null;
			input.value = ''; // 같은 파일 재선택 가능하게 리셋
		}
	}

	// ── 이미지 검색 ─────────────────────────────────────────
	// 파일 업로드와 같은 apply 콜백을 공유한다. 검색 모달에서 고른 외부 원본 URL을
	// /admin/upload(JSON url 모드)로 넘기면 서버가 내려받아 스토리지에 저장 후 우리 URL을 준다.
	let search = $state<{ apply: (url: string) => void; key: string; query: string } | null>(null);

	function openSearch(apply: (url: string) => void, key: string, query: string) {
		search = { apply, key, query };
	}

	async function pickFromSearch(srcUrl: string) {
		if (!search) return;
		const { apply, key } = search;
		search = null; // 모달 닫고 저장 진행(업로드 인디케이터 재사용)
		uploading = key;
		uploadErr = '';
		try {
			const res = await fetch('/admin/upload', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ url: srcUrl })
			});
			if (!res.ok) {
				uploadErr = (await res.text().catch(() => '')) || `저장 실패 (${res.status})`;
				return;
			}
			const { url } = (await res.json()) as { url: string };
			apply(url);
		} catch {
			uploadErr = '이미지 저장 중 오류가 났어요';
		} finally {
			uploading = null;
		}
	}
	// stats(string[]) ↔ 줄바꿈 텍스트
	function stnl(stats: string[]): string {
		return stats.join('\n');
	}
	function setStats(card: { stats: string[] }, v: string) {
		// 타이핑 중엔 빈 줄 허용(줄바꿈 매끄럽게), 빈 줄 정리는 저장 시 서버에서.
		card.stats = v.split('\n');
	}
	// ── 조건 개수 편집(v3.1 가변 길이 5~10판 = 조건 4~9개, 양편 동일) ──
	function renumber() {
		if (!editing) return;
		editing.a.penalties.forEach((p, i) => (p.strength = i + 2));
		editing.b.penalties.forEach((p, i) => (p.strength = i + 2));
	}
	function addCondition() {
		if (!editing || editing.a.penalties.length >= 9) return;
		editing.a.penalties.push({ strength: 0, text: '' });
		editing.b.penalties.push({ strength: 0, text: '' });
		renumber();
	}
	function removeCondition(idx: number) {
		if (!editing || editing.a.penalties.length <= 4) return;
		editing.a.penalties.splice(idx, 1);
		editing.b.penalties.splice(idx, 1);
		renumber();
	}
	const condCount = $derived(editing ? editing.a.penalties.length : 0);

	const deckJson = $derived(editing ? JSON.stringify(editing) : '');
	// 편집 중 덱의 결과 카드 4종(있을 때만)을 [경로, 카드]로 나열
	const cards = $derived(
		editing?.resultCards
			? ([
					['관종/A · 극단', editing.resultCards.a.extreme],
					['관종/A · 애매', editing.resultCards.a.mild],
					['아싸/B · 극단', editing.resultCards.b.extreme],
					['아싸/B · 애매', editing.resultCards.b.mild]
				] as const)
			: []
	);
</script>

<svelte:head>
	<title>관리자 · 그런데이제</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="admin">
	<h2>관리자</h2>

	{#if !data.configured}
		<div class="card note">
			<p><b>관리자 기능이 아직 설정되지 않았습니다.</b></p>
			<p>서버 환경변수 두 개가 필요합니다 (로컬 <code>.env</code> + Vercel 프로젝트 설정):</p>
			<ul>
				<li><code>ADMIN_PASSWORD</code> — 관리자 로그인 비밀번호</li>
				<li><code>SUPABASE_SERVICE_ROLE_KEY</code> — Supabase 대시보드 · 서버 전용(공개 금지)</li>
			</ul>
		</div>
	{:else if !data.authed}
		<form method="POST" action="?/login" class="card login">
			<input type="hidden" name="session_id" value={sessionId} />
			<label>
				비밀번호
				<input type="password" name="password" autocomplete="current-password" required />
			</label>
			{#if form?.error}<p class="err">{form.error}</p>{/if}
			<button type="submit">로그인</button>
		</form>
	{:else}
		{@const requests = data.requests ?? []}
		{@const deckStats = data.deckStats ?? []}
		<form method="POST" action="?/logout" class="logout-row">
			<button type="submit" class="ghost">로그아웃</button>
		</form>

		<!-- 1. 방문자 / 2. 플레이 요약 -->
		<div class="stat-row">
			<div class="card stat">
				<span class="stat-num">{data.visitors}</span>
				<span class="stat-cap">고유 방문자 <small>(관리자 제외)</small></span>
			</div>
			<div class="card stat">
				<span class="stat-num">{data.totalPlays}</span>
				<span class="stat-cap">총 플레이(완주)</span>
			</div>
		</div>

		<!-- 2. 덱별 결과 -->
		<h3>덱별 결과</h3>
		<div class="table-wrap">
			<table>
				<thead>
					<tr><th>덱</th><th>플레이</th><th>선호 분포</th><th>평균 깊이</th></tr>
				</thead>
				<tbody>
					{#each deckStats as s (s.id)}
						<tr>
							<td>{s.title}</td>
							<td class="num">{s.plays}</td>
							<td class="dist">
								{#if s.plays}
									{s.nameA} {s.prefA} · {s.nameB} {s.prefB}
								{:else}
									<span class="muted">—</span>
								{/if}
							</td>
							<td class="num">{s.plays ? s.avgDepth : '—'}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<!-- 3. 주제/조건 신청 -->
		<h3>주제·조건 신청 <small>({requests.length})</small></h3>
		{#if requests.length === 0}
			<p class="muted">아직 신청이 없습니다.</p>
		{:else}
			<ul class="reqs">
				{#each requests as r (r.id)}
					<li class="card req" class:decided={r.status !== 'pending'}>
						<div class="req-head">
							<span class="tag tag-{r.kind}">{kindLabel(r.kind)}</span>
							<b>{r.title}</b>
							<span class="tag st st-{r.status}">{statusLabel[r.status] ?? r.status}</span>
						</div>
						<p class="req-body">{r.body}</p>
						{#if r.status === 'pending'}
							<div class="req-actions">
								<form method="POST" action="?/decide">
									<input type="hidden" name="id" value={r.id} />
									<input type="hidden" name="decision" value="accepted" />
									<button type="submit" class="ok">수락</button>
								</form>
								<form method="POST" action="?/decide">
									<input type="hidden" name="id" value={r.id} />
									<input type="hidden" name="decision" value="rejected" />
									<button type="submit" class="no">거절</button>
								</form>
							</div>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}

		<!-- 4. 덱 편집 (DB 정본) -->
		<h3>덱 편집 <small>(DB 정본)</small></h3>
		{#if form?.error}<p class="err">{form.error}</p>{/if}
		{#if form?.imported}<p class="ok-msg">코드 덱 {form.imported}개를 DB로 이관했어요.</p>{/if}
		{#if form?.saved}<p class="ok-msg">「{form.saved}」 저장됨. 앱에 바로 반영돼요.</p>{/if}

		{#if !editing}
			<form method="POST" action="?/import_decks" class="import-row">
				<button type="submit" class="ghost">코드 → DB 이관(시드)</button>
				<small>decks.ts의 현재 덱을 DB로 복사(덮어씀). DB 비었을 때 1회.</small>
			</form>
			<ul class="deck-list">
				{#each data.decks as d (d.id)}
					<li class="card deck-row">
						<span class="deck-icon"><Icon value={d.icon} /></span>
						<b>{d.title}</b>
						<button type="button" onclick={() => editDeck(d)}>편집</button>
					</li>
				{/each}
			</ul>
		{:else}
			<form method="POST" action="?/save_deck" class="editor card">
				<input type="hidden" name="deck_json" value={deckJson} />
				<div class="ed-head">
					<b>{editing.id}</b>
					<button type="button" class="ghost" onclick={cancelEdit}>취소</button>
				</div>

				<label>제목<input bind:value={editing.title} /></label>
				{#if uploadErr}<p class="err">{uploadErr}</p>{/if}
				<div class="ed-two">
					<div class="ed-field">
						<span class="ed-flabel">아이콘</span>
						<input bind:value={editing.icon} placeholder="이모지 또는 이미지 URL" />
						<div class="up-row">
							<span class="up-prev"><Icon value={editing.icon} size="26px" /></span>
							<label class="up-btn"
								>{uploading === 'icon' ? '올리는 중…' : '📁 이미지 업로드'}
								<input
									type="file"
									accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
									onchange={(e) => uploadImage(e, (u) => editing && (editing.icon = u), 'icon')}
								/>
							</label>
							<button
								type="button"
								class="up-btn"
								onclick={() =>
									openSearch((u) => editing && (editing.icon = u), 'icon', editing?.title ?? '')}
								>🔍 이미지 검색</button
							>
						</div>
					</div>
					<label
						>유형
						<select bind:value={editing.type}>
							{#each TYPES as t (t)}<option value={t}>{t}</option>{/each}
						</select>
					</label>
				</div>

				<div class="ed-condctl">
					<span>조건 <b>{condCount}</b>개 · 판 수 {condCount + 1} <small>(4~9개 / 5~10판)</small></span>
					<button
						type="button"
						class="ghost"
						onclick={() => removeCondition(condCount - 1)}
						disabled={condCount <= 4}>− 마지막 조건</button
					>
					<button type="button" class="ghost" onclick={addCondition} disabled={condCount >= 9}
						>＋ 조건 추가</button
					>
				</div>

				{#each [editing.a, editing.b] as side, si (si)}
					<fieldset class="ed-side">
						<legend>{si === 0 ? 'A편' : 'B편'}</legend>
						<div class="ed-two">
							<label>이름<input bind:value={side.name} /></label>
							<div class="ed-field">
								<span class="ed-flabel">이모지</span>
								<input bind:value={side.emoji} placeholder="이모지 또는 이미지 URL" />
								<div class="up-row">
									<span class="up-prev"><Icon value={side.emoji} size="26px" /></span>
									<label class="up-btn"
										>{uploading === `side${si}` ? '올리는 중…' : '📁 이미지 업로드'}
										<input
											type="file"
											accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
											onchange={(e) => uploadImage(e, (u) => (side.emoji = u), `side${si}`)}
										/>
									</label>
									<button
										type="button"
										class="up-btn"
										onclick={() =>
											openSearch((u) => (side.emoji = u), `side${si}`, side.name ?? '')}
										>🔍 이미지 검색</button
									>
								</div>
							</div>
						</div>
						{#each side.penalties as p, ci (ci)}
							<div class="ed-cond">
								<span class="ed-str">강도 {p.strength}</span>
								<input class="ed-ptext" placeholder="그런데 이제 …" bind:value={p.text} />
								<input
									class="ed-pmerit"
									placeholder="하지만 …(메리트, 선택)"
									bind:value={p.merit}
								/>
								<input
									class="ed-pshort"
									placeholder="영수증용 짧은 라벨(선택, 없으면 자동 축약)"
									bind:value={p.short}
								/>
								<button
									type="button"
									class="ed-delcond"
									title="이 강도 조건을 양편에서 삭제"
									onclick={() => removeCondition(ci)}
									disabled={condCount <= 4}>✕</button
								>
							</div>
						{/each}
					</fieldset>
				{/each}

				{#if editing.resultCards}
					<fieldset class="ed-side">
						<legend>결과 캐릭터 카드</legend>
						{#each cards as [name, c] (name)}
							<div class="ed-card">
								<div class="ed-card-name">{name}</div>
								<label>유형 라벨<input bind:value={c.label} /></label>
								<label
									>특이 스탯 <small>(한 줄에 하나)</small>
									<textarea
										rows="3"
										value={stnl(c.stats)}
										oninput={(e) => setStats(c, e.currentTarget.value)}
									></textarea>
								</label>
								<label>예상 예언<input bind:value={c.prophecy} /></label>
							</div>
						{/each}
					</fieldset>
				{/if}

				<div class="ed-actions">
					<button type="submit">저장</button>
					<button type="button" class="ghost" onclick={cancelEdit}>취소</button>
				</div>
			</form>
		{/if}
	{/if}
</div>

<ImageSearchModal
	open={!!search}
	initialQuery={search?.query ?? ''}
	onpick={pickFromSearch}
	onclose={() => (search = null)}
/>

<style>
	.admin {
		max-width: 720px;
		margin: 0 auto;
	}
	h2 {
		margin: 8px 0 16px;
	}
	h3 {
		margin: 28px 0 12px;
	}
	.card {
		background: var(--surface);
		border: 3px solid var(--line);
		box-shadow: var(--shadow);
		padding: 18px;
	}
	.note ul {
		margin: 8px 0 0;
		padding-left: 18px;
	}
	.note code {
		background: var(--bg, #eee);
		padding: 1px 5px;
	}
	.login {
		display: flex;
		flex-direction: column;
		gap: 12px;
		max-width: 320px;
	}
	.login label {
		display: flex;
		flex-direction: column;
		gap: 6px;
		font-size: 14px;
	}
	.login input {
		font: inherit;
		padding: 10px;
		border: 3px solid var(--line);
		background: var(--surface);
		color: var(--ink);
	}
	button {
		font: inherit;
		font-weight: 700;
		padding: 10px 16px;
		border: 3px solid var(--line);
		background: var(--accent, #6d5efc);
		color: #fff;
		cursor: pointer;
	}
	button.ghost,
	button.no {
		background: var(--surface);
		color: var(--ink);
	}
	button.ok {
		background: #1f9d55;
	}
	button.no {
		border-color: #c0392b;
		color: #c0392b;
	}
	.err {
		color: #c0392b;
		font-size: 14px;
		margin: 0;
	}
	.logout-row {
		text-align: right;
	}
	.stat-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 14px;
	}
	.stat {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
		padding: 22px;
	}
	.stat-num {
		font-size: 40px;
		font-weight: 800;
	}
	.stat-cap {
		font-size: 14px;
		color: var(--muted);
	}
	.table-wrap {
		overflow-x: auto;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 14px;
	}
	th,
	td {
		text-align: left;
		padding: 10px 8px;
		border-bottom: 2px solid var(--line);
		white-space: nowrap;
	}
	td.num,
	th:nth-child(2),
	th:nth-child(4) {
		text-align: right;
	}
	.dist {
		white-space: normal;
	}
	.muted {
		color: var(--muted);
	}
	.reqs {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.req.decided {
		opacity: 0.6;
	}
	.req-head {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}
	.req-body {
		margin: 8px 0 0;
		font-size: 14px;
		white-space: pre-wrap;
	}
	.tag {
		font-size: 12px;
		font-weight: 700;
		padding: 2px 8px;
		border: 2px solid var(--line);
	}
	.tag-topic {
		background: #eef;
	}
	.tag-condition {
		background: #efe;
	}
	.st {
		margin-left: auto;
	}
	.st-accepted {
		color: #1f9d55;
	}
	.st-rejected {
		color: #c0392b;
	}
	.req-actions {
		display: flex;
		gap: 8px;
		margin-top: 12px;
	}
	.req-actions button {
		padding: 6px 14px;
		font-size: 14px;
	}

	/* ── 덱 편집 ── */
	.ok-msg {
		color: #1f9d55;
		font-weight: 700;
		font-size: 14px;
		margin: 0 0 10px;
	}
	.import-row {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
		margin-bottom: 14px;
	}
	.import-row small {
		color: var(--muted);
	}
	.deck-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.deck-row {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 12px 14px;
	}
	.deck-row b {
		flex: 1;
		min-width: 0;
	}
	.deck-icon {
		font-size: 20px;
	}
	.editor {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
	.ed-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.editor label {
		display: flex;
		flex-direction: column;
		gap: 5px;
		font-size: 13px;
		font-weight: 700;
		color: var(--muted);
	}
	.editor input,
	.editor select,
	.editor textarea {
		font: inherit;
		font-weight: 400;
		color: var(--ink);
		padding: 9px 10px;
		border: 2px solid var(--line);
		background: var(--surface);
		width: 100%;
		box-sizing: border-box;
	}
	.ed-two {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
	}
	/* 이미지 업로드 필드(아이콘·이모지) */
	.ed-field {
		display: flex;
		flex-direction: column;
		gap: 5px;
	}
	.ed-flabel {
		font-size: 13px;
		font-weight: 700;
		color: var(--muted);
	}
	.up-row {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.up-prev {
		width: 30px;
		height: 30px;
		flex: none;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border: 2px solid var(--line);
		font-size: 20px;
		overflow: hidden;
	}
	.editor .up-btn {
		/* .editor label의 세로 flex 상속을 이기고 인라인 버튼처럼 */
		display: inline-flex;
		flex-direction: row;
		align-items: center;
		gap: 4px;
		font-size: 13px;
		font-weight: 700;
		color: var(--ink);
		cursor: pointer;
		border: 2px solid var(--line);
		background: var(--surface);
		padding: 6px 10px;
		white-space: nowrap;
	}
	.editor .up-btn input {
		display: none;
	}
	.ed-side {
		border: 2px solid var(--line);
		padding: 12px;
		display: flex;
		flex-direction: column;
		gap: 10px;
		margin: 0;
	}
	.ed-side legend {
		font-weight: 800;
		padding: 0 6px;
	}
	.ed-cond {
		display: grid;
		grid-template-columns: 54px 1fr 26px;
		gap: 6px 8px;
		align-items: center;
	}
	.ed-str {
		grid-column: 1;
		grid-row: 1;
		font-size: 12px;
		font-weight: 700;
		color: var(--muted);
	}
	.ed-ptext {
		grid-column: 2;
		grid-row: 1;
	}
	.ed-pmerit {
		grid-column: 2;
		grid-row: 2;
	}
	.ed-pshort {
		grid-column: 2;
		grid-row: 3;
	}
	.ed-delcond {
		grid-column: 3;
		grid-row: 1 / span 3;
		align-self: center;
		border: 2px solid var(--line);
		background: var(--surface);
		color: #c0392b;
		font-weight: 800;
		cursor: pointer;
		padding: 4px 0;
	}
	.ed-delcond:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}
	.ed-condctl {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
		padding: 8px 0;
		font-size: 13px;
	}
	.ed-condctl b {
		font-size: 15px;
	}
	.ed-condctl small {
		color: var(--muted);
	}
	.ed-card {
		border-top: 2px dashed var(--line);
		padding-top: 10px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.ed-card-name {
		font-weight: 800;
		font-size: 13px;
	}
	.ed-actions {
		display: flex;
		gap: 10px;
		position: sticky;
		bottom: 0;
		background: var(--surface);
		padding-top: 8px;
	}
</style>
