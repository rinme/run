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
		Share2,
		Activity,
		Trash2,
		Sparkles,
		ShieldCheck,
		Clock
	} from 'lucide-svelte';
	import LinkDrawer from '#lib/components/LinkDrawer.svelte';

	interface PageProps {
		data: PageData;
	}

	let { data }: PageProps = $props();

	let linkList = $state<typeof data.links>([]);
	let searchQuery = $state('');
	let selectedFilter = $state<string>('all');
	let isDrawerOpen = $state(false);
	let activeEditLink = $state<any | null>(null);
	let copiedId = $state<string | null>(null);
	let copyToastMessage = $state<string | null>(null);

	$effect.pre(() => {
		linkList = [...(data.links || [])];
	});

	// Global links update event listener
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

	let processedLinks = $derived.by(() => {
		return linkList.filter((l) => {
			const matchesQuery =
				l.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
				l.destinationUrl.toLowerCase().includes(searchQuery.toLowerCase()) ||
				(l.title && l.title.toLowerCase().includes(searchQuery.toLowerCase()));

			const matchesFilter =
				selectedFilter === 'all' ||
				(selectedFilter === 'protected' && (l.deliveryMode === 'password' || l.deliveryMode === 'age_gate')) ||
				l.deliveryMode === selectedFilter;

			return matchesQuery && matchesFilter;
		});
	});

	let totalClicks = $derived(
		linkList.reduce((acc, curr) => acc + (curr.currentClicks || 0), 0)
	);

	function showToast(msg: string) {
		copyToastMessage = msg;
		setTimeout(() => {
			if (copyToastMessage === msg) copyToastMessage = null;
		}, 2000);
	}

	async function copyLink(slug: string, id: string) {
		const fullUrl = `${window.location.origin}/${slug}`;
		try {
			await navigator.clipboard.writeText(fullUrl);
			copiedId = id;
			showToast(`Copied /${slug}`);
			setTimeout(() => {
				if (copiedId === id) copiedId = null;
			}, 2000);
		} catch {
			showToast(`Failed to copy to clipboard`);
		}
	}

	async function shareLink(slug: string, title?: string | null) {
		const fullUrl = `${window.location.origin}/${slug}`;
		if (navigator.share) {
			try {
				await navigator.share({
					title: title || `Run Link /${slug}`,
					url: fullUrl
				});
			} catch {
				// User cancelled share
			}
		} else {
			copyLink(slug, slug);
		}
	}

	async function deleteLink(id: string, slug: string) {
		if (!confirm(`Are you sure you want to delete /${slug}?`)) return;

		try {
			const res = await fetch(`/api/links?id=${id}`, { method: 'DELETE' });
			if (res.ok) {
				linkList = linkList.filter((l) => l.id !== id);
				showToast(`Deleted /${slug}`);
			}
		} catch {
			showToast('Failed to delete link');
		}
	}

	function openCreate() {
		activeEditLink = null;
		isDrawerOpen = true;
	}

	function openEdit(link: any) {
		activeEditLink = link;
		isDrawerOpen = true;
	}

	function handleSaved(saved: any) {
		const index = linkList.findIndex((l) => l.id === saved.id);
		if (index >= 0) {
			linkList[index] = saved;
		} else {
			linkList = [saved, ...linkList];
		}
		showToast(`Saved /${saved.slug}`);
	}
</script>

<svelte:head>
	<title>Links — Run Mobile</title>
</svelte:head>

<!-- Mobile Toast Notification -->
{#if copyToastMessage}
	<div class="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-blue-600 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-lg shadow-blue-500/30 flex items-center gap-2 animate-in fade-in slide-in-from-top duration-200">
		<Check class="w-3.5 h-3.5 stroke-[3]" />
		<span>{copyToastMessage}</span>
	</div>
{/if}

<div class="space-y-4">
	<!-- Compact Stats Overview -->
	<div class="grid grid-cols-2 gap-2.5">
		<div class="bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-3 flex items-center gap-3">
			<div class="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
				<Link2 class="w-5 h-5" />
			</div>
			<div>
				<div class="text-[11px] text-zinc-400 font-medium">Active Links</div>
				<div class="text-xl font-bold text-zinc-100 font-mono">{linkList.length}</div>
			</div>
		</div>

		<div class="bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-3 flex items-center gap-3">
			<div class="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
				<Activity class="w-5 h-5" />
			</div>
			<div>
				<div class="text-[11px] text-zinc-400 font-medium">Total Clicks</div>
				<div class="text-xl font-bold text-zinc-100 font-mono">{totalClicks.toLocaleString()}</div>
			</div>
		</div>
	</div>

	<!-- Search & Filter Bar -->
	<div class="space-y-2">
		<div class="relative">
			<Search class="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
			<input
				type="text"
				placeholder="Search slug, destination, tags..."
				bind:value={searchQuery}
				class="w-full bg-zinc-900/90 border border-zinc-800 focus:border-blue-500/80 rounded-xl pl-10 pr-3 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 outline-hidden transition-colors"
			/>
		</div>

		<!-- Filter Chips -->
		<div class="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
			<button
				type="button"
				onclick={() => (selectedFilter = 'all')}
				class="px-3 py-1 rounded-full border text-[11px] font-medium shrink-0 transition-colors {selectedFilter === 'all'
					? 'bg-blue-600 text-white border-blue-500'
					: 'bg-zinc-900 text-zinc-400 border-zinc-800'}"
			>
				All ({linkList.length})
			</button>
			<button
				type="button"
				onclick={() => (selectedFilter = 'direct')}
				class="px-3 py-1 rounded-full border text-[11px] font-medium shrink-0 transition-colors {selectedFilter === 'direct'
					? 'bg-blue-600 text-white border-blue-500'
					: 'bg-zinc-900 text-zinc-400 border-zinc-800'}"
			>
				Direct
			</button>
			<button
				type="button"
				onclick={() => (selectedFilter = 'protected')}
				class="px-3 py-1 rounded-full border text-[11px] font-medium shrink-0 transition-colors {selectedFilter === 'protected'
					? 'bg-blue-600 text-white border-blue-500'
					: 'bg-zinc-900 text-zinc-400 border-zinc-800'}"
			>
				Protected
			</button>
		</div>
	</div>

	<!-- Links List -->
	{#if processedLinks.length === 0}
		<div class="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-8 text-center space-y-3">
			<div class="w-12 h-12 rounded-2xl bg-zinc-800/80 flex items-center justify-center mx-auto text-zinc-400">
				<Link2 class="w-6 h-6" />
			</div>
			<div>
				<h3 class="text-sm font-semibold text-zinc-200">No links found</h3>
				<p class="text-xs text-zinc-500 mt-1">Tap the plus button below to create your first short link</p>
			</div>
		</div>
	{:else}
		<div class="space-y-2.5">
			{#each processedLinks as link (link.id)}
				{@const isCopied = copiedId === link.id}
				<div class="bg-zinc-900/70 border border-zinc-800/80 hover:border-zinc-700/80 rounded-2xl p-3.5 space-y-3 transition-colors shadow-xs">
					<!-- Top Row: Slug & Quick Actions -->
					<div class="flex items-start justify-between gap-2">
						<div class="min-w-0 flex-1">
							<div class="flex items-center gap-1.5 flex-wrap">
								<span class="text-sm font-bold text-zinc-100 font-mono tracking-tight">/{link.slug}</span>
								{#if link.deliveryMode !== 'direct'}
									<span class="px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] uppercase font-mono font-semibold">
										{link.deliveryMode}
									</span>
								{/if}
							</div>
							{#if link.title}
								<div class="text-xs text-zinc-300 font-medium truncate mt-0.5">{link.title}</div>
							{/if}
						</div>

						<!-- Copy Button -->
						<button
							type="button"
							onclick={() => copyLink(link.slug, link.id)}
							class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all shrink-0 active:scale-95 {isCopied
								? 'bg-emerald-600 text-white border-emerald-500 shadow-sm shadow-emerald-500/20'
								: 'bg-zinc-800 hover:bg-zinc-750 text-zinc-200 border-zinc-700/80'}"
						>
							{#if isCopied}
								<Check class="w-3.5 h-3.5 stroke-[3]" />
								<span>Copied</span>
							{:else}
								<Copy class="w-3.5 h-3.5 text-zinc-400" />
								<span>Copy</span>
							{/if}
						</button>
					</div>

					<!-- Destination URL -->
					<div class="flex items-center gap-1.5 text-xs text-zinc-400 min-w-0 bg-zinc-950/40 px-2.5 py-1.5 rounded-lg border border-zinc-800/50">
						<span class="truncate flex-1 font-mono text-[11px]">{link.destinationUrl}</span>
						<a
							href={link.destinationUrl}
							target="_blank"
							rel="noreferrer"
							class="text-zinc-500 hover:text-zinc-300 p-0.5"
							title="Visit Destination"
						>
							<ExternalLink class="w-3 h-3" />
						</a>
					</div>

					<!-- Bottom Row: Meta & Auxiliary Actions -->
					<div class="flex items-center justify-between pt-1 border-t border-zinc-800/40 text-[11px] text-zinc-500">
						<div class="flex items-center gap-3">
							<span class="font-mono text-zinc-300 font-medium flex items-center gap-1">
								<Activity class="w-3 h-3 text-blue-400" />
								<span>{link.currentClicks || 0} clicks</span>
							</span>
						</div>

						<div class="flex items-center gap-1">
							<!-- Share -->
							<button
								type="button"
								onclick={() => shareLink(link.slug, link.title)}
								class="p-2 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800/60 active:scale-90"
								title="Share link"
							>
								<Share2 class="w-3.5 h-3.5" />
							</button>

							<!-- QR Code Page -->
							<a
								href="/m/qr?url={encodeURIComponent(typeof window !== 'undefined' ? `${window.location.origin}/${link.slug}` : `/${link.slug}`)}"
								class="p-2 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800/60 active:scale-90"
								title="Generate QR"
							>
								<QrCode class="w-3.5 h-3.5" />
							</a>

							<!-- Edit -->
							<button
								type="button"
								onclick={() => openEdit(link)}
								class="p-2 text-zinc-400 hover:text-blue-400 rounded-lg hover:bg-zinc-800/60 active:scale-90"
								title="Edit link"
							>
								<Sparkles class="w-3.5 h-3.5" />
							</button>

							<!-- Delete -->
							<button
								type="button"
								onclick={() => deleteLink(link.id, link.slug)}
								class="p-2 text-zinc-400 hover:text-red-400 rounded-lg hover:bg-zinc-800/60 active:scale-90"
								title="Delete link"
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

<!-- Floating Action Button (FAB) for Creating Link -->
<button
	type="button"
	onclick={openCreate}
	class="fixed right-5 bottom-20 z-40 w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-600/40 flex items-center justify-center transition-all duration-200 active:scale-90 cursor-pointer border-2 border-blue-400/30"
	aria-label="Create New Short Link"
>
	<Plus class="w-6 h-6 stroke-[2.5]" />
</button>

<!-- Link Drawer (Modal) -->
<LinkDrawer
	isOpen={isDrawerOpen}
	linkToEdit={activeEditLink}
	onClose={() => (isDrawerOpen = false)}
	onSaved={handleSaved}
/>
