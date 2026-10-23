<script lang="ts">
	import type { PageData } from './$types';
	import {
		BarChart3,
		TrendingUp,
		Activity,
		Globe,
		ExternalLink,
		Copy,
		Check,
		Monitor
	} from 'lucide-svelte';

	interface PageProps {
		data: PageData;
	}

	let { data }: PageProps = $props();

	let copiedId = $state<string | null>(null);

	const avgClicksPerLink = $derived(
		data.totalLinks > 0 ? (data.totalClicks / data.totalLinks).toFixed(1) : '0'
	);

	const maxClicks = $derived(
		Math.max(1, ...(data.topLinks.map((l) => l.currentClicks || 0)))
	);

	async function copyLink(slug: string, id: string) {
		const fullUrl = `${window.location.origin}/${slug}`;
		await navigator.clipboard.writeText(fullUrl);
		copiedId = id;
		setTimeout(() => {
			if (copiedId === id) copiedId = null;
		}, 2000);
	}
</script>

<svelte:head>
	<title>Analytics — Run Mobile</title>
</svelte:head>

<div class="space-y-4">
	<!-- Page Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-base font-bold text-zinc-100 flex items-center gap-2">
				<BarChart3 class="w-4 h-4 text-blue-400" />
				<span>Traffic & Telemetry</span>
			</h1>
			<p class="text-xs text-zinc-400 mt-0.5">Real-time edge click metrics</p>
		</div>

		<!-- 3D Globe Link for Desktop -->
		<a
			href="/api/view-mode?mode=desktop&redirect=/analytics"
			class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-[11px] font-medium text-zinc-300 hover:text-white transition-colors"
		>
			<Globe class="w-3.5 h-3.5 text-blue-400" />
			<span>3D Globe (PC)</span>
		</a>
	</div>

	<!-- Metric Cards Grid -->
	<div class="grid grid-cols-3 gap-2">
		<div class="bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-3 flex flex-col justify-between">
			<div class="text-[10px] uppercase font-mono tracking-wider text-zinc-400 font-medium">Clicks</div>
			<div class="text-xl font-bold text-zinc-100 font-mono mt-1">{data.totalClicks.toLocaleString()}</div>
			<div class="text-[9px] text-emerald-400 font-medium flex items-center gap-1 mt-1">
				<TrendingUp class="w-2.5 h-2.5" />
				<span>Live</span>
			</div>
		</div>

		<div class="bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-3 flex flex-col justify-between">
			<div class="text-[10px] uppercase font-mono tracking-wider text-zinc-400 font-medium">Links</div>
			<div class="text-xl font-bold text-zinc-100 font-mono mt-1">{data.totalLinks}</div>
			<div class="text-[9px] text-zinc-400 font-medium mt-1">Total created</div>
		</div>

		<div class="bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-3 flex flex-col justify-between">
			<div class="text-[10px] uppercase font-mono tracking-wider text-zinc-400 font-medium">Avg / Link</div>
			<div class="text-xl font-bold text-zinc-100 font-mono mt-1">{avgClicksPerLink}</div>
			<div class="text-[9px] text-blue-400 font-medium mt-1">Engaged</div>
		</div>
	</div>

	<!-- Edge Performance Banner -->
	<div class="bg-blue-950/20 border border-blue-900/40 rounded-2xl p-3.5 flex items-center justify-between">
		<div class="flex items-center gap-2.5">
			<div class="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
				<Activity class="w-4 h-4" />
			</div>
			<div>
				<div class="text-xs font-semibold text-zinc-200">Vercel Edge Gateway</div>
				<div class="text-[11px] text-zinc-400">&lt;8ms worldwide redirection</div>
			</div>
		</div>
		<div class="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[10px] font-semibold">
			ONLINE
		</div>
	</div>

	<!-- Top Performing Links -->
	<div class="bg-zinc-900/70 border border-zinc-800/80 rounded-2xl p-4 space-y-3">
		<div class="flex items-center justify-between">
			<h2 class="text-xs font-bold text-zinc-200 uppercase tracking-wider font-mono">
				Top Click Volume
			</h2>
			<span class="text-[10px] text-zinc-400 font-mono">Ranked by hits</span>
		</div>

		{#if data.topLinks.length === 0}
			<div class="text-center py-6 text-xs text-zinc-400">
				No click data recorded yet.
			</div>
		{:else}
			<div class="space-y-3">
				{#each data.topLinks as link, idx (link.id)}
					{@const percentage = Math.round(((link.currentClicks || 0) / maxClicks) * 100)}
					{@const isCopied = copiedId === link.id}

					<div class="space-y-1.5">
						<!-- Link Details -->
						<div class="flex items-center justify-between text-xs">
							<div class="flex items-center gap-2 min-w-0 flex-1">
								<span class="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 shrink-0">
									#{idx + 1}
								</span>
								<span class="font-bold font-mono text-zinc-100 truncate">
									/{link.slug}
								</span>
							</div>

							<div class="flex items-center gap-2 shrink-0">
								<span class="font-mono text-xs font-bold text-blue-400">
									{(link.currentClicks || 0).toLocaleString()} clicks
								</span>
								<button
									type="button"
									onclick={() => copyLink(link.slug, link.id)}
									class="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
									title="Copy link"
								>
									{#if isCopied}
										<Check class="w-3.5 h-3.5 text-emerald-400" />
									{:else}
										<Copy class="w-3.5 h-3.5" />
									{/if}
								</button>
							</div>
						</div>

						<!-- Progress Bar -->
						<div class="w-full h-2 rounded-full bg-zinc-800/80 overflow-hidden">
							<div
								class="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-500 transition-all duration-500"
								style="width: {percentage}%"
							></div>
						</div>

						<!-- Destination preview -->
						<div class="text-[10px] text-zinc-400 font-mono truncate">
							{link.destinationUrl}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>
