# DORSI

**DORSI** is a reference implementation of a network automation system built
on [StratoWeave](https://github.com/stratoweave/stratoweave). It turns a short
description of a network into the configuration of every device and applies it.

Today it covers one domain: an **IP fabric for data centers** (3-stage and
5-stage Clos, on Nokia SR Linux).

> **Status: preliminary.** The IP fabric support is new. See
> [IP fabric: what is verified](#ip-fabric-what-is-verified) before relying on
> it.

## Introduction

While DORSI and StratoWeave are closely related, they are two distinct
projects with very different goals:
* **StratoWeave** is a ***platform*** for the development of robust network
orchestration systems based on model-driven declarative transforms. It does the
heavy lifting so you can focus on building automation that makes sense.
* **DORSI** is a **reference implementation** of a StratoWeave system. You
can use it to learn about network automation (development) or use it as a solid
foundation for your own network automation system design.

```mermaid
flowchart TB
  subgraph SW["StratoWeave: platform"]
    direction TB
    NB["Northbound: RESTCONF and Web UI"]
    subgraph D["DORSI: service automation"]
      direction TB
      CFS["CFS: ip-fabric"] --> RFS["RFS: fabric-base-config, fabric-interface, server-port"]
      RFS --> DEV["Device: Nokia SR Linux"]
    end
    SB["Southbound: NETCONF"]
    NB --> CFS
    DEV --> SB
  end
  SB --> NET[("Switches")]
```

DORSI was formerly known as SORESPO.

## Getting started

Head over to our [tutorials](https://www.stratoweave.org/tutorials) to get started with
running DORSI and/or making your first changes to the code in minutes!

The default `stable` branch works with the *stable* Acton release, while
development happens on `main`. See [development](docs/development.md) for how
the two branches relate and how to contribute.

To build and test from a checkout:

```sh
acton build
acton test
```

Use an Acton release that matches the StratoWeave version pinned in
`spec/Build.act`. CI builds `main` with the Acton *tip* release; the stable
release may not compile it yet. After changing a YANG model or the generator,
run `make gen` to regenerate `src/dorsi/layers/` and `src/dorsi/devices/`.

## Services

### IP fabric

The IP fabric service builds the **underlay** of a data center network as
described in [RFC 7938](https://www.rfc-editor.org/info/rfc7938/): routed
point-to-point links with eBGP on every link and ECMP across all equal paths.
The configuration follows the
[SR Linux fabric tutorial](https://learn.srlinux.dev/tutorials/l2evpn/fabric/).

The Customer Facing Service (CFS) model is `ip-fabric` (see
`spec/yang/cfs/ip-fabric.yang`). A `fabric` has:

| List | Describes |
| --- | --- |
| `switch` | A switch: `name`, `id`, `type`, `role` (`leaf`, `spine` or `super-spine`), and the `pod` and `plane` it belongs to |
| `fabric-link` | A routed link between two tiers: leaf to spine in the same pod, or spine to super-spine in the same plane |
| `server` | A server and how it connects: `single-homed` (one leaf) or `dual-homed` (two leaves), with its links to leaf ports |

You describe the switches, links and servers. DORSI derives everything else
from the switch `id`:

| What | Derived as |
| --- | --- |
| Loopback | `10.0.<id / 256>.<id % 256>` |
| Link addresses | one /31 from `10.100.0.0/16` per (lower switch, lower port) |
| AS number | private 4-byte: one per leaf, one per spine pod and plane, one per super-spine plane |

The addressing limits are a switch `id` up to 511 and a lower port number below
64. On SR Linux every switch gets a hostname, a loopback, a BGP instance with
ECMP, a policy that advertises only the loopbacks, and for every link an
interface with its /31 and an eBGP session. Server-facing leaf ports are enabled
and described. LLDP is enabled globally and on the management, fabric and server
ports.

Every switch is also registered as a device in DORSI, reached with the lab
credentials of the [`test/`](test/README.md) environments at its
`management-address`, or by its name when it has none. A device type that does
not take its management address from DHCP (all but SR Linux) keeps it in
configuration DORSI manages, so it needs a `management-address`: DORSI
configures it on the management interface and would otherwise remove it. Set
`mock` on a switch to run it against a simulated device instead of a real one.

The fabric is validated before it is applied: tiers must be adjacent and in the
same pod or plane, a port may be used once, servers connect to leaves and match
their profile, and a five-stage fabric needs a super-spine and a spine in every
plane. An invalid fabric is rejected as a whole with every problem listed.

#### Live state

DORSI also reports the state of the fabric. Every five seconds it polls each
fabric interface on the device: its oper-state and the state of the eBGP session
on it. The CFS lifts the two ends of a link into read-only `state` of the
`fabric-link`, with `link-status` and `bgp-status` each `up`, `down` or
`unknown`. A status is `up` only when both ends are up, `down` if either end is
down, and `unknown` when either end cannot be read. A device that stops
answering does not fail the poll, so an end that has delivered no state for 20
seconds is no longer reported and its links read as `unknown`.

The same poll reads the LLDP neighbor of each fabric interface, which shows
where the cable actually goes. The `fabric-link` state has the neighbor each end
sees and a `cabling-status`: `ok` when an end sees the switch and port the link
describes, `mismatch` when an end sees another one, and `no-neighbor` when the
link is up but no end sees an LLDP neighbor. The Web UI lists these as
*Problems* on its start page, together with links that are down, eBGP
sessions that are down on a working link and switches that DORSI gets no state
from. A session can take up to its connect-retry time (120 seconds by default on
SR Linux) to establish after its link comes up, so the `fabric-link` state has
`bgp-down-seconds`, how long the session has been down on a working link, and
the Web UI only lists a session once it has been down for 120 seconds.

A server link has one end DORSI can read: its leaf port. Its oper-state and
LLDP neighbor become the `state` of the server link. Many servers send no LLDP,
so a server link is only checked when its leaf port sees a neighbor: the system
name must be the server, and the port ID the server port unless it is a MAC
address, which Linux `lldpd` sends by default. A server link that is down is an
error when the server has no working link left, and a warning when a
dual-homed server has only lost its redundancy.

Out of scope for now: the **overlay** (EVPN/VXLAN). A dual-homed server has two
configured ports, but surviving the loss of a leaf needs an overlay.

#### IP fabric: what is verified

* The generated SR Linux configuration is covered by snapshot tests for a
  3-stage and a 5-stage topology (`src/dorsi/test_fabric.act`), and the
  validation by `src/dorsi/test_fabric_validation.act`.
* The 3-stage topology has been run on SR Linux 25.3.2 in
  [`test/fabric-3stage`](test/fabric-3stage/README.md): all eBGP sessions come
  up, ECMP and loopback reachability work.
* The 5-stage lab ([`test/fabric-5stage`](test/fabric-5stage/README.md)) has not
  been deployed: ten SR Linux nodes need much more memory than the 3-stage lab,
  which already needs about 9 GB.
* Not covered: server-to-server traffic, link and leaf failures, and live
  changes to a running fabric. The live state is covered by the build but has not
  been checked against a failing link.

### Service automation layering

DORSI implements highly abstracted device and service configuration through
layers of automation. It uses two service layers, the Customer Facing Service
(CFS) and the Resource Facing Service (RFS), on top of the device layer.
StratoWeave does not place any limitations on the number of layers that can be
implemented, as few or many as necessary can be used.

```
                        +-------------------------------+
+-----------------------| RESTCONF Northbound Interface |-----------------------+
|                       +-------------------------------+                       |
|               +-----------------------------------------------+               |
|               |    Customer Facing Service (CFS) - Layer 0    |               |
|               +-----------------------------------------------+               |
|               +-----------------------------------------------+               |
|               |    Resource Facing Service (RFS) - Layer 1    |               |
|               +-----------------------------------------------+               |
|               +-----------------------------------------------+               |
|               |                Device - Layer 2               |               |
|               +-----------------------------------------------+               |
|                       +-------------------------------+                       |
+-----------------------|  NETCONF Southbound Interface |-----------------------+
                        +-------------------------------+
```

A *transform* turns the data of one layer into the data of the layer below. For
the fabric, the CFS transform `Fabric` (`src/dorsi/cfs.act`) validates the
fabric, derives the devices and the RFS entries `fabric-base-config`,
`fabric-interface` and `server-port`, and the RFS transforms
(`src/dorsi/rfs.act`) render them as device configuration. State flows the other
way: `FabricInterfaceTransform` polls the device and `FabricTransform` lifts the
result into the `fabric-link` state.

### Vendors

The service stack is designed to be vendor-neutral, but the IP fabric is
implemented for [Nokia SR Linux](https://www.nokia.com/ip-networks/service-router-linux-NOS/)
only. Device models for Cisco IOS XR and Juniper cRPD are generated as well
(`spec/yang/`), but no service uses them yet.

## Running it

* **Tests:** `acton test`.
* **With mocked devices**, without any containers: add `<mock>true</mock>` to
  every switch of a fabric file (for example `test/fabric-3stage/ip-fabric.xml`)
  and start `out/bin/dorsi --http.port 8089 <file>`. The Web UI is on that port
  and RESTCONF under `/restconf`.
* **Labs:** see [test/README.md](test/README.md). Pick a free `WEBUI_PORT` when
  more than one lab runs.

The Web UI is embedded in the `dorsi` binary. Its start page draws the topology
of the fabric with the live link and BGP state. Under *Services* it has editors
for fabric switches, links and servers (of an existing fabric). A new fabric
needs at least two switches and one link at once, so it is created through
RESTCONF or a startup file. `make gen-webui` rebuilds the embedded assets and
needs [bun](https://bun.sh).

## Repository layout

| Path | Contents |
| --- | --- |
| `spec/yang/cfs/`, `spec/yang/rfs/` | The CFS model (`ip-fabric`) and the RFS model |
| `spec/src/dorsi_gen.act` | Generator input: layers and which parts of the device models are used |
| `src/dorsi/cfs.act`, `src/dorsi/rfs.act` | The transforms |
| `src/dorsi/layers/`, `src/dorsi/devices/`, `src/dorsi/sysspec.act` | Generated by `make gen`, do not edit |
| `snapshots/` | Expected output of the tests |
| `test/` | Lab definitions and their data |
| `webui/` | The Web UI (SvelteKit) |
| `docs/` | Development documentation |
