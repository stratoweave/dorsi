import { parseNetinfraRouter } from '$lib/modules/netinfra-router/parse';

export interface NetinfraRouterApi {
  name?: string;
  id?: number;
  type?: string;
  role?: string;
  asn?: number;
  'approval-required'?: boolean;
}

export interface NetinfraBackboneLinkApi {
  'left-router'?: string;
  'left-interface'?: string;
  'right-router'?: string;
  'right-interface'?: string;
  state?: {
    'link-status'?: string;
  };
}

type LinkStatus = 'up' | 'down' | 'unknown';

export interface NetinfraPayload {
  'netinfra:netinfra'?: {
    router?: NetinfraRouterApi[];
    'backbone-link'?: NetinfraBackboneLinkApi[];
  };
}

interface TopologyLinkLabel {
  x: number;
  y: number;
  width: number;
  interfaceLine: string;
}

interface TopologyLinkGeometry {
  leftX: number;
  leftY: number;
  rightX: number;
  rightY: number;
  label: TopologyLinkLabel | null;
}

export interface TopologyLink {
  id: string;
  leftRouter: string;
  leftInterface: string;
  rightRouter: string;
  rightInterface: string;
  linkStatus: LinkStatus;
  /** Render coordinates; null when either endpoint router is unknown. */
  geometry: TopologyLinkGeometry | null;
}

export interface TopologyRouter {
  name: string;
  id: number | null;
  type: string;
  role: string;
  asn: number | null;
  approvalRequired: boolean;
  x: number;
  y: number;
  angle: number;
}

export interface TopologyGraph {
  width: number;
  height: number;
  routers: TopologyRouter[];
  links: TopologyLink[];
}

export const TOPOLOGY_ROUTER_RADIUS = 42;
export const TOPOLOGY_LINK_LABEL_HEIGHT = 56;
const TOPOLOGY_LINK_LABEL_MIN_WIDTH = 140;
const TOPOLOGY_LINK_LABEL_MAX_WIDTH = 260;
const TOPOLOGY_VIEW_PADDING = 48;

export function parseLinkStatus(value: unknown): LinkStatus {
  if (value === 'up') return 'up';
  if (value === 'down') return 'down';
  return 'unknown';
}

function getRouters(payload: NetinfraPayload | null | undefined): NetinfraRouterApi[] {
  return Array.isArray(payload?.['netinfra:netinfra']?.router) ? payload['netinfra:netinfra']!.router! : [];
}

function getLinks(payload: NetinfraPayload | null | undefined): NetinfraBackboneLinkApi[] {
  return Array.isArray(payload?.['netinfra:netinfra']?.['backbone-link'])
    ? payload['netinfra:netinfra']!['backbone-link']!
    : [];
}

const LINK_LABEL_CHAR_WIDTH = 7;
const LINK_LABEL_PADDING = 28;
const LINK_LABEL_SEPARATOR = ' ↔ ';

/**
 * Shorten `name` to fit `maxChars`: abbreviate the leading type word to two
 * letters and keep the numeric port suffix ("GigabitEthernet0/0/0/0" → "Gi0/0/0/0"),
 * ellipsis-truncating the tail as a fallback.
 */
function shortenInterfaceName(name: string, maxChars: number): string {
  const trimmed = name.trim();
  if (trimmed.length <= maxChars) {
    return trimmed;
  }
  const [, type = '', port = ''] = trimmed.match(/^(\D*)(\d.*)$/) ?? [];
  const candidate = type ? type.replace(/\W/g, '').slice(0, 2) + port : trimmed;
  if (candidate.length <= maxChars) {
    return candidate;
  }
  return maxChars <= 1 ? candidate.slice(0, Math.max(0, maxChars)) : `…${candidate.slice(1 - maxChars)}`;
}

// Per-interface character budget so that "<left> ↔ <right>" fits the widest
// allowed link-label box.
function getInterfaceLabelCharBudget(): number {
  const maxLineChars = Math.floor(
    (TOPOLOGY_LINK_LABEL_MAX_WIDTH - LINK_LABEL_PADDING) / LINK_LABEL_CHAR_WIDTH
  );
  return Math.max(4, Math.floor((maxLineChars - LINK_LABEL_SEPARATOR.length) / 2));
}

/**
 * Build the "<left> ↔ <right>" interface line shown on a backbone link,
 * shortening either side that would otherwise overflow the label box.
 */
function getLinkInterfaceLabel(leftInterface: string, rightInterface: string): string {
  const budget = getInterfaceLabelCharBudget();
  const left = shortenInterfaceName(leftInterface.trim() || 'left interface', budget);
  const right = shortenInterfaceName(rightInterface.trim() || 'right interface', budget);
  return `${left}${LINK_LABEL_SEPARATOR}${right}`;
}

function getLinkLabelWidth(
  leftInterface: string,
  rightInterface: string
): number {
  const interfaceLine = getLinkInterfaceLabel(leftInterface, rightInterface);
  const longest = interfaceLine.length;
  return Math.max(
    TOPOLOGY_LINK_LABEL_MIN_WIDTH,
    Math.min(TOPOLOGY_LINK_LABEL_MAX_WIDTH, LINK_LABEL_PADDING + longest * LINK_LABEL_CHAR_WIDTH)
  );
}

// Pushes the label away from the layout origin (the ring center), so it must
// be called with pre-shift coordinates — the sign of mid·normal is not
// translation-invariant.
function getLinkLabelPosition(
  leftX: number,
  leftY: number,
  rightX: number,
  rightY: number
): { x: number; y: number } {
  const midX = (leftX + rightX) / 2;
  const midY = (leftY + rightY) / 2;
  const deltaX = rightX - leftX;
  const deltaY = rightY - leftY;
  const length = Math.hypot(deltaX, deltaY) || 1;
  const normalX = -deltaY / length;
  const normalY = deltaX / length;
  const direction = midX * normalX + midY * normalY >= 0 ? 1 : -1;
  const offset = TOPOLOGY_LINK_LABEL_HEIGHT / 2 + 10;

  return {
    x: midX + normalX * offset * direction,
    y: midY + normalY * offset * direction
  };
}

function computeCanvasSize(routerCount: number): { width: number; height: number } {
  const width = Math.max(980, 760 + Math.max(routerCount - 1, 0) * 180);
  const height = Math.max(660, 520 + Math.ceil(Math.max(routerCount - 2, 0) / 2) * 120);
  return { width, height };
}

function computeRouterPositions(
  routers: NetinfraRouterApi[]
): { x: number; y: number; angle: number }[] {
  const count = routers.length;
  const { width, height } = computeCanvasSize(count);
  const radiusX = Math.max(220, width * 0.26);
  const radiusY = Math.max(170, height * 0.22);

  if (count <= 1) {
    return [
      {
        x: 0,
        y: 0,
        angle: -Math.PI / 2
      }
    ];
  }

  return routers.map((_router, index) => {
    const angle = -Math.PI / 2 + (index / count) * Math.PI * 2;
    return {
      x: Math.cos(angle) * radiusX,
      y: Math.sin(angle) * radiusY,
      angle
    };
  });
}

function getRouterHalfWidth(router: TopologyRouter): number {
  return Math.max(TOPOLOGY_ROUTER_RADIUS + 12, router.name.length * 4.4);
}

function getGraphBounds(routers: TopologyRouter[], links: TopologyLink[]): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  const includeBox = (x: number, y: number, halfWidth: number, halfHeight: number) => {
    minX = Math.min(minX, x - halfWidth);
    minY = Math.min(minY, y - halfHeight);
    maxX = Math.max(maxX, x + halfWidth);
    maxY = Math.max(maxY, y + halfHeight);
  };

  for (const router of routers) {
    includeBox(router.x, router.y, getRouterHalfWidth(router), TOPOLOGY_ROUTER_RADIUS + 18);
  }

  for (const link of links) {
    const label = link.geometry?.label;
    if (!label) {
      continue;
    }

    includeBox(label.x, label.y, label.width / 2, TOPOLOGY_LINK_LABEL_HEIGHT / 2);
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    return {
      minX: -240,
      minY: -180,
      maxX: 240,
      maxY: 180
    };
  }

  return { minX, minY, maxX, maxY };
}

function buildLinkGeometry(
  link: Omit<TopologyLink, 'geometry'>,
  routerMap: Map<string, TopologyRouter>
): TopologyLinkGeometry | null {
  const leftRouter = routerMap.get(link.leftRouter);
  const rightRouter = routerMap.get(link.rightRouter);

  if (!leftRouter || !rightRouter) {
    return null;
  }

  let label: TopologyLinkLabel | null = null;

  if (link.leftInterface || link.rightInterface) {
    const position = getLinkLabelPosition(leftRouter.x, leftRouter.y, rightRouter.x, rightRouter.y);
    label = {
      x: position.x,
      y: position.y,
      width: getLinkLabelWidth(link.leftInterface, link.rightInterface),
      interfaceLine: getLinkInterfaceLabel(link.leftInterface, link.rightInterface)
    };
  }

  return {
    leftX: leftRouter.x,
    leftY: leftRouter.y,
    rightX: rightRouter.x,
    rightY: rightRouter.y,
    label
  };
}

function shiftLinkGeometry(
  geometry: TopologyLinkGeometry | null,
  shiftX: number,
  shiftY: number
): TopologyLinkGeometry | null {
  if (!geometry) {
    return null;
  }

  return {
    leftX: geometry.leftX + shiftX,
    leftY: geometry.leftY + shiftY,
    rightX: geometry.rightX + shiftX,
    rightY: geometry.rightY + shiftY,
    label: geometry.label
      ? { ...geometry.label, x: geometry.label.x + shiftX, y: geometry.label.y + shiftY }
      : null
  };
}

export function buildTopologyGraph(netinfraPayload: NetinfraPayload): TopologyGraph {
  const routerApis = getRouters(netinfraPayload).filter((router) => String(router?.name ?? '').trim());
  const bareLinks = getLinks(netinfraPayload)
    .filter((link) => String(link?.['left-router'] ?? '').trim() && String(link?.['right-router'] ?? '').trim())
    .map((link, index) => ({
      id: `${String(link['left-router'])}-${String(link['right-router'])}-${index}`,
      leftRouter: String(link['left-router']),
      leftInterface: String(link['left-interface'] ?? ''),
      rightRouter: String(link['right-router']),
      rightInterface: String(link['right-interface'] ?? ''),
      linkStatus: parseLinkStatus(link.state?.['link-status'])
    }));

  const positions = computeRouterPositions(routerApis);

  const routers: TopologyRouter[] = routerApis.map((routerApi, index) => {
    const draft = parseNetinfraRouter(routerApi);
    return {
      name: draft.name,
      id: draft.id,
      type: draft.type,
      role: draft.role,
      asn: draft.asn,
      approvalRequired: draft.approvalRequired,
      x: positions[index]?.x ?? 0,
      y: positions[index]?.y ?? 0,
      angle: positions[index]?.angle ?? -Math.PI / 2
    };
  });

  const routerMap = new Map(routers.map((router) => [router.name, router]));

  // Label placement depends on pre-shift coordinates (see getLinkLabelPosition),
  // so geometry is computed once here and shifted together with the routers.
  const links: TopologyLink[] = bareLinks.map((link) => ({
    ...link,
    geometry: buildLinkGeometry(link, routerMap)
  }));

  const bounds = getGraphBounds(routers, links);
  const shiftX = TOPOLOGY_VIEW_PADDING - bounds.minX;
  const shiftY = TOPOLOGY_VIEW_PADDING - bounds.minY;
  const shiftedRouters = routers.map((router) => ({
    ...router,
    x: router.x + shiftX,
    y: router.y + shiftY
  }));
  const shiftedLinks = links.map((link) => ({
    ...link,
    geometry: shiftLinkGeometry(link.geometry, shiftX, shiftY)
  }));
  const width = Math.ceil(bounds.maxX - bounds.minX + TOPOLOGY_VIEW_PADDING * 2);
  const height = Math.ceil(bounds.maxY - bounds.minY + TOPOLOGY_VIEW_PADDING * 2);

  return {
    width,
    height,
    routers: shiftedRouters,
    links: shiftedLinks
  };
}
