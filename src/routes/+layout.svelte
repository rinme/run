<script lang="ts">
	import './layout.css';
	import favicon from '#lib/assets/favicon.svg';
	import type { LayoutProps } from './$types';
	import AppSidebar from '#lib/components/AppSidebar.svelte';
	import CommandPalette from '#lib/components/CommandPalette.svelte';
	import LinkDrawer from '#lib/components/LinkDrawer.svelte';
	import { page } from '$app/state';

	let { data, children }: LayoutProps = $props();

	let isCommandPaletteOpen = $state(false);
	let isLinkDrawerOpen = $state(false);
	let linkToEdit = $state<any | null>(null);

	const isAuthOrPublicPage = $derived(
		page.url.pathname.startsWith('/login') ||
		page.url.pathname.startsWith('/invite') ||
		page.url.pathname.startsWith('/demo')
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
	<title>Run — High-Performance Edge Link Platform</title>
</svelte:head>

{#if !data.user || isAuthOrPublicPage}
	<!-- Standalone Auth & Public Layout (No Sidebar) -->
	<main class="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col font-sans selection:bg-blue-600/30">
		{@render children()}
	</main>
{:else}
	<!-- Authenticated Dashboard Layout (With Sidebar & Modals) -->
	<div class="min-h-screen bg-[#09090b] text-zinc-100 flex font-sans selection:bg-blue-600/30">
		<!-- App Sidebar -->
		<AppSidebar onOpenCommandPalette={() => (isCommandPaletteOpen = true)} />

		<!-- Main Workspace Area -->
		<div class="flex-1 flex flex-col min-w-0 overflow-y-auto min-h-screen">
			{@render children()}
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
