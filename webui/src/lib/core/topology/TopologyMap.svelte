<script lang="ts">
  import {
    TOPOLOGY_LABEL_HEIGHT,
    TOPOLOGY_SERVER_HEIGHT,
    TOPOLOGY_SERVER_WIDTH,
    TOPOLOGY_SWITCH_HEIGHT,
    TOPOLOGY_SWITCH_WIDTH
  } from '$lib/core/topology/model';
  import { appHref } from '$lib/core/util/nav';

  import type { DeviceSummary } from '$lib/core/orchestron/client';
  import type { TopologyGraph, TopologyPortLabel } from '$lib/core/topology/model';

  let {
    graph,
    devices = [],
    note = ''
  }: { graph: TopologyGraph; devices?: DeviceSummary[]; note?: string } = $props();

  let deviceByName = $derived(new Map(devices.map((device) => [device.name, device])));
  let switchCount = $derived(graph.switches.length);
  let linkCount = $derived(graph.links.length);
  let serverCount = $derived(graph.servers.length);

  function noConfig(name: string): boolean {
    return deviceByName.get(name)?.hasRunningConfig === false;
  }

  function pending(name: string): boolean {
    return (deviceByName.get(name)?.pendingApprovals ?? 0) > 0;
  }

  function subtitle(role: string, id: number | null): string {
    return id === null ? role : `${role} · id ${id}`;
  }
</script>

{#snippet portLabel(label: TopologyPortLabel)}
  <g class="topology__port-group" transform={`translate(${label.x}, ${label.y})`}>
    <rect
      class="topology__port-bg"
      x={-label.width / 2}
      y={-TOPOLOGY_LABEL_HEIGHT / 2}
      width={label.width}
      height={TOPOLOGY_LABEL_HEIGHT}
      rx="8"
    ></rect>
    <text class="topology__port" text-anchor="middle">{label.text}</text>
  </g>
{/snippet}

<div class="topology">
  <div class="topology__summary">
    <span class="pill"><span class="dot"></span>{graph.fabric}</span>
    <span class="pill"><span class="dot"></span>{switchCount} switches</span>
    <span class="pill"><span class="dot"></span>{linkCount} fabric links</span>
    <span class="pill"><span class="dot"></span>{serverCount} servers</span>
  </div>

  <div class="card topology__canvas-card">
    <div class="card-body topology__canvas-wrap">
      <svg
        class="topology__svg"
        viewBox={`0 0 ${graph.width} ${graph.height}`}
        width={graph.width}
        height={graph.height}
        style={`width: ${graph.width}px; height: ${graph.height}px; min-width: 100%;`}
        aria-label={`Topology of fabric ${graph.fabric}`}
        role="img"
      >
        <g class="topology__tiers">
          {#each graph.tiers as tier (tier.label)}
            <line class="topology__tier-line" x1="110" y1={tier.y} x2={graph.width - 20} y2={tier.y}></line>
            <text class="topology__tier-label" x="16" y={tier.y} dominant-baseline="middle">{tier.label}</text>
          {/each}
        </g>

        <g class="topology__links">
          {#each graph.links as link (link.id)}
            <a
              href={appHref(`/services/ip-fabric-link/${encodeURIComponent(link.routeId)}`)}
              class="topology__link-link"
              aria-label={`Open fabric link ${link.lowerSwitch} ${link.lowerPort} ↔ ${link.upperSwitch} ${link.upperPort}`}
            >
              <line x1={link.x1} y1={link.y1} x2={link.x2} y2={link.y2} class="topology__link"></line>
              <line x1={link.x1} y1={link.y1} x2={link.x2} y2={link.y2} class="topology__link-hit"></line>
              {@render portLabel(link.lowerLabel)}
              {@render portLabel(link.upperLabel)}
            </a>
          {/each}

          {#each graph.servers as server (server.name)}
            {#each server.links as link (link.id)}
              <g class="topology__server-link-group">
                <line x1={link.x1} y1={link.y1} x2={link.x2} y2={link.y2} class="topology__link topology__link--server"></line>
                {@render portLabel(link.serverLabel)}
                {@render portLabel(link.switchLabel)}
              </g>
            {/each}
          {/each}
        </g>

        <g class="topology__servers">
          {#each graph.servers as server (server.name)}
            <a href={appHref(`/services/ip-fabric-server/${encodeURIComponent(server.routeId)}`)}>
              <g class="topology__server" transform={`translate(${server.x}, ${server.y})`}>
                <rect
                  class="topology__server-core"
                  x={-TOPOLOGY_SERVER_WIDTH / 2}
                  y={-TOPOLOGY_SERVER_HEIGHT / 2}
                  width={TOPOLOGY_SERVER_WIDTH}
                  height={TOPOLOGY_SERVER_HEIGHT}
                  rx="8"
                ></rect>
                <text class="topology__server-name" text-anchor="middle">
                  <tspan x="0" y="-2">{server.name}</tspan>
                  <tspan x="0" y="11">{server.profile}</tspan>
                </text>
              </g>
            </a>
          {/each}
        </g>

        <g class="topology__switches">
          {#each graph.switches as node (node.name)}
            <a href={appHref(`/devices/${encodeURIComponent(node.name)}`)}>
              <g
                class="topology__switch"
                class:topology__switch--noconfig={noConfig(node.name)}
                class:topology__switch--pending={pending(node.name)}
                transform={`translate(${node.x}, ${node.y})`}
              >
                <rect
                  class="topology__switch-core"
                  x={-TOPOLOGY_SWITCH_WIDTH / 2}
                  y={-TOPOLOGY_SWITCH_HEIGHT / 2}
                  width={TOPOLOGY_SWITCH_WIDTH}
                  height={TOPOLOGY_SWITCH_HEIGHT}
                  rx="10"
                ></rect>
                <text class="topology__switch-name" text-anchor="middle">
                  <tspan x="0" y="-3">{node.name}</tspan>
                  <tspan x="0" y="13">{subtitle(node.role, node.id)}</tspan>
                </text>
              </g>
            </a>
          {/each}
        </g>
      </svg>
    </div>
  </div>

  {#each graph.warnings as warning (warning)}
    <p class="topology__note topology__note--warning">{warning}</p>
  {/each}
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

  .topology__tier-line {
    stroke: rgb(var(--sw-line-rgb) / 0.07);
    stroke-width: 1;
    stroke-dasharray: 4 6;
  }

  .topology__tier-label {
    fill: var(--sw-text-muted);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .topology__link-link {
    cursor: pointer;
    text-decoration: none;
  }

  .topology__link {
    stroke: rgb(var(--sw-accent-rgb) / 0.55);
    stroke-width: 1.6;
    transition: stroke 0.15s ease, stroke-width 0.15s ease;
    pointer-events: none;
  }

  .topology__link--server {
    stroke: rgb(var(--sw-line-rgb) / 0.30);
    stroke-dasharray: 5 4;
  }

  .topology__link-hit {
    stroke: transparent;
    stroke-width: 14;
    pointer-events: stroke;
  }

  .topology__link-link:hover .topology__link {
    stroke: var(--sw-accent-bright);
    stroke-width: 2.6;
  }

  .topology__port-bg {
    fill: rgb(var(--sw-navy-rgb) / 0.92);
    stroke: var(--sw-border-subtle);
    stroke-width: 1;
  }

  .topology__port {
    fill: var(--sw-text-secondary);
    font-size: 10px;
    font-family: var(--sw-font-mono);
    dominant-baseline: middle;
    pointer-events: none;
  }

  .topology__port-group {
    pointer-events: none;
  }

  .topology__switch,
  .topology__server {
    cursor: pointer;
  }

  .topology__switch-core {
    fill: rgb(var(--sw-navy-rgb) / 0.92);
    stroke: var(--sw-accent);
    stroke-width: 1.4;
    transition: stroke 0.15s ease;
  }

  .topology__switch:hover .topology__switch-core {
    stroke: var(--sw-accent-bright);
  }

  .topology__switch--pending .topology__switch-core {
    stroke: var(--sw-warning);
  }

  .topology__switch--noconfig .topology__switch-core {
    stroke: rgb(var(--sw-danger-rgb) / 0.9);
    stroke-dasharray: 5 3;
  }

  .topology__switch-name,
  .topology__server-name {
    fill: var(--sw-text-primary);
    text-anchor: middle;
    font-size: 12px;
    font-weight: 600;
    pointer-events: none;
  }

  .topology__switch-name tspan:last-child,
  .topology__server-name tspan:last-child {
    fill: var(--sw-text-muted);
    font-size: 10px;
    font-weight: 500;
  }

  .topology__server-core {
    fill: rgb(var(--sw-navy-rgb) / 0.92);
    stroke: var(--sw-border-default);
    stroke-width: 1.2;
    transition: stroke 0.15s ease;
  }

  .topology__server:hover .topology__server-core {
    stroke: var(--sw-accent);
  }

  .topology__note {
    margin: 0;
    font-size: 12px;
    color: var(--sw-text-muted);
  }

  .topology__note--warning {
    color: var(--sw-warning);
  }
</style>
