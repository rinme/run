<script lang="ts">
	import { enhance } from '$app/forms';
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
		User,
		Smartphone,
		Users,
		Sliders,
		Ticket,
		Archive,
		Monitor,
		LogOut
	} from 'lucide-svelte';
	import WorkspaceSwitcher from './WorkspaceSwitcher.svelte';

	interface SidebarProps {
		onOpenCommandPalette?: () => void;
		user?: App.ExtendedUser | null;
		impersonating?: boolean;
	}

	let { onOpenCommandPalette = () => {}, user = null, impersonating = false }: SidebarProps = $props();

	const currentPath = $derived(page.url.pathname);

	const navItems = [
		{ label: 'Links', href: '/', icon: Link2, exact: true },
		{ label: 'Analytics & Globe', href: '/analytics', icon: BarChart3 },
		{ label: 'QR Studio', href: '/qr', icon: QrCode },
		{ label: 'Webhooks & Discord', href: '/webhooks', icon: Webhook },
		{ label: 'Custom Domains', href: '/domains', icon: Globe },
		{ label: 'API Keys & MCP', href: '/api-keys', icon: KeyRound },
		{ label: 'Changelog', href: '/changelog', icon: History },
		{ label: 'Settings & Migration', href: '/settings', icon: Settings }
	];

	const adminItems = [
		{ label: 'Overview', href: '/admin', icon: Activity, exact: true },
		{ label: 'User Accounts', href: '/admin/users', icon: Users },
		{ label: 'System Settings', href: '/admin/settings', icon: Sliders },
		{ label: 'VIP Invite Codes', href: '/admin/invites', icon: Ticket },
		{ label: 'Backup & Restore', href: '/admin/backup', icon: Archive },
		{ label: 'Active Sessions', href: '/admin/sessions', icon: Monitor }
	];

	let isAdminOpen = $state(true);

	$effect(() => {
		if (typeof window !== 'undefined') {
			const saved = localStorage.getItem('run_admin_sidebar_open');
			if (saved !== null) {
				isAdminOpen = saved === 'true';
			}
		}
	});

	function toggleAdminMenu() {
		isAdminOpen = !isAdminOpen;
		if (typeof window !== 'undefined') {
			localStorage.setItem('run_admin_sidebar_open', String(isAdminOpen));
		}
	}

	function isActive(href: string, exact = false): boolean {
		if (exact) return currentPath === href;
		return currentPath === href || currentPath.startsWith(href + '/');
	}
</script>

<aside class="w-64 border-r border-zinc-800/80 bg-[#0c0c0e] flex flex-col shrink-0 select-none h-screen sticky top-0">
	<!-- Workspace Switcher Header -->
	<div class="px-3 py-3 border-b border-zinc-800/80">
		<WorkspaceSwitcher />
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

		<!-- Collapsible Administration Menu (Admin or Spectating Only) -->
		{#if user?.role === 'admin' || impersonating}
			<div class="pt-4 mt-4 border-t border-zinc-800/60">
				<button
					type="button"
					onclick={toggleAdminMenu}
					class="w-full flex items-center justify-between text-[10px] uppercase font-mono font-semibold tracking-wider text-zinc-500 hover:text-zinc-300 px-2 mb-2 transition-colors cursor-pointer group"
				>
					<span class="flex items-center gap-1.5 text-purple-400/90 group-hover:text-purple-300">
						<Shield class="w-3.5 h-3.5" />
						<span>Administration</span>
					</span>
					<ChevronRight class="w-3.5 h-3.5 text-zinc-600 transition-transform duration-200 {isAdminOpen ? 'rotate-90' : ''}" />
				</button>

				{#if isAdminOpen}
					<div class="space-y-1 pl-1">
						{#each adminItems as item}
							{@const active = isActive(item.href, item.exact)}
							<a
								href={item.href}
								class="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors {active
									? 'bg-purple-950/40 text-purple-200 border border-purple-800/50 font-semibold shadow-xs'
									: 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850/60'}"
							>
								<div class="flex items-center gap-2.5">
									<item.icon class="w-3.5 h-3.5 {active ? 'text-purple-400' : 'text-zinc-500'}" />
									<span>{item.label}</span>
								</div>
								{#if active}
									<div class="w-1.5 h-1.5 rounded-full bg-purple-500"></div>
								{/if}
							</a>
						{/each}
					</div>
				{/if}
			</div>
		{/if}

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

		<div class="pt-4 mt-4 border-t border-zinc-800/60">
			<div class="text-[10px] uppercase font-mono font-semibold tracking-wider text-zinc-500 px-2 mb-2">
				Experience
			</div>
			<a
				href="/api/view-mode?mode=mobile&redirect=/m"
				class="flex items-center justify-between px-2.5 py-2 rounded-lg text-xs text-zinc-300 hover:text-white bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800/80 transition-colors group"
			>
				<div class="flex items-center gap-2.5">
					<Smartphone class="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
					<span class="font-medium">Switch to Mobile</span>
				</div>
				<span class="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">/m</span>
			</a>
		</div>
	</nav>

	<!-- User Profile Card (Account & Security outside of Admin) -->
	{#if user}
		<div class="p-2.5 border-t border-zinc-800/80 bg-zinc-950/60">
			<div class="flex items-center justify-between p-2 rounded-lg bg-zinc-900/70 border border-zinc-800/80">
				<a
					href="/account"
					class="flex items-center gap-2.5 min-w-0 flex-1 hover:opacity-90 transition group"
					title="Open Account & Security"
				>
					<div class="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-xs text-zinc-200 shrink-0 group-hover:border-zinc-500 transition">
						{user.name?.charAt(0).toUpperCase() || 'U'}
					</div>
					<div class="min-w-0 flex-1">
						<div class="text-xs font-semibold text-zinc-200 truncate group-hover:text-blue-400 transition">
							{user.name || 'User'}
						</div>
						<div class="flex items-center gap-1.5 text-[10px]">
							<span
								class="px-1.5 py-0.2 rounded font-mono uppercase font-semibold {user.role === 'admin'
									? 'bg-purple-950 text-purple-300 border border-purple-800/50'
									: user.role === 'trusted'
										? 'bg-sky-950 text-sky-300 border border-sky-800/50'
										: 'bg-zinc-800 text-zinc-400'}"
							>
								{user.role || 'member'}
							</span>
						</div>
					</div>
				</a>

				<form method="post" action="/account?/signOut" use:enhance class="ml-1">
					<button
						type="submit"
						title="Sign Out"
						class="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded-md transition cursor-pointer"
					>
						<LogOut class="w-3.5 h-3.5" />
					</button>
				</form>
			</div>
		</div>
	{/if}

	<!-- Status Footer -->
	<div class="p-3 border-t border-zinc-800/80 bg-zinc-950/40 flex items-center justify-between text-xs text-zinc-500 font-mono">
		<div class="flex items-center gap-2">
			<span class="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
			<span class="text-[11px]">System Online</span>
		</div>
		<span class="text-[10px]">v2.7.0</span>
	</div>
</aside>
