<script lang="ts">
	import Skeleton from './Skeleton.svelte';

	interface LinkSkeletonProps {
		rows?: number;
		showKpi?: boolean;
	}

	let { rows = 5, showKpi = false }: LinkSkeletonProps = $props();
</script>

{#if showKpi}
	<div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
		{#each Array(4) as _}
			<div class="bg-[#101013] border border-zinc-800/80 rounded-xl p-4 space-y-2.5">
				<Skeleton class="h-3 w-20" />
				<Skeleton class="h-7 w-16" />
				<Skeleton class="h-2.5 w-28" />
			</div>
		{/each}
	</div>
{/if}

<div class="bg-[#101013] border border-zinc-800/90 rounded-xl overflow-hidden divide-y divide-zinc-800/80 shadow-xs">
	{#each Array(rows) as _}
		<div class="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
			<!-- Left Details -->
			<div class="space-y-2 min-w-0 flex-1">
				<div class="flex items-center gap-2">
					<Skeleton class="h-5 w-24 rounded-md" />
					<Skeleton class="h-4 w-16 rounded-full" />
					<Skeleton class="h-4 w-20 rounded-full" />
				</div>
				<Skeleton class="h-3.5 w-3/4 max-w-md rounded" />
				<Skeleton class="h-3 w-40 rounded" />
			</div>

			<!-- Right Actions -->
			<div class="flex items-center gap-2">
				<Skeleton class="h-7 w-16 rounded-lg" />
				<Skeleton class="h-7 w-7 rounded-lg" />
				<Skeleton class="h-7 w-7 rounded-lg" />
				<Skeleton class="h-7 w-7 rounded-lg" />
			</div>
		</div>
	{/each}
</div>
