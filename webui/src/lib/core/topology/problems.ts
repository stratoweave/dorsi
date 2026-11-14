import type { LldpNeighbor, TopologyGraph, TopologyLink } from '$lib/core/topology/model';

export type ProblemSeverity = 'danger' | 'warning';

export interface FabricProblem {
  id: string;
  severity: ProblemSeverity;
  fabric: string;
  title: string;
  /** What is wrong, with the switches and ports involved. */
  detail: string[];
  /** What to check first. */
  hint: string;
  linkRouteId: string;
}

function linkName(link: TopologyLink): string {
  return `${link.lowerSwitch} ${link.lowerPort} ↔ ${link.upperSwitch} ${link.upperPort}`;
}

function sees(neighbor: LldpNeighbor): string {
  return [neighbor.device || '?', neighbor.interface || '?'].join(' ');
}

/** As the CFS compares them: a switch may report a fully qualified name. */
function isExpected(neighbor: LldpNeighbor, device: string, port: string): boolean {
  return (neighbor.device === device || neighbor.device.startsWith(`${device}.`)) && neighbor.interface === port;
}

/** The ends that see another switch or port than the link describes, as text. */
function mismatchedEnds(link: TopologyLink): string[] {
  const ends = [
    { from: `${link.lowerSwitch} ${link.lowerPort}`, neighbor: link.lowerNeighbor, device: link.upperSwitch, port: link.upperPort },
    { from: `${link.upperSwitch} ${link.upperPort}`, neighbor: link.upperNeighbor, device: link.lowerSwitch, port: link.lowerPort }
  ];
  const out: string[] = [];
  for (const end of ends) {
    if (end.neighbor && !isExpected(end.neighbor, end.device, end.port)) {
      out.push(`${end.from} sees ${sees(end.neighbor)}, expected ${end.device} ${end.port}.`);
    }
  }
  return out;
}

/** The problems of one link, the cause first: a miscabled link also has its eBGP session down. */
function linkProblems(fabric: string, link: TopologyLink): FabricProblem[] {
  const base = { fabric, linkRouteId: link.routeId };
  if (link.cablingStatus === 'mismatch') {
    const detail = mismatchedEnds(link);
    if (detail.length === 0) detail.push(`${linkName(link)}: an end sees another switch or port over LLDP.`);
    if (link.bgpStatus === 'down') detail.push('The eBGP session is down because of it.');
    return [{
      ...base,
      id: `${link.id}|cabling`,
      severity: 'danger',
      title: `Miscabled link ${linkName(link)}`,
      detail,
      hint: 'The cable is plugged into another port than the fabric describes. Move it to the expected port, or change the link if the cabling is right.'
    }];
  }
  if (link.linkStatus === 'down') {
    return [{
      ...base,
      id: `${link.id}|link`,
      severity: 'danger',
      title: `Link down ${linkName(link)}`,
      detail: ['The interfaces on the link are down.'],
      hint: 'Check that the cable is plugged in at both ends and that the optics work.'
    }];
  }
  const problems: FabricProblem[] = [];
  if (link.linkStatus === 'up' && link.bgpStatus === 'down') {
    problems.push({
      ...base,
      id: `${link.id}|bgp`,
      severity: 'danger',
      title: `eBGP down ${linkName(link)}`,
      detail: ['The interfaces are up, but the eBGP session does not establish.'],
      hint: link.cablingStatus === 'ok'
        ? 'The cabling is right: check the addresses and AS numbers in the configuration of both switches.'
        : 'Check the cabling and the addresses and AS numbers on both switches.'
    });
  }
  if (link.cablingStatus === 'no-neighbor') {
    problems.push({
      ...base,
      id: `${link.id}|lldp`,
      severity: 'warning',
      title: `No LLDP neighbor ${linkName(link)}`,
      detail: ['The link is up, but no end sees an LLDP neighbor, so DORSI cannot check where the cable goes.'],
      hint: 'LLDP may be off on the far end, or the link has only just come up.'
    });
  }
  return problems;
}

const SEVERITY_ORDER: Record<ProblemSeverity, number> = { danger: 0, warning: 1 };

/** Every problem in the fabrics, the most severe first. */
export function fabricProblems(graphs: TopologyGraph[]): FabricProblem[] {
  return graphs
    .flatMap((graph) => graph.links.flatMap((link) => linkProblems(graph.fabric, link)))
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}
