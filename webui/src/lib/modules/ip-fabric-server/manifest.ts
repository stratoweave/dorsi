import Editor from '$lib/modules/ip-fabric-server/Editor.svelte';
import Preview from '$lib/modules/ip-fabric-server/Preview.svelte';
import Summary from '$lib/modules/ip-fabric-server/Summary.svelte';
import {
  createFabricServerDraft,
  formatFabricServerRouteId,
  getFabricServerPathKey,
  getFabricServerRouteId,
  listFabricServers,
  parseFabricServer,
  parseFabricServerRouteId,
  serializeFabricServerDraft,
  validateFabricServerDraft
} from '$lib/modules/ip-fabric-server/model';

import type { ServiceModule } from '$lib/core/registry/types';
import type { FabricServerDraft } from '$lib/modules/ip-fabric-server/model';

export const module: ServiceModule<FabricServerDraft> = {
  id: 'ip-fabric-server',
  title: 'IP Fabric Server',
  collectionLabel: 'Fabric servers',
  description: 'Create and edit `ip-fabric:server` entries of an existing fabric.',
  deletable: true,
  collectionRestconfRoot: 'data/ip-fabric:ip-fabric',
  restconfRoot: 'data/ip-fabric:ip-fabric/fabric={}/server',
  keyParam: 'name',
  keyLabel: 'fabric and server name',
  createDraft: createFabricServerDraft,
  parse: parseFabricServer,
  cloneDraft: (draft) => ({ ...draft, name: '' }),
  list: listFabricServers,
  validate: validateFabricServerDraft,
  serialize: serializeFabricServerDraft,
  getKey: getFabricServerRouteId,
  getPathKey: getFabricServerPathKey,
  parseRouteId: parseFabricServerRouteId,
  formatRouteId: formatFabricServerRouteId,
  Editor,
  Summary,
  Preview
};
