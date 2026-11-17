# Fabric 5-stage SR Linux

The five-stage Clos of [`fabric-5stage-mixed`](../fabric-5stage-mixed/README.md),
cut down to five switches, with every switch on Nokia SR Linux: one plane and
two pods with one leaf and one spine each, and one super-spine. It runs the
EVPN-VXLAN overlay through a super-spine, which the 3-stage lab does not: the
EVPN routes cross two tiers of switches with no network of their own, which
keep them and pass them on with their next hop.

The fabric and its overlay are in `ip-fabric.xml`, the same data as
`five_stage_srl` in `src/dorsi/test_fabric.act`.

## Links

| Lower switch | Port | Upper switch | Port |
|---|---|---|---|
| leaf1 | `ethernet-1/49` | spine1 | `ethernet-1/1` |
| leaf2 | `ethernet-1/49` | spine2 | `ethernet-1/1` |
| spine1 | `ethernet-1/31` | superspine1 | `ethernet-1/1` |
| spine2 | `ethernet-1/31` | superspine1 | `ethernet-1/2` |

## Servers

Tenant `t1` has network `web` (gateway 10.10.10.1) and network `db` (gateway
10.10.20.1), routed between each other by VRF `main`. The servers set
themselves up for it (`exec` in `fabric-5stage-srl.clab.yml`) and route
10.10.0.0/16 through the gateway of their network.

| Server | Profile | Leaf ports | Network | VLAN | Address |
|---|---|---|---|---|---|
| server1 | dual-homed | leaf1 `ethernet-1/1`, leaf2 `ethernet-1/1` (`lag1`, ESI-LAG across the pods) | `t1/web` | 10 | 10.10.10.11/24 |
| server2 | single-homed | leaf2 `ethernet-1/2` | `t1/db` | 20 | 10.10.20.12/24 |
| server3 | single-homed | leaf1 `ethernet-1/2` | `t1/web` | untagged | 10.10.10.13/24 |

server3 (pod-1) reaches server2 (pod-2) routed across the super-spine over
VXLAN, and server1 bridged, with and without a tag.

## Running it

```sh
WEBUI_PORT=3101 CI=true make start
make -C ../.. build-linux-aarch64   # or build-linux-x86_64
make copy
docker exec -d dorsi-fabric-5stage-srl-sweave sh -c '/dorsi ip-fabric.xml > /dorsi.log 2>&1'
make check-overlay
make check-overlay-failover
```

`check-overlay` pings between the servers, bridged and routed, also with full
1500 byte frames; `check-overlay-failover` takes each port of the ESI-LAG of
server1 down and up again while server3 pings server1 bridged and server2
routed. Both fail on any lost or duplicated reply. Both have passed; once, the
first time it ran, taking down the port of leaf2 lost 6 routed pings of 100
(1.2 s), which five more tries did not repeat.
