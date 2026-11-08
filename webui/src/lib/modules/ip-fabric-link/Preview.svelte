<script lang="ts">
  import { encodeListKey } from '$lib/core/restconf/client';

  import type { FabricLinkDraft } from '$lib/modules/ip-fabric-link/model';

  let { draft, payload }: { draft: FabricLinkDraft; payload: unknown } = $props();

  let fabricKey = $derived(encodeListKey(draft.fabric || '<fabric>'));
  let linkKey = $derived(
    encodeListKey([
      draft.lowerSwitch || '<lower-switch>',
      draft.lowerPort || '<lower-port>',
      draft.upperSwitch || '<upper-switch>',
      draft.upperPort || '<upper-port>'
    ])
  );
</script>

<div class="preview">
  <dl class="preview__meta">
    <div class="preview__meta-item">
      <dt>RESTCONF path</dt>
      <dd><code>/restconf/data/ip-fabric:ip-fabric/fabric={fabricKey}/fabric-link={linkKey}</code></dd>
    </div>
  </dl>
  <pre>{JSON.stringify(payload, null, 2)}</pre>
</div>

<style>
  .preview {
    display: grid;
    gap: 16px;
  }

  .preview__meta {
    display: grid;
    gap: 12px;
    margin: 0;
  }

  .preview__meta-item {
    display: grid;
    gap: 2px;
  }

  .preview__meta dt {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--sw-text-muted);
  }

  .preview__meta dd {
    margin: 0;
    font-size: 13px;
    color: var(--sw-text-secondary);
  }
</style>
