# Fabric 3-stage

Three-stage Clos fabric: three leaves, each connected to both of the two spines.

All switches run Nokia SR Linux. The fabric is described in `ip-fabric.json`
(`ip-fabric.xml` is the same data in XML), which holds one `fabric` with its
switches and the links between them.

## Links

| Lower switch | Port | Upper switch | Port |
|---|---|---|---|
| leaf1 | `ethernet-1/49` | spine1 | `ethernet-1/1` |
| leaf1 | `ethernet-1/50` | spine2 | `ethernet-1/1` |
| leaf2 | `ethernet-1/49` | spine1 | `ethernet-1/2` |
| leaf2 | `ethernet-1/50` | spine2 | `ethernet-1/2` |
| leaf3 | `ethernet-1/49` | spine1 | `ethernet-1/3` |
| leaf3 | `ethernet-1/50` | spine2 | `ethernet-1/3` |

## Servers

| Server | Profile | Leaf | Port | Server port |
|---|---|---|---|---|
| server1 | dual-homed | leaf1 | `ethernet-1/1` | `eth1` |
| server1 | dual-homed | leaf2 | `ethernet-1/1` | `eth2` |
| server2 | dual-homed | leaf2 | `ethernet-1/2` | `eth1` |
| server2 | dual-homed | leaf3 | `ethernet-1/1` | `eth2` |
| server3 | single-homed | leaf3 | `ethernet-1/2` | `eth1` |

## Overlay

`ip-fabric.xml` also has an EVPN-VXLAN overlay: tenant `t1` with network `web`
(VLAN 10) and network `db` (untagged). The servers set themselves up for it
(`exec` in `fabric-3stage.clab.yml`): server1 and server2 bond their two ports
with LACP, as DORSI puts them on an all-active ethernet segment of their two
leaves.

| Server | Network | VLAN | Address | Leaf side |
|---|---|---|---|---|
| server1 | `t1/web` | 10 | 10.10.10.11/24 | `lag1` on leaf1 and leaf2 |
| server2 | `t1/db` | untagged | 10.10.20.12/24 | `lag2` on leaf2, `lag1` on leaf3 |
| server3 | `t1/web` | 10 | 10.10.10.13/24 | `ethernet-1/2` on leaf3 |

Once dorsi has configured the switches, `make check-overlay` pings server3 from
server1 and back and shows the EVPN routes and MAC table on leaf3 and the
ethernet segment on leaf1. To test the ethernet segment, ping server1 from
server3 while disabling `ethernet-1/1` of leaf1
(`sr_cli -ec "interface ethernet-1/1 admin-state disable"`): no ping is lost.
server2 is alone in its network until routing between networks is added.

## Status

The topology and data match the `fabric_three_stage` and `fabric_five_stage`
transform tests (`src/dorsi/test_fabric.act`), which check the generated SR Linux
configuration. The lab has been deployed: all eBGP sessions come up, ECMP and
loopback reachability work. The configuration targets of the shared `quicklab.mk`
(`copy`, `run-and-configure`) send `ip-fabric.xml`, set by `CONFIG`.

## Running it

Without a lab, with mocked switches (no containers needed). Add
`<mock>true</mock>` to every switch of `ip-fabric.xml` in a copy and run:

```sh
out/bin/dorsi --http.port 8089 ip-fabric-mock.xml
```

The Web UI is then on http://localhost:8089 and RESTCONF under `/restconf`.

In the lab, after `WEBUI_PORT=3100 CI=true make start` (pick a free port) and
once the switches have booted:

```sh
make -C ../.. build-linux-aarch64   # or build-linux-x86_64
docker cp ../../out/bin/dorsi dorsi-fabric-3stage-sweave:/dorsi
docker cp ip-fabric.xml dorsi-fabric-3stage-sweave:/ip-fabric.xml
docker exec -d dorsi-fabric-3stage-sweave sh -c '/dorsi ip-fabric.xml > /dorsi.log 2>&1'
```

Five SR Linux nodes need about 9 GB of memory. With less, nodes lose their
dataplane (`xdp_lc_1 has failed`) and cannot be configured.
