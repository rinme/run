<script lang="ts">
	import { page } from '$app/state';
	import { QrCode, Sparkles, Download, ArrowLeft } from 'lucide-svelte';
	import QrStudio from '#lib/components/QrStudio.svelte';

	const initialSlug = $derived(page.url.searchParams.get('slug') || 'github');
	const initialUrl = $derived(
		typeof window !== 'undefined'
			? `${window.location.origin}/${initialSlug}`
			: `${page.url.origin}/${initialSlug}`
	);
</script>

<div class="p-8 max-w-7xl w-full mx-auto space-y-6">
	<!-- Top Bar Header -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
		<div>
			<div class="flex items-center gap-2 mb-1">
				<a href="/" class="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1 font-mono">
					<ArrowLeft class="w-3.5 h-3.5" />
					Back to Links
				</a>
			</div>
			<h1 class="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2.5">
				<span>QR Code Studio</span>
				<span class="text-xs font-mono font-normal text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
					Vector SVG &amp; PNG
				</span>
			</h1>
			<p class="text-xs text-zinc-400 mt-0.5">High-resolution branded QR generation with embedded logos and dot customizers</p>
		</div>
	</div>

	<!-- QR Studio Component -->
	<QrStudio url={initialUrl} slug={initialSlug} />
</div>
