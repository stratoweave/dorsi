<script lang="ts">
  import { onMount } from 'svelte';

  import { restconfGetJson } from '$lib/core/restconf/client';
  import FieldSelect from '$lib/core/ui/FieldSelect.svelte';
  import FieldText from '$lib/core/ui/FieldText.svelte';
  import Section from '$lib/core/ui/Section.svelte';
  import { onGlobalRefresh } from '$lib/core/util/global-refresh';
  import { FABRIC_COLLECTION_ROOT, fabricChildren } from '$lib/modules/ip-fabric/common';
  import { stringAt } from '$lib/core/util/json';

  import type { FabricLinkDraft } from '$lib/modules/ip-fabric-link/model';

  interface Props {
    draft: FabricLinkDraft;
    errors?: Record<string, string>;
    validationKey?: number;
    onchange?: (next: FabricLinkDraft) => void;
    ontouch?: () => void;
  }

  let { draft, errors = {}, validationKey = 0, onchange, ontouch }: Props = $props();

  interface SwitchInfo {
    fabric: string;
    name: string;
    role: string;
  }

  let switches = $state<SwitchInfo[]>([]);
  let loadError = $state('');

  function patch(values: Partial<FabricLinkDraft>): void {
    onchange?.({ ...draft, ...values });
  }

  async function loadSwitches(): Promise<void> {
    try {
      loadError = '';
      const payload = await restconfGetJson(FABRIC_COLLECTION_ROOT);
      switches = fabricChildren(payload, 'switch').map(({ fabric, entry }) => ({
        fabric,
        name: stringAt(entry, 'name'),
        role: stringAt(entry, 'role')
      }));
    } catch (error) {
      switches = [];
      loadError = error instanceof Error ? error.message : 'Failed to load the switches.';
    }
  }

  function switchOptions(current: string, roles: string[]): { value: string; label: string }[] {
    const options = new Map<string, string>();

    for (const item of switches) {
      if (item.fabric === draft.fabric.trim() && roles.includes(item.role)) {
        options.set(item.name, `${item.name} (${item.role})`);
      }
    }

    if (current.trim() && !options.has(current.trim())) {
      options.set(current.trim(), `${current.trim()} (not a suitable switch)`);
    }

    return [
      { value: '', label: options.size > 0 ? 'Select switch' : 'No switches in this fabric' },
      ...Array.from(options.entries())
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([value, label]) => ({ value, label }))
    ];
  }

  // A link joins a leaf to a spine, or a spine to a super-spine
  let lowerOptions = $derived(switchOptions(draft.lowerSwitch, ['leaf', 'spine']));
  let upperOptions = $derived(switchOptions(draft.upperSwitch, ['spine', 'super-spine']));
  let switchHelp = $derived(
    loadError
      ? `Switch list unavailable: ${loadError}`
      : 'Options are the switches of the fabric. The tiers must be adjacent and in the same pod or plane.'
  );

  onMount(() => {
    loadSwitches();
    return onGlobalRefresh(() => loadSwitches());
  });
</script>

<div class="editor">
  <Section
    title="Fabric"
    description="The fabric the link belongs to."
    yangPath="ip-fabric:fabric/fabric-link"
  >
    <div class="editor__grid">
      <FieldText
        label="Fabric"
        required={true}
        value={draft.fabric}
        error={errors.fabric}
        {validationKey}
        placeholder="e.g., dc1"
        yangType="string (key)"
        mono={true}
        onchange={(value) => patch({ fabric: value })}
        ontouch={() => ontouch?.()}
      />
    </div>
  </Section>

  <Section
    title="Endpoints"
    description="The lower tier switch and port, and the upper tier switch and port."
    yangPath="ip-fabric:fabric/fabric-link"
  >
    <div class="editor__grid editor__grid--2col">
      <FieldSelect
        label="Lower switch"
        required={true}
        value={draft.lowerSwitch}
        options={lowerOptions}
        error={errors.lowerSwitch}
        help={switchHelp}
        {validationKey}
        yangType="leafref (key)"
        onchange={(value) => patch({ lowerSwitch: value })}
        ontouch={() => ontouch?.()}
      />
      <FieldText
        label="Lower port"
        required={true}
        value={draft.lowerPort}
        error={errors.lowerPort}
        {validationKey}
        placeholder="e.g., ethernet-1/49"
        yangType="string (key)"
        mono={true}
        onchange={(value) => patch({ lowerPort: value })}
        ontouch={() => ontouch?.()}
      />
      <FieldSelect
        label="Upper switch"
        required={true}
        value={draft.upperSwitch}
        options={upperOptions}
        error={errors.upperSwitch}
        help={switchHelp}
        {validationKey}
        yangType="leafref (key)"
        onchange={(value) => patch({ upperSwitch: value })}
        ontouch={() => ontouch?.()}
      />
      <FieldText
        label="Upper port"
        required={true}
        value={draft.upperPort}
        error={errors.upperPort}
        {validationKey}
        placeholder="e.g., ethernet-1/1"
        yangType="string (key)"
        mono={true}
        onchange={(value) => patch({ upperPort: value })}
        ontouch={() => ontouch?.()}
      />
    </div>
  </Section>
</div>
