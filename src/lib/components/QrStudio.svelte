<script lang="ts">
	import { onMount } from 'svelte';
	import type QRCodeStyling from 'qr-code-styling';
	import type { DotType, CornerSquareType } from 'qr-code-styling';
	import { Download, Sparkles, Image as ImageIcon, Palette, Globe } from 'lucide-svelte';

	interface QrProps {
		url?: string;
		slug?: string;
	}

	const isBrowser = typeof window !== 'undefined';

	let {
		url = $bindable(isBrowser ? `${window.location.origin}/demo` : 'https://demo'),
		slug = 'demo'
	}: QrProps = $props();

	let containerRef = $state<HTMLDivElement | null>(null);
	let qrCode = $state<QRCodeStyling | null>(null);
	let QRCodeStylingClass = $state<any>(null);

	// Reactive customizer state
	let dotType = $state<DotType>('rounded');
	let cornerType = $state<CornerSquareType>('extra-rounded');
	let dotColor = $state('#3b82f6');
	let bgColor = $state('#ffffff');
	let logoUrl = $state('');

	onMount(async () => {
		const module = await import('qr-code-styling');
		QRCodeStylingClass = module.default;
	});

	// Svelte 5 Reactive Effect: Track all customizer states synchronously
	$effect(() => {
		// Read all reactive signals synchronously so Svelte 5 registers them as dependencies
		const currentUrl = url;
		const currentDotType = dotType;
		const currentCornerType = cornerType;
		const currentDotColor = dotColor;
		const currentBgColor = bgColor;
		const currentLogoUrl = logoUrl;
		const LibClass = QRCodeStylingClass;
		const container = containerRef;

		if (!isBrowser || !LibClass || !container) return;

		try {
			const instance = new LibClass({
				width: 260,
				height: 260,
				type: 'svg',
				data: currentUrl,
				dotsOptions: {
					color: currentDotColor,
					type: currentDotType
				},
				cornersSquareOptions: {
					color: currentDotColor,
					type: currentCornerType
				},
				cornersDotOptions: {
					color: currentDotColor
				},
				backgroundOptions: {
					color: currentBgColor
				},
				image: currentLogoUrl || undefined,
				imageOptions: {
					crossOrigin: 'anonymous',
					margin: 6,
					imageSize: 0.28
				}
			});

			qrCode = instance;
			container.innerHTML = '';
			instance.append(container);
		} catch (err) {
			console.error('Failed to update QR code styling:', err);
		}
	});

	function applyPreset(presetDotColor: string, presetBgColor: string, presetDot: DotType, presetCorner: CornerSquareType) {
		dotColor = presetDotColor;
		bgColor = presetBgColor;
		dotType = presetDot;
		cornerType = presetCorner;
	}

	function download(format: 'png' | 'svg') {
		if (qrCode) {
			qrCode.download({
				name: `run-qr-${slug}`,
				extension: format
			});
		}
	}
</script>

<div class="grid grid-cols-1 md:grid-cols-2 gap-6 bg-zinc-900 border border-zinc-800 rounded-xl p-6">
	<!-- Left: Live Preview Canvas -->
	<div class="flex flex-col items-center justify-center p-6 bg-zinc-950 border border-zinc-800/80 rounded-lg">
		<div
			bind:this={containerRef}
			class="p-4 rounded-xl shadow-lg border border-zinc-800 flex items-center justify-center transition-all duration-200"
			style="background-color: {bgColor};"
		></div>

		<div class="mt-6 flex gap-3">
			<button
				type="button"
				onclick={() => download('png')}
				class="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm cursor-pointer"
			>
				<Download class="w-3.5 h-3.5" />
				Download PNG
			</button>
			<button
				type="button"
				onclick={() => download('svg')}
				class="flex items-center gap-1.5 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-lg transition-colors border border-zinc-700 cursor-pointer"
			>
				<Download class="w-3.5 h-3.5" />
				Download SVG
			</button>
		</div>
	</div>

	<!-- Right: Customizer Controls -->
	<div class="space-y-4">
		<div class="flex items-center justify-between pb-2 border-b border-zinc-800">
			<h3 class="text-xs font-bold text-zinc-200 uppercase tracking-wider font-mono flex items-center gap-2">
				<Sparkles class="w-4 h-4 text-blue-400" />
				QR Studio Customization
			</h3>
		</div>

		<!-- QR Target URL Input -->
		<div>
			<label for="qrUrlInput" class="block text-xs font-medium text-zinc-400 mb-1.5 flex items-center gap-1.5">
				<Globe class="w-3.5 h-3.5 text-blue-400" />
				QR Target / Destination URL
			</label>
			<input
				id="qrUrlInput"
				type="url"
				bind:value={url}
				placeholder="https://yourlink.com"
				class="w-full px-3 py-2 bg-zinc-950 border border-zinc-750 rounded-lg text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500 font-mono tracking-tight"
			/>
		</div>

		<!-- Quick Presets -->
		<div>
			<span class="block text-xs font-medium text-zinc-400 mb-1.5 flex items-center gap-1">
				<Palette class="w-3 h-3 text-zinc-400" />
				Style Presets
			</span>
			<div class="flex flex-wrap gap-1.5">
				<button
					type="button"
					onclick={() => applyPreset('#3b82f6', '#ffffff', 'rounded', 'extra-rounded')}
					class="px-2 py-1 text-[11px] rounded bg-blue-950/40 border border-blue-500/30 text-blue-300 hover:bg-blue-900/50 transition cursor-pointer"
				>
					Electric Blue
				</button>
				<button
					type="button"
					onclick={() => applyPreset('#10b981', '#09090b', 'dots', 'dot')}
					class="px-2 py-1 text-[11px] rounded bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/50 transition cursor-pointer"
				>
					Cyber Emerald
				</button>
				<button
					type="button"
					onclick={() => applyPreset('#8b5cf6', '#ffffff', 'classy-rounded', 'extra-rounded')}
					class="px-2 py-1 text-[11px] rounded bg-purple-950/40 border border-purple-500/30 text-purple-300 hover:bg-purple-900/50 transition cursor-pointer"
				>
					Vibrant Purple
				</button>
				<button
					type="button"
					onclick={() => applyPreset('#000000', '#ffffff', 'square', 'square')}
					class="px-2 py-1 text-[11px] rounded bg-zinc-800 border border-zinc-700 text-zinc-200 hover:bg-zinc-700 transition cursor-pointer"
				>
					Classic Mono
				</button>
			</div>
		</div>

		<!-- Dot Pattern -->
		<div>
			<span class="block text-xs font-medium text-zinc-400 mb-1.5">Dot Pattern</span>
			<div class="grid grid-cols-3 gap-2">
				{#each ['rounded', 'dots', 'classy', 'classy-rounded', 'square', 'extra-rounded'] as style}
					<button
						type="button"
						onclick={() => (dotType = style as DotType)}
						class="px-2.5 py-1.5 text-xs font-medium rounded border transition-colors capitalize cursor-pointer {dotType === style ? 'bg-blue-600/20 text-blue-400 border-blue-500 font-semibold' : 'bg-zinc-800/80 text-zinc-300 border-zinc-700 hover:border-zinc-600'}"
					>
						{style.replace('-', ' ')}
					</button>
				{/each}
			</div>
		</div>

		<!-- Corner Style -->
		<div>
			<span class="block text-xs font-medium text-zinc-400 mb-1.5">Corner Squares</span>
			<div class="grid grid-cols-3 gap-2">
				{#each ['extra-rounded', 'dot', 'square'] as style}
					<button
						type="button"
						onclick={() => (cornerType = style as CornerSquareType)}
						class="px-2.5 py-1.5 text-xs font-medium rounded border transition-colors capitalize cursor-pointer {cornerType === style ? 'bg-blue-600/20 text-blue-400 border-blue-500 font-semibold' : 'bg-zinc-800/80 text-zinc-300 border-zinc-700 hover:border-zinc-600'}"
					>
						{style.replace('-', ' ')}
					</button>
				{/each}
			</div>
		</div>

		<!-- Colors -->
		<div class="grid grid-cols-2 gap-4">
			<div>
				<label for="dotColorInput" class="block text-xs font-medium text-zinc-400 mb-1.5">Foreground Color</label>
				<div class="flex items-center gap-2">
					<input
						id="dotColorInput"
						type="color"
						bind:value={dotColor}
						class="w-8 h-8 rounded border border-zinc-700 bg-transparent cursor-pointer p-0 shrink-0"
					/>
					<input
						type="text"
						bind:value={dotColor}
						class="w-full px-2.5 py-1 bg-zinc-800 border border-zinc-700 rounded text-xs text-zinc-200 font-mono"
					/>
				</div>
			</div>
			<div>
				<label for="bgColorInput" class="block text-xs font-medium text-zinc-400 mb-1.5">Background Color</label>
				<div class="flex items-center gap-2">
					<input
						id="bgColorInput"
						type="color"
						bind:value={bgColor}
						class="w-8 h-8 rounded border border-zinc-700 bg-transparent cursor-pointer p-0 shrink-0"
					/>
					<input
						type="text"
						bind:value={bgColor}
						class="w-full px-2.5 py-1 bg-zinc-800 border border-zinc-700 rounded text-xs text-zinc-200 font-mono"
					/>
				</div>
			</div>
		</div>

		<!-- Center Logo URL -->
		<div>
			<label for="logoUrlInput" class="block text-xs font-medium text-zinc-400 mb-1.5 flex items-center gap-1.5">
				<ImageIcon class="w-3.5 h-3.5 text-zinc-400" />
				Embedded Center Logo (URL)
			</label>
			<input
				id="logoUrlInput"
				type="url"
				bind:value={logoUrl}
				placeholder="https://example.com/logo.png"
				class="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
			/>
		</div>
	</div>
</div>
