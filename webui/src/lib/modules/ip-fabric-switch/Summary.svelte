<script lang="ts">
  import type { FabricSwitchDraft } from '$lib/modules/ip-fabric-switch/model';

  let { draft }: { draft: FabricSwitchDraft } = $props();
</script>

<div class="summary">
  <span class="summary__pill">{draft.fabric || 'no fabric'}</span>
  <span class="summary__pill">{draft.role}</span>
  {#if draft.id !== null}<span class="summary__pill">id {draft.id}</span>{/if}
  {#if draft.mock}<span class="summary__pill">mock</span>{/if}
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
