TESTENV=dorsi-fabric-3stage-mixed-n9kv

ROUTERS_SRL=leaf1 spine2
ROUTERS_N9KV=leaf2 leaf3 spine1

include ../common/clab.mk
include ../common/containers.mk
include ../common/quicklab.mk
include ../common/overlay.mk

# The overlay of ip-fabric-overlay.xml (CONFIG=ip-fabric-overlay.xml), bridged
# only: network t1/web joins server1 on leaf1 (SR Linux) and server3 on leaf3
# (Cisco NX-OS), on VLAN 30, through spine1 (NX-OS) or spine2 (SR Linux);
# network t1/db server2 on leaf2 and server3 on leaf3, both NX-OS, untagged.
.PHONY: check-overlay
check-overlay:
	@$(call overlay_ping,server1,10.10.10.13)
	@$(call overlay_ping,server3,10.10.10.11)
	@$(call overlay_ping,server2,10.20.20.13)
	@$(call overlay_ping,server3,10.20.20.12)
	@$(call overlay_ping_mtu,server1,10.10.10.13)
	@$(call overlay_ping_mtu,server2,10.20.20.13)

# ip-fabric-routed.xml (CONFIG=ip-fabric-routed.xml) routes both networks in
# VRF t1/main, with anycast gateways on every leaf. server1 reaches server2
# through the gateway of web on leaf1 (SR Linux), and server2 answers through
# that of db on leaf2 (NX-OS), which has no server in web.
.PHONY: check-routed
check-routed: check-overlay
	@$(call overlay_ping,server1,10.20.20.12)
	@$(call overlay_ping,server2,10.10.10.11)
	@$(call overlay_ping,server2,10.10.10.1)
	@$(call overlay_ping,server3,10.20.20.1)
	@$(call overlay_ping_mtu,server1,10.20.20.12)
