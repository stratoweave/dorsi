<script lang="ts">
  import EmptyState from '$lib/core/ui/EmptyState.svelte';
  import StatusPill from '$lib/core/ui/StatusPill.svelte';
  import { appHref } from '$lib/core/util/nav';

  import type { FabricProblem } from '$lib/core/topology/problems';

  let {
    problems,
    liveState,
    showFabric = false
  }: {
    problems: FabricProblem[];
    /** Whether any link reports live state; without it there is nothing to judge by. */
    liveState: boolean;
    showFabric?: boolean;
  } = $props();
</script>

{#if problems.length === 0 && !liveState}
  <EmptyState compact icon="alert" title="No live state yet" description="No fabric link reports its state, so problems cannot be detected. The devices may be unreachable or mocked." />
{:else if problems.length === 0}
  <EmptyState compact icon="check" title="No problems detected" description="Every fabric link with live state is up, has its eBGP session and is cabled as described." />
{:else}
  <ul class="problems card">
    {#each problems as problem (problem.id)}
      <li class="problem" class:problem--danger={problem.severity === 'danger'} class:problem--warning={problem.severity === 'warning'}>
        <div class="problem__head">
          <StatusPill tone={problem.severity} label={problem.severity === 'danger' ? 'Error' : 'Warning'} />
          <a class="problem__title" href={appHref(`/services/ip-fabric-link/${encodeURIComponent(problem.linkRouteId)}`)}>{problem.title}</a>
          {#if showFabric}
            <span class="problem__fabric">{problem.fabric}</span>
          {/if}
        </div>
        {#each problem.detail as line (line)}
          <p class="problem__detail">{line}</p>
        {/each}
        <p class="problem__hint">{problem.hint}</p>
      </li>
    {/each}
  </ul>
{/if}

<style>
  .problems {
    list-style: none;
    margin: 0;
    padding: 0;
    overflow: hidden;
  }

  .problem {
    display: grid;
    gap: 4px;
    padding: 12px 16px;
    border-left: 3px solid transparent;
  }

  .problem + .problem {
    border-top: 1px solid var(--sw-border-subtle);
  }

  .problem--danger {
    border-left-color: rgb(var(--sw-danger-rgb) / 0.9);
  }

  .problem--warning {
    border-left-color: var(--sw-warning);
  }

  .problem__head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }

  .problem__title {
    color: var(--sw-text-primary);
    font-family: var(--sw-font-mono);
    font-size: 13px;
    font-weight: 600;
    text-decoration: none;
    overflow-wrap: anywhere;
  }

  .problem__title:hover {
    color: var(--sw-accent);
  }

  .problem__fabric {
    font-size: 12px;
    color: var(--sw-text-muted);
  }

  .problem__detail,
  .problem__hint {
    margin: 0;
    font-size: 13px;
    overflow-wrap: anywhere;
  }

  .problem__detail {
    color: var(--sw-text-primary);
  }

  .problem__hint {
    color: var(--sw-text-secondary);
  }
</style>
