<script lang="ts">
	import type QRCodeStyling from 'qr-code-styling';
	import type { DotType, CornerSquareType } from 'qr-code-styling';
	import { Download, Sparkles, Image as ImageIcon } from 'lucide-svelte';

	interface QrProps {
		url?: string;
		slug?: string;
	}

	const isBrowser = typeof window !== 'undefined';

	let {
		url = 'https://run.link/demo',
		slug = 'demo'
	}: QrProps = $props();

	let containerRef = $state<HTMLDivElement | null>(null);
	let qrCode = $state<QRCodeStyling | null>(null);

	// Reactive customizer state
	let dotType = $state<DotType>('rounded');
	let cornerType = $state<CornerSquareType>('extra-rounded');
	let dotColor = $state('#3b82f6');
	let bgColor = $state('#ffffff');
	let logoUrl = $state('');

	$effect(() => {
		if (!isBrowser || !containerRef) return;

		import('qr-code-styling').then(({ default: QRCodeStylingClass }) => {
			if (!qrCode) {
				const instance = new QRCodeStylingClass({
					width: 260,
					height: 260,
					data: url,
					dotsOptions: {
						color: dotColor,
						type: dotType
					},
					cornersSquareOptions: {
						color: dotColor,
						type: cornerType
					},
					backgroundOptions: {
						color: bgColor
					},
					imageOptions: {
						crossOrigin: 'anonymous',
						margin: 6,
						imageSize: 0.28
					}
				});
				qrCode = instance;
				if (containerRef) {
					containerRef.innerHTML = '';
					instance.append(containerRef);
				}
			} else {
				qrCode.update({
					data: url,
					dotsOptions: {
						color: dotColor,
						type: dotType
					},
					cornersSquareOptions: {
						color: dotColor,
						type: cornerType
					},
					backgroundOptions: {
						color: bgColor
					},
					image: logoUrl || undefined
				});
			}
		});
	});

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
				onclick={() => download('png')}
				class="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
			>
				<Download class="w-4 h-4" />
				Download PNG
			</button>
			<button
				onclick={() => download('svg')}
				class="flex items-center gap-1.5 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-medium rounded-lg transition-colors border border-zinc-700"
			>
				<Download class="w-4 h-4" />
				Download SVG
			</button>
		</div>
	</div>

	<!-- Right: Customizer Controls -->
	<div class="space-y-4">
		<h3 class="text-base font-semibold text-zinc-100 flex items-center gap-2">
			<Sparkles class="w-4 h-4 text-blue-400" />
			QR Studio Customization
		</h3>

		<!-- Dot Pattern -->
		<div>
			<span class="block text-xs font-medium text-zinc-400 mb-1.5">Dot Pattern</span>
			<div class="grid grid-cols-3 gap-2">
				{#each ['rounded', 'dots', 'classy', 'classy-rounded', 'square', 'extra-rounded'] as style}
					<button
						type="button"
						onclick={() => (dotType = style as DotType)}
						class="px-2.5 py-1.5 text-xs font-medium rounded border transition-colors capitalize {dotType === style ? 'bg-blue-600/20 text-blue-400 border-blue-500' : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:border-zinc-600'}"
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
						class="px-2.5 py-1.5 text-xs font-medium rounded border transition-colors capitalize {cornerType === style ? 'bg-blue-600/20 text-blue-400 border-blue-500' : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:border-zinc-600'}"
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
						class="w-8 h-8 rounded border border-zinc-700 bg-transparent cursor-pointer p-0"
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
						class="w-8 h-8 rounded border border-zinc-700 bg-transparent cursor-pointer p-0"
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
