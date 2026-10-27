<script lang="ts">
	import type { PageServerData } from './$types';
	import {
		Archive,
		Download,
		Upload,
		Lock,
		Unlock,
		FileJson,
		Eye,
		EyeOff,
		CheckCircle2
	} from 'lucide-svelte';

	let { data }: { data: PageServerData } = $props();

	// Export state
	let exportPassphrase = $state('');
	let showExportPassphrase = $state(false);
	let selectedDatasets = $state<Record<string, boolean>>({
		links: true,
		domains: true,
		utmTemplates: true,
		webhooks: true,
		siteSettings: true,
		inviteCodes: true
	});
	let isExporting = $state(false);
	let exportError = $state<string | null>(null);

	function selectAllDatasets(val: boolean) {
		for (const k in selectedDatasets) {
			selectedDatasets[k] = val;
		}
	}

	async function handleExport() {
		isExporting = true;
		exportError = null;

		try {
			const datasets = Object.keys(selectedDatasets).filter((k) => selectedDatasets[k]);
			if (datasets.length === 0) {
				exportError = 'Please select at least one dataset to export.';
				isExporting = false;
				return;
			}

			const res = await fetch('/api/admin/backup/export', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					datasets,
					passphrase: exportPassphrase.trim() || undefined
				})
			});

			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.error || `Export failed with status ${res.status}`);
			}

			const disposition = res.headers.get('content-disposition');
			let filename = 'run-backup.json';
			if (disposition && disposition.includes('filename=')) {
				const match = disposition.match(/filename="?([^"]+)"?/);
				if (match && match[1]) filename = match[1];
			}

			const blob = await res.blob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = filename;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		} catch (err: any) {
			exportError = err.message || 'Export failed';
		} finally {
			isExporting = false;
		}
	}

	// Restore state
	let restoreFile = $state<File | null>(null);
	let restorePassphrase = $state('');
	let showRestorePassphrase = $state(false);
	let restoreOverwrite = $state(true);
	let isRestoring = $state(false);
	let restoreResult = $state<any | null>(null);
	let restoreError = $state<string | null>(null);

	function handleFileSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		if (input.files && input.files[0]) {
			restoreFile = input.files[0];
			restoreResult = null;
			restoreError = null;
		}
	}

	async function handleRestore() {
		if (!restoreFile) {
			restoreError = 'Please select a backup file (.json or .runbackup.json) to restore.';
			return;
		}
		isRestoring = true;
		restoreError = null;
		restoreResult = null;

		try {
			const formData = new FormData();
			formData.append('file', restoreFile);
			formData.append('passphrase', restorePassphrase.trim());
			formData.append('overwrite', restoreOverwrite ? 'true' : 'false');

			const res = await fetch('/api/admin/backup/restore', {
				method: 'POST',
				body: formData
			});

			const data = await res.json();
			if (!res.ok || !data.success) {
				throw new Error(data.error || 'Restore failed');
			}

			restoreResult = data;
		} catch (err: any) {
			restoreError = err.message || 'Failed to restore database';
		} finally {
			isRestoring = false;
		}
	}
</script>

<svelte:head>
	<title>Backup & Disaster Recovery — Run Admin</title>
</svelte:head>

<div class="p-8 max-w-7xl w-full mx-auto space-y-6">
	<!-- Top Bar Header -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
		<div>
			<h1 class="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2.5">
				<Archive class="w-5 h-5 text-purple-400" />
				<span>Database Backup & Disaster Recovery</span>
			</h1>
			<p class="text-xs text-zinc-400 mt-0.5">
				Create selectable encrypted archives (AES-256-GCM) or restore system data with automatic conflict merge.
			</p>
		</div>
	</div>

	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		<!-- EXPORT CARD -->
		<div class="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-4 flex flex-col justify-between">
			<div class="space-y-4">
				<div class="flex items-center justify-between border-b border-zinc-800 pb-3">
					<h2 class="text-xs font-bold uppercase tracking-wider text-zinc-200 font-mono flex items-center gap-1.5">
						<Download class="w-4 h-4 text-blue-400" />
						Export Database Archive
					</h2>
					<div class="flex items-center gap-2 text-[10px] font-mono">
						<button
							type="button"
							onclick={() => selectAllDatasets(true)}
							class="text-blue-400 hover:underline cursor-pointer"
						>
							Select All
						</button>
						<span class="text-zinc-600">|</span>
						<button
							type="button"
							onclick={() => selectAllDatasets(false)}
							class="text-zinc-400 hover:underline cursor-pointer"
						>
							Clear All
						</button>
					</div>
				</div>

				<!-- Dataset Checklist -->
				<div class="space-y-2 bg-zinc-950/70 p-3 rounded-lg border border-zinc-800">
					<span class="text-[11px] font-mono text-zinc-400 block font-semibold">Selectable Tables:</span>
					<div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
						{#each (data.datasetMetadata || []) as ds}
							<label class="flex items-center gap-2 p-1.5 rounded hover:bg-zinc-800/40 cursor-pointer text-zinc-300">
								<input
									type="checkbox"
									bind:checked={selectedDatasets[ds.id]}
									class="rounded border-zinc-700 bg-zinc-900 text-amber-500 focus:ring-0"
								/>
								<div class="truncate">
									<span class="font-medium text-zinc-200">{ds.label}</span>
									<span class="text-[10px] text-zinc-500 block">
										({(data.backupStats as any)?.[ds.id] ?? 0} records)
									</span>
								</div>
							</label>
						{/each}
					</div>
				</div>

				<!-- Passphrase Input -->
				<div class="space-y-1.5">
					<label for="exportPassphraseInput" class="text-[11px] font-mono text-zinc-300 flex items-center gap-1.5">
						<Lock class="w-3.5 h-3.5 text-purple-400" />
						<span>Passphrase Protection (Optional AES-256-GCM)</span>
					</label>
					<div class="relative">
						<input
							id="exportPassphraseInput"
							type={showExportPassphrase ? 'text' : 'password'}
							bind:value={exportPassphrase}
							placeholder="Leave empty for unencrypted JSON"
							class="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-1.5 pr-8 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-purple-500 focus:outline-none font-mono"
						/>
						<button
							type="button"
							onclick={() => (showExportPassphrase = !showExportPassphrase)}
							class="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 cursor-pointer"
						>
							{#if showExportPassphrase}
								<EyeOff class="w-3.5 h-3.5" />
							{:else}
								<Eye class="w-3.5 h-3.5" />
							{/if}
						</button>
					</div>
					<p class="text-[10px] text-zinc-500">
						If provided, the archive will be encrypted using authenticated AES-256-GCM derived via PBKDF2.
					</p>
				</div>

				{#if exportError}
					<div class="p-2.5 rounded bg-red-950/40 border border-red-500/20 text-red-400 text-xs font-mono">
						{exportError}
					</div>
				{/if}
			</div>

			<button
				type="button"
				onclick={handleExport}
				disabled={isExporting}
				class="w-full mt-4 py-2 px-3 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
			>
				<Download class="w-3.5 h-3.5" />
				<span>{isExporting ? 'Generating Archive...' : 'Download Backup Archive'}</span>
			</button>
		</div>

		<!-- RESTORE CARD -->
		<div class="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-4 flex flex-col justify-between">
			<div class="space-y-4">
				<div class="flex items-center justify-between border-b border-zinc-800 pb-3">
					<h2 class="text-xs font-bold uppercase tracking-wider text-zinc-200 font-mono flex items-center gap-1.5">
						<Upload class="w-4 h-4 text-emerald-400" />
						Restore Database Archive
					</h2>
					<span class="text-[10px] font-mono text-zinc-500">.json, .runbackup</span>
				</div>

				<!-- File Dropzone -->
				<div class="space-y-1.5">
					<label for="restoreFilePicker" class="text-[11px] font-mono text-zinc-300 block">Select Backup File:</label>
					<div class="relative border-2 border-dashed border-zinc-800 hover:border-zinc-700 rounded-lg p-5 text-center cursor-pointer transition bg-zinc-950/60">
						<input
							id="restoreFilePicker"
							type="file"
							accept=".json,.runbackup"
							onchange={handleFileSelect}
							class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
						/>
						<FileJson class="w-7 h-7 text-zinc-500 mx-auto mb-1" />
						{#if restoreFile}
							<div class="text-xs font-mono text-emerald-400 font-semibold">{restoreFile.name}</div>
							<div class="text-[10px] text-zinc-500 font-mono">{(restoreFile.size / 1024).toFixed(1)} KB</div>
						{:else}
							<div class="text-xs text-zinc-400">Click or drag backup file here</div>
							<div class="text-[10px] text-zinc-600 font-mono">Supports unencrypted JSON and AES-256-GCM bundles</div>
						{/if}
					</div>
				</div>

				<!-- Decryption Passphrase Input -->
				<div class="space-y-1.5">
					<label for="restorePassphraseInput" class="text-[11px] font-mono text-zinc-300 flex items-center gap-1.5">
						<Unlock class="w-3.5 h-3.5 text-amber-400" />
						<span>Decryption Passphrase</span>
					</label>
					<div class="relative">
						<input
							id="restorePassphraseInput"
							type={showRestorePassphrase ? 'text' : 'password'}
							bind:value={restorePassphrase}
							placeholder="Enter passphrase if backup was encrypted"
							class="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-1.5 pr-8 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-amber-500 focus:outline-none font-mono"
						/>
						<button
							type="button"
							onclick={() => (showRestorePassphrase = !showRestorePassphrase)}
							class="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 cursor-pointer"
						>
							{#if showRestorePassphrase}
								<EyeOff class="w-3.5 h-3.5" />
							{:else}
								<Eye class="w-3.5 h-3.5" />
							{/if}
						</button>
					</div>
				</div>

				<!-- Conflict Strategy Option -->
				<label class="flex items-center gap-2 p-2.5 rounded bg-zinc-950/70 border border-zinc-800 cursor-pointer text-xs font-mono text-zinc-300">
					<input
						type="checkbox"
						bind:checked={restoreOverwrite}
						class="rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-0"
					/>
					<div>
						<span class="font-medium text-zinc-200">Overwrite conflicting records</span>
						<span class="text-[10px] text-zinc-500 block">Updates existing links, domains, and settings matching backup keys</span>
					</div>
				</label>

				{#if restoreError}
					<div class="p-2.5 rounded bg-red-950/40 border border-red-500/20 text-red-400 text-xs font-mono">
						{restoreError}
					</div>
				{/if}

				{#if restoreResult}
					<div class="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-lg text-xs font-mono text-emerald-300 space-y-1.5">
						<div class="font-bold flex items-center gap-1.5">
							<CheckCircle2 class="w-4 h-4 text-emerald-400" />
							<span>Database Restoration Completed</span>
						</div>
						<div class="text-[11px] text-zinc-400">
							Restored datasets: {Object.keys(restoreResult.counts || {}).join(', ')}
						</div>
					</div>
				{/if}
			</div>

			<button
				type="button"
				onclick={handleRestore}
				disabled={isRestoring || !restoreFile}
				class="w-full mt-4 py-2 px-3 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
			>
				<Upload class="w-3.5 h-3.5" />
				<span>{isRestoring ? 'Restoring Archive...' : 'Restore Selected Archive'}</span>
			</button>
		</div>
	</div>
</div>
