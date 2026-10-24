<script lang="ts">
	import type { PageServerData } from './$types';
	import { History, GitCommit, ExternalLink, Tag, Sparkles, Calendar } from 'lucide-svelte';

	let { data }: { data: PageServerData } = $props();

	function formatDate(val: string | null | undefined): string {
		if (!val) return '—';
		return new Date(val).toLocaleDateString('en-US', {
			month: 'long',
			day: 'numeric',
			year: 'numeric'
		});
	}

	function parseMarkdownSimple(md: string): string {
		if (!md) return '';
		return md
			.replace(/^### (.*$)/gim, '<h4 class="text-xs font-bold uppercase tracking-wider text-zinc-200 mt-3 mb-1.5 font-mono">$1</h4>')
			.replace(/^## (.*$)/gim, '<h3 class="text-sm font-bold text-zinc-100 mt-4 mb-2">$1</h3>')
			.replace(/^\- (.*$)/gim, '<li class="text-xs text-zinc-300 leading-relaxed ml-3 list-disc">$1</li>')
			.replace(/\*\*(.*?)\*\*/gim, '<strong class="text-zinc-100 font-semibold">$1</strong>')
			.replace(/\`(.*?)\`/gim, '<code class="px-1 py-0.5 rounded bg-zinc-800 text-[11px] font-mono text-zinc-200">$1</code>');
	}
</script>

<svelte:head>
	<title>Changelog & Releases — Run</title>
</svelte:head>

<div class="max-w-4xl mx-auto space-y-8">
	<!-- Page Header -->
	<div class="border-b border-zinc-800 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div>
			<h1 class="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
				<History class="w-5 h-5 text-zinc-400" />
				Changelog &amp; Releases
			</h1>
			<p class="text-xs text-zinc-400 mt-1">
				Platform release history and updates
			</p>
		</div>

		<a
			href="https://github.com/{data.repo}"
			target="_blank"
			rel="noreferrer"
			class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-xs font-mono text-zinc-300 hover:text-white hover:border-zinc-700 transition self-start"
		>
			<span>github.com/{data.repo}</span>
			<ExternalLink class="w-3 h-3" />
		</a>
	</div>

	<!-- Timeline List -->
	<div class="relative border-l border-zinc-800 ml-4 sm:ml-6 space-y-10 pl-6 sm:pl-8">
		{#each data.releases as rel, idx (rel.id || idx)}
			<div class="relative group">
				<!-- Timeline Node Dot -->
				<div class="absolute -left-[31px] sm:-left-[39px] top-1.5 w-3.5 h-3.5 rounded-full bg-zinc-950 border-2 {idx === 0 ? 'border-emerald-500' : 'border-zinc-700'}"></div>

				<div class="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-4">
					<!-- Release Header -->
					<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
						<div class="flex items-center gap-2.5">
							<span class="px-2 py-0.5 rounded font-mono text-xs font-bold {idx === 0 ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-zinc-800 text-zinc-300'}">
								{rel.tag_name || 'Release'}
							</span>
							{#if idx === 0}
								<span class="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
									Latest
								</span>
							{/if}
							<h2 class="text-sm font-bold text-zinc-100">{rel.name || rel.tag_name}</h2>
						</div>

						<div class="flex items-center gap-3 text-xs text-zinc-500 font-mono">
							<span class="flex items-center gap-1">
								<Calendar class="w-3 h-3" />
								{formatDate(rel.published_at)}
							</span>
							{#if rel.html_url}
								<a
									href={rel.html_url}
									target="_blank"
									rel="noreferrer"
									class="text-zinc-400 hover:text-zinc-200 transition"
								>
									<ExternalLink class="w-3.5 h-3.5" />
								</a>
							{/if}
						</div>
					</div>

					<!-- Release Body / Notes -->
					<div class="space-y-2 text-xs text-zinc-300 prose prose-invert max-w-none">
						{@html parseMarkdownSimple(rel.body || 'No release notes provided.')}
					</div>
				</div>
			</div>
		{/each}
	</div>
</div>
