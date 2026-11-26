# Fabric 3-stage mixed, Cisco Nexus 9300v

Three-stage Clos of SR Linux and Cisco NX-OS: leaf1 and spine2 SR Linux,
leaf2, leaf3 and spine1 Nexus 9300v (NX-OS 10.6(4)M), each leaf linked to
both spines, and a server on each leaf. `ip-fabric.xml` is the underlay,
`ip-fabric-overlay.xml` adds the EVPN-VXLAN overlay, bridged (`make
check-overlay`), and `ip-fabric-routed.xml` routes its networks in a VRF (`make
check-routed`).

Nexus 9300v is a VM: it needs an x86_64 host with KVM and the vrnetlab image
`vrnetlab/cisco_n9kv:9300-10.6.4.M`, built from `nexus9300v64.10.6.4.M.qcow2`.
It boots in about 15 minutes. `CLAB_MGMT_PASSTHROUGH` gives mgmt0 the
container's address (172.31.42.x/24), the `management-address` of the switch
in `ip-fabric.xml`: dorsi connects there and keeps it on mgmt0.

## Status

dorsi configures NX-OS through its native model (`Cisco-NX-OS-device`). It
needs StratoWeave to send `<get-config>` with a filter, which NX-OS requires:
so far only a local StratoWeave patch does (issue 7 of the StratoWeave
issues doc).

Verified 2026-11-26 on the x86 lab host: dorsi configures all three NX-OS
switches in one commit and makes no change after it. All eBGP sessions
are established, leaf2 reaches the loopbacks of leaf3 over both spines
(ECMP), the loopbacks of every switch reach each other between SR Linux
and NX-OS, and 9000 byte pings with DF set pass on the fabric links. LLDP
cabling is ok on every link.

dorsi polls the state of each NX-OS fabric port with a `<get>` of the
native model: the port's operSt, its LLDP neighbor and the state of its BGP
session. Every link reports link, BGP and cabling status on both ends. With
e1-49 of leaf1 down, the link to spine1 went down at once, and the
cabling became no-neighbor after the 120 s LLDP hold time. All three were
back within a minute of bringing the port up.

### Overlay

`ip-fabric-overlay.xml`: network t1/web joins server1 (leaf1, SR Linux) and
server3 (leaf3, NX-OS), tagged with VLAN 30. Network t1/db joins server2
(leaf2) and server3, both on NX-OS, untagged. NX-OS bridges a network in one
VLAN of the switch. dorsi does not translate VLAN tags on NX-OS, so that VLAN
is the tag of the network's servers there (VLAN 30 for web), or the internal
VLAN of the network for an untagged one (db). A server port trunks the VLANs
of its networks, with the untagged one as its native VLAN. Every NX-OS leaf
has a VTEP on lo0 (nve1), each VNI floods by ingress replication, and EVPN
runs on the eBGP sessions of the links. A spine keeps every route target and
passes the routes on with their next hop unchanged.

`ip-fabric-routed.xml` routes web and db in VRF t1/main (symmetric IRB). An
NX-OS leaf has the anycast gateway on the VLAN interface of each network, in
the VRF. The VRF has its layer 3 VNI on a VLAN of its own, with a VLAN
interface, associated with the VRF on nve1. BGP in the VRF advertises its
connected routes, the subnets, as IP prefix routes. server1 reaches server2
through the gateway of web on leaf1 (SR Linux). server2 answers through the
gateway of db on leaf2 (NX-OS), which has no server in web and routes to it
over the layer 3 VNI.

Verified 2026-11-26:
- Bridged: dorsi configures the overlay in one commit and makes no change
  after it. `make check-overlay` passes, including 1500 byte frames.
- Removal: taking db off server3 removes the native VLAN of its port, and
  the VLAN and VNI of db, from leaf3.
- Routed: `make check-routed` passes. 200 pings at 0.2 s lose none on each
  routed path. leaf2 has web as an IP prefix route from leaf1 and the hosts
  as /32 routes. Networks and VRF are up on every leaf.
- From routed to bridged and back: the VLAN interfaces, VRF, layer 3 VLAN
  and VNI go and come back cleanly.
- The first ping through a gateway right after the routing comes up can lose
  one reply, while the gateway resolves the host (ARP glean). Run
  `check-routed` again if that happens.

Not yet on NX-OS: server LAGs, and the state of a server LAG.
