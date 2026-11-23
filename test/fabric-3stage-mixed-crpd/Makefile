TESTENV=dorsi-fabric-3stage-mixed-crpd

ROUTERS_SRL=leaf1
ROUTERS_CEOS=leaf2 spine2
ROUTERS_CRPD=leaf3 spine1

include ../common/clab.mk
include ../common/containers.mk
include ../common/quicklab.mk
include ../common/overlay.mk

# The overlay of ip-fabric-overlay.xml (CONFIG=ip-fabric-overlay.xml): network
# t1/web joins a server on each leaf, all on VLAN 30, across SR Linux (leaf1),
# Arista EOS (leaf2) and Juniper cRPD (leaf3), through spine1 (cRPD) or spine2
# (EOS).
.PHONY: check-overlay
check-overlay:
	@$(call overlay_ping,server3,10.10.10.11)
	@$(call overlay_ping,server3,10.10.10.12)
	@$(call overlay_ping,server1,10.10.10.13)
	@$(call overlay_ping,server2,10.10.10.13)
	@$(call overlay_ping,server1,10.10.10.12)
	@$(call overlay_ping_mtu,server3,10.10.10.11)
	@$(call overlay_ping_mtu,server2,10.10.10.13)
