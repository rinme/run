<script lang="ts">
	import type { PageData } from './$types';
	import {
		Link2,
		Plus,
		Search,
		Copy,
		ExternalLink,
		QrCode,
		Globe as GlobeIcon,
		Activity,
		Shield,
		Clock,
		Check,
		Radio
	} from 'lucide-svelte';
	import LinkModal from '#lib/components/LinkModal.svelte';
	import Globe from '#lib/components/Globe.svelte';
	import QrStudio from '#lib/components/QrStudio.svelte';
	import { LiveQueueManager } from '#lib/client/live-queue.svelte.ts';

	interface PageProps {
		data: PageData;
	}

	let { data }: PageProps = $props();

	// Local links state
	let linkList = $state<typeof data.links>([]);

	$effect.pre(() => {
		linkList = [...(data.links || [])];
	});
	let searchQuery = $state('');
	let isModalOpen = $state(false);
	let activeTab = $state<'links' | 'analytics' | 'qr'>('links');
	let selectedQrUrl = $state('https://run.link');
	let selectedQrSlug = $state('run');
	let copiedId = $state<string | null>(null);

	// Svelte 5 Live Queue Manager
	const liveQueue = new LiveQueueManager(25);

	$effect(() => {
		if (activeTab === 'analytics') {
			liveQueue.start();
		} else {
			liveQueue.stop();
		}
		return () => {
			liveQueue.stop();
		};
	});

	// Filtered links
	let filteredLinks = $derived(
		linkList.filter(
			(l) =>
				l.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
				l.destinationUrl.toLowerCase().includes(searchQuery.toLowerCase()) ||
				(l.title && l.title.toLowerCase().includes(searchQuery.toLowerCase()))
		)
	);

	let totalClicksCount = $derived(
		linkList.reduce((acc, curr) => acc + (curr.currentClicks || 0), 0)
	);

	function copyToClipboard(slug: string, id: string) {
		const fullUrl = `${window.location.origin}/${slug}`;
		navigator.clipboard.writeText(fullUrl);
		copiedId = id;
		setTimeout(() => {
			if (copiedId === id) copiedId = null;
		}, 2000);
	}

	function openQrFor(slug: string) {
		selectedQrSlug = slug;
		selectedQrUrl = `${window.location.origin}/${slug}`;
		activeTab = 'qr';
	}

	function handleLinkCreated(newLink: any) {
		linkList = [newLink, ...linkList];
	}
</script>

<svelte:head>
	<title>Run — High-Performance Edge Link Platform</title>
</svelte:head>

<div class="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col font-sans selection:bg-blue-600/30">
	<!-- Top Navigation Bar -->
	<header class="border-b border-zinc-800/80 bg-zinc-950/60 backdrop-blur sticky top-0 z-40">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
			<div class="flex items-center gap-3">
				<div class="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-black tracking-tighter text-white shadow-lg shadow-blue-600/20">
					R
				</div>
				<div>
					<span class="font-bold text-base tracking-tight text-white flex items-center gap-2">
						Run
						<span class="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold">Edge v2.0</span>
					</span>
				</div>
			</div>

			<div class="flex items-center gap-3">
				<a
					href="/api/openapi.json"
					target="_blank"
					class="text-xs text-zinc-400 hover:text-zinc-200 px-3 py-1.5 rounded-md hover:bg-zinc-800 transition-colors font-mono"
				>
					OpenAPI
				</a>
				<a
					href="/api/mcp"
					target="_blank"
					class="text-xs text-zinc-400 hover:text-zinc-200 px-3 py-1.5 rounded-md hover:bg-zinc-800 transition-colors font-mono"
				>
					MCP Server
				</a>
				<button
					onclick={() => (isModalOpen = true)}
					class="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-sm transition-all"
				>
					<Plus class="w-4 h-4" />
					Create Link
				</button>
			</div>
		</div>
	</header>

	<!-- Main Content Area -->
	<main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
		<!-- Metric Counters Overview Cards -->
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
			<div class="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-5 shadow-sm">
				<div class="flex items-center justify-between text-zinc-400 mb-2">
					<span class="text-xs font-medium">Total Short Links</span>
					<Link2 class="w-4 h-4 text-blue-400" />
				</div>
				<div class="text-2xl font-bold tracking-tight text-white">{linkList.length}</div>
				<p class="text-[11px] text-zinc-500 mt-1 font-mono">Active on edge</p>
			</div>

			<div class="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-5 shadow-sm">
				<div class="flex items-center justify-between text-zinc-400 mb-2">
					<span class="text-xs font-medium">Total Clicks Tracked</span>
					<Activity class="w-4 h-4 text-emerald-400" />
				</div>
				<div class="text-2xl font-bold tracking-tight text-white">{totalClicksCount.toLocaleString()}</div>
				<p class="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
					<span class="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
					Tinybird Stream Ingest
				</p>
			</div>

			<div class="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-5 shadow-sm">
				<div class="flex items-center justify-between text-zinc-400 mb-2">
					<span class="text-xs font-medium">KV Cache Resolution</span>
					<Clock class="w-4 h-4 text-amber-400" />
				</div>
				<div class="text-2xl font-bold tracking-tight text-white">&lt; 8ms</div>
				<p class="text-[11px] text-zinc-500 mt-1 font-mono">Upstash Redis write-through</p>
			</div>

			<div class="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-5 shadow-sm">
				<div class="flex items-center justify-between text-zinc-400 mb-2">
					<span class="text-xs font-medium">Delivery Security</span>
					<Shield class="w-4 h-4 text-purple-400" />
				</div>
				<div class="text-2xl font-bold tracking-tight text-white">6 Modes</div>
				<p class="text-[11px] text-purple-400 mt-1">PBKDF2 &amp; HMAC Age Gates</p>
			</div>
		</div>

		<!-- Main Tab Switcher -->
		<div class="flex items-center justify-between border-b border-zinc-800 pb-3">
			<div class="flex gap-2">
				<button
					onclick={() => (activeTab = 'links')}
					class="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors {activeTab === 'links' ? 'bg-zinc-800 text-white border border-zinc-700' : 'text-zinc-400 hover:text-zinc-200'}"
				>
					<Link2 class="w-3.5 h-3.5" />
					All Links ({linkList.length})
				</button>
				<button
					onclick={() => (activeTab = 'analytics')}
					class="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors {activeTab === 'analytics' ? 'bg-zinc-800 text-white border border-zinc-700' : 'text-zinc-400 hover:text-zinc-200'}"
				>
					<GlobeIcon class="w-3.5 h-3.5" />
					Live Globe &amp; Analytics
				</button>
				<button
					onclick={() => (activeTab = 'qr')}
					class="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors {activeTab === 'qr' ? 'bg-zinc-800 text-white border border-zinc-700' : 'text-zinc-400 hover:text-zinc-200'}"
				>
					<QrCode class="w-3.5 h-3.5" />
					QR Studio
				</button>
			</div>

			{#if activeTab === 'links'}
				<div class="relative w-64">
					<Search class="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
					<input
						type="text"
						bind:value={searchQuery}
						placeholder="Search by slug, url, title..."
						class="w-full pl-9 pr-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
					/>
				</div>
			{/if}
		</div>

		<!-- TAB 1: ALL LINKS TABLE -->
		{#if activeTab === 'links'}
			{#if filteredLinks.length === 0}
				<div class="text-center py-16 bg-zinc-900/30 border border-zinc-800/80 rounded-2xl p-8">
					<div class="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-4 text-zinc-500">
						<Link2 class="w-6 h-6" />
					</div>
					<h3 class="text-base font-semibold text-zinc-200">No links found</h3>
					<p class="text-xs text-zinc-400 max-w-sm mx-auto mt-1 mb-6">
						Create your first high-performance short link with device targeting, password gates, and live analytics.
					</p>
					<button
						onclick={() => (isModalOpen = true)}
						class="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-sm"
					>
						<Plus class="w-4 h-4" />
						Create Short Link
					</button>
				</div>
			{:else}
				<div class="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden divide-y divide-zinc-800/80 shadow-sm">
					{#each filteredLinks as link (link.id)}
						<div class="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-zinc-800/30 transition-colors">
							<div class="space-y-1.5 min-w-0 flex-1">
								<div class="flex items-center gap-2">
									<a
										href="/{link.slug}"
										target="_blank"
										class="text-sm font-bold text-blue-400 hover:text-blue-300 font-mono tracking-tight flex items-center gap-1"
									>
										/{link.slug}
										<ExternalLink class="w-3.5 h-3.5 opacity-60" />
									</a>

									<!-- Delivery Mode Pill -->
									{#if link.deliveryMode !== 'direct'}
										<span class="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
											{link.deliveryMode.replace('_', ' ')}
										</span>
									{/if}

									<!-- Click / Expire rules badge -->
									{#if link.maxClicks}
										<span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
											Limit: {link.currentClicks}/{link.maxClicks}
										</span>
									{/if}
								</div>

								<div class="text-xs text-zinc-400 truncate max-w-xl font-mono">
									{link.destinationUrl}
								</div>

								{#if link.title}
									<div class="text-xs text-zinc-300 font-medium">{link.title}</div>
								{/if}
							</div>

							<!-- Action Buttons -->
							<div class="flex items-center gap-2 sm:gap-4 shrink-0">
								<!-- Click count badge -->
								<div class="text-right">
									<div class="text-xs font-bold text-zinc-200">{link.currentClicks} clicks</div>
									<div class="text-[10px] text-zinc-500 font-mono">
										{new Date(link.createdAt).toLocaleDateString()}
									</div>
								</div>

								<div class="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
									<button
										title="Copy link"
										onclick={() => copyToClipboard(link.slug, link.id)}
										class="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors"
									>
										{#if copiedId === link.id}
											<Check class="w-3.5 h-3.5 text-emerald-400" />
										{:else}
											<Copy class="w-3.5 h-3.5" />
										{/if}
									</button>

									<button
										title="Generate QR code"
										onclick={() => openQrFor(link.slug)}
										class="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors"
									>
										<QrCode class="w-3.5 h-3.5" />
									</button>
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		{/if}

		<!-- TAB 2: LIVE 3D GLOBE & ANALYTICS -->
		{#if activeTab === 'analytics'}
			<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<!-- Left 2 Cols: 3D Interactive WebGL Globe -->
				<div class="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-2xl h-[450px] overflow-hidden relative shadow-lg">
					<Globe className="w-full h-full" />
				</div>

				<!-- Right Col: Pseudo-Live Stream Replay Queue -->
				<div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col h-[450px] shadow-lg">
					<div class="flex items-center justify-between pb-3 border-b border-zinc-800 mb-3">
						<div class="flex items-center gap-2">
							<Radio class="w-4 h-4 text-emerald-400 animate-pulse" />
							<h3 class="text-xs font-bold tracking-wide uppercase text-zinc-200">Live Traffic Queue</h3>
						</div>
						<span class="text-[11px] font-mono text-zinc-500">{liveQueue.activeCount} buffered</span>
					</div>

					<div class="flex-1 overflow-y-auto space-y-2 pr-1">
						{#if liveQueue.events.length === 0}
							<div class="text-center py-20 text-xs text-zinc-500">
								Streaming live click events...
							</div>
						{:else}
							{#each liveQueue.events as ev (ev.id)}
								<div class="p-2.5 bg-zinc-950/80 border border-zinc-800/80 rounded-lg text-xs space-y-1 animate-in fade-in slide-in-from-top-1 duration-300">
									<div class="flex items-center justify-between">
										<span class="font-mono text-blue-400 font-semibold">/{ev.slug}</span>
										<span class="text-[10px] font-mono text-zinc-500">{new Date(ev.timestamp).toLocaleTimeString()}</span>
									</div>
									<div class="flex items-center justify-between text-[11px] text-zinc-400">
										<span>📍 {ev.city}, {ev.country}</span>
										<span class="capitalize text-zinc-500">{ev.deviceType} • {ev.browser}</span>
									</div>
								</div>
							{/each}
						{/if}
					</div>
				</div>
			</div>
		{/if}

		<!-- TAB 3: QR STUDIO -->
		{#if activeTab === 'qr'}
			<div class="space-y-4">
				<div class="flex items-center justify-between">
					<div>
						<h2 class="text-lg font-bold text-zinc-100">QR Code Studio</h2>
						<p class="text-xs text-zinc-400">Generate high-resolution vector SVG and PNG QR codes with branded styling</p>
					</div>
				</div>

				<QrStudio url={selectedQrUrl} slug={selectedQrSlug} />
			</div>
		{/if}
	</main>

	<!-- Footer -->
	<footer class="border-t border-zinc-900 py-6 text-center text-xs text-zinc-600 font-mono">
		Project Run &bull; SvelteKit 2 + Svelte 5 &bull; Turso &bull; Tinybird &bull; Vercel Edge
	</footer>

	<!-- Tabbed Link Editor Modal -->
	<LinkModal
		isOpen={isModalOpen}
		onClose={() => (isModalOpen = false)}
		onCreated={handleLinkCreated}
	/>
</div>
