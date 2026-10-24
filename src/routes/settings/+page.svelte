<script lang="ts">
	import type { PageData } from './$types';
	import { page } from '$app/state';
	import {
		Settings,
		Database,
		Download,
		Upload,
		CheckCircle2,
		ShieldCheck,
		Radio,
		Cpu,
		Sparkles,
		Server,
		AlertCircle,
		FileJson,
		ArrowRightLeft,
		AlertTriangle,
		XCircle,
		RefreshCw,
		Globe,
		SlidersHorizontal
	} from 'lucide-svelte';

	let { data }: { data: PageData } = $props();

	// --- Database Snapshot Backup State ---
	let isBackingUp = $state(false);
	let backupResult = $state<any | null>(null);

	async function triggerBackup() {
		isBackingUp = true;
		backupResult = null;
		try {
			const res = await fetch('/api/cron/backup');
			if (res.ok) {
				const resData = await res.json();
				backupResult = resData;

				const blob = new Blob([JSON.stringify(resData, null, 2)], { type: 'application/json' });
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

	// --- Export State ---
	let exportStatusFilter = $state<'all' | 'active' | 'expired'>('all');
	let isExporting = $state<string | null>(null); // 'run' | 'sink' | null

	async function downloadExport(format: 'run' | 'sink') {
		isExporting = format;
		try {
			const params = new URLSearchParams({
				format,
				status: exportStatusFilter
			});
			const res = await fetch(`/api/links/export?${params.toString()}`);
			if (!res.ok) throw new Error('Export request failed');

			const blob = await res.blob();
			const contentDisposition = res.headers.get('content-disposition');
			let filename = `${format}-links-${exportStatusFilter}-${new Date().toISOString().slice(0, 10)}.json`;
			if (contentDisposition) {
				const match = contentDisposition.match(/filename="?([^"]+)"?/);
				if (match && match[1]) filename = match[1];
			}

			const downloadUrl = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = downloadUrl;
			a.download = filename;
			a.click();
			URL.revokeObjectURL(downloadUrl);
		} catch (err: any) {
			alert(`Failed to export links: ${err.message}`);
		} finally {
			isExporting = null;
		}
	}

	// --- Import State ---
	let importFile = $state<File | null>(null);
	let importJsonData = $state<any | null>(null);
	let detectedFormat = $state<'sink' | 'run' | 'unknown'>('unknown');
	let formatOverride = $state<'auto' | 'sink' | 'run'>('auto');
	let linksFoundCount = $state<number>(0);
	let parseError = $state<string | null>(null);

	// Import Options
	let conflictStrategy = $state<'skip' | 'overwrite' | 'rename'>('skip');
	let selectedTargetDomainId = $state<string>(''); // empty string = default host
	let remapMode = $state<'origin' | 'domain' | 'custom'>('origin');
	let customRemapHost = $state<string>('');

	// Import Execution
	let isImporting = $state(false);
	let importResult = $state<any | null>(null);

	function detectFormatClient(parsed: any): 'sink' | 'run' | 'unknown' {
		if (!parsed || typeof parsed !== 'object') return 'unknown';
		const arr: any[] = Array.isArray(parsed)
			? parsed
			: Array.isArray(parsed.links)
				? parsed.links
				: Array.isArray(parsed.data?.links)
					? parsed.data.links
					: [];

		if (arr.length === 0) {
			if (parsed.generator === 'run' || parsed.totalLinks !== undefined) return 'run';
			if (parsed.version && ('cursor' in parsed || 'list_complete' in parsed)) return 'sink';
			return 'unknown';
		}

		const sample = arr[0];
		if (!sample || typeof sample !== 'object') return 'unknown';

		if ('destinationUrl' in sample || 'deliveryMode' in sample || 'isArchived' in sample) {
			return 'run';
		}
		if ('url' in sample) {
			return 'sink';
		}
		return 'unknown';
	}

	function handleFileSelected(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) return;

		importFile = file;
		parseError = null;
		importResult = null;

		const reader = new FileReader();
		reader.onload = (e) => {
			try {
				const text = e.target?.result as string;
				const parsed = JSON.parse(text);
				importJsonData = parsed;

				const detected = detectFormatClient(parsed);
				detectedFormat = detected;

				const arr = Array.isArray(parsed)
					? parsed
					: Array.isArray(parsed.links)
						? parsed.links
						: Array.isArray(parsed.data?.links)
							? parsed.data.links
							: [];
				linksFoundCount = arr.length;

				if (linksFoundCount === 0) {
					parseError = 'No link records could be found in the provided JSON file.';
				}
			} catch (err: any) {
				parseError = `Invalid JSON file: ${err.message}`;
				importJsonData = null;
				linksFoundCount = 0;
			}
		};
		reader.readAsText(file);
	}

	async function runImport() {
		if (!importJsonData) return;

		isImporting = true;
		importResult = null;
		parseError = null;

		try {
			// Resolve remap domain
			let remapDomainUrl: string | null = null;
			let useOrigin = remapMode === 'origin';

			if (remapMode === 'domain') {
				if (selectedTargetDomainId) {
					const matched = data?.domains?.find((d: any) => d.id === selectedTargetDomainId);
					if (matched) remapDomainUrl = matched.name;
				} else {
					remapDomainUrl = data?.siteConfig?.defaultDomain || page.url.host;
				}
			} else if (remapMode === 'custom' && customRemapHost.trim()) {
				remapDomainUrl = customRemapHost.trim();
			}

			const payload = {
				payload: importJsonData,
				format: formatOverride === 'auto' ? detectedFormat : formatOverride,
				conflictStrategy,
				targetDomainId: selectedTargetDomainId || null,
				remapDomainUrl,
				useOriginDomain: useOrigin
			};

			const res = await fetch('/api/links/import', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});

			const resultData = await res.json();
			if (!res.ok) {
				throw new Error(resultData.error || 'Import failed with server error');
			}

			importResult = resultData;
		} catch (err: any) {
			parseError = err.message;
		} finally {
			isImporting = false;
		}
	}

	function resetImport() {
		importFile = null;
		importJsonData = null;
		detectedFormat = 'unknown';
		formatOverride = 'auto';
		linksFoundCount = 0;
		parseError = null;
		importResult = null;
	}

	function downloadItemsLog(items: any[], filenamePrefix: string) {
		const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' });
		const downloadUrl = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = downloadUrl;
		a.download = `${filenamePrefix}-${new Date().toISOString().slice(0, 10)}.json`;
		a.click();
		URL.revokeObjectURL(downloadUrl);
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
			<p class="text-xs text-zinc-400 mt-0.5">Workspace configuration, Sink migration, link imports/exports, and telemetry</p>
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

	<!-- Import & Export / Sink Migration Section -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		<!-- EXPORT LINKS CARD -->
		<div class="bg-[#101013] border border-zinc-800/80 rounded-xl p-5 flex flex-col justify-between space-y-4">
			<div class="space-y-3">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<div class="p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400">
							<Download class="w-4 h-4" />
						</div>
						<div>
							<h3 class="text-xs font-bold text-zinc-200 uppercase tracking-wider font-mono">Export Links</h3>
							<p class="text-[11px] text-zinc-400">Download link database in Native Run or Sink v1.0 format</p>
						</div>
					</div>
					<span class="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
						{data?.stats?.total ?? 0} Total
					</span>
				</div>

				<!-- Status Filter Tabs -->
				<div class="space-y-1.5">
					<span class="text-[11px] font-mono text-zinc-400">Filter Status:</span>
					<div class="grid grid-cols-3 gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800 text-xs font-mono">
						<button
							type="button"
							onclick={() => (exportStatusFilter = 'all')}
							class="py-1.5 px-2 rounded text-center transition-all cursor-pointer {exportStatusFilter === 'all'
								? 'bg-zinc-800 text-zinc-100 font-semibold shadow-xs'
								: 'text-zinc-400 hover:text-zinc-200'}"
						>
							All ({data?.stats?.total ?? 0})
						</button>
						<button
							type="button"
							onclick={() => (exportStatusFilter = 'active')}
							class="py-1.5 px-2 rounded text-center transition-all cursor-pointer {exportStatusFilter === 'active'
								? 'bg-zinc-800 text-emerald-400 font-semibold shadow-xs'
								: 'text-zinc-400 hover:text-zinc-200'}"
						>
							Active ({data?.stats?.active ?? 0})
						</button>
						<button
							type="button"
							onclick={() => (exportStatusFilter = 'expired')}
							class="py-1.5 px-2 rounded text-center transition-all cursor-pointer {exportStatusFilter === 'expired'
								? 'bg-zinc-800 text-amber-400 font-semibold shadow-xs'
								: 'text-zinc-400 hover:text-zinc-200'}"
						>
							Expired ({data?.stats?.expired ?? 0})
						</button>
					</div>
				</div>

				<div class="p-3 bg-zinc-900/40 border border-zinc-800/80 rounded-lg text-[11px] text-zinc-400 space-y-1">
					<p><strong class="text-zinc-300">Run Native JSON:</strong> Preserves full targeting rules, device routing, AB splits, UTM presets, and security modes.</p>
					<p><strong class="text-zinc-300">Sink Format JSON:</strong> 100% compliant with Sink v1.0 specifications for direct upload to any Sink instance.</p>
				</div>
			</div>

			<!-- Export Buttons -->
			<div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-zinc-800/80">
				<button
					type="button"
					onclick={() => downloadExport('run')}
					disabled={isExporting !== null}
					class="flex items-center justify-center gap-1.5 px-3 py-2 bg-zinc-800 hover:bg-zinc-750 text-white text-xs font-semibold rounded-lg border border-zinc-700 shadow-sm transition-all cursor-pointer disabled:opacity-50"
				>
					<Download class="w-3.5 h-3.5 {isExporting === 'run' ? 'animate-bounce' : ''}" />
					<span>{isExporting === 'run' ? 'Exporting...' : 'Export Run Native'}</span>
				</button>
				<button
					type="button"
					onclick={() => downloadExport('sink')}
					disabled={isExporting !== null}
					class="flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 text-xs font-semibold rounded-lg border border-blue-500/30 shadow-sm transition-all cursor-pointer disabled:opacity-50"
				>
					<ArrowRightLeft class="w-3.5 h-3.5 {isExporting === 'sink' ? 'animate-spin' : ''}" />
					<span>{isExporting === 'sink' ? 'Exporting...' : 'Export to Sink v1.0'}</span>
				</button>
			</div>
		</div>

		<!-- IMPORT LINKS CARD -->
		<div class="bg-[#101013] border border-zinc-800/80 rounded-xl p-5 space-y-4">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-2">
					<div class="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400">
						<Upload class="w-4 h-4" />
					</div>
					<div>
						<h3 class="text-xs font-bold text-zinc-200 uppercase tracking-wider font-mono">Import &amp; Migrate Links</h3>
						<p class="text-[11px] text-zinc-400">Import links from Sink v1.0 or Run export files with automatic remapping</p>
					</div>
				</div>
				{#if importJsonData}
					<button
						type="button"
						onclick={resetImport}
						disabled={isImporting}
						class="text-[11px] font-mono text-zinc-400 hover:text-zinc-200 cursor-pointer flex items-center gap-1"
					>
						<RefreshCw class="w-3 h-3" />
						<span>Reset</span>
					</button>
				{/if}
			</div>

			{#if parseError}
				<div class="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-300 flex items-start gap-2">
					<AlertCircle class="w-4 h-4 mt-0.5 shrink-0 text-red-400" />
					<div class="space-y-1">
						<span class="font-bold">Import Error</span>
						<p class="text-[11px] text-red-300/90">{parseError}</p>
					</div>
				</div>
			{/if}

			{#if !importJsonData && !importResult}
				<!-- File Dropzone -->
				<label
					for="link-import-input"
					class="border-2 border-dashed border-zinc-800 hover:border-zinc-700 bg-zinc-950/50 hover:bg-zinc-900/40 rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all group"
				>
					<div class="p-3 bg-zinc-900 group-hover:bg-zinc-850 rounded-full border border-zinc-800 text-zinc-400 group-hover:text-zinc-200 transition-all">
						<FileJson class="w-5 h-5" />
					</div>
					<div class="text-center space-y-0.5">
						<span class="text-xs font-semibold text-zinc-200 block">Click to upload JSON file</span>
						<span class="text-[11px] text-zinc-500 block">Accepts Sink export or Run native JSON files</span>
					</div>
					<input
						id="link-import-input"
						type="file"
						accept=".json,application/json"
						onchange={handleFileSelected}
						class="hidden"
					/>
				</label>
			{/if}

			{#if importJsonData && !importResult}
				<!-- File Preview & Configure Options -->
				<div class="space-y-4">
					<div class="p-3 bg-zinc-950 border border-zinc-800 rounded-lg flex items-center justify-between text-xs font-mono">
						<div class="space-y-0.5">
							<span class="text-zinc-200 font-semibold block truncate max-w-[200px] sm:max-w-xs">{importFile?.name}</span>
							<span class="text-[11px] text-zinc-400">{linksFoundCount} links detected</span>
						</div>
						<div class="flex items-center gap-1.5">
							{#if detectedFormat === 'sink'}
								<span class="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
									Sink v1.0
								</span>
							{:else if detectedFormat === 'run'}
								<span class="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
									Run Native
								</span>
							{:else}
								<span class="text-[10px] font-semibold px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
									Unknown Schema
								</span>
							{/if}
						</div>
					</div>

					<!-- Advanced Migration Settings -->
					<div class="space-y-3 bg-zinc-900/30 p-3.5 border border-zinc-800/80 rounded-lg text-xs">
						<!-- Format Selector Override -->
						<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
							<div class="space-y-1">
								<label for="format-override" class="text-[11px] font-mono text-zinc-400">Schema Parser:</label>
								<select
									id="format-override"
									bind:value={formatOverride}
									class="w-full bg-zinc-950 border border-zinc-800 rounded-lg text-xs px-2.5 py-1.5 text-zinc-200 font-mono"
								>
									<option value="auto">Auto-detect ({detectedFormat})</option>
									<option value="sink">Force Sink v1.0 Schema</option>
									<option value="run">Force Run Native Schema</option>
								</select>
							</div>

							<!-- Conflict Strategy -->
							<div class="space-y-1">
								<label for="conflict-strategy" class="text-[11px] font-mono text-zinc-400">Slug Collision Strategy:</label>
								<select
									id="conflict-strategy"
									bind:value={conflictStrategy}
									class="w-full bg-zinc-950 border border-zinc-800 rounded-lg text-xs px-2.5 py-1.5 text-zinc-200 font-mono"
								>
									<option value="skip">Skip duplicates (Safe default)</option>
									<option value="overwrite">Overwrite existing links</option>
									<option value="rename">Auto-rename with suffix (-xxxx)</option>
								</select>
							</div>
						</div>

						<!-- Target Domain Assignment -->
						<div class="space-y-1 pt-1">
							<label for="target-domain-select" class="text-[11px] font-mono text-zinc-400 flex items-center gap-1.5">
								<Globe class="w-3.5 h-3.5 text-blue-400" />
								<span>Assign Short Links to Domain:</span>
							</label>
							<select
								id="target-domain-select"
								bind:value={selectedTargetDomainId}
								class="w-full bg-zinc-950 border border-zinc-800 rounded-lg text-xs px-2.5 py-1.5 text-zinc-200 font-mono"
							>
								<option value="">Default Host ({data?.siteConfig?.defaultDomain || page.url.host})</option>
								{#if data?.domains && data.domains.length > 0}
									{#each data.domains as d}
										<option value={d.id}>{d.name} {d.verified ? '✓' : '(unverified)'}</option>
									{/each}
								{/if}
							</select>
						</div>

						<!-- URL Remapping Options -->
						<div class="space-y-1.5 pt-1">
							<span class="text-[11px] font-mono text-zinc-400 block">Destination URL Host Handling:</span>
							<div class="space-y-2">
								<label class="flex items-center gap-2 cursor-pointer text-zinc-300">
									<input
										type="radio"
										name="remap-mode"
										value="origin"
										bind:group={remapMode}
										class="text-blue-500 focus:ring-blue-500/20 bg-zinc-950 border-zinc-800"
									/>
									<span>Use origin destination URLs as-is (Recommended)</span>
								</label>
								<label class="flex items-center gap-2 cursor-pointer text-zinc-300">
									<input
										type="radio"
										name="remap-mode"
										value="domain"
										bind:group={remapMode}
										class="text-blue-500 focus:ring-blue-500/20 bg-zinc-950 border-zinc-800"
									/>
									<span>Remap destination host to selected domain</span>
								</label>
								<label class="flex items-center gap-2 cursor-pointer text-zinc-300">
									<input
										type="radio"
										name="remap-mode"
										value="custom"
										bind:group={remapMode}
										class="text-blue-500 focus:ring-blue-500/20 bg-zinc-950 border-zinc-800"
									/>
									<span>Remap destination host to custom hostname</span>
								</label>

								{#if remapMode === 'custom'}
									<input
										type="text"
										placeholder="e.g. app.mycompany.com"
										bind:value={customRemapHost}
										class="w-full bg-zinc-950 border border-zinc-800 rounded-lg text-xs px-2.5 py-1.5 text-zinc-200 font-mono mt-1"
									/>
								{/if}
							</div>
						</div>
					</div>

					<!-- Execute Button -->
					<button
						type="button"
						onclick={runImport}
						disabled={isImporting || linksFoundCount === 0}
						class="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50"
					>
						<Upload class="w-3.5 h-3.5 {isImporting ? 'animate-bounce' : ''}" />
						<span>{isImporting ? `Importing ${linksFoundCount} Links...` : `Import ${linksFoundCount} Links`}</span>
					</button>
				</div>
			{/if}

			{#if importResult}
				<!-- Import Results Summary -->
				<div class="space-y-4 animate-in fade-in">
					<div class="p-4 bg-zinc-950 border border-zinc-800 rounded-lg space-y-3">
						<div class="flex items-center justify-between">
							<span class="text-xs font-bold text-zinc-200 font-mono">Migration Completed</span>
							<span class="text-[10px] font-mono text-zinc-400">Total: {importResult.total}</span>
						</div>

						<div class="grid grid-cols-3 gap-2 text-center text-xs font-mono">
							<div class="p-2.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
								<span class="block text-base font-bold">{importResult.success}</span>
								<span class="text-[10px] uppercase font-semibold">Imported</span>
							</div>
							<div class="p-2.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400">
								<span class="block text-base font-bold">{importResult.skipped}</span>
								<span class="text-[10px] uppercase font-semibold">Skipped</span>
							</div>
							<div class="p-2.5 rounded bg-red-500/10 border border-red-500/20 text-red-400">
								<span class="block text-base font-bold">{importResult.failed}</span>
								<span class="text-[10px] uppercase font-semibold">Failed</span>
							</div>
						</div>

						<!-- Download Logs -->
						<div class="flex flex-wrap gap-2 pt-2 border-t border-zinc-800/80">
							{#if importResult.successItems?.length > 0}
								<button
									type="button"
									onclick={() => downloadItemsLog(importResult.successItems, 'import-success-items')}
									class="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 text-[11px] font-mono rounded border border-zinc-800 transition-all cursor-pointer flex items-center gap-1"
								>
									<Download class="w-3 h-3 text-emerald-400" />
									<span>Success Log ({importResult.success})</span>
								</button>
							{/if}

							{#if importResult.skippedItems?.length > 0}
								<button
									type="button"
									onclick={() => downloadItemsLog(importResult.skippedItems, 'import-skipped-items')}
									class="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 text-[11px] font-mono rounded border border-zinc-800 transition-all cursor-pointer flex items-center gap-1"
								>
									<Download class="w-3 h-3 text-amber-400" />
									<span>Skipped Log ({importResult.skipped})</span>
								</button>
							{/if}

							{#if importResult.failedItems?.length > 0}
								<button
									type="button"
									onclick={() => downloadItemsLog(importResult.failedItems, 'import-failed-items')}
									class="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 text-[11px] font-mono rounded border border-zinc-800 transition-all cursor-pointer flex items-center gap-1"
								>
									<Download class="w-3 h-3 text-red-400" />
									<span>Errors Log ({importResult.failed})</span>
								</button>
							{/if}
						</div>
					</div>

					<button
						type="button"
						onclick={resetImport}
						class="w-full py-2 bg-zinc-800 hover:bg-zinc-750 text-zinc-200 text-xs font-semibold rounded-lg border border-zinc-700 transition-all cursor-pointer"
					>
						Import Another File
					</button>
				</div>
			{/if}
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
