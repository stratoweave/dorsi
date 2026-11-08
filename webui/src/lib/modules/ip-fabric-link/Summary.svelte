<script lang="ts">
  import { formatFabricLinkEndpoints } from '$lib/modules/ip-fabric-link/model';

  import type { FabricLinkDraft } from '$lib/modules/ip-fabric-link/model';

  let { draft }: { draft: FabricLinkDraft } = $props();
</script>

<div class="summary">
  <span class="summary__pill">{draft.fabric || 'no fabric'}</span>
  <span class="summary__pill">{formatFabricLinkEndpoints(draft)}</span>
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
