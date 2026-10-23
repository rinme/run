<script lang="ts">
	import { page } from '$app/state';
	import { QrCode, Sparkles, ArrowLeft } from 'lucide-svelte';
	import QrStudio from '#lib/components/QrStudio.svelte';

	const paramUrl = $derived(page.url.searchParams.get('url'));
	const paramSlug = $derived(page.url.searchParams.get('slug') || 'run');

	const initialUrl = $derived(
		paramUrl ||
		(typeof window !== 'undefined'
			? `${window.location.origin}/${paramSlug}`
			: `https://run.link/${paramSlug}`)
	);
</script>

<svelte:head>
	<title>QR Studio — Run Mobile</title>
</svelte:head>

<div class="space-y-4">
	<!-- Page Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-base font-bold text-zinc-100 flex items-center gap-2">
				<QrCode class="w-4 h-4 text-blue-400" />
				<span>Mobile QR Studio</span>
			</h1>
			<p class="text-xs text-zinc-400 mt-0.5">Custom vectors, brand logos & colors</p>
		</div>

		<span class="text-[10px] font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
			SVG &amp; PNG
		</span>
	</div>

	<!-- QR Studio Component -->
	<QrStudio url={initialUrl} slug={paramSlug} />
</div>
