<script lang="ts">
	import { page } from '$app/state';
	import {
		Link2,
		BarChart3,
		QrCode,
		Globe,
		KeyRound,
		Settings,
		Command,
		ExternalLink,
		Activity,
		ChevronRight,
		Webhook,
		History,
		Shield,
		User
	} from 'lucide-svelte';

	interface SidebarProps {
		onOpenCommandPalette?: () => void;
	}

	let { onOpenCommandPalette = () => {} }: SidebarProps = $props();

	const currentPath = $derived(page.url.pathname);

	const navItems = [
		{ label: 'Links', href: '/', icon: Link2, exact: true },
		{ label: 'Analytics & Globe', href: '/analytics', icon: BarChart3 },
		{ label: 'QR Studio', href: '/qr', icon: QrCode },
		{ label: 'Webhooks & Discord', href: '/webhooks', icon: Webhook },
		{ label: 'Custom Domains', href: '/domains', icon: Globe },
		{ label: 'API Keys & MCP', href: '/api-keys', icon: KeyRound },
		{ label: 'Changelog', href: '/changelog', icon: History },
		{ label: 'Settings & Backups', href: '/settings', icon: Settings }
	];

	const managementItems = [
		{ label: 'Account & Security', href: '/account', icon: User },
		{ label: 'Admin Control', href: '/admin', icon: Shield }
	];

	function isActive(href: string, exact = false): boolean {
		if (exact) return currentPath === href;
		return currentPath === href || currentPath.startsWith(href + '/');
	}
</script>

<aside class="w-64 border-r border-zinc-800/80 bg-[#0c0c0e] flex flex-col shrink-0 select-none h-screen sticky top-0">
	<!-- Workspace / Product Header -->
	<div class="h-16 px-4 border-b border-zinc-800/80 flex items-center justify-between">
		<div class="flex items-center gap-2.5">
			<div class="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center font-black text-xs text-white shadow-sm">
				R
			</div>
			<div class="flex flex-col">
				<div class="flex items-center gap-1.5">
					<span class="text-xs font-bold text-zinc-100 tracking-tight">Run Platform</span>
					<span class="text-[9px] uppercase font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/60 font-semibold">Edge</span>
				</div>
				<span class="text-[11px] text-zinc-400 font-medium">Personal Workspace</span>
			</div>
		</div>
	</div>

	<!-- Command Palette Trigger Button -->
	<div class="px-3 py-3 border-b border-zinc-800/50">
		<button
			type="button"
			onclick={onOpenCommandPalette}
			class="w-full flex items-center justify-between px-3 py-1.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 transition-colors group cursor-pointer shadow-xs"
		>
			<span class="flex items-center gap-2">
				<Command class="w-3.5 h-3.5 text-zinc-500 group-hover:text-blue-400 transition-colors" />
				<span>Search or jump...</span>
			</span>
			<kbd class="px-1.5 py-0.5 text-[10px] font-mono bg-zinc-950 text-zinc-400 rounded border border-zinc-800">⌘K</kbd>
		</button>
	</div>

	<!-- Navigation Links -->
	<nav class="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
		<div class="text-[10px] uppercase font-mono font-semibold tracking-wider text-zinc-500 px-2 mb-2">
			Workspace
		</div>

		{#each navItems as item}
			{@const active = isActive(item.href, item.exact)}
			<a
				href={item.href}
				class="flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-colors {active
					? 'bg-zinc-800 text-zinc-100 font-semibold shadow-xs'
					: 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850/60'}"
			>
				<div class="flex items-center gap-2.5">
					<item.icon class="w-4 h-4 {active ? 'text-blue-400' : 'text-zinc-500'}" />
					<span>{item.label}</span>
				</div>
				{#if active}
					<div class="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
				{/if}
			</a>
		{/each}

		<div class="pt-4 mt-4 border-t border-zinc-800/60">
			<div class="text-[10px] uppercase font-mono font-semibold tracking-wider text-zinc-500 px-2 mb-2">
				Administration
			</div>
			{#each managementItems as item}
				{@const active = isActive(item.href)}
				<a
					href={item.href}
					class="flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-colors {active
						? 'bg-zinc-800 text-zinc-100 font-semibold shadow-xs'
						: 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850/60'}"
				>
					<div class="flex items-center gap-2.5">
						<item.icon class="w-4 h-4 {active ? 'text-purple-400' : 'text-zinc-500'}" />
						<span>{item.label}</span>
					</div>
					{#if active}
						<div class="w-1.5 h-1.5 rounded-full bg-purple-500"></div>
					{/if}
				</a>
			{/each}
		</div>

		<div class="pt-4 mt-4 border-t border-zinc-800/60">
			<div class="text-[10px] uppercase font-mono font-semibold tracking-wider text-zinc-500 px-2 mb-2">
				Developer
			</div>
			<a
				href="/api/openapi.json"
				target="_blank"
				class="flex items-center justify-between px-2.5 py-2 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850/60 transition-colors"
			>
				<span class="flex items-center gap-2 font-mono">
					<span>/api/openapi.json</span>
				</span>
				<ExternalLink class="w-3.5 h-3.5 text-zinc-600" />
			</a>
			<a
				href="/api/mcp"
				target="_blank"
				class="flex items-center justify-between px-2.5 py-2 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850/60 transition-colors"
			>
				<span class="flex items-center gap-2 font-mono">
					<span>/api/mcp (JSON-RPC)</span>
				</span>
				<ExternalLink class="w-3.5 h-3.5 text-zinc-600" />
			</a>
		</div>
	</nav>

	<!-- Edge Status Footer -->
	<div class="p-3 border-t border-zinc-800/80 bg-zinc-950/40 flex items-center justify-between">
		<div class="flex items-center gap-2 text-xs text-zinc-400">
			<span class="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
			<span class="font-mono text-[11px]">Vercel Edge &bull; &lt;8ms</span>
		</div>
		<span class="text-[10px] font-mono text-zinc-500">v2.0</span>
	</div>
</aside>
