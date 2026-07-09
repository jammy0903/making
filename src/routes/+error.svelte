<script lang="ts">
	import { page } from '$app/state';
	import { useT, localePath, getLocale } from '$lib/i18n';

	const t = useT();
</script>

<svelte:head>
	<title>{page.status} | {t('app.title')}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="empty" style="margin-top:48px">
	<h2 style="margin:0 0 4px">{page.status}</h2>
	<p class="muted" style="margin:0 0 20px">페이지를 찾을 수 없어요.</p>
	<a class="btn btn-primary" href={localePath(getLocale(), '/')}>{t('nav.home')}</a>
</div>
