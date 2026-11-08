<script lang="ts">
  import { onMount } from 'svelte';

  import { restconfGetJson } from '$lib/core/restconf/client';
  import FieldSelect from '$lib/core/ui/FieldSelect.svelte';
  import FieldText from '$lib/core/ui/FieldText.svelte';
  import ListEditor from '$lib/core/ui/ListEditor.svelte';
  import Section from '$lib/core/ui/Section.svelte';
  import { onGlobalRefresh } from '$lib/core/util/global-refresh';
  import { stringAt } from '$lib/core/util/json';
  import { FABRIC_COLLECTION_ROOT, fabricChildren } from '$lib/modules/ip-fabric/common';
  import {
    SERVER_PROFILES,
    createFabricServerLink
  } from '$lib/modules/ip-fabric-server/model';

  import type { FabricServerDraft, FabricServerLink } from '$lib/modules/ip-fabric-server/model';

  interface Props {
    draft: FabricServerDraft;
    errors?: Record<string, string>;
    validationKey?: number;
    onchange?: (next: FabricServerDraft) => void;
    ontouch?: () => void;
  }

  let { draft, errors = {}, validationKey = 0, onchange, ontouch }: Props = $props();

  let leaves = $state<{ fabric: string; name: string }[]>([]);

  function patch(values: Partial<FabricServerDraft>): void {
    onchange?.({ ...draft, ...values });
  }

  function patchLink(index: number, values: Partial<FabricServerLink>): void {
    patch({
      links: draft.links.map((link, i) => (i === index ? { ...link, ...values } : link))
    });
  }

  async function loadLeaves(): Promise<void> {
    try {
      const payload = await restconfGetJson(FABRIC_COLLECTION_ROOT);
      leaves = fabricChildren(payload, 'switch')
        .filter(({ entry }) => stringAt(entry, 'role') === 'leaf')
        .map(({ fabric, entry }) => ({ fabric, name: stringAt(entry, 'name') }));
    } catch {
      leaves = [];
    }
  }

  function leafOptions(current: string): { value: string; label: string }[] {
    const names = new Set(
      leaves.filter((leaf) => leaf.fabric === draft.fabric.trim()).map((leaf) => leaf.name)
    );

    if (current.trim()) names.add(current.trim());

    return [
      { value: '', label: names.size > 0 ? 'Select leaf' : 'No leaves in this fabric' },
      ...Array.from(names)
        .sort((left, right) => left.localeCompare(right))
        .map((value) => ({ value, label: value }))
    ];
  }

  const profileOptions = SERVER_PROFILES.map((profile) => ({ value: profile, label: profile }));

  onMount(() => {
    loadLeaves();
    return onGlobalRefresh(() => loadLeaves());
  });
</script>

<div class="editor">
  <Section
    title="Server"
    description="The fabric, the server and how it must be connected."
    yangPath="ip-fabric:fabric/server"
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
        onchange={(value) => patch({ fabric: value })}
        ontouch={() => ontouch?.()}
      />
      <FieldText
        label="Server name"
        required={true}
        value={draft.name}
        error={errors.name}
        {validationKey}
        placeholder="e.g., server1"
        yangType="string (key)"
        mono={true}
        onchange={(value) => patch({ name: value })}
        ontouch={() => ontouch?.()}
      />
      <FieldSelect
        label="Connectivity profile"
        required={true}
        value={draft.profile}
        options={profileOptions}
        {validationKey}
        yangType="enumeration"
        help="Dual-homed links to two different leaves. Surviving the loss of a leaf needs an overlay, which is not configured yet."
        onchange={(value) => patch({ profile: value === 'single-homed' ? 'single-homed' : 'dual-homed' })}
        ontouch={() => ontouch?.()}
      />
    </div>
  </Section>

  <Section
    title="Links"
    description="Where the server NICs are connected."
    yangPath="ip-fabric:fabric/server/connectivity/link"
  >
    {#if errors.links}
      <p class="editor__error">{errors.links}</p>
    {/if}
    <ListEditor
      title="Links"
      items={draft.links}
      addLabel="Add link"
      emptyLabel="No links yet."
      getItemLabel={(link, index) => `Link ${index + 1}${link.switch ? `: ${link.switch}` : ''}`}
      onadd={() => patch({ links: [...draft.links, createFabricServerLink()] })}
      onremove={(index) => patch({ links: draft.links.filter((_, i) => i !== index) })}
    >
      {#snippet row(link: FabricServerLink, index: number)}
        <div class="editor__grid editor__grid--2col">
          <FieldSelect
            label="Leaf"
            required={true}
            value={link.switch}
            options={leafOptions(link.switch)}
            error={errors[`links.${index}.switch`]}
            {validationKey}
            yangType="leafref (key)"
            onchange={(value) => patchLink(index, { switch: value })}
            ontouch={() => ontouch?.()}
          />
          <FieldText
            label="Leaf port"
            required={true}
            value={link.switchPort}
            error={errors[`links.${index}.switchPort`]}
            {validationKey}
            placeholder="e.g., ethernet-1/1"
            yangType="string (key)"
            mono={true}
            onchange={(value) => patchLink(index, { switchPort: value })}
            ontouch={() => ontouch?.()}
          />
          <FieldText
            label="Server port"
            required={true}
            value={link.serverPort}
            error={errors[`links.${index}.serverPort`]}
            {validationKey}
            placeholder="e.g., eth1"
            yangType="string"
            mono={true}
            onchange={(value) => patchLink(index, { serverPort: value })}
            ontouch={() => ontouch?.()}
          />
        </div>
      {/snippet}
    </ListEditor>
  </Section>
</div>

<style>
  .editor__error {
    margin: 0 0 8px;
    font-size: 12px;
    color: rgb(var(--sw-danger-rgb) / 0.95);
  }
</style>
