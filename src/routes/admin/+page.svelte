<script lang="ts">
	import { onMount } from 'svelte';
	import { getSessionId } from '$lib/supabase';
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
	{/if}
</div>

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
</style>
