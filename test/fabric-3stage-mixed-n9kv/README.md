# Fabric 3-stage mixed, Cisco Nexus 9300v

Three-stage Clos of SR Linux and Cisco NX-OS: leaf1 and spine2 SR Linux,
leaf2, leaf3 and spine1 Nexus 9300v (NX-OS 10.6(4)M), each leaf linked to
both spines, and a server on each leaf. `ip-fabric.xml` is the underlay,
`ip-fabric-overlay.xml` adds the EVPN-VXLAN overlay (`make check-overlay`).

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

`ip-fabric-overlay.xml`: network t1/web joins the three servers, tagged with
VLAN 30. Network t1/db joins server2 and server3, untagged. NX-OS bridges
a network in one VLAN of the switch. dorsi does not translate VLAN tags on
NX-OS, so that VLAN is the tag of the network's servers there (VLAN 30 for
web), or the internal VLAN of the network for an untagged one (db). A
server port trunks the VLANs of its networks, with the untagged one as its
native VLAN. Every NX-OS leaf has a VTEP on lo0 (nve1), each VNI floods by
ingress replication, and EVPN runs on the eBGP sessions of the links. A
spine keeps every route target and passes the routes on with their next
hop unchanged.

Verified 2026-11-26: dorsi configures the overlay in one commit and makes
no change after it. `make check-overlay` passes, including 1500 byte
frames. web runs between SR Linux and NX-OS, db between the two NX-OS
leaves. Every network is up, with its EVPN instance up on each leaf. Taking
db off server3 removes the native VLAN of its port, and VLAN and VNI of db,
from leaf3. Not yet on NX-OS: routed networks (IRB, IP-VRF) and server
LAGs.
