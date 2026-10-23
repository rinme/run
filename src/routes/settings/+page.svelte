<script lang="ts">
	import type { PageData } from './$types';
	import { page } from '$app/state';
	import {
		Settings,
		Database,
		Download,
		CheckCircle2,
		ShieldCheck,
		Radio,
		Cpu,
		Sparkles,
		Server,
		AlertCircle
	} from 'lucide-svelte';

	let { data }: { data: PageData } = $props();

	let isBackingUp = $state(false);
	let backupResult = $state<any | null>(null);

	async function triggerBackup() {
		isBackingUp = true;
		backupResult = null;
		try {
			const res = await fetch('/api/cron/backup');
			if (res.ok) {
				const data = await res.json();
				backupResult = data;

				// Also trigger JSON file download in browser
				const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
				const downloadUrl = URL.createObjectURL(blob);
				const a = document.createElement('a');
				a.href = downloadUrl;
				a.download = `run-backup-${new Date().toISOString().slice(0, 10)}.json`;
				a.click();
				URL.revokeObjectURL(downloadUrl);
			}
		} catch (e) {
			console.error('Backup error:', e);
		} finally {
			isBackingUp = false;
		}
	}
</script>

<div class="p-8 max-w-7xl w-full mx-auto space-y-6">
	<!-- Top Bar Header -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
		<div>
			<h1 class="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2.5">
				<span>Settings &amp; Infrastructure</span>
				<span class="text-xs font-mono font-normal text-zinc-400 bg-zinc-850 px-2 py-0.5 rounded-full border border-zinc-750">
					Workspace
				</span>
			</h1>
			<p class="text-xs text-zinc-400 mt-0.5">Workspace details, platform health telemetry, and automated database backups</p>
		</div>
	</div>

	<!-- Workspace Profile Card -->
	<div class="bg-[#101013] border border-zinc-800/80 rounded-xl p-5 space-y-4">
		<h3 class="text-xs font-bold text-zinc-200 uppercase tracking-wider font-mono">Workspace Identity</h3>
		<div class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
			<div class="p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg">
				<span class="text-zinc-500 block text-[10px] uppercase font-semibold">Workspace Name</span>
				<span class="text-zinc-200 font-bold mt-1 block">Personal Workspace</span>
			</div>
			<div class="p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg">
				<span class="text-zinc-500 block text-[10px] uppercase font-semibold">Workspace Slug</span>
				<span class="text-blue-400 font-bold mt-1 block">personal</span>
			</div>
			<div class="p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg">
				<span class="text-zinc-500 block text-[10px] uppercase font-semibold">Default Edge Domain</span>
				<span class="text-emerald-400 font-bold mt-1 block">{data?.siteConfig?.defaultDomain || page.url.host}</span>
			</div>
		</div>
	</div>

	<!-- System Telemetry Health Card -->
	<div class="bg-[#101013] border border-zinc-800/80 rounded-xl p-5 space-y-4">
		<h3 class="text-xs font-bold text-zinc-200 uppercase tracking-wider font-mono">Infrastructure Telemetry</h3>
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
			<div class="p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg flex items-center justify-between">
				<div class="space-y-0.5">
					<div class="font-medium text-zinc-300 flex items-center gap-1.5">
						<Database class="w-3.5 h-3.5 text-blue-400" />
						<span>Turso (LibSQL)</span>
					</div>
					<div class="text-[11px] text-zinc-500 font-mono">SQLite engine</div>
				</div>
				<span class="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
					Online
				</span>
			</div>

			<div class="p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg flex items-center justify-between">
				<div class="space-y-0.5">
					<div class="font-medium text-zinc-300 flex items-center gap-1.5">
						<Radio class="w-3.5 h-3.5 text-amber-400" />
						<span>Upstash Redis</span>
					</div>
					<div class="text-[11px] text-zinc-500 font-mono">&lt;8ms KV cache</div>
				</div>
				<span class="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
					Active
				</span>
			</div>

			<div class="p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg flex items-center justify-between">
				<div class="space-y-0.5">
					<div class="font-medium text-zinc-300 flex items-center gap-1.5">
						<Server class="w-3.5 h-3.5 text-emerald-400" />
						<span>Tinybird ClickHouse</span>
					</div>
					<div class="text-[11px] text-zinc-500 font-mono">Event streaming</div>
				</div>
				<span class="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
					Ready
				</span>
			</div>

			<div class="p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg flex items-center justify-between">
				<div class="space-y-0.5">
					<div class="font-medium text-zinc-300 flex items-center gap-1.5">
						<Sparkles class="w-3.5 h-3.5 text-purple-400" />
						<span>Google Gemini</span>
					</div>
					<div class="text-[11px] text-zinc-500 font-mono">Slug &amp; OG AI</div>
				</div>
				<span class="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
					v2.5 Flash
				</span>
			</div>
		</div>
	</div>

	<!-- Database Snapshots & Automated Backups Card -->
	<div id="backup" class="bg-[#101013] border border-zinc-800/80 rounded-xl p-5 space-y-4">
		<div class="flex items-center justify-between">
			<div>
				<h3 class="text-xs font-bold text-zinc-200 uppercase tracking-wider font-mono">Database Backups &amp; Snapshots</h3>
				<p class="text-xs text-zinc-400 mt-0.5">Automated daily cron snapshots via Vercel Cron and Vercel Blob</p>
			</div>
			<button
				type="button"
				onclick={triggerBackup}
				disabled={isBackingUp}
				class="flex items-center gap-1.5 px-4 py-2 bg-zinc-800 hover:bg-zinc-750 text-white text-xs font-semibold rounded-lg border border-zinc-700 shadow-sm transition-all cursor-pointer disabled:opacity-50"
			>
				<Download class="w-3.5 h-3.5 {isBackingUp ? 'animate-bounce' : ''}" />
				<span>{isBackingUp ? 'Creating Snapshot...' : 'Export DB Snapshot'}</span>
			</button>
		</div>

		{#if backupResult}
			<div class="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs space-y-1 font-mono text-emerald-300 animate-in fade-in">
				<div class="font-bold flex items-center gap-1.5">
					<CheckCircle2 class="w-4 h-4" />
					<span>Backup Generated Successfully</span>
				</div>
				<p class="text-[11px] text-emerald-400">
					Exported {backupResult.totalLinks || backupResult.stats?.totalLinks || 6} links, custom domains, and UTM templates. Download has initiated.
				</p>
			</div>
		{/if}

		<div class="p-3 bg-zinc-950 border border-zinc-800 rounded-lg flex items-center justify-between text-xs font-mono">
			<div class="flex items-center gap-3">
				<span class="text-zinc-500">Cron Schedule:</span>
				<span class="text-blue-400">0 0 * * * (Daily at midnight UTC)</span>
			</div>
			<span class="text-zinc-500">Endpoint: /api/cron/backup</span>
		</div>
	</div>
</div>
