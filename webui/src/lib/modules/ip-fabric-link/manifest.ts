import Editor from '$lib/modules/ip-fabric-link/Editor.svelte';
import Preview from '$lib/modules/ip-fabric-link/Preview.svelte';
import Summary from '$lib/modules/ip-fabric-link/Summary.svelte';
import {
  createFabricLinkDraft,
  formatFabricLinkRouteId,
  getFabricLinkPathKey,
  getFabricLinkRouteId,
  listFabricLinks,
  parseFabricLink,
  parseFabricLinkRouteId,
  serializeFabricLinkDraft,
  validateFabricLinkDraft
} from '$lib/modules/ip-fabric-link/model';

import type { ServiceModule } from '$lib/core/registry/types';
import type { FabricLinkDraft } from '$lib/modules/ip-fabric-link/model';

export const module: ServiceModule<FabricLinkDraft> = {
  id: 'ip-fabric-link',
  title: 'IP Fabric Link',
  collectionLabel: 'Fabric links',
  description: 'Create and edit `ip-fabric:fabric-link` entries of an existing fabric.',
  deletable: true,
  collectionRestconfRoot: 'data/ip-fabric:ip-fabric',
  restconfRoot: 'data/ip-fabric:ip-fabric/fabric={}/fabric-link',
  keyParam: 'lowerSwitch',
  keyLabel: 'fabric, lower switch and port, and upper switch and port',
  createDraft: createFabricLinkDraft,
  parse: parseFabricLink,
  cloneDraft: (draft) => ({ ...draft, lowerPort: '', upperPort: '' }),
  list: listFabricLinks,
  validate: validateFabricLinkDraft,
  serialize: serializeFabricLinkDraft,
  getKey: getFabricLinkRouteId,
  getPathKey: getFabricLinkPathKey,
  parseRouteId: parseFabricLinkRouteId,
  formatRouteId: formatFabricLinkRouteId,
  Editor,
  Summary,
  Preview
};
