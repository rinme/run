<script lang="ts">
	import {
		X,
		Sparkles,
		Globe,
		Smartphone,
		ShieldCheck,
		Share2,
		Layers,
		Plus,
		Trash2,
		Check,
		AlertCircle
	} from 'lucide-svelte';
	import { motion, AnimatePresence } from 'motion-sv';
	import { crispSpring } from '#lib/client/motion.svelte.ts';

	interface DrawerProps {
		isOpen?: boolean;
		linkToEdit?: any | null;
		onClose?: () => void;
		onSaved?: (link: any) => void;
	}

	let {
		isOpen = false,
		linkToEdit = null,
		onClose = () => {},
		onSaved = () => {}
	}: DrawerProps = $props();

	type TabType = 'general' | 'routing' | 'security' | 'utm' | 'social';
	let activeTab = $state<TabType>('general');

	// Form fields
	let destinationUrl = $state('');
	let slug = $state('');
	let title = $state('');
	let description = $state('');
	let deliveryMode = $state<'direct' | 'password' | 'age_gate' | 'interstitial' | 'cloaked' | 'reverse_proxy'>('direct');
	let password = $state('');
	let interstitialDuration = $state(5);
	let expiresAt = $state('');
	let maxClicks = $state<number | ''>('');
	let expiredRedirectUrl = $state('');
	let redirectWithQuery = $state(true);

	// Dynamic Routing
	let iosUrl = $state('');
	let androidUrl = $state('');
	let geoRules = $state<Array<{ country: string; url: string }>>([]);
	let abSplits = $state<Array<{ url: string; weight: number }>>([]);

	// UTM tags
	let utmSource = $state('');
	let utmMedium = $state('');
	let utmCampaign = $state('');
	let utmTerm = $state('');
	let utmContent = $state('');

	// AI state
	let isAiLoading = $state(false);
	let aiSuggestions = $state<{ slugs: string[]; summary: string; tags: string[] } | null>(null);

	let errorMessage = $state('');
	let isSubmitting = $state(false);

	// Populate when linkToEdit changes
	$effect(() => {
		if (linkToEdit) {
			destinationUrl = linkToEdit.destinationUrl || '';
			slug = linkToEdit.slug || '';
			title = linkToEdit.title || '';
			description = linkToEdit.description || '';
			deliveryMode = linkToEdit.deliveryMode || 'direct';
			password = ''; // Never show password hash
			interstitialDuration = linkToEdit.interstitialDuration || 5;
			expiresAt = linkToEdit.expiresAt ? new Date(linkToEdit.expiresAt).toISOString().slice(0, 16) : '';
			maxClicks = linkToEdit.maxClicks || '';
			expiredRedirectUrl = linkToEdit.expiredRedirectUrl || '';
			redirectWithQuery = linkToEdit.redirectWithQuery !== false;

			// Parse device
			if (linkToEdit.deviceRouting) {
				try {
					const dev = JSON.parse(linkToEdit.deviceRouting);
					iosUrl = dev.ios || '';
					androidUrl = dev.android || '';
				} catch {}
			} else {
				iosUrl = '';
				androidUrl = '';
			}

			// Parse geo
			if (linkToEdit.geoRouting) {
				try {
					const geo = JSON.parse(linkToEdit.geoRouting);
					geoRules = Object.entries(geo).map(([country, url]) => ({ country, url: String(url) }));
				} catch {}
			} else {
				geoRules = [];
			}

			// Parse A/B
			if (linkToEdit.abSplits) {
				try {
					abSplits = JSON.parse(linkToEdit.abSplits);
				} catch {}
			} else {
				abSplits = [];
			}

			// Parse UTM
			if (linkToEdit.utmPreset) {
				try {
					const utm = JSON.parse(linkToEdit.utmPreset);
					utmSource = utm.source || '';
					utmMedium = utm.medium || '';
					utmCampaign = utm.campaign || '';
					utmTerm = utm.term || '';
					utmContent = utm.content || '';
				} catch {}
			} else {
				utmSource = ''; utmMedium = ''; utmCampaign = ''; utmTerm = ''; utmContent = '';
			}
		} else {
			// Reset fields for new link
			destinationUrl = '';
			slug = '';
			title = '';
			description = '';
			deliveryMode = 'direct';
			password = '';
			interstitialDuration = 5;
			expiresAt = '';
			maxClicks = '';
			expiredRedirectUrl = '';
			redirectWithQuery = true;
			iosUrl = '';
			androidUrl = '';
			geoRules = [];
			abSplits = [];
			utmSource = ''; utmMedium = ''; utmCampaign = ''; utmTerm = ''; utmContent = '';
			aiSuggestions = null;
		}
		errorMessage = '';
	});

	async function requestAiSuggestions() {
		if (!destinationUrl) {
			errorMessage = 'Please enter a destination URL first.';
			return;
		}
		errorMessage = '';
		isAiLoading = true;
		try {
			const res = await fetch('/api/ai/suggest', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ url: destinationUrl })
			});
			if (res.ok) {
				const data = await res.json();
				aiSuggestions = data;
				if (data.slugs?.length > 0 && !slug) {
					slug = data.slugs[0];
				}
				if (data.summary && !title) {
					title = data.summary;
				}
			}
		} catch (e) {
			console.error('AI suggestion failed:', e);
		} finally {
			isAiLoading = false;
		}
	}

	function addGeoRule() {
		geoRules = [...geoRules, { country: '', url: '' }];
	}

	function removeGeoRule(index: number) {
		geoRules = geoRules.filter((_, i) => i !== index);
	}

	function addAbSplit() {
		abSplits = [...abSplits, { url: '', weight: 50 }];
	}

	function removeAbSplit(index: number) {
		abSplits = abSplits.filter((_, i) => i !== index);
	}

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!destinationUrl) {
			errorMessage = 'Destination URL is required.';
			return;
		}

		isSubmitting = true;
		errorMessage = '';

		const deviceRouting = (iosUrl || androidUrl) ? { ios: iosUrl || undefined, android: androidUrl || undefined } : undefined;
		const geoMap: Record<string, string> = {};
		geoRules.forEach((r) => {
			if (r.country && r.url) geoMap[r.country.toUpperCase()] = r.url;
		});

		const utmPreset = (utmSource || utmMedium || utmCampaign) ? {
			source: utmSource || undefined,
			medium: utmMedium || undefined,
			campaign: utmCampaign || undefined,
			term: utmTerm || undefined,
			content: utmContent || undefined
		} : undefined;

		const payload: Record<string, any> = {
			destinationUrl,
			slug: slug || undefined,
			title: title || undefined,
			description: description || undefined,
			deliveryMode,
			password: deliveryMode === 'password' && password ? password : undefined,
			interstitialDuration: deliveryMode === 'interstitial' ? interstitialDuration : undefined,
			expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
			maxClicks: maxClicks ? Number(maxClicks) : null,
			expiredRedirectUrl: expiredRedirectUrl || null,
			redirectWithQuery,
			deviceRouting,
			geoRouting: Object.keys(geoMap).length > 0 ? geoMap : null,
			abSplits: abSplits.length > 0 ? abSplits : null,
			utmPreset
		};

		if (linkToEdit) {
			payload.id = linkToEdit.id;
		}

		try {
			const res = await fetch('/api/links', {
				method: linkToEdit ? 'PATCH' : 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});

			if (!res.ok) {
				const err = await res.json();
				errorMessage = err.error || 'Failed to save link';
				return;
			}

			const saved = await res.json();
			onSaved(saved);
			onClose();
		} catch {
			errorMessage = 'Network error while saving link';
		} finally {
			isSubmitting = false;
		}
	}
</script>

<AnimatePresence>
	{#if isOpen}
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			transition={{ duration: 0.18 }}
			class="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs"
			onclick={(e) => { if (e.target === e.currentTarget) onClose(); }}
			role="presentation"
		>
			<motion.div
				initial={{ x: '100%' }}
				animate={{ x: 0 }}
				exit={{ x: '100%' }}
				transition={crispSpring}
				class="bg-[#101014] border-l border-zinc-800 w-full max-w-xl h-full flex flex-col shadow-2xl"
			>
			<!-- Drawer Header -->
			<div class="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
				<div>
					<h2 class="text-sm font-bold text-zinc-100 flex items-center gap-2">
						{#if linkToEdit}
							<span>Edit Short Link</span>
							<span class="text-xs font-mono text-blue-400">/{linkToEdit.slug}</span>
						{:else}
							<span>Create New Short Link</span>
						{/if}
					</h2>
					<p class="text-xs text-zinc-400 mt-0.5">Configure destination, targeting rules, and security</p>
				</div>
				<button
					type="button"
					onclick={onClose}
					class="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
				>
					<X class="w-4 h-4" />
				</button>
			</div>

			<!-- Drawer Tabs -->
			<div class="flex border-b border-zinc-800 bg-zinc-950/40 px-6 gap-2">
				{#each [
					{ id: 'general', label: 'General', icon: Layers },
					{ id: 'routing', label: 'Routing', icon: Smartphone },
					{ id: 'security', label: 'Security & Limits', icon: ShieldCheck },
					{ id: 'utm', label: 'UTM Presets', icon: Globe },
					{ id: 'social', label: 'Social / OG', icon: Share2 }
				] as tab}
					<button
						type="button"
						onclick={() => (activeTab = tab.id as TabType)}
						class="flex items-center gap-1.5 py-3 px-2 text-xs font-medium border-b-2 transition-colors cursor-pointer {activeTab === tab.id
							? 'border-blue-500 text-blue-400 font-semibold'
							: 'border-transparent text-zinc-400 hover:text-zinc-200'}"
					>
						<tab.icon class="w-3.5 h-3.5" />
						{tab.label}
					</button>
				{/each}
			</div>

			<!-- Drawer Form Body -->
			<form onsubmit={handleSubmit} class="flex-1 overflow-y-auto p-6 space-y-4">
				{#if errorMessage}
					<div class="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg">
						<AlertCircle class="w-4 h-4 shrink-0" />
						<span>{errorMessage}</span>
					</div>
				{/if}

				<!-- TAB 1: GENERAL -->
				{#if activeTab === 'general'}
					<div class="space-y-4">
						<div>
							<div class="flex items-center justify-between mb-1.5">
								<label for="drawerDestUrl" class="block text-xs font-medium text-zinc-300">Destination URL *</label>
								<button
									type="button"
									onclick={requestAiSuggestions}
									disabled={isAiLoading || !destinationUrl}
									class="flex items-center gap-1 text-[11px] font-medium text-blue-400 hover:text-blue-300 disabled:opacity-40 transition-colors cursor-pointer"
								>
									<Sparkles class="w-3 h-3 {isAiLoading ? 'animate-spin' : ''}" />
									{isAiLoading ? 'AI Analyzing...' : 'Auto-Fill with AI'}
								</button>
							</div>
							<input
								id="drawerDestUrl"
								type="url"
								bind:value={destinationUrl}
								required
								placeholder="https://example.com/long-landing-page"
								class="w-full px-3 py-2 bg-zinc-900 border border-zinc-750 rounded-lg text-xs text-zinc-100 placeholder-zinc-500 font-mono focus:outline-none focus:border-blue-500"
							/>
						</div>

						{#if aiSuggestions?.slugs && aiSuggestions.slugs.length > 0}
							<div class="p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg space-y-2">
								<span class="text-[11px] font-semibold text-blue-400 flex items-center gap-1">
									<Sparkles class="w-3 h-3" />
									Suggested Slugs:
								</span>
								<div class="flex flex-wrap gap-1.5">
									{#each aiSuggestions.slugs as s}
										<button
											type="button"
											onclick={() => (slug = s)}
											class="px-2.5 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-md font-mono cursor-pointer"
										>
											{s}
										</button>
									{/each}
								</div>
							</div>
						{/if}

						<div class="grid grid-cols-2 gap-4">
							<div>
								<label for="drawerSlug" class="block text-xs font-medium text-zinc-300 mb-1.5">Custom Slug</label>
								<div class="flex items-center">
									<span class="px-2.5 py-2 bg-zinc-900 text-zinc-500 border border-r-0 border-zinc-750 rounded-l-lg text-xs font-mono">
										/
									</span>
									<input
										id="drawerSlug"
										type="text"
										bind:value={slug}
										placeholder="summer-sale"
										class="w-full px-3 py-2 bg-zinc-900 border border-zinc-750 rounded-r-lg text-xs text-zinc-100 placeholder-zinc-500 font-mono focus:outline-none focus:border-blue-500"
									/>
								</div>
							</div>

							<div>
								<label for="drawerTitle" class="block text-xs font-medium text-zinc-300 mb-1.5">Link Title</label>
								<input
									id="drawerTitle"
									type="text"
									bind:value={title}
									placeholder="Marketing Campaign"
									class="w-full px-3 py-2 bg-zinc-900 border border-zinc-750 rounded-lg text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
								/>
							</div>
						</div>

						<div>
							<label for="drawerDesc" class="block text-xs font-medium text-zinc-300 mb-1.5">Description (Internal)</label>
							<textarea
								id="drawerDesc"
								bind:value={description}
								rows="2"
								placeholder="Optional internal notes about this link"
								class="w-full px-3 py-2 bg-zinc-900 border border-zinc-750 rounded-lg text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
							></textarea>
						</div>
					</div>
				{/if}

				<!-- TAB 2: ROUTING -->
				{#if activeTab === 'routing'}
					<div class="space-y-4">
						<div class="space-y-3">
							<h4 class="text-xs font-semibold text-zinc-300 uppercase tracking-wider font-mono">Device Redirection</h4>
							<div class="grid grid-cols-2 gap-3">
								<div>
									<label for="drawerIos" class="block text-xs text-zinc-400 mb-1">iOS Target (App Store)</label>
									<input
										id="drawerIos"
										type="url"
										bind:value={iosUrl}
										placeholder="https://apps.apple.com/..."
										class="w-full px-3 py-2 bg-zinc-900 border border-zinc-750 rounded-lg text-xs text-zinc-200"
									/>
								</div>
								<div>
									<label for="drawerAndroid" class="block text-xs text-zinc-400 mb-1">Android Target (Google Play)</label>
									<input
										id="drawerAndroid"
										type="url"
										bind:value={androidUrl}
										placeholder="https://play.google.com/..."
										class="w-full px-3 py-2 bg-zinc-900 border border-zinc-750 rounded-lg text-xs text-zinc-200"
									/>
								</div>
							</div>
						</div>

						<!-- Geo Rules -->
						<div class="space-y-2 pt-3 border-t border-zinc-800">
							<div class="flex items-center justify-between">
								<h4 class="text-xs font-semibold text-zinc-300 uppercase tracking-wider font-mono">Geo-Targeted Routing</h4>
								<button
									type="button"
									onclick={addGeoRule}
									class="text-xs font-medium text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
								>
									<Plus class="w-3.5 h-3.5" />
									Add Rule
								</button>
							</div>

							{#each geoRules as rule, i}
								<div class="flex gap-2 items-center">
									<input
										type="text"
										bind:value={rule.country}
										placeholder="US"
										maxlength="2"
										class="w-16 px-2.5 py-1.5 bg-zinc-900 border border-zinc-750 rounded-lg text-xs uppercase font-mono text-zinc-200 text-center"
									/>
									<input
										type="url"
										bind:value={rule.url}
										placeholder="https://us.example.com"
										class="flex-1 px-3 py-1.5 bg-zinc-900 border border-zinc-750 rounded-lg text-xs text-zinc-200"
									/>
									<button
										type="button"
										onclick={() => removeGeoRule(i)}
										class="p-1.5 text-zinc-500 hover:text-red-400 cursor-pointer"
									>
										<Trash2 class="w-4 h-4" />
									</button>
								</div>
							{/each}
						</div>

						<!-- A/B Splits -->
						<div class="space-y-2 pt-3 border-t border-zinc-800">
							<div class="flex items-center justify-between">
								<h4 class="text-xs font-semibold text-zinc-300 uppercase tracking-wider font-mono">A/B Traffic Splits</h4>
								<button
									type="button"
									onclick={addAbSplit}
									class="text-xs font-medium text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
								>
									<Plus class="w-3.5 h-3.5" />
									Add Variant
								</button>
							</div>

							{#each abSplits as split, i}
								<div class="flex gap-2 items-center">
									<input
										type="url"
										bind:value={split.url}
										placeholder="https://variant-b.example.com"
										class="flex-1 px-3 py-1.5 bg-zinc-900 border border-zinc-750 rounded-lg text-xs text-zinc-200"
									/>
									<div class="flex items-center gap-1 w-20">
										<input
											type="number"
											bind:value={split.weight}
											min="1"
											max="100"
											class="w-14 px-2 py-1.5 bg-zinc-900 border border-zinc-750 rounded-lg text-xs text-center text-zinc-200 font-mono"
										/>
										<span class="text-xs text-zinc-500">%</span>
									</div>
									<button
										type="button"
										onclick={() => removeAbSplit(i)}
										class="p-1.5 text-zinc-500 hover:text-red-400 cursor-pointer"
									>
										<Trash2 class="w-4 h-4" />
									</button>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				<!-- TAB 3: SECURITY & LIMITS -->
				{#if activeTab === 'security'}
					<div class="space-y-4">
						<div>
							<label for="drawerDeliverySelect" class="block text-xs font-medium text-zinc-300 mb-1.5">Delivery Security Mode</label>
							<select
								id="drawerDeliverySelect"
								bind:value={deliveryMode}
								class="w-full px-3 py-2 bg-zinc-900 border border-zinc-750 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-blue-500"
							>
								<option value="direct">Direct Redirect (302/301 Standard)</option>
								<option value="password">Password Challenge Gate</option>
								<option value="age_gate">NSFW / 18+ Age Verification Screen</option>
								<option value="interstitial">Interstitial Countdown Timer</option>
								<option value="cloaked">Link Cloaking (Full-Screen Iframe)</option>
								<option value="reverse_proxy">Reverse Proxy Forwarding (Mask Domain)</option>
							</select>
						</div>

						{#if deliveryMode === 'password'}
							<div>
								<label for="drawerPwd" class="block text-xs font-medium text-zinc-300 mb-1.5">
									{linkToEdit?.passwordHash ? 'Change Passcode (Leave blank to keep existing)' : 'Set Passcode'}
								</label>
								<input
									id="drawerPwd"
									type="password"
									bind:value={password}
									placeholder="Secret passcode..."
									class="w-full px-3 py-2 bg-zinc-900 border border-zinc-750 rounded-lg text-xs text-zinc-200"
								/>
							</div>
						{/if}

						{#if deliveryMode === 'interstitial'}
							<div>
								<label for="drawerDuration" class="block text-xs font-medium text-zinc-300 mb-1.5">Countdown Duration (seconds)</label>
								<input
									id="drawerDuration"
									type="number"
									bind:value={interstitialDuration}
									min="1"
									max="60"
									class="w-28 px-3 py-2 bg-zinc-900 border border-zinc-750 rounded-lg text-xs text-zinc-200"
								/>
							</div>
						{/if}

						<div class="pt-2 border-t border-zinc-800 grid grid-cols-2 gap-4">
							<div>
								<label for="drawerExpiry" class="block text-xs font-medium text-zinc-300 mb-1.5">Expiration Date</label>
								<input
									id="drawerExpiry"
									type="datetime-local"
									bind:value={expiresAt}
									class="w-full px-3 py-2 bg-zinc-900 border border-zinc-750 rounded-lg text-xs text-zinc-200"
								/>
							</div>
							<div>
								<label for="drawerMaxClicks" class="block text-xs font-medium text-zinc-300 mb-1.5">Max Click Limit</label>
								<input
									id="drawerMaxClicks"
									type="number"
									bind:value={maxClicks}
									min="1"
									placeholder="e.g. 1000"
									class="w-full px-3 py-2 bg-zinc-900 border border-zinc-750 rounded-lg text-xs text-zinc-200"
								/>
							</div>
						</div>

						<div>
							<label for="drawerFallbackUrl" class="block text-xs font-medium text-zinc-300 mb-1.5">Expired Fallback Target URL</label>
							<input
								id="drawerFallbackUrl"
								type="url"
								bind:value={expiredRedirectUrl}
								placeholder="https://example.com/expired-landing"
								class="w-full px-3 py-2 bg-zinc-900 border border-zinc-750 rounded-lg text-xs text-zinc-200"
							/>
						</div>

						<label class="flex items-center gap-2 pt-2 cursor-pointer">
							<input
								type="checkbox"
								bind:checked={redirectWithQuery}
								class="rounded bg-zinc-900 border-zinc-700 text-blue-600 focus:ring-0"
							/>
							<span class="text-xs text-zinc-300">Forward incoming query parameters (?ref=..., ?utm=...)</span>
						</label>
					</div>
				{/if}

				<!-- TAB 4: UTM -->
				{#if activeTab === 'utm'}
					<div class="space-y-3">
						<p class="text-xs text-zinc-400">Append campaign analytics tags automatically when visitors click</p>
						<div class="grid grid-cols-2 gap-3">
							<div>
								<label for="drawerUtmSrc" class="block text-xs text-zinc-400 mb-1">UTM Source</label>
								<input
									id="drawerUtmSrc"
									type="text"
									bind:value={utmSource}
									placeholder="twitter, newsletter, google"
									class="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-750 rounded-lg text-xs text-zinc-200"
								/>
							</div>
							<div>
								<label for="drawerUtmMed" class="block text-xs text-zinc-400 mb-1">UTM Medium</label>
								<input
									id="drawerUtmMed"
									type="text"
									bind:value={utmMedium}
									placeholder="social, email, cpc"
									class="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-750 rounded-lg text-xs text-zinc-200"
								/>
							</div>
						</div>
						<div class="grid grid-cols-3 gap-3">
							<div>
								<label for="drawerUtmCamp" class="block text-xs text-zinc-400 mb-1">UTM Campaign</label>
								<input
									id="drawerUtmCamp"
									type="text"
									bind:value={utmCampaign}
									placeholder="summer_sale"
									class="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-750 rounded-lg text-xs text-zinc-200"
								/>
							</div>
							<div>
								<label for="drawerUtmTerm" class="block text-xs text-zinc-400 mb-1">UTM Term</label>
								<input
									id="drawerUtmTerm"
									type="text"
									bind:value={utmTerm}
									placeholder="shoes"
									class="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-750 rounded-lg text-xs text-zinc-200"
								/>
							</div>
							<div>
								<label for="drawerUtmCont" class="block text-xs text-zinc-400 mb-1">UTM Content</label>
								<input
									id="drawerUtmCont"
									type="text"
									bind:value={utmContent}
									placeholder="banner_v1"
									class="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-750 rounded-lg text-xs text-zinc-200"
								/>
							</div>
						</div>
					</div>
				{/if}

				<!-- TAB 5: SOCIAL / OG -->
				{#if activeTab === 'social'}
					<div class="space-y-4">
						<p class="text-xs text-zinc-400">Preview and customize OpenGraph social card metadata</p>
						<div class="p-3 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2">
							<span class="text-[10px] uppercase font-bold text-zinc-500 tracking-wider font-mono">Live Card Preview</span>
							<div class="border border-zinc-800 rounded-lg overflow-hidden bg-zinc-900/60 p-3">
								<div class="text-xs font-semibold text-zinc-200">{title || 'Your Link Title'}</div>
								<div class="text-[11px] text-zinc-400 mt-0.5 line-clamp-2">{description || 'Your custom link description will be displayed when shared on social networks.'}</div>
								<div class="text-[10px] text-zinc-500 font-mono mt-2 flex items-center gap-1">
									<Globe class="w-3 h-3" />
									{typeof window !== 'undefined' ? window.location.host : 'run.link'}/{slug || 'slug'}
								</div>
							</div>
						</div>
					</div>
				{/if}

				<!-- Drawer Footer -->
				<div class="pt-4 border-t border-zinc-800 flex items-center justify-between">
					<button
						type="button"
						onclick={onClose}
						class="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={isSubmitting}
						class="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
					>
						<Check class="w-4 h-4" />
						{isSubmitting ? 'Saving...' : linkToEdit ? 'Save Changes' : 'Create Link'}
					</button>
				</div>
			</form>
		</motion.div>
	</motion.div>
{/if}
</AnimatePresence>
