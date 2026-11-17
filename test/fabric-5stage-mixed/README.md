# Fabric 5-stage, mixed vendors

A five-stage Clos of Nokia SR Linux and Arista cEOS, cut down to five switches
so that it fits a laptop: one plane and two pods, each with one leaf and one
spine, and one super-spine. The full [fabric-5stage](../fabric-5stage/README.md)
lab has ten switches and needs about twice the memory (each SR Linux or cEOS
node takes about 1.5 GiB).

Every role runs on cEOS, and the lab has every kind of link between the
vendors: Arista–Nokia (leaf1 to spine1), Nokia–Arista (leaf2 to spine2, spine1
to superspine1) and Arista–Arista (spine2 to superspine1). Traffic between the
pods crosses all five stages: leaf, spine, super-spine, spine, leaf.

| Switch | Vendor | Role | Pod | Plane |
|---|---|---|---|---|
| leaf1 | Arista cEOS-lab 4.36.3.2M | leaf | pod-1 | |
| leaf2 | Nokia SR Linux 25.3.2 | leaf | pod-2 | |
| spine1 | Nokia SR Linux 25.3.2 | spine | pod-1 | plane-1 |
| spine2 | Arista cEOS-lab 4.36.3.2M | spine | pod-2 | plane-1 |
| superspine1 | Arista cEOS-lab 4.36.3.2M | super-spine | | plane-1 |

The fabric is described in `ip-fabric.xml`. A pod has a single leaf and the
plane a single spine per pod, so there is one path between any two switches and
no ECMP; the 3-stage labs cover ECMP.

## Management addresses

The lab pins its management addresses in `172.31.37.0/24`: the leaves `.11`
and `.12`, the spines `.21` and `.22`, superspine1 `.31`, the servers `.41` to
`.43` and sweave `.10`. As in
[fabric-3stage-mixed](../fabric-3stage-mixed/README.md#management-addresses),
the cEOS switches carry theirs as `management-address` in `ip-fabric.xml`,
together with the `management-gateway` of their management VRF.

## Links

| Lower switch | Port | Upper switch | Port |
|---|---|---|---|
| leaf1 | `Ethernet49` | spine1 | `ethernet-1/1` |
| leaf2 | `ethernet-1/49` | spine2 | `Ethernet1` |
| spine1 | `ethernet-1/31` | superspine1 | `Ethernet1` |
| spine2 | `Ethernet31` | superspine1 | `Ethernet2` |

## Servers

| Server | Profile | Leaf | Port | Server port |
|---|---|---|---|---|
| server1 | dual-homed | leaf1 | `Ethernet1` | `eth1` |
| server1 | dual-homed | leaf2 | `ethernet-1/1` | `eth2` |
| server2 | single-homed | leaf2 | `ethernet-1/2` | `eth1` |
| server3 | single-homed | leaf1 | `Ethernet2` | `eth1` |

## Status

The topology and data match the `fabric_five_stage_mixed` transform test
(`src/dorsi/test_fabric.act`). The lab has been deployed with `ip-fabric.xml`:
all four eBGP sessions come up, every switch learns the loopbacks of the other
four, all 20 loopback pairs ping, and a traceroute from leaf1 to leaf2 crosses
spine1, superspine1 and spine2. dorsi reports every fabric link up with its BGP
session up and its cabling ok, every server link up, and the management
addresses of the cEOS switches stay in place.

## Running it

The cEOS image has to be imported first, see
[fabric-3stage-mixed](../fabric-3stage-mixed/README.md#the-ceos-image). Stop
other labs: five switches need about 8 GiB.

```sh
WEBUI_PORT=3200 CI=true make start
```

and once the switches have booted:

```sh
make -C ../.. build-linux-aarch64   # or build-linux-x86_64
docker cp ../../out/bin/dorsi dorsi-fabric-5stage-mixed-sweave:/dorsi
docker cp ip-fabric.xml dorsi-fabric-5stage-mixed-sweave:/ip-fabric.xml
docker exec -d dorsi-fabric-5stage-mixed-sweave sh -c '/dorsi ip-fabric.xml > /dorsi.log 2>&1'
```
