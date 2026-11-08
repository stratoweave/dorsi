import {
  deviceConfigAdata,
  deviceConfigObject,
  deviceConfigXml
} from '$lib/demo/fixtures/device-configs';

// Blobs for /layer/{0..2}: the CFS → RFS → Device transformation chain.
// Layer 0 (JSON) and layer 2 are rendered live from the demo state so edits
// show up when re-inspecting; the RFS layer is representative static content.

interface LayerContext {
  /** Wrapped CFS payloads exactly as served over RESTCONF. */
  netinfra: Record<string, unknown>;
  /** Managed routers, for the per-device layers. */
  routers: { name: string; id: number }[];
}

const LAYER2_XML = `<rfs xmlns="urn:dorsi:rfs">
  <device>
    <name>AMS-CORE-1</name>
    <service><type>base-router</type><instance>AMS-CORE-1</instance></service>
    <service><type>backbone-interface</type><instance>ethernet-1/1</instance></service>
    <service><type>backbone-interface</type><instance>ethernet-1/2</instance></service>
  </device>
  <device>
    <name>FRA-CORE-1</name>
    <service><type>base-router</type><instance>FRA-CORE-1</instance></service>
    <service><type>backbone-interface</type><instance>ethernet-1/1</instance></service>
    <service><type>backbone-interface</type><instance>ethernet-1/2</instance></service>
    <service><type>backbone-interface</type><instance>ethernet-1/3</instance></service>
  </device>
  <device>
    <name>STO-CORE-1</name>
    <service><type>base-router</type><instance>STO-CORE-1</instance></service>
    <service><type>backbone-interface</type><instance>ethernet-1/1</instance></service>
    <service><type>backbone-interface</type><instance>ethernet-1/2</instance></service>
    <service><type>backbone-interface</type><instance>ethernet-1/3</instance></service>
  </device>
  <device>
    <name>LJU-CORE-1</name>
    <service><type>base-router</type><instance>LJU-CORE-1</instance></service>
    <service><type>backbone-interface</type><instance>ethernet-1/1</instance></service>
    <service><type>backbone-interface</type><instance>ethernet-1/2</instance></service>
  </device>
</rfs>`;

const LAYER2_JSON = JSON.stringify(
  {
    'rfs:rfs': {
      device: [
        {
          name: 'AMS-CORE-1',
          service: ['base-router', 'backbone-interface ethernet-1/1', 'backbone-interface ethernet-1/2']
        },
        {
          name: 'FRA-CORE-1',
          service: ['base-router', 'backbone-interface ethernet-1/1', 'backbone-interface ethernet-1/2', 'backbone-interface ethernet-1/3']
        },
        {
          name: 'STO-CORE-1',
          service: ['base-router', 'backbone-interface ethernet-1/1', 'backbone-interface ethernet-1/2', 'backbone-interface ethernet-1/3']
        },
        {
          name: 'LJU-CORE-1',
          service: ['base-router', 'backbone-interface ethernet-1/1', 'backbone-interface ethernet-1/2']
        }
      ]
    }
  },
  null,
  2
);

const LAYER2_ADATA = `rfs {
    device AMS-CORE-1 { base-router, backbone-interface x2 }
    device FRA-CORE-1 { base-router, backbone-interface x3 }
    device STO-CORE-1 { base-router, backbone-interface x3 }
    device LJU-CORE-1 { base-router, backbone-interface x2 }
}`;

const LAYER0_XML = `<data>
  <netinfra xmlns="urn:dorsi:netinfra">
    <global-settings>
      <ibgp-authentication-key>ibgp-authentication-key</ibgp-authentication-key>
    </global-settings>
    <router><name>AMS-CORE-1</name><id>1</id><type>NokiaSRLinux_25_3_2</type><role>edge</role><asn>65001</asn></router>
    <router><name>FRA-CORE-1</name><id>2</id><type>NokiaSRLinux_25_3_2</type><role>edge</role><asn>65001</asn></router>
    <router><name>STO-CORE-1</name><id>3</id><type>NokiaSRLinux_25_3_2</type><role>edge</role><asn>65001</asn></router>
    <router><name>LJU-CORE-1</name><id>4</id><type>NokiaSRLinux_25_3_2</type><role>edge</role><asn>65001</asn></router>
    <backbone-link><left-router>AMS-CORE-1</left-router><left-interface>ethernet-1/1</left-interface><right-router>FRA-CORE-1</right-router><right-interface>ethernet-1/1</right-interface></backbone-link>
    <backbone-link><left-router>AMS-CORE-1</left-router><left-interface>ethernet-1/2</left-interface><right-router>STO-CORE-1</right-router><right-interface>ethernet-1/1</right-interface></backbone-link>
    <backbone-link><left-router>FRA-CORE-1</left-router><left-interface>ethernet-1/2</left-interface><right-router>STO-CORE-1</right-router><right-interface>ethernet-1/2</right-interface></backbone-link>
    <backbone-link><left-router>FRA-CORE-1</left-router><left-interface>ethernet-1/3</left-interface><right-router>LJU-CORE-1</right-router><right-interface>ethernet-1/1</right-interface></backbone-link>
    <backbone-link><left-router>STO-CORE-1</left-router><left-interface>ethernet-1/3</left-interface><right-router>LJU-CORE-1</right-router><right-interface>ethernet-1/2</right-interface></backbone-link>
  </netinfra>
</data>`;

const LAYER0_ADATA = `cfs {
    netinfra {
        global-settings { ibgp-authentication-key: "***" }
        routers: [AMS-CORE-1, FRA-CORE-1, STO-CORE-1, LJU-CORE-1]
        backbone-links: 5
    }
}`;

export function layerConfigText(layer: number, format: string, ctx: LayerContext): string {
  if (layer === 0) {
    if (format === 'json') {
      return JSON.stringify(ctx.netinfra, null, 2);
    }
    if (format === 'adata') {
      return LAYER0_ADATA;
    }
    return LAYER0_XML;
  }

  if (layer === 1) {
    if (format === 'json') return LAYER2_JSON;
    if (format === 'adata') return LAYER2_ADATA;
    return LAYER2_XML;
  }

  // Layer 2: the fully rendered per-device configuration.
  if (format === 'json') {
    const devices: Record<string, unknown> = {};
    for (const router of ctx.routers) {
      devices[router.name] = deviceConfigObject(router.name, router.id);
    }
    return JSON.stringify({ 'device-config:devices': devices }, null, 2);
  }
  if (format === 'adata') {
    return ctx.routers
      .map((router) => `device ${router.name} {\n${deviceConfigAdata(router.name, router.id)
        .split('\n')
        .map((line) => `    ${line}`)
        .join('\n')}\n}`)
      .join('\n');
  }
  return `<devices>\n${ctx.routers
    .map((router) => `  <device>\n    <name>${router.name}</name>\n${deviceConfigXml(router.name, router.id)
      .split('\n')
      .map((line) => `    ${line}`)
      .join('\n')}\n  </device>`)
    .join('\n')}\n</devices>`;
}
