import { arrayAt, stringAt } from '$lib/core/util/json';
import { fabricChildren, keyPart, singleEntry, splitRouteId } from '$lib/modules/ip-fabric/common';

import type { ServiceListItem } from '$lib/core/registry/types';
import type { ValidationResult } from '$lib/core/validation/types';

export type FabricServerProfile = 'single-homed' | 'dual-homed';

export interface FabricServerLink {
  switch: string;
  switchPort: string;
  serverPort: string;
}

export interface FabricServerDraft {
  fabric: string;
  name: string;
  profile: FabricServerProfile;
  links: FabricServerLink[];
}

export const SERVER_PROFILES: FabricServerProfile[] = ['dual-homed', 'single-homed'];

export function createFabricServerLink(): FabricServerLink {
  return { switch: '', switchPort: '', serverPort: '' };
}

export function createFabricServerDraft(): FabricServerDraft {
  return { fabric: '', name: '', profile: 'dual-homed', links: [createFabricServerLink()] };
}

export function getFabricServerPathKey(draft: Pick<FabricServerDraft, 'fabric' | 'name'>): string[] {
  return [draft.fabric.trim(), draft.name.trim()];
}

export function getFabricServerRouteId(draft: Pick<FabricServerDraft, 'fabric' | 'name'>): string {
  return getFabricServerPathKey(draft).join(',');
}

export function parseFabricServerRouteId(id: string): string[] {
  return splitRouteId(id, 2);
}

export function formatFabricServerRouteId(id: string): string {
  const [fabric, name] = parseFabricServerRouteId(id);
  return fabric && name ? `${name} (${fabric})` : name || fabric || 'Unassigned server';
}

function draftFromEntry(fabric: string, entry: unknown): FabricServerDraft {
  const profile = stringAt(entry, 'connectivity', 'profile');

  return {
    fabric,
    name: stringAt(entry, 'name'),
    profile: profile === 'single-homed' ? 'single-homed' : 'dual-homed',
    links: arrayAt(entry, 'connectivity', 'link').map((link) => ({
      switch: stringAt(link, 'switch'),
      switchPort: stringAt(link, 'switch-port'),
      serverPort: stringAt(link, 'server-port')
    }))
  };
}

export function parseFabricServer(input: unknown, key?: string | string[]): FabricServerDraft {
  const entry = singleEntry(input, 'server', 'name');

  if (!entry) {
    return { ...createFabricServerDraft(), fabric: keyPart(key, 0) };
  }

  return draftFromEntry(keyPart(key, 0), entry);
}

export function listFabricServers(input: unknown): ServiceListItem[] {
  return fabricChildren(input, 'server').map(({ fabric, entry }) => {
    const draft = draftFromEntry(fabric, entry);

    return {
      id: getFabricServerRouteId(draft),
      label: draft.name,
      description: `Fabric ${fabric}`,
      badges: [{ text: draft.profile.toUpperCase(), tone: 'neutral' }]
    };
  });
}

export function serializeFabricServerDraft(draft: FabricServerDraft): unknown {
  return {
    name: draft.name.trim(),
    connectivity: {
      profile: draft.profile,
      link: draft.links.map((link) => ({
        switch: link.switch.trim(),
        'switch-port': link.switchPort.trim(),
        'server-port': link.serverPort.trim()
      }))
    }
  };
}

export function validateFabricServerDraft(draft: FabricServerDraft): ValidationResult {
  const errors: Record<string, string> = {};
  const warnings: string[] = [];

  if (!draft.fabric.trim()) errors.fabric = 'Fabric is required.';
  if (!draft.name.trim()) errors.name = 'Server name is required.';

  if (draft.links.length === 0) {
    errors.links = 'A server needs at least one link.';
  }

  draft.links.forEach((link, index) => {
    if (!link.switch.trim()) errors[`links.${index}.switch`] = 'Leaf is required.';
    if (!link.switchPort.trim()) errors[`links.${index}.switchPort`] = 'Leaf port is required.';
    if (!link.serverPort.trim()) errors[`links.${index}.serverPort`] = 'Server port is required.';
  });

  const leaves = new Set(draft.links.map((link) => link.switch.trim()).filter(Boolean));

  if (draft.profile === 'single-homed' && leaves.size > 1) {
    errors.links = 'A single-homed server links to one leaf.';
  } else if (draft.profile === 'dual-homed' && draft.links.length > 0 && leaves.size !== 2) {
    errors.links = 'A dual-homed server links to two different leaves.';
  }

  return { ok: Object.keys(errors).length === 0, errors, warnings };
}
