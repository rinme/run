<script lang="ts">
	import type { PageData } from './$types';
	import {
		KeyRound,
		Plus,
		Copy,
		Check,
		Trash2,
		Terminal,
		Cpu,
		AlertTriangle,
		X
	} from 'lucide-svelte';

	interface PageProps {
		data: PageData;
	}

	let { data }: PageProps = $props();

	let keyList = $state<typeof data.keys>([]);
	let isCreateModalOpen = $state(false);
	let keyName = $state('');
	let selectedScopes = $state<string[]>(['links:read', 'links:write', 'analytics:read']);

	// Secret reveal state
	let revealedToken = $state<string | null>(null);
	let isSubmitting = $state(false);
	let copiedId = $state<string | null>(null);

	$effect.pre(() => {
		keyList = [...(data.keys || [])];
	});

	function copyText(text: string, id: string) {
		navigator.clipboard.writeText(text);
		copiedId = id;
		setTimeout(() => {
			if (copiedId === id) copiedId = null;
		}, 2000);
	}

	async function handleCreateKey(e: SubmitEvent) {
		e.preventDefault();
		if (!keyName) return;

		isSubmitting = true;
		try {
			const res = await fetch('/api/api-keys', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: keyName,
					scopes: selectedScopes
				})
			});

			if (res.ok) {
				const body = await res.json();
				revealedToken = body.token;
				keyList = [body.key, ...keyList];
				keyName = '';
				isCreateModalOpen = false;
			}
		} catch (err) {
			console.error('Create API Key error:', err);
		} finally {
			isSubmitting = false;
		}
	}

	async function handleDeleteKey(id: string, name: string) {
		if (!confirm(`Revoke key "${name}"? Any agent or script using this token will stop working immediately.`)) return;

		try {
			const res = await fetch(`/api/api-keys?id=${id}`, { method: 'DELETE' });
			if (res.ok) {
				keyList = keyList.filter((k) => k.id !== id);
			}
		} catch (e) {
			console.error('Delete key error:', e);
		}
	}
</script>

<div class="p-8 max-w-7xl w-full mx-auto space-y-6">
	<!-- Top Bar Header -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
		<div>
			<h1 class="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2.5">
				<span>API Tokens &amp; MCP Console</span>
				<span class="text-xs font-mono font-normal text-zinc-400 bg-zinc-850 px-2 py-0.5 rounded-full border border-zinc-750">
					{keyList.length} active
				</span>
			</h1>
			<p class="text-xs text-zinc-400 mt-0.5">Generate scoped Bearer tokens for external REST access and Model Context Protocol agents</p>
		</div>

		<button
			type="button"
			onclick={() => (isCreateModalOpen = true)}
			class="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-sm transition-all cursor-pointer"
		>
			<Plus class="w-4 h-4" />
			<span>Generate Key</span>
		</button>
	</div>

	<!-- Token Revealed Banner -->
	{#if revealedToken}
		<div class="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-2 animate-in zoom-in-95 duration-150">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-2 text-xs font-bold text-emerald-400 font-mono">
					<Check class="w-4 h-4" />
					<span>API KEY GENERATED — COPY IT NOW</span>
				</div>
				<button type="button" onclick={() => (revealedToken = null)} class="text-zinc-500 hover:text-white cursor-pointer">
					<X class="w-4 h-4" />
				</button>
			</div>
			<p class="text-xs text-zinc-300">
				Make sure to copy your API key now. For your security, you will not be able to view it again.
			</p>
			<div class="flex items-center gap-2 pt-1">
				<code class="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-mono text-emerald-300 flex-1 select-all break-all">
					{revealedToken}
				</code>
				<button
					type="button"
					onclick={() => copyText(revealedToken!, 'revealed')}
					class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer shrink-0"
				>
					{#if copiedId === 'revealed'}
						<Check class="w-3.5 h-3.5" />
						<span>Copied</span>
					{:else}
						<Copy class="w-3.5 h-3.5" />
						<span>Copy Key</span>
					{/if}
				</button>
			</div>
		</div>
	{/if}

	<!-- Active API Keys Table -->
	<div class="bg-[#101013] border border-zinc-800/90 rounded-xl overflow-hidden divide-y divide-zinc-800/80 shadow-xs">
		{#if keyList.length === 0}
			<div class="p-12 text-center text-xs text-zinc-400">
				No API keys generated yet. Click "Generate Key" to create your first token.
			</div>
		{:else}
			{#each keyList as k (k.id)}
				{@const scopes = (() => { try { return JSON.parse(k.scopes); } catch { return ['*']; } })()}
				<div class="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-zinc-850/30 transition-colors">
					<div class="space-y-1">
						<div class="flex items-center gap-2.5">
							<span class="text-sm font-bold text-zinc-100">{k.name}</span>
							<code class="text-xs font-mono text-blue-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
								{k.keyPrefix}&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;
							</code>
						</div>

						<div class="flex items-center gap-2 pt-0.5 text-xs text-zinc-400 font-mono">
							<span>Scopes:</span>
							{#each scopes as s}
								<span class="px-1.5 py-0.2 bg-zinc-850 text-zinc-300 rounded text-[10px] border border-zinc-750">
									{s}
								</span>
							{/each}
						</div>
					</div>

					<div class="flex items-center gap-4">
						<span class="text-[11px] text-zinc-500 font-mono">
							Created {new Date(k.createdAt).toLocaleDateString()}
						</span>
						<button
							type="button"
							onclick={() => handleDeleteKey(k.id, k.name)}
							class="p-2 text-zinc-400 hover:text-red-400 hover:bg-zinc-850 rounded-lg transition-colors cursor-pointer"
							title="Revoke key"
						>
							<Trash2 class="w-4 h-4" />
						</button>
					</div>
				</div>
			{/each}
		{/if}
	</div>

	<!-- MCP Integration & Agent Setup Card -->
	<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
		<!-- MCP Setup -->
		<div class="bg-[#101013] border border-zinc-800/80 rounded-xl p-5 space-y-3">
			<div class="flex items-center justify-between">
				<h3 class="text-xs font-bold text-zinc-200 uppercase tracking-wider font-mono flex items-center gap-2">
					<Cpu class="w-4 h-4 text-purple-400" />
					Model Context Protocol (MCP) Config
				</h3>
				<button
					type="button"
					onclick={() => copyText(`{
  "mcpServers": {
    "run": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-fetch", "${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173'}/api/mcp"]
    }
  }
}`, 'mcp-json')}
					class="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer font-mono"
				>
					{#if copiedId === 'mcp-json'}
						<Check class="w-3.5 h-3.5" />
						<span>Copied</span>
					{:else}
						<Copy class="w-3.5 h-3.5" />
						<span>Copy JSON</span>
					{/if}
				</button>
			</div>

			<p class="text-xs text-zinc-400">
				Add this block to your Claude Desktop config or Cursor (<code class="text-zinc-300">.cursor/mcp.json</code>) to give your AI assistants access to create and analyze links:
			</p>

			<pre class="p-3 bg-zinc-950 border border-zinc-800 rounded-lg text-[11px] font-mono text-zinc-300 overflow-x-auto leading-relaxed"><code>{`{
  "mcpServers": {
    "run": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-fetch", "http://localhost:5173/api/mcp"]
    }
  }
}`}</code></pre>
		</div>

		<!-- REST API Curl Example -->
		<div class="bg-[#101013] border border-zinc-800/80 rounded-xl p-5 space-y-3">
			<div class="flex items-center justify-between">
				<h3 class="text-xs font-bold text-zinc-200 uppercase tracking-wider font-mono flex items-center gap-2">
					<Terminal class="w-4 h-4 text-emerald-400" />
					REST API cURL Example
				</h3>
				<button
					type="button"
					onclick={() => copyText(`curl -X POST http://localhost:5173/api/links \\
  -H "Authorization: Bearer run_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"destinationUrl": "https://news.ycombinator.com", "slug": "hn"}'`, 'curl')}
					class="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer font-mono"
				>
					{#if copiedId === 'curl'}
						<Check class="w-3.5 h-3.5" />
						<span>Copied</span>
					{:else}
						<Copy class="w-3.5 h-3.5" />
						<span>Copy cURL</span>
					{/if}
				</button>
			</div>

			<p class="text-xs text-zinc-400">
				Create links programmatically from any CLI, bash script, or microservice:
			</p>

			<pre class="p-3 bg-zinc-950 border border-zinc-800 rounded-lg text-[11px] font-mono text-zinc-300 overflow-x-auto leading-relaxed"><code>curl -X POST http://localhost:5173/api/links \
  -H "Authorization: Bearer run_live_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '&#123;"destinationUrl": "https://news.ycombinator.com", "slug": "hn"&#125;'</code></pre>
		</div>
	</div>
</div>

<!-- Generate Key Modal -->
{#if isCreateModalOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150"
		onclick={(e) => { if (e.target === e.currentTarget) isCreateModalOpen = false; }}
		role="presentation"
	>
		<div class="bg-[#121215] border border-zinc-800 rounded-xl w-full max-w-md shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150">
			<div class="flex items-center justify-between pb-3 border-b border-zinc-800">
				<h3 class="text-sm font-bold text-zinc-100">Generate Workspace API Key</h3>
				<button type="button" onclick={() => (isCreateModalOpen = false)} class="text-zinc-400 hover:text-white cursor-pointer">
					<X class="w-4 h-4" />
				</button>
			</div>

			<form onsubmit={handleCreateKey} class="space-y-4">
				<div>
					<label for="keyNameInput" class="block text-xs font-medium text-zinc-300 mb-1">Key Name / Description *</label>
					<input
						id="keyNameInput"
						type="text"
						bind:value={keyName}
						required
						placeholder="e.g. Antigravity Agent, CI Deploy Key"
						class="w-full px-3 py-2 bg-zinc-900 border border-zinc-750 rounded-lg text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
					/>
				</div>

				<div>
					<span class="block text-xs font-medium text-zinc-300 mb-2">Permission Scopes</span>
					<div class="space-y-2">
						{#each [
							{ id: 'links:read', label: 'links:read (Query short links and metadata)' },
							{ id: 'links:write', label: 'links:write (Create, update, and delete links)' },
							{ id: 'analytics:read', label: 'analytics:read (Access real-time click stats)' }
						] as sc}
							<label class="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
								<input
									type="checkbox"
									checked={selectedScopes.includes(sc.id)}
									onchange={(e) => {
										if ((e.target as HTMLInputElement).checked) {
											selectedScopes = [...selectedScopes, sc.id];
										} else {
											selectedScopes = selectedScopes.filter((s) => s !== sc.id);
										}
									}}
									class="rounded bg-zinc-900 border-zinc-700 text-blue-600 focus:ring-0"
								/>
								<span>{sc.label}</span>
							</label>
						{/each}
					</div>
				</div>

				<div class="pt-2 flex items-center justify-end gap-2">
					<button
						type="button"
						onclick={() => (isCreateModalOpen = false)}
						class="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 cursor-pointer"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={isSubmitting}
						class="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm cursor-pointer"
					>
						{isSubmitting ? 'Generating...' : 'Generate Secret Key'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
