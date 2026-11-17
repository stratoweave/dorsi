TESTENV=dorsi-fabric-3stage-mixed

ROUTERS_SRL=leaf1 leaf2 spine1
ROUTERS_CEOS=leaf3 spine2

include ../common/clab.mk
include ../common/containers.mk
include ../common/quicklab.mk
include ../common/overlay.mk

# The overlay of ip-fabric-overlay.xml (CONFIG=ip-fabric-overlay.xml), across
# the vendors, layer 2 only: network t1/web joins server1, on an ESI-LAG of
# leaf1 and leaf2 (SR Linux), to server3 (another VLAN tag) and server2
# (untagged) on leaf3 (Arista EOS), over VXLAN through spine1 (SR Linux) or
# spine2 (EOS).
.PHONY: check-overlay
check-overlay:
	@$(call overlay_ping,server1,10.10.10.13)
	@$(call overlay_ping,server3,10.10.10.11)
	@$(call overlay_ping,server1,10.10.10.12)
	@$(call overlay_ping,server2,10.10.10.11)
	@$(call overlay_ping,server3,10.10.10.12)
	@$(call overlay_ping_mtu,server1,10.10.10.13)
