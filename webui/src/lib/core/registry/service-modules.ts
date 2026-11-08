import { module as ipFabricLink } from '$lib/modules/ip-fabric-link/manifest';
import { module as ipFabricServer } from '$lib/modules/ip-fabric-server/manifest';
import { module as ipFabricSwitch } from '$lib/modules/ip-fabric-switch/manifest';
import { module as netinfraBackboneLink } from '$lib/modules/netinfra-backbone-link/manifest';
import { module as netinfraRouter } from '$lib/modules/netinfra-router/manifest';

import type { AnyServiceModule, ServiceModuleMeta } from '$lib/core/registry/types';

export const serviceModules = {
  'ip-fabric-link': ipFabricLink,
  'ip-fabric-server': ipFabricServer,
  'ip-fabric-switch': ipFabricSwitch,
  'netinfra-backbone-link': netinfraBackboneLink,
  'netinfra-router': netinfraRouter
} satisfies Record<string, AnyServiceModule>;

export function listServiceModules(): AnyServiceModule[] {
  return Object.values(serviceModules);
}

export function listServiceModuleMeta(): ServiceModuleMeta[] {
  return listServiceModules().map(({ id, title, collectionLabel, description }) => ({
    id,
    title,
    collectionLabel,
    description
  }));
}

export function getServiceModule(moduleId: string): AnyServiceModule | null {
  return serviceModules[moduleId as keyof typeof serviceModules] ?? null;
}

export function getServiceModuleOrThrow(moduleId: string): AnyServiceModule {
  const module = getServiceModule(moduleId);
  if (!module) {
    throw new Error(`Unknown service module: ${moduleId}`);
  }
  return module;
}
