import { stringAt } from '$lib/core/util/json';
import { fabricChildren, keyPart, singleEntry, splitRouteId } from '$lib/modules/ip-fabric/common';

import type { ServiceListItem } from '$lib/core/registry/types';
import type { ValidationResult } from '$lib/core/validation/types';

export interface FabricLinkDraft {
  fabric: string;
  lowerSwitch: string;
  lowerPort: string;
  upperSwitch: string;
  upperPort: string;
}

export function createFabricLinkDraft(): FabricLinkDraft {
  return { fabric: '', lowerSwitch: '', lowerPort: '', upperSwitch: '', upperPort: '' };
}

export function getFabricLinkPathKey(draft: FabricLinkDraft): string[] {
  return [
    draft.fabric.trim(),
    draft.lowerSwitch.trim(),
    draft.lowerPort.trim(),
    draft.upperSwitch.trim(),
    draft.upperPort.trim()
  ];
}

export function getFabricLinkRouteId(draft: FabricLinkDraft): string {
  return getFabricLinkPathKey(draft).join(',');
}

export function parseFabricLinkRouteId(id: string): string[] {
  return splitRouteId(id, 5);
}

export function formatFabricLinkEndpoints(
  draft: Pick<FabricLinkDraft, 'lowerSwitch' | 'lowerPort' | 'upperSwitch' | 'upperPort'>
): string {
  const lower = [draft.lowerSwitch.trim(), draft.lowerPort.trim()].filter(Boolean).join(' ');
  const upper = [draft.upperSwitch.trim(), draft.upperPort.trim()].filter(Boolean).join(' ');

  if (lower && upper) return `${lower} ↔ ${upper}`;
  return lower || upper || 'Unassigned endpoints';
}

export function formatFabricLinkRouteId(id: string): string {
  const [fabric, lowerSwitch, lowerPort, upperSwitch, upperPort] = parseFabricLinkRouteId(id);
  const endpoints = formatFabricLinkEndpoints({ lowerSwitch, lowerPort, upperSwitch, upperPort });
  return fabric ? `${endpoints} (${fabric})` : endpoints;
}

function draftFromEntry(fabric: string, entry: unknown): FabricLinkDraft {
  return {
    fabric,
    lowerSwitch: stringAt(entry, 'lower-switch'),
    lowerPort: stringAt(entry, 'lower-port'),
    upperSwitch: stringAt(entry, 'upper-switch'),
    upperPort: stringAt(entry, 'upper-port')
  };
}

export function parseFabricLink(input: unknown, key?: string | string[]): FabricLinkDraft {
  const entry = singleEntry(input, 'fabric-link', 'lower-switch');

  if (!entry) {
    return { ...createFabricLinkDraft(), fabric: keyPart(key, 0) };
  }

  return draftFromEntry(keyPart(key, 0), entry);
}

export function listFabricLinks(input: unknown): ServiceListItem[] {
  return fabricChildren(input, 'fabric-link').map(({ fabric, entry }) => {
    const draft = draftFromEntry(fabric, entry);

    return {
      id: getFabricLinkRouteId(draft),
      label: formatFabricLinkEndpoints(draft),
      description: `Fabric ${fabric}`
    };
  });
}

export function serializeFabricLinkDraft(draft: FabricLinkDraft): unknown {
  return {
    'lower-switch': draft.lowerSwitch.trim(),
    'lower-port': draft.lowerPort.trim(),
    'upper-switch': draft.upperSwitch.trim(),
    'upper-port': draft.upperPort.trim()
  };
}

/** The number a port name ends in, such as 49 for `ethernet-1/49`. */
function trailingNumber(port: string): number | null {
  const match = /(\d+)$/.exec(port.trim());
  return match ? Number(match[1]) : null;
}

export function validateFabricLinkDraft(draft: FabricLinkDraft): ValidationResult {
  const errors: Record<string, string> = {};
  const warnings: string[] = [];

  if (!draft.fabric.trim()) errors.fabric = 'Fabric is required.';
  if (!draft.lowerSwitch.trim()) errors.lowerSwitch = 'Lower switch is required.';
  if (!draft.lowerPort.trim()) errors.lowerPort = 'Lower port is required.';
  if (!draft.upperSwitch.trim()) errors.upperSwitch = 'Upper switch is required.';
  if (!draft.upperPort.trim()) errors.upperPort = 'Upper port is required.';

  if (
    draft.lowerSwitch.trim() &&
    draft.lowerSwitch.trim() === draft.upperSwitch.trim()
  ) {
    errors.upperSwitch = 'A link joins two different switches.';
  }

  if (draft.lowerPort.trim()) {
    const number = trailingNumber(draft.lowerPort);
    if (number === null || number > 63) {
      errors.lowerPort = 'The lower port must end in a number below 64, the addresses are derived from it.';
    }
  }

  return { ok: Object.keys(errors).length === 0, errors, warnings };
}
