<script lang="ts">
  import FieldCheckbox from '$lib/core/ui/FieldCheckbox.svelte';
  import FieldNumber from '$lib/core/ui/FieldNumber.svelte';
  import FieldSelect from '$lib/core/ui/FieldSelect.svelte';
  import FieldText from '$lib/core/ui/FieldText.svelte';
  import Section from '$lib/core/ui/Section.svelte';
  import { SWITCH_ROLES } from '$lib/modules/ip-fabric-switch/model';

  import type { FabricSwitchDraft, FabricSwitchRole } from '$lib/modules/ip-fabric-switch/model';

  interface Props {
    draft: FabricSwitchDraft;
    errors?: Record<string, string>;
    validationKey?: number;
    onchange?: (next: FabricSwitchDraft) => void;
    ontouch?: () => void;
  }

  let { draft, errors = {}, validationKey = 0, onchange, ontouch }: Props = $props();

  function patch(values: Partial<FabricSwitchDraft>): void {
    onchange?.({ ...draft, ...values });
  }

  const roleOptions = SWITCH_ROLES.map((role) => ({ value: role, label: role }));
</script>

<div class="editor">
  <Section
    title="Identity"
    description="The fabric and the switch within it."
    yangPath="ip-fabric:fabric/switch"
  >
    <div class="editor__grid editor__grid--2col">
      <FieldText
        label="Fabric"
        required={true}
        value={draft.fabric}
        error={errors.fabric}
        {validationKey}
        placeholder="e.g., dc1"
        yangType="string (key)"
        mono={true}
        help="The fabric must exist. A new fabric needs at least two switches and one link at once."
        onchange={(value) => patch({ fabric: value })}
        ontouch={() => ontouch?.()}
      />
      <FieldText
        label="Switch name"
        required={true}
        value={draft.name}
        error={errors.name}
        {validationKey}
        placeholder="e.g., leaf1"
        yangType="string (key)"
        mono={true}
        onchange={(value) => patch({ name: value })}
        ontouch={() => ontouch?.()}
      />
      <FieldNumber
        label="Switch id"
        required={true}
        value={draft.id}
        error={errors.id}
        {validationKey}
        min={1}
        max={511}
        yangType="uint16"
        help="Loopback and link addresses and the BGP AS number are derived from it."
        onchange={(value) => patch({ id: value })}
        ontouch={() => ontouch?.()}
      />
      <FieldText
        label="Platform type"
        required={true}
        value={draft.type}
        error={errors.type}
        {validationKey}
        placeholder="NokiaSRLinux_25_3_2"
        yangType="string"
        mono={true}
        onchange={(value) => patch({ type: value })}
        ontouch={() => ontouch?.()}
      />
    </div>
  </Section>

  <Section
    title="Position in the fabric"
    description="The role, and the pod and plane that connect the tiers."
    yangPath="ip-fabric:fabric/switch/*"
  >
    <div class="editor__grid editor__grid--2col">
      <FieldSelect
        label="Role"
        required={true}
        value={draft.role}
        options={roleOptions}
        error={errors.role}
        {validationKey}
        yangType="enumeration"
        onchange={(value) => patch({ role: value as FabricSwitchRole })}
        ontouch={() => ontouch?.()}
      />
      <FieldText
        label="Pod"
        value={draft.pod}
        error={errors.pod}
        {validationKey}
        placeholder="default pod-1"
        yangType="string"
        mono={true}
        help="Not used by a super-spine."
        onchange={(value) => patch({ pod: value })}
        ontouch={() => ontouch?.()}
      />
      <FieldText
        label="Plane"
        value={draft.plane}
        error={errors.plane}
        {validationKey}
        placeholder="default plane-1"
        yangType="string"
        mono={true}
        help="Only for five-stage fabrics. Not used by a leaf."
        onchange={(value) => patch({ plane: value })}
        ontouch={() => ontouch?.()}
      />
      <FieldCheckbox
        label="Mock switch"
        checked={draft.mock}
        help="Do not connect to a device, configure a simulated one."
        onchange={(mock) => patch({ mock })}
      />
    </div>
  </Section>
</div>
