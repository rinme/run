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

	interface ModalProps {
		isOpen?: boolean;
		onClose?: () => void;
		onCreated?: (link: any) => void;
	}

	let {
		isOpen = false,
		onClose = () => {},
		onCreated = () => {}
	}: ModalProps = $props();

	type TabType = 'general' | 'routing' | 'security' | 'utm' | 'social';
	let activeTab = $state<TabType>('general');

	// Form fields (Svelte 5 runes)
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

	// AI generation state
	let isAiLoading = $state(false);
	let aiSuggestions = $state<{ slugs: string[]; summary: string; tags: string[] } | null>(null);

	// Error / Submitting state
	let errorMessage = $state('');
	let isSubmitting = $state(false);

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

		// Format dynamic routing
		const deviceRouting = (iosUrl || androidUrl) ? { ios: iosUrl || undefined, android: androidUrl || undefined } : undefined;
		const geoMap: Record<string, string> = {};
		geoRules.forEach((r) => {
			if (r.country && r.url) geoMap[r.country.toUpperCase()] = r.url;
		});

		// Format UTMs
		const utmPreset = (utmSource || utmMedium || utmCampaign) ? {
			source: utmSource || undefined,
			medium: utmMedium || undefined,
			campaign: utmCampaign || undefined,
			term: utmTerm || undefined,
			content: utmContent || undefined
		} : undefined;

		try {
			const payload = {
				destinationUrl,
				slug: slug || undefined,
				title: title || undefined,
				description: description || undefined,
				deliveryMode,
				password: deliveryMode === 'password' ? password : undefined,
				interstitialDuration: deliveryMode === 'interstitial' ? interstitialDuration : undefined,
				expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
				maxClicks: maxClicks ? Number(maxClicks) : undefined,
				expiredRedirectUrl: expiredRedirectUrl || undefined,
				redirectWithQuery,
				deviceRouting,
				geoRouting: Object.keys(geoMap).length > 0 ? geoMap : undefined,
				abSplits: abSplits.length > 0 ? abSplits : undefined,
				utmPreset
			};

			const res = await fetch('/api/links', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});

			if (!res.ok) {
				const err = await res.json();
				errorMessage = err.error || 'Failed to create link';
				return;
			}

			const createdLink = await res.json();
			onCreated(createdLink);
			onClose();
		} catch {
			errorMessage = 'Network error while creating link';
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
			class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
		>
			<motion.div
				initial={{ opacity: 0, scale: 0.95, y: -10 }}
				animate={{ opacity: 1, scale: 1, y: 0 }}
				exit={{ opacity: 0, scale: 0.95, y: -10 }}
				transition={crispSpring}
				class="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
			>
			<!-- Header -->
			<div class="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
				<div>
					<h2 class="text-lg font-semibold text-zinc-100">Create Short Link</h2>
					<p class="text-xs text-zinc-400">Configure destination, routing rules, and security gates</p>
				</div>
				<button
					type="button"
					onclick={() => onClose()}
					class="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
				>
					<X class="w-5 h-5" />
				</button>
			</div>

			<!-- Navigation Tabs -->
			<div class="flex border-b border-zinc-800 bg-zinc-950/40 px-6 gap-2">
				{#each [
					{ id: 'general', label: 'General', icon: Layers },
					{ id: 'routing', label: 'Routing', icon: Smartphone },
					{ id: 'security', label: 'Security & Limits', icon: ShieldCheck },
					{ id: 'utm', label: 'UTM Presets', icon: Globe },
					{ id: 'social', label: 'Social & OG', icon: Share2 }
				] as tab}
					<button
						type="button"
						onclick={() => (activeTab = tab.id as TabType)}
						class="flex items-center gap-1.5 py-3 px-3 text-xs font-medium border-b-2 transition-colors {activeTab === tab.id ? 'border-blue-500 text-blue-400 font-semibold' : 'border-transparent text-zinc-400 hover:text-zinc-200'}"
					>
						<tab.icon class="w-3.5 h-3.5" />
						{tab.label}
					</button>
				{/each}
			</div>

			<!-- Tab Content Form -->
			<form onsubmit={handleSubmit} class="flex-1 overflow-y-auto p-6 space-y-4">
				{#if errorMessage}
					<div class="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg">
						<AlertCircle class="w-4 h-4 shrink-0" />
						{errorMessage}
					</div>
				{/if}

				<!-- TAB 1: GENERAL -->
				{#if activeTab === 'general'}
					<div class="space-y-4">
						<div>
							<div class="flex items-center justify-between mb-1.5">
								<label for="destUrlInput" class="block text-xs font-medium text-zinc-300">Destination URL *</label>
								<button
									type="button"
									onclick={requestAiSuggestions}
									disabled={isAiLoading || !destinationUrl}
									class="flex items-center gap-1 text-[11px] font-medium text-blue-400 hover:text-blue-300 disabled:opacity-40 transition-colors"
								>
									<Sparkles class="w-3 h-3 {isAiLoading ? 'animate-spin' : ''}" />
									{isAiLoading ? 'AI Analyzing...' : 'Auto-Fill with AI'}
								</button>
							</div>
							<input
								id="destUrlInput"
								type="url"
								bind:value={destinationUrl}
								required
								placeholder="https://example.com/my-long-landing-page"
								class="w-full px-3 py-2 bg-zinc-800/80 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
							/>
						</div>

						<!-- AI Suggestions Pill Row -->
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
											class="px-2.5 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-md font-mono"
										>
											{s}
										</button>
									{/each}
								</div>
							</div>
						{/if}

						<div class="grid grid-cols-2 gap-4">
							<div>
								<label for="slugInput" class="block text-xs font-medium text-zinc-300 mb-1.5">Custom Slug (Optional)</label>
								<div class="flex items-center">
									<span class="px-2.5 py-2 bg-zinc-800 text-zinc-500 border border-r-0 border-zinc-700 rounded-l-lg text-xs font-mono">
										/
									</span>
									<input
										id="slugInput"
										type="text"
										bind:value={slug}
										placeholder="summer-sale"
										class="w-full px-3 py-2 bg-zinc-800/80 border border-zinc-700 rounded-r-lg text-sm text-zinc-100 placeholder-zinc-500 font-mono focus:outline-none focus:border-blue-500"
									/>
								</div>
							</div>

							<div>
								<label for="titleInput" class="block text-xs font-medium text-zinc-300 mb-1.5">Link Title</label>
								<input
									id="titleInput"
									type="text"
									bind:value={title}
									placeholder="Summer Launch Campaign"
									class="w-full px-3 py-2 bg-zinc-800/80 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
								/>
							</div>
						</div>
					</div>
				{/if}

				<!-- TAB 2: ROUTING -->
				{#if activeTab === 'routing'}
					<div class="space-y-5">
						<div class="space-y-3">
							<h4 class="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Device Redirection</h4>
							<div class="grid grid-cols-2 gap-4">
								<div>
									<label for="iosUrlInput" class="block text-xs text-zinc-400 mb-1">iOS Target (Apple App Store)</label>
									<input
										id="iosUrlInput"
										type="url"
										bind:value={iosUrl}
										placeholder="https://apps.apple.com/..."
										class="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-200"
									/>
								</div>
								<div>
									<label for="androidUrlInput" class="block text-xs text-zinc-400 mb-1">Android Target (Google Play)</label>
									<input
										id="androidUrlInput"
										type="url"
										bind:value={androidUrl}
										placeholder="https://play.google.com/..."
										class="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-200"
									/>
								</div>
							</div>
						</div>

						<!-- Geo-Targeting -->
						<div class="space-y-2 pt-2 border-t border-zinc-800">
							<div class="flex items-center justify-between">
								<h4 class="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Geo-Targeted Routing</h4>
								<button
									type="button"
									onclick={addGeoRule}
									class="text-xs font-medium text-blue-400 hover:text-blue-300 flex items-center gap-1"
								>
									<Plus class="w-3.5 h-3.5" />
									Add Country Rule
								</button>
							</div>

							{#each geoRules as rule, i}
								<div class="flex gap-2 items-center">
									<input
										type="text"
										bind:value={rule.country}
										placeholder="US, DE, GB"
										maxlength="2"
										class="w-20 px-2.5 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-xs uppercase font-mono text-zinc-200 text-center"
									/>
									<input
										type="url"
										bind:value={rule.url}
										placeholder="https://us.store.com"
										class="flex-1 px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-200"
									/>
									<button
										type="button"
										onclick={() => removeGeoRule(i)}
										class="p-1.5 text-zinc-500 hover:text-red-400"
									>
										<Trash2 class="w-4 h-4" />
									</button>
								</div>
							{/each}
						</div>

						<!-- A/B Split Testing -->
						<div class="space-y-2 pt-2 border-t border-zinc-800">
							<div class="flex items-center justify-between">
								<h4 class="text-xs font-semibold text-zinc-300 uppercase tracking-wider">A/B Split Testing</h4>
								<button
									type="button"
									onclick={addAbSplit}
									class="text-xs font-medium text-blue-400 hover:text-blue-300 flex items-center gap-1"
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
										class="flex-1 px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-200"
									/>
									<div class="flex items-center gap-1 w-24">
										<input
											type="number"
											bind:value={split.weight}
											min="1"
											max="100"
											class="w-16 px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-center text-zinc-200 font-mono"
										/>
										<span class="text-xs text-zinc-500">%</span>
									</div>
									<button
										type="button"
										onclick={() => removeAbSplit(i)}
										class="p-1.5 text-zinc-500 hover:text-red-400"
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
							<label for="deliveryModeSelect" class="block text-xs font-medium text-zinc-300 mb-1.5">Delivery Mode</label>
							<select
								id="deliveryModeSelect"
								bind:value={deliveryMode}
								class="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-blue-500"
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
								<label for="pwdInput" class="block text-xs font-medium text-zinc-300 mb-1.5">Access Password</label>
								<input
									id="pwdInput"
									type="password"
									bind:value={password}
									placeholder="Set a secret passcode..."
									class="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-200"
								/>
							</div>
						{/if}

						{#if deliveryMode === 'interstitial'}
							<div>
								<label for="durationInput" class="block text-xs font-medium text-zinc-300 mb-1.5">Countdown Seconds</label>
								<input
									id="durationInput"
									type="number"
									bind:value={interstitialDuration}
									min="1"
									max="60"
									class="w-32 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-200"
								/>
							</div>
						{/if}

						<div class="pt-2 border-t border-zinc-800 grid grid-cols-2 gap-4">
							<div>
								<label for="expiresAtInput" class="block text-xs font-medium text-zinc-300 mb-1.5">Expiration Date</label>
								<input
									id="expiresAtInput"
									type="datetime-local"
									bind:value={expiresAt}
									class="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-200"
								/>
							</div>
							<div>
								<label for="maxClicksInput" class="block text-xs font-medium text-zinc-300 mb-1.5">Max Click Limit</label>
								<input
									id="maxClicksInput"
									type="number"
									bind:value={maxClicks}
									min="1"
									placeholder="e.g. 500"
									class="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-200"
								/>
							</div>
						</div>

						<div>
							<label for="fallbackInput" class="block text-xs font-medium text-zinc-300 mb-1.5">Expired Fallback Redirect URL</label>
							<input
								id="fallbackInput"
								type="url"
								bind:value={expiredRedirectUrl}
								placeholder="https://example.com/expired-page"
								class="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-200"
							/>
						</div>

						<label class="flex items-center gap-2 pt-2 cursor-pointer">
							<input
								type="checkbox"
								bind:checked={redirectWithQuery}
								class="rounded bg-zinc-800 border-zinc-700 text-blue-600 focus:ring-0"
							/>
							<span class="text-xs text-zinc-300">Forward incoming query parameters (?ref=..., ?utm=...)</span>
						</label>
					</div>
				{/if}

				<!-- TAB 4: UTM PRESETS -->
				{#if activeTab === 'utm'}
					<div class="space-y-3">
						<p class="text-xs text-zinc-400">Append campaign analytics tags automatically when visitors click</p>
						<div class="grid grid-cols-2 gap-3">
							<div>
								<label for="utmSourceInput" class="block text-xs text-zinc-400 mb-1">UTM Source</label>
								<input
									id="utmSourceInput"
									type="text"
									bind:value={utmSource}
									placeholder="twitter, newsletter, google"
									class="w-full px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-200"
								/>
							</div>
							<div>
								<label for="utmMediumInput" class="block text-xs text-zinc-400 mb-1">UTM Medium</label>
								<input
									id="utmMediumInput"
									type="text"
									bind:value={utmMedium}
									placeholder="social, email, cpc"
									class="w-full px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-200"
								/>
							</div>
						</div>
						<div class="grid grid-cols-3 gap-3">
							<div>
								<label for="utmCampaignInput" class="block text-xs text-zinc-400 mb-1">UTM Campaign</label>
								<input
									id="utmCampaignInput"
									type="text"
									bind:value={utmCampaign}
									placeholder="summer_sale"
									class="w-full px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-200"
								/>
							</div>
							<div>
								<label for="utmTermInput" class="block text-xs text-zinc-400 mb-1">UTM Term</label>
								<input
									id="utmTermInput"
									type="text"
									bind:value={utmTerm}
									placeholder="shoes"
									class="w-full px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-200"
								/>
							</div>
							<div>
								<label for="utmContentInput" class="block text-xs text-zinc-400 mb-1">UTM Content</label>
								<input
									id="utmContentInput"
									type="text"
									bind:value={utmContent}
									placeholder="banner_v1"
									class="w-full px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-200"
								/>
							</div>
						</div>
					</div>
				{/if}

				<!-- TAB 5: SOCIAL / OG -->
				{#if activeTab === 'social'}
					<div class="space-y-4">
						<p class="text-xs text-zinc-400">Override OpenGraph social cards displayed on Twitter/X, Discord, and Slack</p>
						<div>
							<label for="ogDescInput" class="block text-xs text-zinc-400 mb-1">OG Description</label>
							<textarea
								id="ogDescInput"
								bind:value={description}
								rows="3"
								placeholder="Check out this exclusive launch deal..."
								class="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-200"
							></textarea>
						</div>

						<!-- Social Preview Mockup -->
						<div class="p-3 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2">
							<span class="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Social Preview Card</span>
							<div class="border border-zinc-800 rounded-lg overflow-hidden bg-zinc-900/60 p-3">
								<div class="text-xs font-semibold text-zinc-200">{title || 'Your Link Title'}</div>
								<div class="text-[11px] text-zinc-400 mt-0.5 line-clamp-2">{description || 'Your custom link description will be displayed when shared on social platforms.'}</div>
								<div class="text-[10px] text-zinc-500 font-mono mt-2 flex items-center gap-1">
									<Globe class="w-3 h-3" />
									{typeof window !== 'undefined' ? window.location.host : 'run.link'}/{slug || 'slug'}
								</div>
							</div>
						</div>
					</div>
				{/if}

				<!-- Footer Buttons -->
				<div class="pt-4 border-t border-zinc-800 flex items-center justify-between">
					<button
						type="button"
						onclick={() => onClose()}
						class="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={isSubmitting}
						class="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
					>
						<Check class="w-4 h-4" />
						{isSubmitting ? 'Creating...' : 'Create Link'}
					</button>
				</div>
			</form>
		</motion.div>
	</motion.div>
{/if}
</AnimatePresence>
