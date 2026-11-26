# Fabric 3-stage mixed, Cisco Nexus 9300v

Three-stage Clos of SR Linux and Cisco NX-OS: leaf1 and spine2 SR Linux,
leaf2, leaf3 and spine1 Nexus 9300v (NX-OS 10.6(4)M), each leaf linked to
both spines. `ip-fabric.xml` is the underlay.

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
