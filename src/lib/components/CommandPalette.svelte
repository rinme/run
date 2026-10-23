<script lang="ts">
	import { goto } from '$app/navigation';
	import {
		Search,
		Link2,
		BarChart3,
		QrCode,
		Globe,
		KeyRound,
		Settings,
		Plus,
		Download,
		Terminal,
		ArrowRight,
		X,
		Webhook,
		History,
		Shield,
		User
	} from 'lucide-svelte';

	interface CommandProps {
		isOpen: boolean;
		onClose: () => void;
		onCreateLink: () => void;
		links?: Array<{ id: string; slug: string; destinationUrl: string; title?: string | null }>;
	}

	let {
		isOpen = false,
		onClose = () => {},
		onCreateLink = () => {},
		links = []
	}: CommandProps = $props();

	let query = $state('');
	let inputRef = $state<HTMLInputElement | null>(null);

	const staticActions = [
		{ id: 'create', title: 'Create New Short Link', category: 'Actions', icon: Plus, action: () => { onClose(); onCreateLink(); } },
		{ id: 'links', title: 'Go to Links Table', category: 'Navigation', icon: Link2, action: () => { onClose(); goto('/'); } },
		{ id: 'analytics', title: 'Go to Analytics & 3D Globe', category: 'Navigation', icon: BarChart3, action: () => { onClose(); goto('/analytics'); } },
		{ id: 'qr', title: 'Go to QR Code Studio', category: 'Navigation', icon: QrCode, action: () => { onClose(); goto('/qr'); } },
		{ id: 'webhooks', title: 'Go to Webhooks & Discord Embeds', category: 'Navigation', icon: Webhook, action: () => { onClose(); goto('/webhooks'); } },
		{ id: 'domains', title: 'Go to Custom Domains', category: 'Navigation', icon: Globe, action: () => { onClose(); goto('/domains'); } },
		{ id: 'api', title: 'Go to API Keys & MCP Server', category: 'Navigation', icon: KeyRound, action: () => { onClose(); goto('/api-keys'); } },
		{ id: 'changelog', title: 'Go to Changelog & Releases', category: 'Navigation', icon: History, action: () => { onClose(); goto('/changelog'); } },
		{ id: 'account', title: 'Go to Account & Security', category: 'Navigation', icon: User, action: () => { onClose(); goto('/account'); } },
		{ id: 'admin', title: 'Go to Admin System Control', category: 'Navigation', icon: Shield, action: () => { onClose(); goto('/admin'); } },
		{ id: 'settings', title: 'Go to Settings & Backups', category: 'Navigation', icon: Settings, action: () => { onClose(); goto('/settings'); } },
		{ id: 'backup', title: 'Trigger Database Snapshot Backup', category: 'Actions', icon: Download, action: () => { onClose(); goto('/settings#backup'); } }
	];

	// Filter actions and links by query
	const filteredActions = $derived(
		staticActions.filter((a) => a.title.toLowerCase().includes(query.toLowerCase()) || a.category.toLowerCase().includes(query.toLowerCase()))
	);

	const filteredLinkItems = $derived(
		query.trim()
			? links.filter((l) => l.slug.toLowerCase().includes(query.toLowerCase()) || l.destinationUrl.toLowerCase().includes(query.toLowerCase()) || (l.title && l.title.toLowerCase().includes(query.toLowerCase()))).slice(0, 5)
			: []
	);

	$effect(() => {
		if (isOpen) {
			setTimeout(() => inputRef?.focus(), 50);
		} else {
			query = '';
		}
	});

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onClose();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
	<div
		class="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150"
		onclick={(e) => { if (e.target === e.currentTarget) onClose(); }}
		role="presentation"
	>
		<div class="bg-[#121215] border border-zinc-800 rounded-xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
			<!-- Input Header -->
			<div class="flex items-center px-4 py-3 border-b border-zinc-800 gap-3">
				<Search class="w-4 h-4 text-zinc-500 shrink-0" />
				<input
					bind:this={inputRef}
					bind:value={query}
					placeholder="Type a command, route, or link slug..."
					class="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-500 outline-none"
				/>
				<kbd class="px-1.5 py-0.5 text-[10px] font-mono bg-zinc-900 text-zinc-400 rounded border border-zinc-800">ESC</kbd>
			</div>

			<!-- Results Body -->
			<div class="max-h-80 overflow-y-auto p-2 space-y-1">
				{#if filteredLinkItems.length > 0}
					<div class="px-2 py-1 text-[10px] font-mono font-semibold uppercase tracking-wider text-zinc-500">
						Links ({filteredLinkItems.length})
					</div>
					{#each filteredLinkItems as link}
						<button
							type="button"
							onclick={() => { onClose(); goto(`/#${link.id}`); }}
							class="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs hover:bg-zinc-800/80 transition-colors text-left group cursor-pointer"
						>
							<div class="flex items-center gap-2.5 min-w-0">
								<span class="font-mono text-blue-400 font-semibold shrink-0">/{link.slug}</span>
								<span class="text-zinc-400 truncate text-[11px] font-mono">{link.destinationUrl}</span>
							</div>
							<ArrowRight class="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-300 transition-colors shrink-0" />
						</button>
					{/each}
				{/if}

				{#if filteredActions.length > 0}
					<div class="px-2 py-1 text-[10px] font-mono font-semibold uppercase tracking-wider text-zinc-500">
						Commands
					</div>
					{#each filteredActions as action}
						<button
							type="button"
							onclick={action.action}
							class="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs hover:bg-zinc-800/80 transition-colors text-left group cursor-pointer"
						>
							<div class="flex items-center gap-2.5">
								<action.icon class="w-4 h-4 text-zinc-500 group-hover:text-blue-400 transition-colors" />
								<span class="text-zinc-200 group-hover:text-white font-medium">{action.title}</span>
							</div>
							<span class="text-[10px] text-zinc-500 font-mono">{action.category}</span>
						</button>
					{/each}
				{/if}

				{#if filteredActions.length === 0 && filteredLinkItems.length === 0}
					<div class="p-8 text-center text-xs text-zinc-500">
						No commands or links found matching "<span class="text-zinc-300">{query}</span>"
					</div>
				{/if}
			</div>

			<!-- Footer Tip -->
			<div class="px-4 py-2 border-t border-zinc-800/80 bg-zinc-950/60 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
				<span>Navigation &amp; Actions</span>
				<span>Press ESC to exit</span>
			</div>
		</div>
	</div>
{/if}
