TESTENV=dorsi-fabric-5stage-srl

ROUTERS_SRL=leaf1 leaf2 spine1 spine2 superspine1

include ../common/clab.mk
include ../common/containers.mk
include ../common/quicklab.mk
include ../common/overlay.mk

# The overlay of ip-fabric.xml: server1, on an ESI-LAG of leaf1 (pod-1) and
# leaf2 (pod-2), and server3 on leaf1 share network t1/web. server2 on leaf2
# is in network t1/db, which VRF main routes to t1/web across the super-spine.
.PHONY: check-overlay
check-overlay:
	@$(call overlay_ping,server3,10.10.10.11)
	@$(call overlay_ping,server1,10.10.10.13)
	@$(call overlay_ping,server3,10.10.20.12)
	@$(call overlay_ping,server2,10.10.10.13)
	@$(call overlay_ping,server1,10.10.20.12)
	@$(call overlay_ping_mtu,server3,10.10.20.12)
	docker exec $(TESTENV)-leaf1 sr_cli "show network-instance default protocols bgp routes evpn route-type summary"
	docker exec $(TESTENV)-leaf1 sr_cli "show network-instance t1-web bridge-table mac-table all"
	docker exec $(TESTENV)-leaf1 sr_cli "show system network-instance ethernet-segments"

# Both ports of the ESI-LAG of server1, in the two pods, go down and up again
# while server3 reaches server1 bridged and server2 routed
.PHONY: check-overlay-failover
check-overlay-failover:
	@$(call overlay_failover,server3,10.10.10.11,leaf1,ethernet-1/1)
	@$(call overlay_failover,server2,10.10.10.11,leaf2,ethernet-1/1)
