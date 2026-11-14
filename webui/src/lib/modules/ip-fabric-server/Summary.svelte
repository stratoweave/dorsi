<script lang="ts">
  import type { FabricServerDraft } from '$lib/modules/ip-fabric-server/model';

  let { draft }: { draft: FabricServerDraft } = $props();
  let leaves = $derived(Array.from(new Set(draft.links.map((link) => link.switch).filter(Boolean))));
</script>

<div class="summary">
  <span class="summary__pill">{draft.fabric || 'no fabric'}</span>
  <span class="summary__pill">{draft.profile}</span>
  {#if leaves.length > 0}<span class="summary__pill">{leaves.join(', ')}</span>{/if}
</div>

<style>
  .summary {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .summary__pill {
    display: inline-flex;
    align-items: center;
    padding: 3px 10px;
    border-radius: 20px;
    background: var(--sw-bg-elevated);
    color: var(--sw-text-secondary);
    font-size: 11px;
    font-weight: 500;
  }
</style>
