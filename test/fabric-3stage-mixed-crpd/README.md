# Fabric 3-stage, three vendors

The [fabric-3stage](../fabric-3stage/README.md) lab with switches of all three
vendors dorsi supports: three leaves, each connected to both
of the two spines. Its links join Juniper cRPD to SR Linux, to Arista cEOS and
to another cRPD, in both directions where a vendor is on both layers.

| Switch | Vendor | Type |
|---|---|---|
| leaf1 | Nokia SR Linux 25.3.2 | `NokiaSRLinux_25_3_2` |
| leaf2, spine2 | Arista cEOS-lab 4.36.3.2M | `AristaEOS_4_36_3_2M` |
| leaf3, spine1 | Juniper cRPD 24.4R1.9 | `JuniperCRPD_24_4R1_9` |

The fabric is described in `ip-fabric.xml`. SR Linux names its ports
`ethernet-1/N`, cEOS `EthernetN` (the container interface `ethN`), cRPD the
container interface `ethN` itself. See [fabric-3stage-mixed](../fabric-3stage-mixed/README.md)
for cEOS and its management VRF, and [fabric-3stage-crpd](../fabric-3stage-crpd/README.md)
for cRPD and how dorsi reads its state.

## Management addresses

`172.31.40.0/24`: leaf1 to leaf3 are `.11` to `.13`, spine1 and spine2 `.21`
and `.22`, the servers `.31` to `.33` and sweave `.10`. The cEOS switches carry
theirs as `management-address` in `ip-fabric.xml`.

## Links

| Lower switch | Port | Upper switch | Port | Vendors |
|---|---|---|---|---|
| leaf1 | `ethernet-1/49` | spine1 | `eth1` | SR Linux – cRPD |
| leaf1 | `ethernet-1/50` | spine2 | `Ethernet1` | SR Linux – EOS |
| leaf2 | `Ethernet49` | spine1 | `eth2` | EOS – cRPD |
| leaf2 | `Ethernet50` | spine2 | `Ethernet2` | EOS – EOS |
| leaf3 | `eth49` | spine1 | `eth3` | cRPD – cRPD |
| leaf3 | `eth50` | spine2 | `Ethernet3` | cRPD – EOS |

## Servers

| Server | Profile | Leaf | Port | Server port |
|---|---|---|---|---|
| server1 | single-homed | leaf1 | `ethernet-1/1` | `eth1` |
| server2 | single-homed | leaf2 | `Ethernet1` | `eth1` |
| server3 | single-homed | leaf3 | `eth1` | `eth1` |

## Status

The topology and data match the `fabric_three_stage_mixed_crpd` transform test
(`src/dorsi/test_fabric.act`). The lab has been deployed with `ip-fabric.xml`:
all ten eBGP sessions come up across the vendors, every loopback reaches the
loopback of every switch of another AS, each leaf has both spines as paths to
the others, a 9000 byte packet crosses every fabric link unfragmented, and
dorsi reports every fabric link up with its BGP session up and its cabling ok,
read over LLDP from all three vendors.

A link cut at its cRPD end, to SR Linux (spine1 `eth1`) and to EOS (leaf3
`eth50`), reads down with its session down; a paused cRPD (spine1) reads
unknown on its three links after 20 s; both come back. The cRPD–EOS link
removed over RESTCONF leaves the configuration of both ends and the state of
the fabric, and comes up again when added back. The PATCH that adds it back
gets no answer within 120 s, as with EOS in the other labs, though its change
is applied.

## Overlay

`ip-fabric-overlay.xml` is the same fabric with an EVPN-VXLAN overlay across
the vendors, layer 2 only. Network `t1/web` joins a server on each leaf, all
tagged with VLAN 30:

| Server | Leaf side | Address |
|---|---|---|
| server1 | `ethernet-1/1` on leaf1 (SR Linux) | 10.10.10.11/24 |
| server2 | `Ethernet1` on leaf2 (EOS) | 10.10.10.12/24 |
| server3 | `eth1` on leaf3 (cRPD) | 10.10.10.13/24 |

Run dorsi with `ip-fabric-overlay.xml` instead of `ip-fabric.xml` (`make copy
CONFIG=ip-fabric-overlay.xml`), then `make check-overlay` pings between the
servers, also with full 1500 byte frames, and fails on any lost or duplicated
reply. It has passed, with the expired cRPD license of the `licenses`
repository: cRPD only logs `RPD_CONTAINER_LICENSE_ERROR`.

On cRPD the network is a `mac-vrf` routing instance of service type
`vlan-based` with one bridge domain, which cRPD makes a Linux bridge with a
VXLAN device of the VNI. The server port is a unit of the VLAN tag with
`encapsulation vlan-bridge`, which cRPD makes the Linux subinterface `eth1.30`
in the bridge; without that encapsulation rpd counts the port as not there
and advertises no EVPN route. The YANG of cRPD lacks `vlan-based`, which cRPD
requires; `spec/yang/JuniperCRPD_24_4R1_9/junos-conf-root.yang` has it added.
An untagged server port and a server LAG did not come up on cRPD, so the
validation refuses them, as it does a routed network.

cRPD advertises the EVPN routes of its own networks with the local address of
the session as next hop, whatever the export policy sets. Over the sessions of
the links that address is that of the link, not the VTEP, so a cRPD leaf sends
its EVPN routes over eBGP sessions between loopbacks instead (group `overlay`,
multihop), to each of its spines, which have the matching sessions in their
own `overlay` group. A cRPD spine passes the EVPN routes on over the sessions
of the links with their next hop: they are multihop with `no-nexthop-change`,
and the loopback routes go out with `next-hop self`.

rpd starts with a VXLAN device `irb` of its own on UDP port 4789 that collects
every VNI, and the device of the VNI of a network then cannot come up
(`EADDRINUSE`). No Junos statement removes it, so the lab takes it down on
leaf3 when the container starts (the `exec` of leaf3 in the topology); it stays
down. A cRPD leaf outside this lab needs the same.

DORSI reports the network up on all three leaves, with its EVPN instance up.
On cRPD it polls the EVPN instance and the VXLAN device of the VNI with Junos
RPCs: the network reads down while no server port of it is up (leaf3 `eth1`
set down), and its EVPN instance down while the VXLAN device is down (`irb`
brought back up before the network is created); both come back.

## Running it

See [fabric-3stage-mixed](../fabric-3stage-mixed/README.md) for the cEOS image
and [fabric-3stage-crpd](../fabric-3stage-crpd/README.md) for the cRPD one.

```sh
WEBUI_PORT=3000 CI=true make start
```

and once cEOS answers `show management api netconf` with "running":

```sh
make -C ../.. build-linux-aarch64   # or build-linux-x86_64
make copy CONFIG=ip-fabric.xml
docker exec -d dorsi-fabric-3stage-mixed-crpd-sweave sh -c '/dorsi ip-fabric.xml > /dorsi.log 2>&1'
```

One SR Linux, two cEOS and two cRPD switches take about 5.5 GB.
