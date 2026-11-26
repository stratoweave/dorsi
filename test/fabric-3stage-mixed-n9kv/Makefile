TESTENV=dorsi-fabric-3stage-mixed-n9kv

ROUTERS_SRL=leaf1 spine2
ROUTERS_N9KV=leaf2 leaf3 spine1

include ../common/clab.mk
include ../common/containers.mk
include ../common/quicklab.mk
include ../common/overlay.mk

# The overlay of ip-fabric-overlay.xml (CONFIG=ip-fabric-overlay.xml): network
# t1/web joins a server on each leaf, all on VLAN 30, across SR Linux (leaf1)
# and Cisco NX-OS (leaf2, leaf3), through spine1 (NX-OS) or spine2 (SR
# Linux); network t1/db the servers of the NX-OS leaves, untagged.
.PHONY: check-overlay
check-overlay:
	@$(call overlay_ping,server1,10.10.10.12)
	@$(call overlay_ping,server1,10.10.10.13)
	@$(call overlay_ping,server2,10.10.10.13)
	@$(call overlay_ping,server3,10.10.10.11)
	@$(call overlay_ping,server2,10.20.20.13)
	@$(call overlay_ping_mtu,server1,10.10.10.12)
	@$(call overlay_ping_mtu,server2,10.10.10.13)
	@$(call overlay_ping_mtu,server3,10.20.20.12)
