# Arista EOS 4.36.3.2M

The OpenConfig and Arista modules dorsi needs for an IP fabric switch,
downloaded from a cEOS-lab 4.36.3.2M switch over NETCONF (`ncurl get-schema`),
so they match that release exactly. Of the 339 modules the switch serves, these
are the 131 that `openconfig-interfaces`, `-if-ip`, `-if-ethernet`,
`-network-instance`, `-routing-policy`, `-bgp-policy`, `-lldp` and `-system`,
the Arista deviations of the interface, BGP, network-instance, routing-policy,
LLDP and system modules, and `arista-netinst-augments` (`ipv4-routing-enabled`)
import.

## Changes to the downloaded modules

* `arista-bgp-deviations`: removed three `augment` statements that hold only a
  description and target leaves (`bgp/global/config/as` and the two
  `ebgp-multihop/config/enabled`). An augment must target a container, list,
  choice or case (RFC 7950, section 7.17), and the YANG compiler rejects them.
  They add no nodes.

## Notes on EOS

Found on the lab switch, see the comments in `spec/src/dorsi_gen.act` and
`src/dorsi/rfs.act`:

* The management address of Management0 is configuration under
  `/interfaces`, which dorsi manages, so it comes from the switch's
  `management-address` in the fabric.
* An IPv4 address on subinterface 0 makes an Ethernet port routed
  (`no switchport`); `ipv4-routing-enabled` turns on `ip routing`.
* `use-multiple-paths/config` is not supported, `use-multiple-paths/ebgp`
  is; routing policies become RCF functions.
* BGP advertises only routes in BGP: the loopback gets there through a
  `table-connection` from DIRECTLY_CONNECTED (`redistribute connected`).
* A NETCONF filter that names the LLDP neighbors of an interface without any
  fails; the whole LLDP entry of the interface is read instead.
