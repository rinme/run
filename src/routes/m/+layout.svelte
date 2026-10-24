<script lang="ts">
	import { page } from '$app/state';
	import type { LayoutProps } from './$types';
	import {
		Link2,
		BarChart3,
		QrCode,
		User,
		Monitor,
		Zap
	} from 'lucide-svelte';
	import WorkspaceSwitcher from '#lib/components/WorkspaceSwitcher.svelte';

	let { data, children }: LayoutProps = $props();

	const currentPath = $derived(page.url.pathname);

	const navTabs = [
		{ label: 'Links', href: '/m', icon: Link2, exact: true },
		{ label: 'Analytics', href: '/m/analytics', icon: BarChart3 },
		{ label: 'QR Studio', href: '/m/qr', icon: QrCode },
		{ label: 'Account', href: '/m/account', icon: User }
	];

	function isTabActive(href: string, exact = false): boolean {
		if (exact) return currentPath === href;
		return currentPath === href || currentPath.startsWith(href + '/');
	}
</script>

<div class="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col font-sans selection:bg-blue-600/30">
	<!-- Mobile Sticky Top Bar -->
	<header class="sticky top-0 z-40 bg-[#0c0c0e]/95 backdrop-blur-md border-b border-zinc-800/80 px-3 py-2 flex flex-col gap-2">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-2">
				<div class="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center font-black text-xs text-white shadow-xs">
					R
				</div>
				<span class="text-xs font-bold text-zinc-100 tracking-tight">Run</span>
				<span class="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold">Mobile</span>
			</div>

			<!-- Switch to PC Button -->
			<a
				href="/api/view-mode?mode=desktop&redirect=/"
				class="inline-flex items-center gap-1.5 px-2 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-md text-[11px] font-medium text-zinc-300 transition-colors active:scale-95"
				title="Switch to PC View"
			>
				<Monitor class="w-3 h-3 text-zinc-400" />
				<span>PC View</span>
			</a>
		</div>

		<!-- Workspace Selector for Mobile -->
		<div class="w-full">
			<WorkspaceSwitcher />
		</div>
	</header>

	<!-- Main Mobile Viewport Content -->
	<main class="flex-1 w-full max-w-lg mx-auto px-4 py-4 pb-28">
		{@render children()}
	</main>

	<!-- Mobile Bottom Navigation Bar -->
	<nav class="fixed bottom-0 inset-x-0 z-40 bg-[#0c0c0e]/95 backdrop-blur-xl border-t border-zinc-800/80 px-3 pt-2 pb-[calc(0.6rem+env(safe-area-inset-bottom,0px))]">
		<div class="max-w-md mx-auto grid grid-cols-4 gap-1">
			{#each navTabs as tab}
				{@const active = isTabActive(tab.href, tab.exact)}
				<a
					href={tab.href}
					class="flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all duration-200 active:scale-90 {active
						? 'text-blue-400 font-semibold'
						: 'text-zinc-500 hover:text-zinc-300 font-medium'}"
				>
					<div class="relative p-1">
						<tab.icon class="w-5 h-5 {active ? 'text-blue-400 stroke-[2.5]' : 'text-zinc-400 stroke-2'}" />
						{#if active}
							<span class="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50"></span>
						{/if}
					</div>
					<span class="text-[11px] tracking-tight mt-0.5">{tab.label}</span>
				</a>
			{/each}
		</div>
	</nav>
</div>
