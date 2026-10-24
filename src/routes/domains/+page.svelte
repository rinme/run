<script lang="ts">
	import type { PageData } from './$types';
	import {
		Globe,
		Plus,
		CheckCircle2,
		AlertCircle,
		Trash2,
		ExternalLink,
		RefreshCw,
		Copy,
		Check,
		X
	} from 'lucide-svelte';

	interface PageProps {
		data: PageData;
	}

	let { data }: PageProps = $props();

	let domainList = $state<typeof data.domains>([]);
	let isAddModalOpen = $state(false);
	let newDomainName = $state('');
	let newFallbackUrl = $state('');
	let isSubmitting = $state(false);
	let errorMessage = $state('');
	let copiedRecord = $state<string | null>(null);

	const cnameTarget = $derived(
		`cname.${data.siteConfig?.defaultDomain || (typeof window !== 'undefined' ? window.location.host : 'run.link')}`
	);

	$effect.pre(() => {
		domainList = [...(data.domains || [])];
	});

	function copyToClipboard(text: string, id: string) {
		navigator.clipboard.writeText(text);
		copiedRecord = id;
		setTimeout(() => {
			if (copiedRecord === id) copiedRecord = null;
		}, 2000);
	}

	async function handleAddDomain(e: SubmitEvent) {
		e.preventDefault();
		if (!newDomainName) return;

		isSubmitting = true;
		errorMessage = '';

		try {
			const res = await fetch('/api/domains', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: newDomainName,
					fallbackUrl: newFallbackUrl || undefined
				})
			});

			if (!res.ok) {
				const err = await res.json();
				errorMessage = err.error || 'Failed to add domain';
				return;
			}

			const created = await res.json();
			domainList = [created, ...domainList];
			newDomainName = '';
			newFallbackUrl = '';
			isAddModalOpen = false;
		} catch {
			errorMessage = 'Network error while adding domain';
		} finally {
			isSubmitting = false;
		}
	}

	async function handleVerify(id: string) {
		try {
			const res = await fetch('/api/domains', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id, verified: true })
			});
			if (res.ok) {
				const updated = await res.json();
				const idx = domainList.findIndex((d) => d.id === id);
				if (idx >= 0) domainList[idx] = updated;
			}
		} catch (e) {
			console.error('Verify error:', e);
		}
	}

	async function handleDeleteDomain(id: string, name: string) {
		if (!confirm(`Are you sure you want to delete ${name}? Links assigned to this domain will fallback to default.`)) return;

		try {
			const res = await fetch(`/api/domains?id=${id}`, { method: 'DELETE' });
			if (res.ok) {
				domainList = domainList.filter((d) => d.id !== id);
			}
		} catch (e) {
			console.error('Delete error:', e);
		}
	}
</script>

<div class="p-8 max-w-7xl w-full mx-auto space-y-6">
	<!-- Top Bar Header -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
		<div>
			<h1 class="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2.5">
				<span>Custom Domains</span>
				<span class="text-xs font-mono font-normal text-zinc-400 bg-zinc-850 px-2 py-0.5 rounded-full border border-zinc-750">
					{domainList.length} configured
				</span>
			</h1>
			<p class="text-xs text-zinc-400 mt-0.5">Configure custom domains for your short links</p>
		</div>

		<button
			type="button"
			onclick={() => (isAddModalOpen = true)}
			class="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-sm transition-all cursor-pointer"
		>
			<Plus class="w-4 h-4" />
			<span>Add Domain</span>
		</button>
	</div>

	<!-- Domains List Table -->
	<div class="bg-[#101013] border border-zinc-800/90 rounded-xl overflow-hidden divide-y divide-zinc-800/80 shadow-xs">
		{#if domainList.length === 0}
			<div class="p-12 text-center text-xs text-zinc-400">
				No custom domains configured yet. Add your branded domain above.
			</div>
		{:else}
			{#each domainList as d (d.id)}
				<div class="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-zinc-850/30 transition-colors">
					<div class="space-y-1">
						<div class="flex items-center gap-2.5">
							<span class="text-sm font-bold text-zinc-100 font-mono tracking-tight">{d.name}</span>
							{#if d.verified}
								<span class="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
									<CheckCircle2 class="w-3 h-3" />
									Verified
								</span>
							{:else}
								<span class="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
									<AlertCircle class="w-3 h-3" />
									DNS Pending
								</span>
							{/if}

							{#if d.primary}
								<span class="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
									Primary
								</span>
							{/if}
						</div>

						<div class="text-xs text-zinc-400 flex items-center gap-1.5 font-mono">
							<span>404 Catch-All:</span>
							<span class="text-zinc-300">{d.fallbackUrl || 'Standard 404 page'}</span>
						</div>
					</div>

					<div class="flex items-center gap-2">
						{#if !d.verified}
							<button
								type="button"
								onclick={() => handleVerify(d.id)}
								class="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-750 text-xs font-medium text-zinc-200 rounded-lg border border-zinc-700 transition-colors cursor-pointer"
							>
								<RefreshCw class="w-3.5 h-3.5" />
								Verify DNS
							</button>
						{/if}

						<button
							type="button"
							onclick={() => handleDeleteDomain(d.id, d.name)}
							class="p-2 text-zinc-400 hover:text-red-400 hover:bg-zinc-850 rounded-lg transition-colors cursor-pointer"
							title="Delete domain"
						>
							<Trash2 class="w-4 h-4" />
						</button>
					</div>
				</div>
			{/each}
		{/if}
	</div>

	<!-- DNS Configuration Guide Card -->
	<div class="bg-[#101013] border border-zinc-800/80 rounded-xl p-5 space-y-4">
		<h3 class="text-xs font-bold text-zinc-200 uppercase tracking-wider font-mono">DNS Setup Records</h3>
		<p class="text-xs text-zinc-400">Add the following DNS records at your domain registrar (Cloudflare, Namecheap, Route 53) to verify and activate routing:</p>

		<div class="border border-zinc-800 rounded-lg overflow-hidden divide-y divide-zinc-800 text-xs font-mono">
			<div class="p-3 bg-zinc-900/60 flex items-center justify-between">
				<div class="flex items-center gap-6">
					<span class="w-16 font-semibold text-blue-400">CNAME</span>
					<span class="text-zinc-300">go (or subdomain)</span>
					<span class="text-zinc-400">&rarr;</span>
					<span class="text-zinc-200 font-bold">{cnameTarget}</span>
				</div>
				<button
					type="button"
					onclick={() => copyToClipboard(cnameTarget, 'cname')}
					class="p-1 text-zinc-400 hover:text-white cursor-pointer"
				>
					{#if copiedRecord === 'cname'}
						<Check class="w-3.5 h-3.5 text-emerald-400" />
					{:else}
						<Copy class="w-3.5 h-3.5" />
					{/if}
				</button>
			</div>

			<div class="p-3 bg-zinc-900/60 flex items-center justify-between">
				<div class="flex items-center gap-6">
					<span class="w-16 font-semibold text-purple-400">TXT</span>
					<span class="text-zinc-300">_run-challenge</span>
					<span class="text-zinc-400">&rarr;</span>
					<span class="text-zinc-200 font-bold">run-verification=live-ok-2026</span>
				</div>
				<button
					type="button"
					onclick={() => copyToClipboard('run-verification=live-ok-2026', 'txt')}
					class="p-1 text-zinc-400 hover:text-white cursor-pointer"
				>
					{#if copiedRecord === 'txt'}
						<Check class="w-3.5 h-3.5 text-emerald-400" />
					{:else}
						<Copy class="w-3.5 h-3.5" />
					{/if}
				</button>
			</div>
		</div>
	</div>
</div>

<!-- Add Domain Modal -->
{#if isAddModalOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150"
		onclick={(e) => { if (e.target === e.currentTarget) isAddModalOpen = false; }}
		role="presentation"
	>
		<div class="bg-[#121215] border border-zinc-800 rounded-xl w-full max-w-md shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150">
			<div class="flex items-center justify-between pb-3 border-b border-zinc-800">
				<h3 class="text-sm font-bold text-zinc-100">Add Custom Domain</h3>
				<button type="button" onclick={() => (isAddModalOpen = false)} class="text-zinc-400 hover:text-white cursor-pointer">
					<X class="w-4 h-4" />
				</button>
			</div>

			{#if errorMessage}
				<div class="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg flex items-center gap-2">
					<AlertCircle class="w-4 h-4 shrink-0" />
					<span>{errorMessage}</span>
				</div>
			{/if}

			<form onsubmit={handleAddDomain} class="space-y-4">
				<div>
					<label for="domainNameInput" class="block text-xs font-medium text-zinc-300 mb-1">Domain or Subdomain *</label>
					<input
						id="domainNameInput"
						type="text"
						bind:value={newDomainName}
						required
						placeholder="go.mybrand.com"
						class="w-full px-3 py-2 bg-zinc-900 border border-zinc-750 rounded-lg text-xs text-zinc-100 placeholder-zinc-500 font-mono focus:outline-none focus:border-blue-500"
					/>
				</div>

				<div>
					<label for="fallbackInput" class="block text-xs font-medium text-zinc-300 mb-1">404 Catch-All Fallback URL</label>
					<input
						id="fallbackInput"
						type="url"
						bind:value={newFallbackUrl}
						placeholder="https://mybrand.com/404"
						class="w-full px-3 py-2 bg-zinc-900 border border-zinc-750 rounded-lg text-xs text-zinc-100 placeholder-zinc-500 font-mono focus:outline-none focus:border-blue-500"
					/>
					<p class="text-[11px] text-zinc-500 mt-1">Visitors to unassigned slugs on this domain will be redirected here.</p>
				</div>

				<div class="pt-2 flex items-center justify-end gap-2">
					<button
						type="button"
						onclick={() => (isAddModalOpen = false)}
						class="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 cursor-pointer"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={isSubmitting}
						class="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm cursor-pointer"
					>
						{isSubmitting ? 'Adding...' : 'Add Domain'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
