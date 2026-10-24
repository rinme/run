<script lang="ts">
	import { motionSettings } from '#lib/client/motion.svelte.ts';

	interface SkeletonProps {
		class?: string;
		rounded?: string;
	}

	let { class: className = '', rounded = 'rounded-md' }: SkeletonProps = $props();

	const isReduced = $derived(motionSettings.mode === 'always');
</script>

<div
	class="{rounded} bg-zinc-800/60 {isReduced ? '' : 'animate-pulse'} {className}"
	aria-hidden="true"
></div>
