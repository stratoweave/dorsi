import Editor from '$lib/modules/ip-fabric-switch/Editor.svelte';
import Preview from '$lib/modules/ip-fabric-switch/Preview.svelte';
import Summary from '$lib/modules/ip-fabric-switch/Summary.svelte';
import {
  createFabricSwitchDraft,
  formatFabricSwitchRouteId,
  getFabricSwitchPathKey,
  getFabricSwitchRouteId,
  listFabricSwitches,
  parseFabricSwitch,
  parseFabricSwitchRouteId,
  serializeFabricSwitchDraft,
  validateFabricSwitchDraft
} from '$lib/modules/ip-fabric-switch/model';

import type { ServiceModule } from '$lib/core/registry/types';
import type { FabricSwitchDraft } from '$lib/modules/ip-fabric-switch/model';

export const module: ServiceModule<FabricSwitchDraft> = {
  id: 'ip-fabric-switch',
  title: 'IP Fabric Switch',
  collectionLabel: 'Fabric switches',
  description: 'Create and edit `ip-fabric:switch` entries of an existing fabric.',
  deletable: true,
  collectionRestconfRoot: 'data/ip-fabric:ip-fabric',
  restconfRoot: 'data/ip-fabric:ip-fabric/fabric={}/switch',
  keyParam: 'name',
  keyLabel: 'fabric and switch name',
  createDraft: createFabricSwitchDraft,
  parse: parseFabricSwitch,
  cloneDraft: (draft) => ({ ...draft, name: '', id: null }),
  list: listFabricSwitches,
  validate: validateFabricSwitchDraft,
  serialize: serializeFabricSwitchDraft,
  getKey: getFabricSwitchRouteId,
  getPathKey: getFabricSwitchPathKey,
  parseRouteId: parseFabricSwitchRouteId,
  formatRouteId: formatFabricSwitchRouteId,
  Editor,
  Summary,
  Preview
};
