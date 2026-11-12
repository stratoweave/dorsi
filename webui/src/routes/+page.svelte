<script lang="ts">
  import { onMount } from 'svelte';

  import { listServiceModules } from '$lib/core/registry/service-modules';
  import { lowercaseFirst } from '$lib/core/registry/types';
  import { fetchDevices, isPendingQueueItem, type DeviceSummary } from '$lib/core/orchestron/client';
  import { queuesPoll } from '$lib/core/orchestron/poll-store';
  import TopologyMap from '$lib/core/topology/TopologyMap.svelte';
  import { buildTopologyGraphs } from '$lib/core/topology/model';
  import { restconfGetJson } from '$lib/core/restconf/client';
  import DeviceConfigStatus from '$lib/core/ui/DeviceConfigStatus.svelte';
  import EmptyState from '$lib/core/ui/EmptyState.svelte';
  import Skeleton from '$lib/core/ui/Skeleton.svelte';
  import StatTile from '$lib/core/ui/StatTile.svelte';
  import StatusPill from '$lib/core/ui/StatusPill.svelte';
  import { onGlobalRefresh } from '$lib/core/util/global-refresh';
  import { LatestRequest } from '$lib/core/util/latest-request';
  import { appHref } from '$lib/core/util/nav';
  import { startPolling } from '$lib/core/util/poll';

  import type { FabricPayload, TopologyGraph } from '$lib/core/topology/model';

  const modules = listServiceModules();

  // Wholesale-replaced on every poll; raw state skips deep proxying.
  let devices = $state.raw<DeviceSummary[]>([]);
  let loadingDevices = $state(true);
  let loadError = $state('');
  let topologyGraphs = $state.raw<TopologyGraph[] | null>(null);
  let loadingTopology = $state(true);
  let topologyError = $state('');
  let topologyNote = $state('');
  let serviceCounts = $state.raw<Record<string, number | null>>({});
  let loadingCounts = $state(true);

  let pendingApprovals = $derived($queuesPoll.queues.filter(isPendingQueueItem).length);
  let queueLoaded = $derived($queuesPoll.loaded);
  let devicesWithoutConfig = $derived(devices.filter((device) => device.hasRunningConfig === false).length);
  let switchesCount = $derived(serviceCounts['ip-fabric-switch'] ?? null);
  let linksCount = $derived(serviceCounts['ip-fabric-link'] ?? null);

  async function loadDevices(): Promise<void> {
    try {
      loadingDevices = true;
      loadError = '';
      devices = await fetchDevices();
    } catch (error) {
      loadError = error instanceof Error ? error.message : 'Failed to load devices.';
      devices = [];
    } finally {
      loadingDevices = false;
    }
  }

  const topologyRequest = new LatestRequest();

  async function loadTopology(): Promise<void> {
    const isInitialLoad = topologyGraphs === null;
    const token = topologyRequest.begin();
    try {
      if (isInitialLoad) {
        loadingTopology = true;
      }
      topologyNote = '';

      const [fabricResult] = await Promise.allSettled([
        restconfGetJson<FabricPayload>('data/ip-fabric:ip-fabric')
      ]);
      if (!topologyRequest.isCurrent(token)) return;

      if (fabricResult.status !== 'fulfilled') {
        const message = fabricResult.reason instanceof Error
          ? fabricResult.reason.message
          : 'Failed to load the fabric topology.';
        if (isInitialLoad) {
          topologyGraphs = null;
          topologyError = message;
        } else {
          topologyNote = `Refresh failed: ${message}`;
        }
        return;
      }

      topologyError = '';
      topologyGraphs = buildTopologyGraphs(fabricResult.value);
    } finally {
      if (topologyRequest.isCurrent(token)) loadingTopology = false;
    }
  }

  /** One RESTCONF GET per distinct collection root; several modules share `ip-fabric`. */
  async function loadServiceCounts(): Promise<void> {
    const roots = new Map<string, Promise<unknown>>();
    const results = await Promise.all(
      modules.map(async (module) => {
        if (!module.list) return [module.id, null] as const;
        const root = module.collectionRestconfRoot ?? module.restconfRoot;
        let request = roots.get(root);
        if (!request) {
          request = restconfGetJson(root);
          roots.set(root, request);
        }
        try {
          const response = await request;
          return [module.id, module.list(response).length] as const;
        } catch {
          return [module.id, null] as const;
        }
      })
    );
    serviceCounts = Object.fromEntries(results);
    loadingCounts = false;
  }

  const TOPOLOGY_REFRESH_MS = 2000;

  onMount(() => {
    loadDevices();
    loadTopology();
    loadServiceCounts();

    const offRefresh = onGlobalRefresh(() => {
      loadDevices();
      loadTopology();
      loadServiceCounts();
    });

    const stopTopologyRefresh = startPolling(loadTopology, TOPOLOGY_REFRESH_MS, { immediate: false });

    return () => {
      offRefresh();
      stopTopologyRefresh();
    };
  });
</script>

<div class="overview">
  <div class="page-header page-header--flush">
    <div>
      <h1>Overview</h1>
      <p>Live view of devices, fabric services, and pending changes.</p>
    </div>
  </div>

  <section class="stat-grid" aria-label="Summary" data-tour="stats">
    <StatTile
      label="Devices"
      value={devices.length}
      hint={loadingDevices ? '' : devicesWithoutConfig > 0 ? `${devicesWithoutConfig} without running config` : 'All configured'}
      tone={devicesWithoutConfig > 0 ? 'warning' : 'neutral'}
      href="/devices"
      loading={loadingDevices}
    />
    <StatTile
      label="Pending approvals"
      value={pendingApprovals}
      hint={pendingApprovals > 0 ? 'Waiting for review' : 'Queue is clear'}
      tone={pendingApprovals > 0 ? 'warning' : 'neutral'}
      href="/operations/config-queue"
      loading={!queueLoaded}
    />
    <StatTile
      label="Fabric switches"
      value={switchesCount}
      href="/services/ip-fabric-switch"
      loading={loadingCounts}
    />
    <StatTile
      label="Fabric links"
      value={linksCount}
      href="/services/ip-fabric-link"
      loading={loadingCounts}
    />
  </section>

  <section class="overview__section" data-tour="topology">
    <div class="section-head">
      <h2>Fabric Topology</h2>
    </div>

    {#if loadingTopology}
      <Skeleton height="320px" />
    {:else if topologyError}
      <EmptyState tone="danger" icon="alert" title="Topology unavailable" description={topologyError} />
    {:else if topologyGraphs && topologyGraphs.length === 0}
      <EmptyState icon="services" title="No fabric yet" description="Create a fabric through RESTCONF or a startup file, then add switches, links and servers." />
    {:else if topologyGraphs}
      {#each topologyGraphs as graph (graph.fabric)}
        <TopologyMap {graph} {devices} note={topologyNote} />
      {/each}
    {/if}
  </section>

  <section class="overview__section" data-tour="devices-table">
    <div class="section-head">
      <h2>Devices</h2>
      <a class="btn btn-secondary btn-sm" href={appHref('/devices')}>View all devices</a>
    </div>

    {#if loadingDevices}
      <Skeleton variant="rows" rows={4} />
    {:else if loadError}
      <EmptyState tone="danger" icon="alert" title="Devices unavailable" description={loadError} />
    {:else if devices.length === 0}
      <EmptyState icon="devices" title="No devices" description="No managed devices were returned by the orchestrator." />
    {:else}
      <div class="card device-table">
        <div class="card-body no-pad">
          <table>
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Type</th>
                <th scope="col">Address</th>
                <th scope="col">User</th>
                <th scope="col" class="num">Queue</th>
                <th scope="col" class="num">Pending</th>
                <th scope="col">Approval</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {#each devices as device (device.id)}
                <tr>
                  <td><a class="device-table__name" href={appHref(`/devices/${encodeURIComponent(device.id)}`)}>{device.name}</a></td>
                  <td>{device.type ?? '—'}</td>
                  <td class="monospace">{device.address ?? '—'}</td>
                  <td>{device.username ?? '—'}</td>
                  <td class="num">{device.queueLength ?? 0}</td>
                  <td class="num" class:device-table__attention={(device.pendingApprovals ?? 0) > 0}>{device.pendingApprovals ?? 0}</td>
                  <td>
                    {#if device.approvalRequired}
                      <StatusPill tone="warning" label="Required" />
                    {:else}
                      <StatusPill tone="neutral" label="Auto" dot={false} />
                    {/if}
                  </td>
                  <td>
                    <DeviceConfigStatus hasRunningConfig={device.hasRunningConfig} />
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    {/if}
  </section>

  <section class="overview__section" data-tour="service-cards">
    <div class="section-head">
      <h2>Services</h2>
      <a class="btn btn-secondary btn-sm" href={appHref('/services')}>View all services</a>
    </div>

    <div class="service-grid">
      {#each modules as module (module.id)}
        <article class="service-card card">
          <div class="card-header">
            <h3>{module.title}</h3>
          </div>

          <div class="card-body">
            <div class="service-card__count">
              {#if loadingCounts}
                <Skeleton variant="text" width="64px" />
              {:else}
                <strong>{serviceCounts[module.id] ?? '—'}</strong>
                <span>{module.collectionLabel.toLowerCase()} configured</span>
              {/if}
            </div>

            <div class="service-card__actions">
              <a class="btn btn-primary btn-sm" href={appHref(`/services/${module.id}/new`)}>Create new</a>
              <a class="btn btn-secondary btn-sm" href={appHref(`/services/${module.id}`)}>View {lowercaseFirst(module.collectionLabel)}</a>
            </div>
          </div>
        </article>
      {/each}
    </div>
  </section>
</div>

<style>
  .overview {
    display: grid;
    gap: 24px;
  }

  .stat-grid {
    display: grid;
    gap: 12px;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  }

  .overview__section {
    display: grid;
    gap: 14px;
  }

  .section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  .section-head h2 {
    font-size: 16px;
  }

  .device-table {
    overflow: hidden;
  }

  .device-table__name {
    color: var(--sw-text-primary);
    font-weight: 600;
    text-decoration: none;
  }

  .device-table__name:hover {
    color: var(--sw-accent);
  }

  .device-table__attention {
    color: var(--sw-warning);
    font-weight: 600;
  }

  .service-card__count {
    display: flex;
    align-items: baseline;
    gap: 8px;
    margin-bottom: 16px;
    min-height: 30px;
  }

  .service-card__count strong {
    font-size: 24px;
    font-weight: 600;
    letter-spacing: -0.02em;
    font-variant-numeric: tabular-nums;
  }

  .service-card__count span {
    font-size: 13px;
    color: var(--sw-text-secondary);
  }

  @media (max-width: 720px) {
    .section-head {
      flex-direction: column;
      align-items: stretch;
    }

    .device-table .card-body {
      overflow-x: auto;
    }
  }
</style>
