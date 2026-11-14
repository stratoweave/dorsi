import { booleanAt, numberAt, stringAt } from '$lib/core/util/json';
import { fabricChildren, keyPart, singleEntry, splitRouteId } from '$lib/modules/ip-fabric/common';

import type { ServiceListItem } from '$lib/core/registry/types';
import type { ValidationResult } from '$lib/core/validation/types';

export type FabricSwitchRole = 'leaf' | 'spine' | 'super-spine';

export interface FabricSwitchDraft {
  fabric: string;
  name: string;
  id: number | null;
  type: string;
  role: FabricSwitchRole;
  pod: string;
  plane: string;
  mock: boolean;
}

export const SWITCH_ROLES: FabricSwitchRole[] = ['leaf', 'spine', 'super-spine'];

export function createFabricSwitchDraft(): FabricSwitchDraft {
  return {
    fabric: '',
    name: '',
    id: null,
    type: 'NokiaSRLinux_25_3_2',
    role: 'leaf',
    pod: '',
    plane: '',
    mock: false
  };
}

export function getFabricSwitchPathKey(draft: Pick<FabricSwitchDraft, 'fabric' | 'name'>): string[] {
  return [draft.fabric.trim(), draft.name.trim()];
}

export function getFabricSwitchRouteId(draft: Pick<FabricSwitchDraft, 'fabric' | 'name'>): string {
  return getFabricSwitchPathKey(draft).join(',');
}

export function parseFabricSwitchRouteId(id: string): string[] {
  return splitRouteId(id, 2);
}

export function formatFabricSwitchRouteId(id: string): string {
  const [fabric, name] = parseFabricSwitchRouteId(id);
  return fabric && name ? `${name} (${fabric})` : name || fabric || 'Unassigned switch';
}

function toRole(value: string): FabricSwitchRole {
  return (SWITCH_ROLES as string[]).includes(value) ? (value as FabricSwitchRole) : 'leaf';
}

function draftFromEntry(fabric: string, entry: unknown): FabricSwitchDraft {
  return {
    fabric,
    name: stringAt(entry, 'name'),
    id: numberAt(entry, 'id'),
    type: stringAt(entry, 'type'),
    role: toRole(stringAt(entry, 'role')),
    pod: stringAt(entry, 'pod'),
    plane: stringAt(entry, 'plane'),
    mock: booleanAt(entry, 'mock')
  };
}

export function parseFabricSwitch(input: unknown, key?: string | string[]): FabricSwitchDraft {
  const entry = singleEntry(input, 'switch', 'name');

  if (!entry) {
    return { ...createFabricSwitchDraft(), fabric: keyPart(key, 0) };
  }

  return draftFromEntry(keyPart(key, 0), entry);
}

export function listFabricSwitches(input: unknown): ServiceListItem[] {
  return fabricChildren(input, 'switch').map(({ fabric, entry }) => {
    const draft = draftFromEntry(fabric, entry);

    return {
      id: getFabricSwitchRouteId(draft),
      label: draft.name,
      description: `Fabric ${fabric}`,
      badges: [
        { text: draft.role.toUpperCase(), tone: 'neutral' },
        ...(draft.mock ? [{ text: 'MOCK', tone: 'neutral' as const }] : [])
      ]
    };
  });
}

export function serializeFabricSwitchDraft(draft: FabricSwitchDraft): unknown {
  const body: Record<string, unknown> = {
    name: draft.name.trim(),
    id: draft.id,
    type: draft.type.trim(),
    role: draft.role,
    mock: draft.mock
  };

  // The pod only applies below the super-spines and the plane only above the leaves
  if (draft.role !== 'super-spine' && draft.pod.trim()) {
    body.pod = draft.pod.trim();
  }

  if (draft.role !== 'leaf' && draft.plane.trim()) {
    body.plane = draft.plane.trim();
  }

  return body;
}

export function validateFabricSwitchDraft(draft: FabricSwitchDraft): ValidationResult {
  const errors: Record<string, string> = {};
  const warnings: string[] = [];

  if (!draft.fabric.trim()) errors.fabric = 'Fabric is required.';
  if (!draft.name.trim()) errors.name = 'Switch name is required.';
  if (!draft.type.trim()) errors.type = 'Platform type is required.';

  if (draft.id === null || !Number.isInteger(draft.id) || draft.id < 1) {
    errors.id = 'Switch id is required.';
  } else if (draft.id > 511) {
    errors.id = 'Switch id must be at most 511, the addressing scheme does not go further.';
  }

  if (draft.role === 'super-spine' && draft.pod.trim()) {
    warnings.push('A super-spine has no pod, the pod is not sent.');
  }

  if (draft.role === 'leaf' && draft.plane.trim()) {
    warnings.push('A leaf has no plane, the plane is not sent.');
  }

  return { ok: Object.keys(errors).length === 0, errors, warnings };
}
