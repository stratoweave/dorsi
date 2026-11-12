import { arrayAt, numberAt, stringAt } from '$lib/core/util/json';
import { getFabricLinkRouteId } from '$lib/modules/ip-fabric-link/model';
import { getFabricServerRouteId } from '$lib/modules/ip-fabric-server/model';

export type SwitchRole = 'super-spine' | 'spine' | 'leaf';
export type LinkStatus = 'up' | 'down' | 'unknown';

export const TOPOLOGY_SWITCH_WIDTH = 132;
export const TOPOLOGY_SWITCH_HEIGHT = 46;
export const TOPOLOGY_SERVER_WIDTH = 124;
export const TOPOLOGY_SERVER_HEIGHT = 34;
export const TOPOLOGY_LABEL_HEIGHT = 16;

const SLOT_WIDTH = 176;
const TIER_GAP = 150;
const MARGIN_LEFT = 120;
const MARGIN_RIGHT = 40;
const MARGIN_TOP = 40;
const MARGIN_BOTTOM = 40;
const SERVER_SLOT_WIDTH = 132;
/** How far from its node a port label may sit, tried in this order until it does not overlap another label. */
const PORT_LABEL_DISTANCES = [18, 32, 46];

/** Top to bottom. */
const SWITCH_TIERS: { role: SwitchRole; label: string }[] = [
  { role: 'super-spine', label: 'Super-spine' },
  { role: 'spine', label: 'Spine' },
  { role: 'leaf', label: 'Leaf' }
];

export interface TopologySwitch {
  name: string;
  id: number | null;
  role: SwitchRole;
  type: string;
  pod: string;
  plane: string;
  x: number;
  y: number;
}

export interface TopologyPortLabel {
  text: string;
  x: number;
  y: number;
  width: number;
}

export interface TopologyLink {
  id: string;
  routeId: string;
  lowerSwitch: string;
  lowerPort: string;
  upperSwitch: string;
  upperPort: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  lowerLabel: TopologyPortLabel;
  upperLabel: TopologyPortLabel;
  /** The oper-state of the interfaces on the link. */
  linkStatus: LinkStatus;
  /** The state of the eBGP session on the link. */
  bgpStatus: LinkStatus;
  /** Down if either is down, up only when both are up. */
  status: LinkStatus;
}

export interface TopologyServerLink {
  id: string;
  switchName: string;
  switchPort: string;
  serverPort: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  switchLabel: TopologyPortLabel;
  serverLabel: TopologyPortLabel;
}

export interface TopologyServer {
  name: string;
  routeId: string;
  profile: string;
  x: number;
  y: number;
  links: TopologyServerLink[];
}

export interface TopologyTier {
  label: string;
  y: number;
}

export interface TopologyGraph {
  fabric: string;
  width: number;
  height: number;
  tiers: TopologyTier[];
  switches: TopologySwitch[];
  links: TopologyLink[];
  servers: TopologyServer[];
  /** Problems that keep part of the fabric off the map, such as a link to a switch that does not exist. */
  warnings: string[];
}

export interface FabricPayload {
  'ip-fabric:ip-fabric'?: {
    fabric?: unknown[];
  };
}

function compareNames(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true });
}

function toStatus(value: string): LinkStatus {
  return value === 'up' || value === 'down' ? value : 'unknown';
}

/** The status of a link as one: down if the interfaces or the session are down, up only when both are up. */
export function combineStatus(linkStatus: LinkStatus, bgpStatus: LinkStatus): LinkStatus {
  if (linkStatus === 'down' || bgpStatus === 'down') return 'down';
  if (linkStatus === 'up' && bgpStatus === 'up') return 'up';
  return 'unknown';
}

function isSwitchRole(value: string): value is SwitchRole {
  return value === 'super-spine' || value === 'spine' || value === 'leaf';
}

/** `ethernet-1/49` becomes `e1/49`, which fits next to the line. */
function shortPort(port: string): string {
  return port.replace(/^ethernet-/, 'e');
}

function portLabel(port: string, x: number, y: number): TopologyPortLabel {
  const text = shortPort(port);
  return { text, x, y, width: Math.max(28, text.length * 6.6 + 12) };
}

/** The point of the line from (x1, y1) to (x2, y2) that is `dy` below or above its start. */
function alongY(x1: number, y1: number, x2: number, y2: number, dy: number): { x: number; y: number } {
  const span = Math.abs(y2 - y1) || 1;
  const t = Math.min(0.5, dy / span);
  return { x: x1 + (x2 - x1) * t, y: y1 + (y2 - y1) * t };
}

/** Puts the port labels on their lines, each as close to its node as it can be without covering another label. */
class LabelPlacer {
  private placed: TopologyPortLabel[] = [];

  private collides(label: TopologyPortLabel): boolean {
    return this.placed.some(
      (other) =>
        Math.abs(other.x - label.x) < (other.width + label.width) / 2 + 2 &&
        Math.abs(other.y - label.y) < TOPOLOGY_LABEL_HEIGHT + 2
    );
  }

  /** The label of `port`, on the line that starts at the node end (x1, y1) and runs to (x2, y2). */
  place(port: string, x1: number, y1: number, x2: number, y2: number): TopologyPortLabel {
    let first: TopologyPortLabel | null = null;
    for (const distance of PORT_LABEL_DISTANCES) {
      const at = alongY(x1, y1, x2, y2, distance);
      const label = portLabel(port, at.x, at.y);
      first ??= label;
      if (!this.collides(label)) {
        this.placed.push(label);
        return label;
      }
    }
    this.placed.push(first!);
    return first!;
  }
}

interface Endpoint {
  linkId: string;
  peerX: number;
}

/**
 * Spread the ends of the lines along the edge of a node, ordered by where the
 * other end is, so that the lines do not cross each other needlessly.
 */
interface EdgePoint {
  x: number;
  index: number;
}

function spreadAlongEdge(nodeX: number, width: number, endpoints: Endpoint[]): Map<string, EdgePoint> {
  const sorted = [...endpoints].sort((a, b) => a.peerX - b.peerX);
  const out = new Map<string, EdgePoint>();
  sorted.forEach((endpoint, index) => {
    out.set(endpoint.linkId, { x: nodeX - width / 2 + ((index + 1) * width) / (sorted.length + 1), index });
  });
  return out;
}

function sortSwitches(role: SwitchRole, list: TopologySwitch[]): TopologySwitch[] {
  return [...list].sort((a, b) => {
    if (role === 'super-spine') {
      return compareNames(a.plane, b.plane) || compareNames(a.name, b.name);
    }
    if (role === 'spine') {
      return compareNames(a.pod, b.pod) || compareNames(a.plane, b.plane) || compareNames(a.name, b.name);
    }
    return compareNames(a.pod, b.pod) || compareNames(a.name, b.name);
  });
}

/** The map of one fabric: its switches in tiers, the links between them and the servers below the leaves. */
export function buildFabricGraph(fabricApi: unknown): TopologyGraph {
  const fabric = stringAt(fabricApi, 'name');
  const warnings: string[] = [];

  const byRole = new Map<SwitchRole, TopologySwitch[]>();
  const switches = new Map<string, TopologySwitch>();
  for (const entry of arrayAt(fabricApi, 'switch')) {
    const name = stringAt(entry, 'name').trim();
    const role = stringAt(entry, 'role');
    if (!name) continue;
    if (!isSwitchRole(role)) {
      warnings.push(`Switch ${name} has no known role, so it is not on the map.`);
      continue;
    }
    const node: TopologySwitch = {
      name,
      id: numberAt(entry, 'id'),
      role,
      type: stringAt(entry, 'type'),
      pod: stringAt(entry, 'pod') || 'pod-1',
      plane: stringAt(entry, 'plane') || 'plane-1',
      x: 0,
      y: 0
    };
    switches.set(name, node);
    byRole.set(role, [...(byRole.get(role) ?? []), node]);
  }

  // The tiers that exist, top to bottom
  const presentTiers = SWITCH_TIERS.filter((tier) => (byRole.get(tier.role) ?? []).length > 0);
  const serverEntries = arrayAt(fabricApi, 'server');
  const hasServers = serverEntries.length > 0 && presentTiers.some((tier) => tier.role === 'leaf');

  const widest = Math.max(1, ...presentTiers.map((tier) => byRole.get(tier.role)!.length));
  const width = MARGIN_LEFT + widest * SLOT_WIDTH + MARGIN_RIGHT;
  const centerX = MARGIN_LEFT + (width - MARGIN_LEFT - MARGIN_RIGHT) / 2;

  const tiers: TopologyTier[] = [];
  const labels = new LabelPlacer();
  presentTiers.forEach((tier, index) => {
    const y = MARGIN_TOP + TOPOLOGY_SWITCH_HEIGHT / 2 + index * TIER_GAP;
    tiers.push({ label: tier.label, y });
    const row = sortSwitches(tier.role, byRole.get(tier.role)!);
    row.forEach((node, position) => {
      node.y = y;
      node.x = centerX - ((row.length - 1) * SLOT_WIDTH) / 2 + position * SLOT_WIDTH;
    });
  });

  const serverY = MARGIN_TOP + TOPOLOGY_SWITCH_HEIGHT / 2 + presentTiers.length * TIER_GAP;
  if (hasServers) {
    tiers.push({ label: 'Servers', y: serverY });
  }

  // Both ends of every line, so that they can be spread along the nodes
  interface RawLink {
    id: string;
    routeId: string;
    lower: TopologySwitch;
    lowerPort: string;
    upper: TopologySwitch;
    upperPort: string;
    linkStatus: LinkStatus;
    bgpStatus: LinkStatus;
  }
  const rawLinks: RawLink[] = [];
  for (const entry of arrayAt(fabricApi, 'fabric-link')) {
    const lowerName = stringAt(entry, 'lower-switch');
    const upperName = stringAt(entry, 'upper-switch');
    const lowerPort = stringAt(entry, 'lower-port');
    const upperPort = stringAt(entry, 'upper-port');
    const lower = switches.get(lowerName);
    const upper = switches.get(upperName);
    if (!lower || !upper) {
      warnings.push(`The link ${lowerName} ${lowerPort} ↔ ${upperName} ${upperPort} joins a switch that is not on the map.`);
      continue;
    }
    const routeId = getFabricLinkRouteId({ fabric, lowerSwitch: lowerName, lowerPort, upperSwitch: upperName, upperPort });
    rawLinks.push({
      id: routeId,
      routeId,
      lower,
      lowerPort,
      upper,
      upperPort,
      linkStatus: toStatus(stringAt(entry, 'state', 'link-status')),
      bgpStatus: toStatus(stringAt(entry, 'state', 'bgp-status'))
    });
  }

  interface RawServerLink {
    id: string;
    server: string;
    leaf: TopologySwitch;
    switchPort: string;
    serverPort: string;
  }
  const rawServers: { name: string; profile: string; links: RawServerLink[] }[] = [];
  if (hasServers) {
    for (const entry of serverEntries) {
      const name = stringAt(entry, 'name');
      if (!name) continue;
      const links: RawServerLink[] = [];
      for (const link of arrayAt(entry, 'connectivity', 'link')) {
        const switchName = stringAt(link, 'switch');
        const leaf = switches.get(switchName);
        const switchPort = stringAt(link, 'switch-port');
        const serverPort = stringAt(link, 'server-port');
        if (!leaf) {
          warnings.push(`Server ${name} is linked to ${switchName}, which is not on the map.`);
          continue;
        }
        links.push({ id: `${name},${switchName},${switchPort}`, server: name, leaf, switchPort, serverPort });
      }
      rawServers.push({ name, profile: stringAt(entry, 'connectivity', 'profile') || 'dual-homed', links });
    }
  }

  // Servers below the leaves they connect to, kept apart from each other
  const servers: TopologyServer[] = rawServers
    .map((server) => {
      const xs = server.links.map((link) => link.leaf.x);
      const x = xs.length > 0 ? xs.reduce((sum, value) => sum + value, 0) / xs.length : centerX;
      return { server, x };
    })
    .sort((a, b) => a.x - b.x || compareNames(a.server.name, b.server.name))
    .reduce<{ server: (typeof rawServers)[number]; x: number }[]>((placed, item) => {
      const previous = placed[placed.length - 1];
      placed.push({ server: item.server, x: previous ? Math.max(item.x, previous.x + SERVER_SLOT_WIDTH) : item.x });
      return placed;
    }, [])
    .map(({ server, x }) => ({
      name: server.name,
      routeId: getFabricServerRouteId({ fabric, name: server.name }),
      profile: server.profile,
      x,
      y: serverY,
      links: [] as TopologyServerLink[]
    }));
  const serverByName = new Map(servers.map((server) => [server.name, server]));

  // Where each line meets each node
  const upEnds = new Map<string, Endpoint[]>();
  const downEnds = new Map<string, Endpoint[]>();
  const push = (map: Map<string, Endpoint[]>, node: string, endpoint: Endpoint) => {
    map.set(node, [...(map.get(node) ?? []), endpoint]);
  };
  for (const link of rawLinks) {
    push(upEnds, link.lower.name, { linkId: link.id, peerX: link.upper.x });
    push(downEnds, link.upper.name, { linkId: link.id, peerX: link.lower.x });
  }
  for (const server of rawServers) {
    const placed = serverByName.get(server.name);
    for (const link of server.links) {
      push(downEnds, link.leaf.name, { linkId: link.id, peerX: placed?.x ?? link.leaf.x });
    }
  }

  const upX = new Map<string, EdgePoint>();
  const downX = new Map<string, EdgePoint>();
  const serverX = new Map<string, EdgePoint>();
  for (const [name, ends] of upEnds) {
    for (const [id, point] of spreadAlongEdge(switches.get(name)!.x, TOPOLOGY_SWITCH_WIDTH, ends)) upX.set(`${name}|${id}`, point);
  }
  for (const [name, ends] of downEnds) {
    for (const [id, point] of spreadAlongEdge(switches.get(name)!.x, TOPOLOGY_SWITCH_WIDTH, ends)) downX.set(`${name}|${id}`, point);
  }
  for (const server of rawServers) {
    const placed = serverByName.get(server.name)!;
    const ends = server.links.map((link) => ({ linkId: link.id, peerX: link.leaf.x }));
    for (const [id, point] of spreadAlongEdge(placed.x, TOPOLOGY_SERVER_WIDTH, ends)) serverX.set(`${server.name}|${id}`, point);
  }

  const halfSwitch = TOPOLOGY_SWITCH_HEIGHT / 2;
  const links: TopologyLink[] = rawLinks.map((link) => {
    // The lower switch is drawn below the upper one: the line leaves the top of the lower and the bottom of the upper
    const lowerEnd = upX.get(`${link.lower.name}|${link.id}`);
    const upperEnd = downX.get(`${link.upper.name}|${link.id}`);
    const x1 = lowerEnd?.x ?? link.lower.x;
    const y1 = link.lower.y - halfSwitch;
    const x2 = upperEnd?.x ?? link.upper.x;
    const y2 = link.upper.y + halfSwitch;
    return {
      id: link.id,
      routeId: link.routeId,
      lowerSwitch: link.lower.name,
      lowerPort: link.lowerPort,
      upperSwitch: link.upper.name,
      upperPort: link.upperPort,
      x1,
      y1,
      x2,
      y2,
      lowerLabel: labels.place(link.lowerPort, x1, y1, x2, y2),
      upperLabel: labels.place(link.upperPort, x2, y2, x1, y1),
      linkStatus: link.linkStatus,
      bgpStatus: link.bgpStatus,
      status: combineStatus(link.linkStatus, link.bgpStatus)
    };
  });

  for (const server of rawServers) {
    const placed = serverByName.get(server.name)!;
    for (const link of server.links) {
      const serverEnd = serverX.get(`${server.name}|${link.id}`);
      const leafEnd = downX.get(`${link.leaf.name}|${link.id}`);
      const x1 = serverEnd?.x ?? placed.x;
      const y1 = placed.y - TOPOLOGY_SERVER_HEIGHT / 2;
      const x2 = leafEnd?.x ?? link.leaf.x;
      const y2 = link.leaf.y + halfSwitch;
      placed.links.push({
        id: link.id,
        switchName: link.leaf.name,
        switchPort: link.switchPort,
        serverPort: link.serverPort,
        x1,
        y1,
        x2,
        y2,
        serverLabel: labels.place(link.serverPort, x1, y1, x2, y2),
        switchLabel: labels.place(link.switchPort, x2, y2, x1, y1)
      });
    }
  }

  const rightmostServer = servers.reduce((max, server) => Math.max(max, server.x + TOPOLOGY_SERVER_WIDTH / 2), 0);
  const lastTierY = tiers.length > 0 ? tiers[tiers.length - 1].y : MARGIN_TOP;
  return {
    fabric,
    width: Math.max(width, rightmostServer + MARGIN_RIGHT),
    height: lastTierY + TOPOLOGY_SWITCH_HEIGHT / 2 + MARGIN_BOTTOM,
    tiers,
    switches: [...switches.values()],
    links,
    servers,
    warnings
  };
}

/** One map for every fabric in the payload. */
export function buildTopologyGraphs(payload: FabricPayload | null | undefined): TopologyGraph[] {
  const fabrics = payload?.['ip-fabric:ip-fabric']?.fabric;
  if (!Array.isArray(fabrics)) return [];
  return fabrics
    .map((fabric) => buildFabricGraph(fabric))
    .filter((graph) => graph.fabric !== '')
    .sort((a, b) => compareNames(a.fabric, b.fabric));
}
