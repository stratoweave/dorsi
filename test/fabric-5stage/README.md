# Fabric 5-stage

Five-stage Clos fabric: two pods with two leaves each and one spine per plane,
and two super-spines, one per plane.

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
| leaf3 | `ethernet-1/49` | spine3 | `ethernet-1/1` |
| leaf3 | `ethernet-1/50` | spine4 | `ethernet-1/1` |
| leaf4 | `ethernet-1/49` | spine3 | `ethernet-1/2` |
| leaf4 | `ethernet-1/50` | spine4 | `ethernet-1/2` |
| spine1 | `ethernet-1/31` | superspine1 | `ethernet-1/1` |
| spine3 | `ethernet-1/31` | superspine1 | `ethernet-1/2` |
| spine2 | `ethernet-1/31` | superspine2 | `ethernet-1/1` |
| spine4 | `ethernet-1/31` | superspine2 | `ethernet-1/2` |

## Servers

| Server | Profile | Leaf | Port | Server port |
|---|---|---|---|---|
| server1 | dual-homed | leaf1 | `ethernet-1/1` | `eth1` |
| server1 | dual-homed | leaf2 | `ethernet-1/1` | `eth2` |
| server2 | dual-homed | leaf2 | `ethernet-1/2` | `eth1` |
| server2 | dual-homed | leaf3 | `ethernet-1/1` | `eth2` |
| server3 | single-homed | leaf3 | `ethernet-1/2` | `eth1` |

## Status

The topology and data match the `fabric_three_stage` and `fabric_five_stage`
transform tests (`src/dorsi/test_fabric.act`), which check the generated SR Linux
configuration. The ten SR Linux nodes need far more memory than a laptop
has: the lab runs on an x86_64 lab host (verified 2026-11-25 on a 251 GB
host). See the 3-stage README for how to run it.

`make check-underlay` checks that every leaf reaches the loopback of all ten
switches from its own loopback and that every BGP session of every switch is
established. It has passed.

## Overlay

`ip-fabric-overlay.xml` is the same fabric with a layer 2 EVPN-VXLAN overlay
across both pods. Network `t1/web` joins:

| Server | Leaf side | VLAN | Address |
|---|---|---|---|
| server1 | ESI-LAG of leaf1 and leaf2 (pod 1) | 10 | 10.10.10.11/24 |
| server2 | ESI-LAG of leaf2 (pod 1) and leaf3 (pod 2) | 20 | 10.10.10.12/24 |
| server3 | `ethernet-1/2` of leaf3 (pod 2) | 30 | 10.10.10.13/24 |

Run dorsi with `CONFIG=ip-fabric-overlay.xml` (`make copy` and `make
run-and-configure`), then `make setup-overlay-servers` (bonds, VLANs and
addresses on the servers) and `make check-overlay`: pings between all three
servers, also with full 1500 byte frames, failing on any lost or duplicated
reply. It has passed.

`make check-overlay-failover` takes each leg of server2's cross-pod ESI-LAG
down and up while another server pings it. The pod 1 leg (leaf2) loses no
reply. The pod 2 leg (leaf3), pinged from server3 on leaf3 itself, lost 0 to
4 replies (at most about 0.8 s) on a change, in either direction: leaf3 then
has to reach server2 through the other pod. This is the parked SR Linux
ESI-LAG loss, larger across pods.

A hung super-spine (`docker pause` of superspine1 for 120 s, 2026-11-25)
black-holed the overlay flow server1 → server3, which hashed onto its plane,
for 57 s; an underlay flow leaf1 → leaf4 on the other plane lost nothing.
The fabric sessions only notice a hung peer when the BGP hold time (SR Linux
default 90 s) runs out: dorsi configures no BFD. Nothing was lost when it
came back.
