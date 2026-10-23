<script lang="ts">
	import type { PageData } from './$types';
	import {
		BarChart3,
		Globe as GlobeIcon,
		Radio,
		Activity,
		Smartphone,
		Compass,
		ExternalLink,
		Calendar
	} from 'lucide-svelte';
	import Globe from '#lib/components/Globe.svelte';
	import { LiveQueueManager } from '#lib/client/live-queue.svelte.ts';

	interface PageProps {
		data: PageData;
	}

	let { data }: PageProps = $props();

	let timeRange = $state<'24h' | '7d' | '30d' | 'all'>('7d');

	// Real-time Live Queue
	const liveQueue = new LiveQueueManager(25);

	$effect(() => {
		liveQueue.start();
		return () => liveQueue.stop();
	});

	// Timeseries synthetic data for SVG chart
	const timeseriesData = [
		{ label: 'Mon', clicks: 142 },
		{ label: 'Tue', clicks: 238 },
		{ label: 'Wed', clicks: 310 },
		{ label: 'Thu', clicks: 284 },
		{ label: 'Fri', clicks: 420 },
		{ label: 'Sat', clicks: 512 },
		{ label: 'Sun', clicks: 489 }
	];

	const maxClicks = Math.max(...timeseriesData.map((d) => d.clicks));

	const topCountries = [
		{ code: 'US', name: 'United States', clicks: 1240, percentage: 42 },
		{ code: 'DE', name: 'Germany', clicks: 480, percentage: 16 },
		{ code: 'GB', name: 'United Kingdom', clicks: 320, percentage: 11 },
		{ code: 'JP', name: 'Japan', clicks: 210, percentage: 7 },
		{ code: 'FR', name: 'France', clicks: 180, percentage: 6 },
		{ code: 'SG', name: 'Singapore', clicks: 140, percentage: 5 }
	];

	const topReferrers = [
		{ name: 'Direct / None', count: 1420, percentage: 48 },
		{ name: 'Twitter / X', count: 840, percentage: 28 },
		{ name: 'GitHub', count: 410, percentage: 14 },
		{ name: 'Hacker News', count: 180, percentage: 6 },
		{ name: 'Reddit', count: 110, percentage: 4 }
	];
</script>

<div class="p-8 max-w-7xl w-full mx-auto space-y-6">
	<!-- Top Bar Header -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
		<div>
			<h1 class="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2.5">
				<span>Analytics &amp; Telemetry</span>
				<span class="text-xs font-mono font-normal text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1.5">
					<span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
					Live Stream
				</span>
			</h1>
			<p class="text-xs text-zinc-400 mt-0.5">Click volume timeseries, geo-distributed traffic, and device metrics</p>
		</div>

		<div class="flex items-center gap-1 bg-zinc-900 p-1 border border-zinc-800 rounded-lg">
			{#each ['24h', '7d', '30d', 'all'] as range}
				<button
					type="button"
					onclick={() => (timeRange = range as any)}
					class="px-3 py-1 text-xs rounded font-mono transition-colors capitalize cursor-pointer {timeRange === range
						? 'bg-zinc-800 text-white font-semibold'
						: 'text-zinc-400 hover:text-zinc-200'}"
				>
					{range}
				</button>
			{/each}
		</div>
	</div>

	<!-- Top Metric Cards -->
	<div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
		<div class="bg-[#101013] border border-zinc-800/80 rounded-xl p-4">
			<div class="text-[11px] font-medium text-zinc-400 uppercase tracking-wider font-mono">Total Period Clicks</div>
			<div class="text-2xl font-bold tracking-tight text-zinc-100 mt-1 font-mono">
				{data.totalClicks.toLocaleString()}
			</div>
			<div class="text-[11px] text-emerald-400 mt-1">+18.4% vs last period</div>
		</div>

		<div class="bg-[#101013] border border-zinc-800/80 rounded-xl p-4">
			<div class="text-[11px] font-medium text-zinc-400 uppercase tracking-wider font-mono">Unique Countries</div>
			<div class="text-2xl font-bold tracking-tight text-zinc-100 mt-1 font-mono">48</div>
			<div class="text-[11px] text-zinc-400 mt-1 font-mono">Top: United States (42%)</div>
		</div>

		<div class="bg-[#101013] border border-zinc-800/80 rounded-xl p-4">
			<div class="text-[11px] font-medium text-zinc-400 uppercase tracking-wider font-mono">Device Breakdown</div>
			<div class="text-2xl font-bold tracking-tight text-zinc-100 mt-1 font-mono">64% Desktop</div>
			<div class="text-[11px] text-zinc-400 mt-1">32% Mobile &bull; 4% Tablet</div>
		</div>

		<div class="bg-[#101013] border border-zinc-800/80 rounded-xl p-4">
			<div class="text-[11px] font-medium text-zinc-400 uppercase tracking-wider font-mono">Edge Lookup Latency</div>
			<div class="text-2xl font-bold tracking-tight text-zinc-100 mt-1 font-mono">7.2ms</div>
			<div class="text-[11px] text-zinc-400 mt-1">99.8% cache hit ratio</div>
		</div>
	</div>

	<!-- Timeseries Click Chart (taste-skill: clean, no-slop SVG area/line chart) -->
	<div class="bg-[#101013] border border-zinc-800/80 rounded-xl p-5 space-y-4">
		<div class="flex items-center justify-between">
			<div>
				<h3 class="text-xs font-bold text-zinc-200 uppercase tracking-wider font-mono">Click Volume Over Time</h3>
				<p class="text-xs text-zinc-400">Aggregated redirect events across all active short links</p>
			</div>
			<span class="text-xs font-mono text-blue-400">Daily Average: 342 clicks</span>
		</div>

		<!-- SVG Bar Chart -->
		<div class="h-44 w-full flex items-end gap-3 pt-4 pb-2 border-b border-zinc-800/80">
			{#each timeseriesData as pt}
				{@const heightPct = Math.round((pt.clicks / maxClicks) * 100)}
				<div class="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
					<span class="text-[10px] font-mono text-zinc-400 group-hover:text-blue-400 transition-colors">
						{pt.clicks}
					</span>
					<div
						class="w-full bg-zinc-800 group-hover:bg-blue-600 rounded-xs transition-colors"
						style="height: {heightPct}%;"
					></div>
					<span class="text-[11px] font-mono text-zinc-500">{pt.label}</span>
				</div>
			{/each}
		</div>
	</div>

	<!-- 3D Interactive WebGL Globe + Real-Time Queue -->
	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
		<!-- 3D Globe -->
		<div class="lg:col-span-2 bg-[#101013] border border-zinc-800/80 rounded-xl h-[420px] overflow-hidden relative shadow-xs">
			<Globe className="w-full h-full" />
		</div>

		<!-- Real-time Live Queue -->
		<div class="bg-[#101013] border border-zinc-800/80 rounded-xl p-4 flex flex-col h-[420px]">
			<div class="flex items-center justify-between pb-3 border-b border-zinc-800 mb-3">
				<div class="flex items-center gap-2">
					<Radio class="w-4 h-4 text-emerald-400 animate-pulse" />
					<h3 class="text-xs font-bold tracking-wide uppercase text-zinc-200 font-mono">Live Traffic Stream</h3>
				</div>
				<span class="text-[10px] font-mono text-zinc-500">{liveQueue.activeCount} buffered</span>
			</div>

			<div class="flex-1 overflow-y-auto space-y-2 pr-1">
				{#if liveQueue.events.length === 0}
					<div class="text-center py-24 text-xs text-zinc-500 font-mono">
						Streaming incoming click events...
					</div>
				{:else}
					{#each liveQueue.events as ev (ev.id)}
						<div class="p-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs space-y-1 animate-in fade-in slide-in-from-top-1 duration-200">
							<div class="flex items-center justify-between">
								<span class="font-mono text-blue-400 font-semibold">/{ev.slug}</span>
								<span class="text-[10px] font-mono text-zinc-500">{new Date(ev.timestamp).toLocaleTimeString()}</span>
							</div>
							<div class="flex items-center justify-between text-[11px] text-zinc-400">
								<span>📍 {ev.city}, {ev.country}</span>
								<span class="capitalize text-zinc-500">{ev.deviceType} &bull; {ev.browser}</span>
							</div>
						</div>
					{/each}
				{/if}
			</div>
		</div>
	</div>

	<!-- Bottom Breakdown: Countries & Referrers -->
	<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
		<!-- Top Countries -->
		<div class="bg-[#101013] border border-zinc-800/80 rounded-xl p-5 space-y-3">
			<h3 class="text-xs font-bold text-zinc-200 uppercase tracking-wider font-mono">Top Geographic Origins</h3>
			<div class="space-y-2">
				{#each topCountries as c}
					<div class="space-y-1">
						<div class="flex items-center justify-between text-xs">
							<span class="text-zinc-300 font-medium">{c.name} ({c.code})</span>
							<span class="font-mono text-zinc-400">{c.clicks.toLocaleString()} ({c.percentage}%)</span>
						</div>
						<div class="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden">
							<div class="bg-blue-600 h-full rounded-full" style="width: {c.percentage}%;"></div>
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- Top Referrers -->
		<div class="bg-[#101013] border border-zinc-800/80 rounded-xl p-5 space-y-3">
			<h3 class="text-xs font-bold text-zinc-200 uppercase tracking-wider font-mono">Top Traffic Sources</h3>
			<div class="space-y-2">
				{#each topReferrers as r}
					<div class="space-y-1">
						<div class="flex items-center justify-between text-xs">
							<span class="text-zinc-300 font-medium">{r.name}</span>
							<span class="font-mono text-zinc-400">{r.count.toLocaleString()} ({r.percentage}%)</span>
						</div>
						<div class="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden">
							<div class="bg-zinc-700 h-full rounded-full" style="width: {r.percentage}%;"></div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>
</div>
