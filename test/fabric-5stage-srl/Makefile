TESTENV=dorsi-fabric-5stage-srl

ROUTERS_SRL=leaf1 leaf2 spine1 spine2 superspine1

include ../common/clab.mk
include ../common/containers.mk
include ../common/quicklab.mk
include ../common/overlay.mk

# The overlay of ip-fabric.xml: all three servers are in network t1/web, on
# leaves in different pods, so their traffic crosses the super-spine over
# VXLAN. server1 is on an ESI-LAG of leaf1 (pod-1) and leaf2 (pod-2).
.PHONY: check-overlay
check-overlay:
	@$(call overlay_ping,server3,10.10.10.12)
	@$(call overlay_ping,server2,10.10.10.13)
	@$(call overlay_ping,server1,10.10.10.12)
	@$(call overlay_ping,server1,10.10.10.13)
	docker exec $(TESTENV)-leaf1 sr_cli "show network-instance default protocols bgp routes evpn route-type summary"
	docker exec $(TESTENV)-leaf1 sr_cli "show network-instance t1-web bridge-table mac-table all"
	docker exec $(TESTENV)-leaf1 sr_cli "show system network-instance ethernet-segments"

# Both ports of the ESI-LAG of server1, in the two pods, go down and up again
# while server2 and server3 reach server1 across the super-spine
.PHONY: check-overlay-failover
check-overlay-failover:
	@$(call overlay_failover,server3,10.10.10.11,leaf1,ethernet-1/1)
	@$(call overlay_failover,server2,10.10.10.11,leaf2,ethernet-1/1)
