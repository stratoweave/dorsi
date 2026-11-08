import { error } from '@sveltejs/kit';

import { getServiceModule } from '$lib/core/registry/service-modules';
import { getRoutePathKey } from '$lib/core/registry/types';
import { getListEntryPath, restconfGetJson } from '$lib/core/restconf/client';

import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, fetch, depends }) => {
  const serviceModule = getServiceModule(params.module);

  if (!serviceModule) {
    error(404, `Unknown service module: ${params.module}`);
  }

  depends(`data:service:${params.module}:${params.id}`);

  try {
    const pathKey = getRoutePathKey(serviceModule, params.id);
    const response = await restconfGetJson(
      getListEntryPath(serviceModule.restconfRoot, pathKey),
      fetch
    );
    return {
      moduleId: serviceModule.id,
      serviceId: params.id,
      draft: serviceModule.parse(response, pathKey),
      loadError: ''
    };
  } catch (loadError) {
    const message = loadError instanceof Error ? loadError.message : 'Failed to load service draft.';
    return {
      moduleId: serviceModule.id,
      serviceId: params.id,
      draft: serviceModule.createDraft(),
      loadError: message
    };
  }
};
