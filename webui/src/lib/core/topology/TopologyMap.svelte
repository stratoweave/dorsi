<script lang="ts">
  import { TOPOLOGY_LINK_LABEL_HEIGHT, TOPOLOGY_ROUTER_RADIUS } from '$lib/core/topology/model';
  import { appHref } from '$lib/core/util/nav';

  import type { TopologyGraph } from '$lib/core/topology/model';

  let { graph, note = '' }: { graph: TopologyGraph; note?: string } = $props();

  const routerRadius = TOPOLOGY_ROUTER_RADIUS;
  const linkLabelHeight = TOPOLOGY_LINK_LABEL_HEIGHT;

  let routerCount = $derived(graph.routers.length);
  let linkCount = $derived(graph.links.length);
</script>

<div class="topology">
  <div class="topology__summary">
    <span class="pill"><span class="dot"></span>{routerCount} routers</span>
    <span class="pill"><span class="dot"></span>{linkCount} backbone links</span>
  </div>

  <div class="card topology__canvas-card">
    <div class="card-body topology__canvas-wrap">
      <svg
        class="topology__svg"
        viewBox={`0 0 ${graph.width} ${graph.height}`}
        width={graph.width}
        height={graph.height}
        style={`width: ${graph.width}px; height: ${graph.height}px; min-width: 100%;`}
        aria-label="Network topology map"
        role="img"
      >
        <defs>
          <radialGradient id="topology-ring-grad" cx="50%" cy="50%" r="50%">
            <stop offset="60%" stop-color="rgb(var(--sw-accent-rgb) / 0)"></stop>
            <stop offset="85%" stop-color="rgb(var(--sw-accent-rgb) / 0.55)"></stop>
            <stop offset="100%" stop-color="rgb(var(--sw-accent-rgb) / 0)"></stop>
          </radialGradient>
        </defs>

        <g class="topology__links">
          {#each graph.links as link (link.id)}
            {#if link.geometry}
              {@const geometry = link.geometry}
              {@const deltaX = geometry.rightX - geometry.leftX}
              {@const deltaY = geometry.rightY - geometry.leftY}
              {@const length = Math.hypot(deltaX, deltaY) || 1}
              {@const offsetX = (deltaX / length) * (routerRadius + 4)}
              {@const offsetY = (deltaY / length) * (routerRadius + 4)}
              {@const routeId = `${link.leftRouter},${link.leftInterface},${link.rightRouter},${link.rightInterface}`}
              {@const href = appHref(`/services/netinfra-backbone-link/${encodeURIComponent(routeId)}`)}

              <a {href} class="topology__link-link" aria-label={`Open backbone-link ${link.leftRouter} ${link.leftInterface} ↔ ${link.rightRouter} ${link.rightInterface}, status ${link.linkStatus}`}>
                <line
                  x1={geometry.leftX + offsetX}
                  y1={geometry.leftY + offsetY}
                  x2={geometry.rightX - offsetX}
                  y2={geometry.rightY - offsetY}
                  class="topology__link"
                  class:topology__link--up={link.linkStatus === 'up'}
                  class:topology__link--down={link.linkStatus === 'down'}
                />
                <line
                  x1={geometry.leftX + offsetX}
                  y1={geometry.leftY + offsetY}
                  x2={geometry.rightX - offsetX}
                  y2={geometry.rightY - offsetY}
                  class="topology__link-hit"
                />

                {#if geometry.label}
                  {@const label = geometry.label}
                  <g class="topology__link-label-group" transform={`translate(${label.x}, ${label.y})`}>
                    <rect
                      class="topology__link-label-bg"
                      x={-label.width / 2}
                      y={-linkLabelHeight / 2}
                      width={label.width}
                      height={linkLabelHeight}
                      rx="12"
                    ></rect>
                    <text class="topology__link-label" text-anchor="middle">
                      <tspan x="0" y="-4">{label.interfaceLine}</tspan>
                    </text>
                  </g>
                {/if}
              </a>
            {/if}
          {/each}
        </g>

        <g class="topology__routers">
          {#each graph.routers as router (router.name)}
            <a href={appHref(`/devices/${encodeURIComponent(router.name)}`)}>
              <g
                class="topology__router"
                class:topology__router--approval={router.approvalRequired}
                transform={`translate(${router.x}, ${router.y})`}
              >
                <circle
                  class="topology__router-ring"
                  r={routerRadius + 12}
                  fill="url(#topology-ring-grad)"
                ></circle>
                <circle class="topology__router-core" r={routerRadius}></circle>
                <circle class="topology__router-core-inner" r={routerRadius - 2}></circle>
                <text class="topology__router-name" text-anchor="middle">
                  <tspan x="0" y="-4">{router.name}</tspan>
                  <tspan x="0" y="14">
                    {router.role || router.type || (router.asn !== null ? `AS${router.asn}` : 'router')}
                  </tspan>
                </text>
              </g>
            </a>
          {/each}
        </g>

      </svg>
    </div>
  </div>

  {#if note}
    <p class="topology__note">{note}</p>
  {/if}
</div>

<style>
  .topology {
    display: grid;
    gap: 14px;
  }

  .topology__summary {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .topology__canvas-card {
    overflow: hidden;
  }

  .topology__canvas-wrap {
    overflow: auto;
    padding: 0;
    background-color: rgb(var(--sw-navy-rgb) / 0.55);
    background-image:
      radial-gradient(600px 320px at 50% 50%, rgb(var(--sw-accent-rgb) / 0.10), transparent 70%),
      linear-gradient(rgb(var(--sw-line-rgb) / 0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgb(var(--sw-line-rgb) / 0.04) 1px, transparent 1px);
    background-size: auto, 32px 32px, 32px 32px;
  }

  .topology__svg {
    display: block;
    width: auto;
    min-width: 100%;
    max-width: none;
    height: auto;
  }

  .topology__link-link {
    cursor: pointer;
    text-decoration: none;
  }

  .topology__link {
    stroke: rgb(var(--sw-line-rgb) / 0.20);
    stroke-width: 1.5;
    transition: stroke 0.15s ease, stroke-width 0.15s ease;
    pointer-events: none;
  }

  .topology__link--up {
    stroke: rgb(var(--sw-success-rgb) / 0.85);
    stroke-width: 2;
  }

  .topology__link--down {
    stroke: rgb(var(--sw-danger-rgb) / 0.9);
    stroke-width: 2;
  }

  .topology__link-hit {
    stroke: transparent;
    stroke-width: 14;
    pointer-events: stroke;
  }

  .topology__link-link:hover .topology__link {
    stroke: var(--sw-accent);
    stroke-width: 2.5;
  }

  .topology__link-link:hover .topology__link-label-bg {
    stroke: var(--sw-accent);
  }

  .topology__link-label-bg {
    fill: rgb(var(--sw-navy-rgb) / 0.92);
    stroke: var(--sw-border-default);
    stroke-width: 1;
    transition: stroke 0.15s ease;
  }

  .topology__link-label {
    fill: var(--sw-text-secondary);
    font-size: 11px;
    font-family: var(--sw-font-mono);
    dominant-baseline: middle;
    pointer-events: none;
  }

  .topology__router {
    cursor: pointer;
  }

  .topology__router-ring {
    stroke: none;
    pointer-events: none;
  }

  .topology__router-core {
    fill: rgb(var(--sw-navy-rgb) / 0.92);
    stroke: var(--sw-accent);
    stroke-width: 1.4;
    transition: transform 0.15s ease, stroke 0.15s ease;
  }

  .topology__router-core-inner {
    fill: none;
    stroke: rgb(var(--sw-accent-rgb) / 0.25);
    stroke-width: 1;
    pointer-events: none;
  }

  .topology__router:hover .topology__router-core {
    transform: scale(1.03);
    stroke: var(--sw-accent-bright);
  }

  .topology__router--approval .topology__router-core {
    stroke: var(--sw-warning);
  }

  .topology__router--approval .topology__router-core-inner {
    stroke: rgb(var(--sw-warning-rgb) / 0.25);
  }

  .topology__router-name {
    fill: var(--sw-text-primary);
    text-anchor: middle;
    font-size: 12px;
    font-weight: 600;
    pointer-events: none;
  }

  .topology__router-name tspan:last-child {
    fill: var(--sw-text-muted);
    font-size: 11px;
    font-weight: 500;
  }

  .topology__note {
    margin: 0;
    font-size: 12px;
    color: var(--sw-text-muted);
  }
</style>
