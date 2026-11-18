import type { LldpNeighbor, OverlayPlacement, TopologyGraph, TopologyLink, TopologyServer, TopologyServerLink } from '$lib/core/topology/model';

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
  /** The page of the link or switch, for appHref. */
  href: string;
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

/**
 * A session can take up to its connect-retry time, 120 seconds by default on
 * SR Linux, to establish after its link comes up or the configuration
 * changes; it is only a problem once it stays down this long on a working
 * link. A backend that does not report how long counts as past it.
 */
const BGP_GRACE_SECONDS = 120;

/** The problems of one link, the cause first: a miscabled link also has its eBGP session down. */
function linkProblems(fabric: string, link: TopologyLink): FabricProblem[] {
  const base = { fabric, href: `/services/ip-fabric-link/${encodeURIComponent(link.routeId)}` };
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
  if (link.linkStatus === 'up' && link.bgpStatus === 'down' && (link.bgpDownSeconds ?? BGP_GRACE_SECONDS) >= BGP_GRACE_SECONDS) {
    problems.push({
      ...base,
      id: `${link.id}|bgp`,
      severity: 'danger',
      title: `eBGP down ${linkName(link)}`,
      detail: [`The interfaces are up, but the eBGP session has not established for ${link.bgpDownSeconds ?? BGP_GRACE_SECONDS} s.`],
      hint: link.cablingStatus === 'ok'
        ? 'The cabling is right: check that the session is enabled on both switches and that their addresses and AS numbers match.'
        : 'Check the cabling, that the session is enabled on both switches and that their addresses and AS numbers match.'
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

/**
 * The switches DORSI gets no state from: every link of the switch has an
 * unknown status while other links of the fabric are known. The status of a
 * link is unknown when one of its ends cannot be read, and the one switch that
 * all such links share is the one that does not answer.
 */
function silentSwitches(graph: TopologyGraph): string[] {
  const known = (link: TopologyLink) => link.linkStatus !== 'unknown';
  if (!graph.links.some(known)) return [];
  return graph.switches
    .map((node) => node.name)
    .filter((name) => {
      const links = graph.links.filter((link) => link.lowerSwitch === name || link.upperSwitch === name);
      return links.length > 0 && !links.some(known);
    });
}

function silentSwitchProblem(fabric: string, name: string): FabricProblem {
  return {
    id: `${fabric}|${name}|silent`,
    severity: 'danger',
    fabric,
    title: `No state from ${name}`,
    detail: [`DORSI gets no state from ${name}, so the state of its links is unknown.`],
    hint: 'Check that the switch is running and that its management address answers NETCONF.',
    href: `/devices/${encodeURIComponent(name)}`
  };
}

function serverLinkName(link: TopologyServerLink, server: string): string {
  return `${link.switchName} ${link.switchPort} ↔ ${server} ${link.serverPort}`;
}

/** The problems of the links of one server. Only the leaf end of a server link can be read. */
function serverProblems(fabric: string, server: TopologyServer, silent: Set<string>): FabricProblem[] {
  const base = { fabric, href: `/services/ip-fabric-server/${encodeURIComponent(server.routeId)}` };
  const working = server.links.filter((link) => link.linkStatus === 'up' && link.cablingStatus !== 'mismatch');
  const problems: FabricProblem[] = [];
  for (const link of server.links) {
    if (silent.has(link.switchName)) continue;
    if (link.cablingStatus === 'mismatch' && link.neighbor) {
      problems.push({
        ...base,
        id: `${server.name}|${link.id}|cabling`,
        severity: 'danger',
        title: `Miscabled server link ${serverLinkName(link, server.name)}`,
        detail: [`${link.switchName} ${link.switchPort} sees ${sees(link.neighbor)}, expected ${server.name} ${link.serverPort}.`],
        hint: 'The cable is plugged into another server or server port than the fabric describes. Move it, or change the server link if the cabling is right.'
      });
    } else if (link.linkStatus === 'down') {
      const others = working.map((other) => other.switchName).filter((name) => name !== link.switchName);
      problems.push({
        ...base,
        id: `${server.name}|${link.id}|link`,
        // A server that still has a working link has lost redundancy, not its connection
        severity: working.length > 0 ? 'warning' : 'danger',
        title: `Server link down ${serverLinkName(link, server.name)}`,
        detail: [
          `The leaf port ${link.switchName} ${link.switchPort} is down.`,
          working.length === 0
            ? `${server.name} has no working link to the fabric.`
            : others.length > 0
              ? `${server.name} still reaches the fabric through ${[...new Set(others)].join(', ')}, without redundancy.`
              : `${server.name} still reaches the fabric through its other link to ${link.switchName}.`
        ],
        hint: 'Check the cable and the network interface of the server.'
      });
    }
  }
  return problems;
}

/**
 * The problems of the overlay on one leaf: a network or VRF whose network
 * instance or EVPN instance is down, and a server LAG that is down while its
 * ports are up (LACP did not come up) or whose ethernet segment is down. A LAG
 * with its ports down is a server link problem already.
 */
function overlayProblems(graph: TopologyGraph, placement: OverlayPlacement): FabricProblem[] {
  const base = { fabric: graph.fabric, href: `/devices/${encodeURIComponent(placement.switchName)}` };
  const id = `${placement.kind}|${placement.owner}|${placement.name}|${placement.switchName}`;
  if (placement.kind !== 'lag') {
    const what = placement.kind === 'network' ? 'Network' : 'VRF';
    const instance = placement.kind === 'network' ? 'MAC-VRF' : 'IP-VRF';
    const detail: string[] = [];
    if (placement.operStatus === 'down') detail.push(`The ${instance} ${placement.owner}-${placement.name} on ${placement.switchName} is down.`);
    if (placement.evpnStatus === 'down') {
      detail.push(`Its EVPN instance is down, so ${placement.switchName} exchanges no routes for it with the other leaves.`);
    }
    if (detail.length === 0) return [];
    return [{
      ...base,
      id,
      severity: 'danger',
      title: `${what} ${placement.owner}/${placement.name} down on ${placement.switchName}`,
      detail,
      hint: placement.kind === 'network'
        ? 'Check that the network has an interface that is up and that vxlan1 has its VNI on the switch.'
        : 'Check that the VRF has an IRB interface that is up and that vxlan1 has its layer 3 VNI on the switch.'
    }];
  }
  const server = graph.servers.find((candidate) => candidate.name === placement.owner);
  const ports = server?.links.filter((link) => link.switchName === placement.switchName) ?? [];
  const portsUp = ports.length > 0 && ports.every((link) => link.linkStatus === 'up');
  const serverHref = server ? `/services/ip-fabric-server/${encodeURIComponent(server.routeId)}` : base.href;
  if (placement.operStatus === 'down' && portsUp) {
    return [{
      ...base,
      href: serverHref,
      id,
      severity: 'danger',
      title: `LAG ${placement.name} of ${placement.owner} down on ${placement.switchName}`,
      detail: [
        `${ports.length === 1 ? `The port ${ports[0].switchPort} is` : `The ports ${ports.map((link) => link.switchPort).join(', ')} are`} up, but the LAG is not: LACP has not come up with ${placement.owner}.`
      ],
      hint: `Check that ${placement.owner} bonds the ports with LACP (802.3ad) and that the cables go to the ports the server describes.`
    }];
  }
  if (placement.operStatus === 'up' && placement.evpnStatus === 'down') {
    return [{
      ...base,
      href: serverHref,
      id,
      severity: 'danger',
      title: `Ethernet segment of ${placement.owner} down on ${placement.switchName}`,
      detail: [`The LAG ${placement.name} is up, but its EVPN ethernet segment is down, so ${placement.switchName} does not forward for ${placement.owner} with its other leaf.`],
      hint: 'Check that the ethernet segment has the same ESI on both leaves of the server and that EVPN is up on the switch.'
    }];
  }
  return [];
}

function graphProblems(graph: TopologyGraph): FabricProblem[] {
  const silent = new Set(silentSwitches(graph));
  // The links of a silent switch are only half known, what is seen of them follows from it
  const links = graph.links.filter((link) => !silent.has(link.lowerSwitch) && !silent.has(link.upperSwitch));
  return [
    ...[...silent].map((name) => silentSwitchProblem(graph.fabric, name)),
    ...links.flatMap((link) => linkProblems(graph.fabric, link)),
    ...graph.servers.flatMap((server) => serverProblems(graph.fabric, server, silent)),
    ...graph.overlay
      .filter((placement) => !silent.has(placement.switchName))
      .flatMap((placement) => overlayProblems(graph, placement))
  ];
}

const SEVERITY_ORDER: Record<ProblemSeverity, number> = { danger: 0, warning: 1 };

/** Every problem in the fabrics, the most severe first. */
export function fabricProblems(graphs: TopologyGraph[]): FabricProblem[] {
  return graphs
    .flatMap(graphProblems)
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}
