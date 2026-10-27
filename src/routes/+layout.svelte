<script lang="ts">
	import './layout.css';
	import favicon from '#lib/assets/favicon.svg';
	import type { LayoutProps } from './$types';
	import AppSidebar from '#lib/components/AppSidebar.svelte';
	import CommandPalette from '#lib/components/CommandPalette.svelte';
	import LinkDrawer from '#lib/components/LinkDrawer.svelte';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { MotionConfig } from 'motion-sv';
	import { motionSettings } from '#lib/client/motion.svelte.ts';
	import { Eye, ArrowRight } from 'lucide-svelte';

	let { data, children }: LayoutProps = $props();

	let isCommandPaletteOpen = $state(false);
	let isLinkDrawerOpen = $state(false);
	let linkToEdit = $state<any | null>(null);

	const isCustomShellPage = $derived(
		page.url.pathname.startsWith('/login') ||
		page.url.pathname.startsWith('/forgot-password') ||
		page.url.pathname.startsWith('/reset-password') ||
		page.url.pathname.startsWith('/invite') ||
		page.url.pathname.startsWith('/demo') ||
		page.url.pathname.startsWith('/m')
	);

	// Global keyboard shortcuts (Cmd+K / Ctrl+K)
	function handleGlobalKeydown(e: KeyboardEvent) {
		if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
			e.preventDefault();
			isCommandPaletteOpen = !isCommandPaletteOpen;
		}
	}

	function openCreateLink() {
		linkToEdit = null;
		isLinkDrawerOpen = true;
	}

	function handleSavedLink() {
		if (typeof window !== 'undefined') {
			window.dispatchEvent(new CustomEvent('run:links-updated'));
		}
	}
</script>

<svelte:window onkeydown={handleGlobalKeydown} />

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Run</title>
</svelte:head>

<MotionConfig reducedMotion={motionSettings.mode}>
	{#if !data.user || isCustomShellPage}
		<!-- Standalone Auth, Public & Dedicated Mobile Layout (No Desktop Sidebar) -->
		<main class="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col font-sans selection:bg-blue-600/30">
			{@render children()}
		</main>
	{:else}
		<!-- Authenticated Dashboard Layout (With Sidebar & Modals) -->
		<div class="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col font-sans selection:bg-blue-600/30">
			<!-- Impersonation Sticky Banner -->
			{#if data.impersonating}
				<div class="sticky top-0 z-50 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-zinc-950 px-4 py-2 text-xs flex items-center justify-between font-medium shadow-md">
					<div class="flex items-center gap-2">
						<Eye class="w-4 h-4 text-zinc-950 shrink-0" />
						<span>Spectating as <strong>{data.user?.name}</strong> ({data.user?.email})</span>
						<span class="px-1.5 py-0.5 rounded bg-black/20 text-[10px] font-mono uppercase font-bold">{data.user?.role}</span>
						{#if data.impersonator}
							<span class="text-zinc-850 text-[11px] hidden sm:inline">&bull; Admin operator: {data.impersonator.name}</span>
						{/if}
					</div>
					<form method="post" action="/api/admin/impersonate/exit" use:enhance>
						<button
							type="submit"
							class="px-2.5 py-1 rounded-md bg-zinc-950 hover:bg-zinc-900 text-amber-200 text-xs font-semibold shadow-xs transition cursor-pointer flex items-center gap-1.5"
						>
							<span>Exit Spectating</span>
							<ArrowRight class="w-3 h-3" />
						</button>
					</form>
				</div>
			{/if}

			<div class="flex-1 flex min-h-0">
				<!-- App Sidebar -->
				<AppSidebar
					onOpenCommandPalette={() => (isCommandPaletteOpen = true)}
					user={data.user}
					impersonating={data.impersonating}
				/>

				<!-- Main Workspace Area -->
				<div class="flex-1 flex flex-col min-w-0 overflow-y-auto min-h-screen">
					{@render children()}
				</div>
			</div>

			<!-- Global Command Palette (Cmd+K) -->
			<CommandPalette
				isOpen={isCommandPaletteOpen}
				onClose={() => (isCommandPaletteOpen = false)}
				onCreateLink={openCreateLink}
			/>

			<!-- Global Link Drawer (Slide-over for Create & Edit) -->
			<LinkDrawer
				isOpen={isLinkDrawerOpen}
				onClose={() => (isLinkDrawerOpen = false)}
				linkToEdit={linkToEdit}
				onSaved={handleSavedLink}
			/>
		</div>
	{/if}
</MotionConfig>
