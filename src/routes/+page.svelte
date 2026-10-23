<script lang="ts">
	import type { PageData } from './$types';
	import {
		Link2,
		Plus,
		Search,
		Copy,
		ExternalLink,
		QrCode,
		Check,
		Edit3,
		Trash2,
		ShieldCheck,
		Sparkles,
		Clock,
		Activity,
		Filter,
		Share2
	} from 'lucide-svelte';
	import LinkDrawer from '#lib/components/LinkDrawer.svelte';

	interface PageProps {
		data: PageData;
	}

	let { data }: PageProps = $props();

	let linkList = $state<typeof data.links>([]);
	let searchQuery = $state('');
	let selectedMode = $state<string>('all');
	let sortBy = $state<'latest' | 'clicks' | 'slug'>('latest');

	// Drawer state
	let isDrawerOpen = $state(false);
	let activeEditLink = $state<any | null>(null);
	let copiedId = $state<string | null>(null);

	$effect.pre(() => {
		linkList = [...(data.links || [])];
	});

	// Listen for global links update event
	$effect(() => {
		const handleUpdate = async () => {
			const res = await fetch('/api/links');
			if (res.ok) {
				const fresh = await res.json();
				linkList = fresh;
			}
		};
		window.addEventListener('run:links-updated', handleUpdate);
		return () => window.removeEventListener('run:links-updated', handleUpdate);
	});

	// Filtered & Sorted links
	let processedLinks = $derived.by(() => {
		let list = linkList.filter((l) => {
			const matchesQuery =
				l.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
				l.destinationUrl.toLowerCase().includes(searchQuery.toLowerCase()) ||
				(l.title && l.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
				(l.tags && l.tags.toLowerCase().includes(searchQuery.toLowerCase()));

			const matchesMode = selectedMode === 'all' || l.deliveryMode === selectedMode;

			return matchesQuery && matchesMode;
		});

		if (sortBy === 'clicks') {
			list.sort((a, b) => (b.currentClicks || 0) - (a.currentClicks || 0));
		} else if (sortBy === 'slug') {
			list.sort((a, b) => a.slug.localeCompare(b.slug));
		} else {
			list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
		}

		return list;
	});

	let totalClicks = $derived(
		linkList.reduce((acc, curr) => acc + (curr.currentClicks || 0), 0)
	);

	function copyShortUrl(slug: string, id: string) {
		const url = `${window.location.origin}/${slug}`;
		navigator.clipboard.writeText(url);
		copiedId = id;
		setTimeout(() => {
			if (copiedId === id) copiedId = null;
		}, 2000);
	}

	function openCreateDrawer() {
		activeEditLink = null;
		isDrawerOpen = true;
	}

	function openEditDrawer(link: any) {
		activeEditLink = link;
		isDrawerOpen = true;
	}

	async function handleDeleteLink(id: string, slug: string) {
		if (!confirm(`Are you sure you want to delete /${slug}? This action is immediate.`)) return;

		try {
			const res = await fetch(`/api/links?id=${id}`, { method: 'DELETE' });
			if (res.ok) {
				linkList = linkList.filter((l) => l.id !== id);
			}
		} catch (e) {
			console.error('Delete error:', e);
		}
	}

	function handleSaved(savedLink: any) {
		const idx = linkList.findIndex((l) => l.id === savedLink.id);
		if (idx >= 0) {
			linkList[idx] = savedLink;
		} else {
			linkList = [savedLink, ...linkList];
		}
	}
</script>

<div class="p-8 max-w-7xl w-full mx-auto space-y-6">
	<!-- Top Bar Header -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
		<div>
			<h1 class="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2.5">
				<span>Short Links</span>
				<span class="text-xs font-mono font-normal text-zinc-400 bg-zinc-850 px-2.5 py-0.5 rounded-full border border-zinc-750">
					{linkList.length} total
				</span>
			</h1>
			<p class="text-xs text-zinc-400 mt-0.5">High-speed edge routing, security delivery gates, and targeting</p>
		</div>

		<div class="flex items-center gap-2.5">
			<a
				href="/domains"
				class="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-300 hover:text-white hover:border-zinc-700 transition-colors"
			>
				<span class="w-2 h-2 rounded-full bg-emerald-400"></span>
				<span>{data.siteConfig?.defaultDomain || 'go.run.link'}</span>
			</a>

			<button
				type="button"
				onclick={openCreateDrawer}
				class="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-sm transition-all cursor-pointer"
			>
				<Plus class="w-4 h-4" />
				<span>Create Link</span>
			</button>
		</div>
	</div>

	<!-- KPI Summary Row (taste-skill anti-slop: clean data numbers, no colored icon circles) -->
	<div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
		<div class="bg-[#101013] border border-zinc-800/80 rounded-xl p-4">
			<div class="text-[11px] font-medium text-zinc-400 uppercase tracking-wider font-mono">Total Links</div>
			<div class="text-2xl font-bold tracking-tight text-zinc-100 mt-1 font-mono">{linkList.length}</div>
			<div class="text-[11px] text-zinc-400 mt-1">Active in workspace</div>
		</div>

		<div class="bg-[#101013] border border-zinc-800/80 rounded-xl p-4">
			<div class="text-[11px] font-medium text-zinc-400 uppercase tracking-wider font-mono">Total Clicks Tracked</div>
			<div class="text-2xl font-bold tracking-tight text-zinc-100 mt-1 font-mono">{totalClicks.toLocaleString()}</div>
			<div class="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
				<span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
				<span>Tinybird Ingestion Stream</span>
			</div>
		</div>

		<div class="bg-[#101013] border border-zinc-800/80 rounded-xl p-4">
			<div class="text-[11px] font-medium text-zinc-400 uppercase tracking-wider font-mono">KV Cache Resolution</div>
			<div class="text-2xl font-bold tracking-tight text-zinc-100 mt-1 font-mono">&lt; 8ms</div>
			<div class="text-[11px] text-zinc-400 mt-1">Upstash Redis write-through</div>
		</div>

		<div class="bg-[#101013] border border-zinc-800/80 rounded-xl p-4">
			<div class="text-[11px] font-medium text-zinc-400 uppercase tracking-wider font-mono">Active Delivery Modes</div>
			<div class="text-2xl font-bold tracking-tight text-zinc-100 mt-1 font-mono">6 Modes</div>
			<div class="text-[11px] text-zinc-400 mt-1">PBKDF2 &bull; Age Gate &bull; Interstitial</div>
		</div>
	</div>

	<!-- Search & Filter Controls -->
	<div class="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2">
		<!-- Search Input -->
		<div class="relative flex-1 max-w-md">
			<Search class="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Search by slug, destination, title, tags..."
				class="w-full pl-9 pr-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
			/>
		</div>

		<!-- Delivery Mode Filter Chips -->
		<div class="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
			{#each [
				{ id: 'all', label: 'All' },
				{ id: 'direct', label: 'Direct' },
				{ id: 'password', label: 'Password' },
				{ id: 'age_gate', label: '18+ Gate' },
				{ id: 'interstitial', label: 'Countdown' },
				{ id: 'cloaked', label: 'Cloaked' }
			] as mode}
				<button
					type="button"
					onclick={() => (selectedMode = mode.id)}
					class="px-2.5 py-1 text-xs rounded-md transition-colors cursor-pointer capitalize font-medium {selectedMode === mode.id
						? 'bg-zinc-800 text-white border border-zinc-700'
						: 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'}"
				>
					{mode.label}
				</button>
			{/each}

			<select
				bind:value={sortBy}
				class="ml-2 px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded-md text-xs text-zinc-300 focus:outline-none focus:border-zinc-700 cursor-pointer"
			>
				<option value="latest">Sort: Latest</option>
				<option value="clicks">Sort: Most Clicks</option>
				<option value="slug">Sort: Slug (A-Z)</option>
			</select>
		</div>
	</div>

	<!-- Links Data Table -->
	{#if processedLinks.length === 0}
		<div class="text-center py-20 bg-[#101013] border border-zinc-800 rounded-xl p-8">
			<div class="w-10 h-10 rounded-full bg-zinc-850 flex items-center justify-center mx-auto mb-3 text-zinc-500">
				<Link2 class="w-5 h-5" />
			</div>
			<h3 class="text-sm font-semibold text-zinc-200">No short links match your filter</h3>
			<p class="text-xs text-zinc-400 max-w-sm mx-auto mt-1 mb-5">
				{searchQuery ? `No links found matching "${searchQuery}"` : 'Get started by creating your first short link with edge routing.'}
			</p>
			<button
				type="button"
				onclick={openCreateDrawer}
				class="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-sm cursor-pointer"
			>
				<Plus class="w-4 h-4" />
				Create Link
			</button>
		</div>
	{:else}
		<div class="bg-[#101013] border border-zinc-800/90 rounded-xl overflow-hidden divide-y divide-zinc-800/80 shadow-xs">
			{#each processedLinks as link (link.id)}
				<div
					id={link.id}
					class="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-zinc-850/30 transition-colors group"
				>
					<!-- Left: Slug & Details -->
					<div class="space-y-1.5 min-w-0 flex-1">
						<div class="flex items-center gap-2 flex-wrap">
							<a
								href="/{link.slug}"
								target="_blank"
								class="text-sm font-bold text-blue-400 hover:text-blue-300 font-mono tracking-tight flex items-center gap-1"
							>
								/{link.slug}
								<ExternalLink class="w-3.5 h-3.5 opacity-60" />
							</a>

							<!-- Delivery Mode Tag -->
							{#if link.deliveryMode !== 'direct'}
								<span class="text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded bg-zinc-850 text-zinc-300 border border-zinc-750">
									{link.deliveryMode.replace('_', ' ')}
								</span>
							{/if}

							<!-- Click Limit / Expire Badge -->
							{#if link.maxClicks}
								<span class="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
									{link.currentClicks} / {link.maxClicks} clicks
								</span>
							{/if}

							<!-- A/B Split Indicator -->
							{#if link.abSplits}
								<span class="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
									A/B Split
								</span>
							{/if}
						</div>

						<div class="text-xs text-zinc-400 truncate max-w-xl font-mono">
							{link.destinationUrl}
						</div>

						{#if link.title}
							<div class="text-xs text-zinc-300 font-medium">{link.title}</div>
						{/if}

						<!-- Tags -->
						{#if link.tags}
							{@const tagsList = (() => { try { return JSON.parse(link.tags); } catch { return []; } })()}
							{#if tagsList.length > 0}
								<div class="flex items-center gap-1.5 pt-0.5">
									{#each tagsList as tag}
										<span class="text-[10px] font-mono text-zinc-400 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
											#{tag}
										</span>
									{/each}
								</div>
							{/if}
						{/if}
					</div>

					<!-- Right: Click count & Action Buttons -->
					<div class="flex items-center gap-4 shrink-0 justify-between sm:justify-end">
						<div class="text-right">
							<div class="text-xs font-bold text-zinc-100 font-mono">{link.currentClicks.toLocaleString()} clicks</div>
							<div class="text-[10px] text-zinc-400 font-mono">
								{new Date(link.createdAt).toLocaleDateString()}
							</div>
						</div>

						<!-- Action Controls Bar -->
						<div class="flex items-center gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
							<button
								title="Copy short link"
								type="button"
								onclick={() => copyShortUrl(link.slug, link.id)}
								class="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors cursor-pointer"
							>
								{#if copiedId === link.id}
									<Check class="w-3.5 h-3.5 text-emerald-400" />
								{:else}
									<Copy class="w-3.5 h-3.5" />
								{/if}
							</button>

							<a
								title="Open in QR Studio"
								href="/qr?slug={link.slug}"
								class="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
							>
								<QrCode class="w-3.5 h-3.5" />
							</a>

							<button
								title="Edit link"
								type="button"
								onclick={() => openEditDrawer(link)}
								class="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors cursor-pointer"
							>
								<Edit3 class="w-3.5 h-3.5" />
							</button>

							<button
								title="Delete link"
								type="button"
								onclick={() => handleDeleteLink(link.id, link.slug)}
								class="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded transition-colors cursor-pointer"
							>
								<Trash2 class="w-3.5 h-3.5" />
							</button>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- Slide-Over Drawer -->
<LinkDrawer
	isOpen={isDrawerOpen}
	linkToEdit={activeEditLink}
	onClose={() => (isDrawerOpen = false)}
	onSaved={handleSaved}
/>
