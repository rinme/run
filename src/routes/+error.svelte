<script lang="ts">
	import { page } from '$app/state';
	import { ArrowLeft, Home, AlertCircle, RefreshCw } from 'lucide-svelte';
</script>

<svelte:head>
	<title>{page.status} — Run</title>
</svelte:head>

<div class="min-h-[75vh] flex items-center justify-center px-4">
	<div class="max-w-md w-full text-center space-y-6">
		<!-- Error Code Pill -->
		<div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-400">
			<span class="w-2 h-2 rounded-full {page.status >= 500 ? 'bg-red-500' : 'bg-amber-400'}"></span>
			<span>HTTP {page.status}</span>
		</div>

		<!-- Title & Details -->
		<div class="space-y-2">
			<h1 class="text-2xl font-bold tracking-tight text-zinc-100">
				{#if page.status === 404}
					Resource Not Found
				{:else if page.status === 401 || page.status === 403}
					Access Restricted
				{:else}
					Internal System Error
				{/if}
			</h1>
			<p class="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
				{#if page.error?.message}
					{page.error.message}
				{:else if page.status === 404}
					The requested short link, destination, or dashboard route could not be found on this instance.
				{:else}
					An unexpected condition was encountered. Please try again or return to the dashboard.
				{/if}
			</p>
		</div>

		<!-- Navigation Actions -->
		<div class="flex items-center justify-center gap-3 pt-2">
			<button
				type="button"
				onclick={() => window.history.back()}
				class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-xs text-zinc-300 hover:text-white hover:bg-zinc-850 transition"
			>
				<ArrowLeft class="w-3.5 h-3.5" />
				<span>Go Back</span>
			</button>

			<a
				href="/"
				class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 text-xs font-semibold text-zinc-950 hover:bg-zinc-200 transition"
			>
				<Home class="w-3.5 h-3.5" />
				<span>Dashboard</span>
			</a>
		</div>
	</div>
</div>
